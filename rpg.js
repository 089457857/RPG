// 屁眼王國大冒險 — 連線伺服器模組（Socket.IO 命名空間 /rpg）
// 伺服器負責：角色存檔、怪物、傷害、經驗、金幣、掉落、商店、轉職、傳送門、聊天。
// 玩家位置與自身 HP 由各自的瀏覽器回報（原型等級的防作弊）。
const path = require('path');
const fs = require('fs');
const D = require('./rpg-data');

module.exports = function attachRPG({ io, app, S, save, dir, page = 'index.html', routes = ['/'] }) {
  const pick = f => { const a = path.join(dir, 'public', f); return fs.existsSync(a) ? a : path.join(dir, f); };
  app.get(routes, (req, res) => res.sendFile(pick(page)));
  app.get('/rpg-data.js', (req, res) => res.type('application/javascript').sendFile(pick('rpg-data.js')));
  if (!S.rpg) S.rpg = {};
  // 多角色：S.rpg[uid] 是目前使用中的角色；其他欄位的角色放在 S.rpgAlt[uid].slots（使用中的那格是 null）
  if (!S.rpgAlt) S.rpgAlt = {};
  const MAXSLOT = 3;
  const alt = uid => (S.rpgAlt[uid] ||= { slots: [null, null, null], act: 0 });
  const slotList = uid => { const a = alt(uid); return a.slots.map((c, i) => { const x = i === a.act ? S.rpg[uid] : c; return x ? { cls: x.cls, lv: x.lv, job: x.job, jobName: D.CL[x.cls].jobs[x.job], map: D.MAPS[x.map || 0].name } : null; }); };

  const ns = io.of('/rpg');
  const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const G = .34;

  // ---------------- 世界（每張地圖一個） ----------------
  const worlds = D.MAPS.map((m, mi) => ({ mi, mons: m.spawns.map((sp, i) => mkMon(sp, i, mi)), drops: new Map(), players: new Map(), dseq: 1 }));
  function mkMon(sp, i, mi) {
    const m = D.MON[sp.t], seg = D.MAPS[mi].seg[sp.s], a = sp.a ?? seg.x1 + 10, b = sp.b ?? seg.x2 - 10;
    return { mi, i, t: sp.t, sp, x: rnd(a, b), seg: sp.s, a, b, vx: 0, f: Math.random() < .5 ? -1 : 1, hp: m.hp, max: m.hp, dead: 0, hurt: 0, aggro: 0, target: null, think: ri(30, 120), hop: 0, vy: 0, w: m.w, kx: 0, frozen: 0, stomp: ri(120, 200), dmgBy: {}, warn: 0, dash: 0, rage: 0, pend: null, root: 0, vuln: 0 };
  }
  const char = uid => D.fix(S.rpg[uid]);
  const nameOf = uid => S.users[uid]?.name || '玩家';
  function me(uid) { const c = char(uid); return c ? { ...c, max: D.stats(c) } : null; }
  const pushMe = uid => ns.to('u:' + uid).emit('me', me(uid));

  // ---------------- 模擬 ----------------
  const TICK = 1000 / 30;
  setInterval(() => {
    for (const w of worlds) {
      if (!w.players.size) continue;
      for (const m of w.mons) stepMon(w, m);
      for (const [id, d] of w.drops) if (Date.now() > d.until) { w.drops.delete(id); ns.to('m' + w.mi).emit('dgone', { id }); }
    }
  }, TICK);
  function stepMon(w, m) {
    const d = D.MON[m.t];
    if (m.dead) { m.dead--; if (m.dead <= 0) { Object.assign(m, mkMon(m.sp, m.i, m.mi)); ns.to('m' + w.mi).emit('respawn', { i: m.i }); } return; }
    // 30Hz 模擬，速度 ×2 對齊瀏覽器的 60Hz
    if (m.hurt > 0) m.hurt -= 2; if (m.aggro > 0) m.aggro -= 2;
    const seg = D.MAPS[m.mi].seg[m.seg];
    if (m.root > 0) m.root -= 2;
    if (m.frozen > 0) { m.frozen -= 2; m.kx = 0; }
    else if (m.kx) { m.x += m.kx * 1.6; m.kx *= .64; if (Math.abs(m.kx) < .1) m.kx = 0; }
    else if (m.hurt < 6 && !(m.warn > 0) && !(m.dash > 0) && !(m.root > 0)) {
      const tp = m.aggro && m.target ? w.players.get(m.target) : null;
      if (tp && !tp.dead && Math.abs(tp.y - seg.y) < 60) { m.f = tp.x < m.x ? -1 : 1; m.vx = d.spd * 1.5 * m.f; }
      else if ((m.think -= 2) <= 0) { m.think = ri(60, 180); const r = Math.random(); m.vx = r < .3 ? 0 : d.spd * (Math.random() < .5 ? -1 : 1); if (m.vx) m.f = Math.sign(m.vx); }
      m.x += m.vx * 2;
    }
    const lo = Math.max(seg.x1 + m.w / 2, m.a), hi = Math.min(seg.x2 - m.w / 2, m.b);
    m.x = clamp(m.x, lo, hi); if ((m.x <= lo + .1 || m.x >= hi - .1) && m.vx) { m.vx = -m.vx; m.f = Math.sign(m.vx); }
    if (!m.frozen) {
      if (m.hop < 0 || m.vy) { for (let k = 0; k < 2; k++) { m.vy += G * .8; m.hop += m.vy; } if (m.hop >= 0) { m.hop = 0; m.vy = 0; if (m.stomping) { m.stomping = 0; ns.to('m' + w.mi).emit('stomp', { i: m.i, x: m.x, atk: Math.round(d.atk * 1.2) }); } } }
      else if (/slime|shroom/.test(m.t) && Math.random() < .016) { m.vy = -2.6; m.hop = -.01; }
    }
    if (d.boss) bossAI(w, m, d);
  }
  // ---------------- Boss 招式 ----------------
  // 伺服器決定 Boss 何時放什麼招、打哪裡；每位玩家的瀏覽器依預警範圍自行判定是否被打中。
  function bossAI(w, m, d) {
    // 打不到任何人時快速回血：沒有活著的玩家站在 Boss 這一層附近（例如全躲在高處平台上偷打）
    const sy = D.MAPS[m.mi].seg[m.seg].y;
    let reach = false; for (const p of w.players.values()) if (!p.dead && Math.abs(p.x - m.x) < 450 && p.y > sy - 50 && p.y < sy + 20) { reach = true; break; }
    if (reach || m.hp >= m.max) { m.noReach = 0; if (m.regen) { m.regen = 0; } }
    else if ((m.noReach = (m.noReach || 0) + 1) > 120) {
      if (!m.regen) { m.regen = 1; ns.to('m' + w.mi).emit('sys', { t: `${d.name} 碰不到任何人，開始快速回血！快下來跟它正面對決！` }); }
      m.hp = Math.min(m.max, m.hp + m.max * .03 / 30);
    }
    const rage = m.hp < m.max * .3;
    if (rage && !m.rage) { m.rage = 1; ns.to('m' + w.mi).emit('sys', { t: `${d.name} 暴怒了！招式變得更快更兇！` }); }
    if (m.warn > 0) { m.vx = 0; if ((m.warn -= 1) <= 0 && m.pend === 'charge') { m.dash = 16; } return; }
    if (m.dash > 0) {
      m.dash--; const seg = D.MAPS[m.mi].seg[m.seg], lo = Math.max(seg.x1 + m.w / 2, m.a), hi = Math.min(seg.x2 - m.w / 2, m.b);
      m.x = clamp(m.x + m.f * 8, lo, hi); m.vx = 0; return;
    }
    if (!m.aggro || m.frozen || m.hop < 0 || (m.stomp -= rage ? 3 : 2) > 0) return;
    m.stomp = ri(120, 190);
    const k = d.sk[ri(0, d.sk.length - 1)], atk = Math.round(d.atk * (rage ? 1.2 : 1)), seg = D.MAPS[m.mi].seg[m.seg];
    const tp = m.target && w.players.get(m.target);
    if (tp && !tp.dead) m.f = tp.x < m.x ? -1 : 1;
    const ev = { i: m.i, k, n: (d.skn && d.skn[k]) || '', x: Math.round(m.x), y: seg.y, f: m.f, atk, rage: rage ? 1 : 0 };
    if (k === 'slam') { m.vy = -4.5; m.hop = -.01; m.stomping = 1; return; }
    if (k === 'rain') {
      const xs = [], near = [...w.players.values()].filter(p => !p.dead && Math.abs(p.x - m.x) < 420);
      for (const p of near) for (let j = 0; j < (rage ? 3 : 2); j++) xs.push(Math.round(clamp(p.x + rnd(-60, 60), 10, D.WW - 10)));
      for (let j = 0; j < (rage ? 6 : 4); j++) xs.push(Math.round(clamp(m.x + rnd(-300, 300), 10, D.WW - 10)));
      ev.xs = xs; ev.warn = 1000; m.warn = 18;
    } else if (k === 'breath') { ev.warn = 800; ev.len = 260; m.warn = 40; }
    else if (k === 'quake') { ev.warn = 700; m.warn = 30; }
    else if (k === 'charge') { ev.warn = 700; m.warn = 21; m.pend = 'charge'; }
    if (k !== 'charge') m.pend = null;
    ns.to('m' + w.mi).emit('bskill', ev);
  }
  // 10Hz 廣播
  setInterval(() => {
    for (const w of worlds) {
      if (!w.players.size) continue;
      const m = w.mons.map(m => [m.i, Math.round(m.x * 10) / 10, Math.round(m.hop), m.f, Math.max(0, Math.round(m.hp)), m.dead ? 1 : 0, m.frozen > 0 ? 1 : 0, m.hurt > 8 ? 1 : 0]);
      const p = [...w.players.values()].map(pl => playerPub(pl));
      ns.to('m' + w.mi).emit('st', { m, p });
    }
  }, 100);
  function playerPub(pl) { const c = char(pl.uid) || {}; return [pl.uid, nameOf(pl.uid), c.cls, c.job || 0, c.wep || 0, c.lv || 1, Math.round(pl.x), Math.round(pl.y), pl.f, pl.act || 0, pl.rope ? 1 : 0, pl.dead ? 1 : 0, pl.hpPct ?? 100, pl.clone ? 1 : 0, c.pet || '', pl.mount ? 1 : 0]; }

  // ---------------- 擊殺與經驗 ----------------
  function kill(w, m, killer) {
    const d = D.MON[m.t];
    m.dead = d.boss ? 30 * 90 : 30 * 7; m.hp = 0;
    ns.to('m' + w.mi).emit('kill', { i: m.i });
    const y = D.MAPS[m.mi].seg[m.seg].y, now = Date.now(), news = [];
    const add = (t, v, dx) => { const id = w.dseq++; const dr = { id, t, v, x: clamp(m.x + dx, 10, D.WW - 10), y, until: now + 25000, fy: y - m.w * .5 }; w.drops.set(id, dr); news.push(dr); };
    add('gold', ri(...d.gold), 0);
    if (Math.random() < (d.boss ? 1 : .12)) add(Math.random() < .6 ? 'pot' : 'eth', 1, 8);
    if (d.boss) for (let k = 0; k < 4; k++) add('gold', Math.round(ri(...d.gold) / 6), rnd(-30, 30));
    if (d.leg && Math.random() < d.leg) { add('leg', 1, -10); ns.to('m' + w.mi).emit('sys', { t: `✦ ${d.name} 掉落了傳說武器！快去撿！` }); }
    ns.to('m' + w.mi).emit('drop', news);
    // 經驗：所有有出手、仍在這張地圖的玩家都分得到，一起打比較划算
    const total = Object.values(m.dmgBy).reduce((a, b) => a + b, 0) || 1;
    for (const [uid, dmg] of Object.entries(m.dmgBy)) {
      const c = char(uid); if (!c || !w.players.has(uid)) continue;
      const share = Math.min(1, dmg / total + .3), ld = d.lv - c.lv, ef = ld < -10 ? .3 : ld < -5 ? .65 : 1;
      // 低等玩家跟打高等怪：照樣有經驗，但單次最多約 1.5 級，避免一隻王直接衝十幾級
      let e = Math.max(1, Math.round(d.exp * ef * share)); if (ld > 12) e = Math.min(e, Math.round(D.needExp(c.lv) * 1.5));
      const lv0 = c.lv, up = D.addExp(c, e);
      ns.to('u:' + uid).emit('gain', { exp: e, lv: c.lv, up, newJob: up && D.JOBLV.some(j => j > lv0 && j <= c.lv) });
      if (up) ns.to('m' + w.mi).emit('lvup', { id: uid });
      pushMe(uid);
    }
    if (d.boss) ns.to('m' + w.mi).emit('sys', { t: `${D.MON[m.t].name} 被打倒了！最後一擊：${nameOf(killer)}` });
    m.dmgBy = {}; save();
  }

  // ---------------- 連線 ----------------
  ns.use((socket, next) => {
    const uid = S.sessions[socket.handshake.auth?.token];
    if (!uid || !S.users[uid]) return next(new Error('auth'));
    socket.data.uid = uid; next();
  });
  ns.on('connection', socket => {
    const uid = socket.data.uid;
    socket.join('u:' + uid);
    let w = null; let rate = { t: 0, n: 0 }, chatT = 0;
    const pl = { uid, x: 0, y: D.GY, f: 1, act: 0, rope: 0, dead: 0, hpPct: 100, clone: 0 };
    const online = () => [...worlds].reduce((a, w2) => a + w2.players.size, 0);

    function enter(mi, x) {
      if (w) { w.players.delete(uid); socket.leave('m' + w.mi); ns.to('m' + w.mi).emit('pleave', { id: uid }); }
      w = worlds[mi]; pl.x = x ?? D.MAPS[mi].start; pl.y = D.GY; pl.dead = 0;
      // 同一個帳號只留一個連線在世界裡
      for (const w2 of worlds) w2.players.delete(uid);
      w.players.set(uid, pl); socket.join('m' + mi);
      socket.emit('init', {
        map: mi, x: pl.x,
        mons: w.mons.map(m => ({ i: m.i, x: m.x, hop: m.hop, f: m.f, hp: m.hp, max: m.max, dead: m.dead ? 1 : 0 })),
        drops: [...w.drops.values()], players: [...w.players.values()].filter(p => p.uid !== uid).map(playerPub), online: online(),
      });
      ns.to('m' + mi).emit('sys', { t: `${nameOf(uid)} 來到了${D.MAPS[mi].name}`, quiet: 1 });
    }

    socket.emit('hello', { me: me(uid), name: nameOf(uid), id: uid, list: slotList(uid), act: alt(uid).act });
    function leaveWorld() { if (w) { w.players.delete(uid); ns.to('m' + w.mi).emit('pleave', { id: uid }); socket.leave('m' + w.mi); w = null; } }
    // 切換到第 i 格（使用中的角色收回自己的格子）
    function swapTo(i) { const a = alt(uid); if (i === a.act) return; a.slots[a.act] = S.rpg[uid] || null; S.rpg[uid] = a.slots[i]; a.slots[i] = null; a.act = i; if (!S.rpg[uid]) delete S.rpg[uid]; }
    socket.on('chars', (_, ack) => ack && ack({ list: slotList(uid), act: alt(uid).act }));
    socket.on('useSlot', ({ i } = {}, ack) => {
      i = i | 0; if (i < 0 || i >= MAXSLOT) return ack && ack({ ok: false });
      const a = alt(uid), c = i === a.act ? S.rpg[uid] : a.slots[i]; if (!c) return ack && ack({ ok: false, msg: '這一格沒有角色' });
      leaveWorld(); swapTo(i); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('create', ({ cls, slot } = {}, ack) => {
      if (!D.CL[cls]) return ack && ack({ ok: false });
      const a = alt(uid); slot = slot == null ? a.act : slot | 0; if (slot < 0 || slot >= MAXSLOT) return ack && ack({ ok: false });
      if ((slot === a.act ? S.rpg[uid] : a.slots[slot])) return ack && ack({ ok: false, msg: '這一格已經有角色了' });
      leaveWorld(); swapTo(slot); S.rpg[uid] = D.newChar(cls); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('delSlot', ({ i } = {}, ack) => {
      i = i | 0; const a = alt(uid); if (i < 0 || i >= MAXSLOT) return ack && ack({ ok: false });
      if (i === a.act) { leaveWorld(); delete S.rpg[uid]; } else a.slots[i] = null;
      save(); ack && ack({ ok: true, list: slotList(uid), act: a.act });
    });
    socket.on('leave', (_, ack) => { leaveWorld(); ack && ack({ ok: true, list: slotList(uid), act: alt(uid).act }); });
    socket.on('reset', (_, ack) => { leaveWorld(); delete S.rpg[uid]; save(); ack && ack({ ok: true }); });
    // 能力值
    socket.on('ap', ({ k, n } = {}, ack) => {
      const c = char(uid); if (!c || !D.STATS[k]) return ack && ack({ ok: false });
      n = clamp(n | 0, 1, c.ap || 0); if (!n) return ack && ack({ ok: false, msg: '沒有能力點數了' });
      c.st[k] += n; c.ap -= n; save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('apreset', (_, ack) => {
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      const used = Object.values(c.st).reduce((a, b) => a + b, 0); if (!used) return ack && ack({ ok: false, msg: '還沒有分配任何點數' });
      if (c.gold < D.APRESET) return ack && ack({ ok: false, msg: `重置需要 ${D.APRESET} 金幣` }); c.gold -= D.APRESET; c.ap += used; c.st = { str: 0, vit: 0, int: 0, dex: 0 }; save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('enter', (_, ack) => { const c = char(uid); if (!c) return ack && ack({ ok: false }); enter(c.map || 0); ack && ack({ ok: true });
      if (c.apComp) { delete c.apComp; save(); socket.emit('notice', { t: `能力值系統改版補償：獲得 ${D.APRESET.toLocaleString()} 金幣，可以到「能力」重新配點！` }); } });
    socket.on('pos', (p = {}) => {
      if (!w) return;
      pl.x = clamp(+p.x || 0, 0, D.WW); pl.y = clamp(+p.y || 0, -100, D.WH + 60); pl.f = p.f < 0 ? -1 : 1; pl.act = p.act ? 1 : 0; pl.rope = p.rope ? 1 : 0; pl.dead = p.dead ? 1 : 0;
      pl.hpPct = clamp(Math.round(+p.hp || 0), 0, 100); pl.clone = p.clone ? 1 : 0; pl.mount = p.mount && (char(uid)?.lv || 0) >= D.MOUNTLV ? 1 : 0;
    });
    socket.on('hit', (list) => {
      const c = char(uid); if (!w || !c || !Array.isArray(list) || pl.dead || pl.mount) return;
      const now = Date.now(); if (now - rate.t > 1000) { rate = { t: now, n: 0 }; }
      const st = D.stats(c), out = []; let dealt = 0;
      for (const h of list.slice(0, 20)) {
        if (++rate.n > 60) break;
        const m = w.mons[h.m | 0]; if (!m || m.dead || m.hp <= 0) continue;
        if (Math.abs(m.x - pl.x) > 360) continue;
        const mult = clamp(+h.mult || 1, .1, 3.2), cb = clamp(+h.cb || 0, 0, 40);
        const crit = Math.random() * 100 < st.crit + cb;
        const boss = D.MON[m.t].boss;
        let dmg = Math.max(1, Math.round(st.atk * mult * rnd(.85, 1.15) * (crit ? st.critD || 1.7 : 1) * (now < m.vuln ? 1.2 : 1) * (h.sk ? 1 + (st.skillB || 0) : 1)));
        // 靈魂收割：直接處決殘血的一般怪
        if (h.ex && !boss && m.hp - dmg < m.max * .15) dmg = Math.max(dmg, Math.ceil(m.hp));
        if (h.vu) m.vuln = now + 8000;
        if (h.rt && !boss) m.root = 75;
        m.hp -= dmg; m.hurt = 28; m.aggro = 840; m.target = uid; m.dmgBy[uid] = (m.dmgBy[uid] || 0) + dmg;
        if (!boss && h.pl) m.kx = clamp((pl.x + (m.x < pl.x ? -20 : 20) - m.x) / 4.4, -40, 40);
        else if (!boss && h.kb) m.kx = clamp(+h.kb, 0, 4) * (m.x < pl.x ? -1 : 1);
        // 冰凍：一般怪 1 秒、Boss 0.5 秒；被凍過之後有抗凍時間，避免一直被凍住
        // 冰凍：Boss 免疫；凍結 0.75 秒，解凍後 3 秒內不會再被凍住
        if (h.fz && !D.MON[m.t].boss && now > (m.fzImm || 0)) { m.frozen = 45; m.fzImm = now + 750 + 3000; }
        out.push([m.i, dmg, crit ? 1 : 0, h.s | 0]); dealt += dmg;
        if (m.hp <= 0) kill(w, m, uid);
      }
      if (out.length) ns.to('m' + w.mi).emit('hits', { by: uid, h: out });
      // 朱雀：攻擊吸血 5%，每秒最多回復 12% 最大 HP
      if (c.pet === 'zhuque' && dealt > 0) {
        if (now - (pl.lsT || 0) > 1000) { pl.lsT = now; pl.ls = 0; }
        const cap = Math.round(st.hp * .12), heal = Math.min(Math.round(dealt * .05), cap - (pl.ls || 0));
        if (heal > 0) { pl.ls = (pl.ls || 0) + heal; socket.emit('heal', { hp: heal }); }
      }
    });
    socket.on('cast', (p = {}) => { if (!w || !char(uid)) return; if (!D.SK[char(uid).cls][p.k] && p.k !== 'dj') return; socket.to('m' + w.mi).emit('cast', { id: uid, k: p.k, x: +p.x || 0, y: +p.y || 0, f: p.f < 0 ? -1 : 1 }); });
    // 天使的輔助技能：轉送給附近的隊友（含自己），由各自的瀏覽器套用效果
    socket.on('aid', ({ k } = {}, ack) => {
      const c = char(uid); if (!w || !c || c.cls !== 'angel' || !['s1', 's3', 's4', 's6'].includes(k) || D.skillLock(c, k)) return;
      const now = Date.now(); if (now - (pl.aidT || 0) < 600) return; pl.aidT = now;
      for (const o of w.players.values()) if (Math.abs(o.x - pl.x) < 300 && Math.abs(o.y - pl.y) < 160) ns.to('u:' + o.uid).emit('aid', { k, by: uid, name: nameOf(uid), hb: D.stats(c).healB || 0 });
    });
    socket.on('pick', ({ id } = {}, ack) => {
      const c = char(uid); if (!w || !c) return;
      const d = w.drops.get(id); if (!d) return ack && ack({ ok: false });
      if (Math.abs(d.x - pl.x) > 60 || Math.abs(d.y - pl.y) > 60) return ack && ack({ ok: false });
      w.drops.delete(id);
      let leg = null;
      if (d.t === 'gold') c.gold += d.v;
      else if (d.t === 'leg') {
        if (c.wep === D.LEGI) { c.gold += D.LEGGOLD; leg = { dup: 1 }; }
        else { c.wep = D.LEGI; leg = { name: D.WEAPONS[c.cls][D.LEGI][0] }; ns.to('m' + w.mi).emit('sys', { t: `✦ ${nameOf(uid)} 獲得了傳說武器「${leg.name}」！` }); }
      } else c[d.t] = (c[d.t] || 0) + 1;
      ns.to('m' + w.mi).emit('dgone', { id, by: uid }); save(); pushMe(uid); ack && ack({ ok: true, t: d.t, v: d.v, leg });
    });
    socket.on('use', ({ k } = {}, ack) => {
      const c = char(uid); if (!c || !['pot', 'eth'].includes(k) || !(c[k] > 0)) return ack && ack({ ok: false });
      c[k]--; save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('buy', ({ k, i } = {}, ack) => {
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      const no = msg => ack && ack({ ok: false, msg });
      if (k === 'pot' || k === 'eth' || k === 'pot10' || k === 'rest') {
        if (!w || w.mi !== 0) return no('要在晨露村才能購買');
        const price = D.SHOP[k]; if (c.gold < price) return no('金幣不足');
        c.gold -= price; if (k === 'pot') c.pot++; else if (k === 'eth') c.eth++; else if (k === 'pot10') c.pot += 10;
      } else if (k === 'wep') {
        const it = D.WEAPONS[c.cls][i | 0]; if (!it || it[4] || (i | 0) <= c.wep) return no(it && it[4] ? '傳說武器只能從怪物身上取得' : '無法購買');
        if (c.lv < it[2]) return no(`需要 Lv ${it[2]}`); if (c.gold < it[3]) return no('金幣不足');
        c.gold -= it[3]; c.wep = i | 0;
      } else if (k === 'arm') {
        const it = D.ARMORS[i | 0]; if (!it || (i | 0) <= c.arm) return no('無法購買');
        if (c.lv < it[3]) return no(`需要 Lv ${it[3]}`); if (c.gold < it[4]) return no('金幣不足');
        c.gold -= it[4]; c.arm = i | 0;
      } else return no('無法購買');
      save(); ack && ack({ ok: true, me: me(uid), rest: k === 'rest' });
    });
    socket.on('pet', ({ p } = {}, ack) => {
      const c = char(uid); if (!c || !D.PETS[p]) return ack && ack({ ok: false });
      if (c.lv < D.PETLV) return ack && ack({ ok: false, msg: `Lv ${D.PETLV} 才能擁有寵物` });
      if (c.pet === p) return ack && ack({ ok: false, msg: '已經是這隻寵物了' });
      if (c.pet) { if (c.gold < D.PETSWAP) return ack && ack({ ok: false, msg: `更換寵物需要 ${D.PETSWAP} 金幣` }); c.gold -= D.PETSWAP; }
      c.pet = p; save(); ack && ack({ ok: true, me: me(uid) });
      if (w) ns.to('m' + w.mi).emit('sys', { t: `${nameOf(uid)} 的寵物「${D.PETS[p].n}」現身了！` });
    });
    socket.on('slots', ({ slots } = {}, ack) => {
      const c = char(uid); if (!c || !Array.isArray(slots) || slots.length !== D.SLOTN) return ack && ack({ ok: false });
      const sk = D.SK[c.cls], seen = new Set();
      for (const k of slots) { if (k === '') continue; if (k === 'atk' || !sk[k] || seen.has(k)) return ack && ack({ ok: false, msg: '技能配置有誤' }); seen.add(k); }
      c.slots = slots.map(String); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('advance', (_, ack) => {
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      const next = c.job + 1; if (next > 4) return ack && ack({ ok: false, msg: '已經完成所有轉職' });
      if (c.lv < D.JOBLV[next]) return ack && ack({ ok: false, msg: `需要 Lv ${D.JOBLV[next]}` });
      if (!w || w.mi !== 0) return ack && ack({ ok: false, msg: '要在晨露村找轉職教官' });
      c.job = next; save(); ack && ack({ ok: true, me: me(uid) });
      ns.to('m' + w.mi).emit('sys', { t: `${nameOf(uid)} 轉職成為「${D.CL[c.cls].jobs[next]}」！` });
    });
    socket.on('portal', ({ to } = {}, ack) => {
      const c = char(uid); if (!c || !w) return ack && ack({ ok: false });
      const pt = D.MAPS[w.mi].portals.find(p => p.to === to); if (!pt) return ack && ack({ ok: false });
      if (Math.abs(pl.x - pt.x) > 60) return ack && ack({ ok: false, msg: '離傳送門太遠' });
            c.map = to; save(); ack && ack({ ok: true }); enter(to, pt.tx);
    });
    socket.on('revive', (_, ack) => {
      const c = char(uid); if (!c) return;
      c.exp = Math.max(0, c.exp - Math.floor(D.needExp(c.lv) * .06)); c.map = 0; save(); pushMe(uid); ack && ack({ ok: true }); enter(0, D.MAPS[0].start);
    });
    socket.on('chat', ({ t } = {}) => {
      if (!w) return; const now = Date.now(); if (now - chatT < 800) return; chatT = now;
      t = String(t || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60); if (!t) return;
      ns.to('m' + w.mi).emit('chat', { id: uid, name: nameOf(uid), t });
    });
    socket.on('disconnect', () => {
      // 同帳號若還有其他分頁連著，就不移除
      setTimeout(() => {
        const still = (ns.adapter.rooms.get('u:' + uid)?.size || 0) > 0;
        if (w && !still) { w.players.delete(uid); ns.to('m' + w.mi).emit('pleave', { id: uid }); }
      }, 300);
    });
  });

  // 給大廳顯示的線上人數與排行
  return {
    online: () => worlds.reduce((a, w) => a + w.players.size, 0),
    top: () => [...Object.entries(S.rpg), ...Object.entries(S.rpgAlt).flatMap(([uid, a]) => a.slots.filter(Boolean).map(c => [uid, c]))].map(([uid, c]) => ({ name: nameOf(uid), lv: c.lv, job: D.CL[c.cls]?.jobs[c.job] || '' })).sort((a, b) => b.lv - a.lv).slice(0, 10),
  };
};
