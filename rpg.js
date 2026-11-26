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

  const ns = io.of('/rpg');
  const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const G = .34;

  // ---------------- 世界（每張地圖一個） ----------------
  const worlds = D.MAPS.map((m, mi) => ({ mi, mons: m.spawns.map((sp, i) => mkMon(sp, i)), drops: new Map(), players: new Map(), dseq: 1 }));
  function mkMon(sp, i) {
    const m = D.MON[sp.t], seg = D.SEG[sp.s], a = sp.a ?? seg.x1 + 10, b = sp.b ?? seg.x2 - 10;
    return { i, t: sp.t, sp, x: rnd(a, b), seg: sp.s, a, b, vx: 0, f: Math.random() < .5 ? -1 : 1, hp: m.hp, max: m.hp, dead: 0, hurt: 0, aggro: 0, target: null, think: ri(30, 120), hop: 0, vy: 0, w: m.w, kx: 0, frozen: 0, stomp: ri(120, 200), dmgBy: {} };
  }
  const char = uid => S.rpg[uid];
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
    if (m.dead) { m.dead--; if (m.dead <= 0) { Object.assign(m, mkMon(m.sp, m.i)); ns.to('m' + w.mi).emit('respawn', { i: m.i }); } return; }
    // 30Hz 模擬，速度 ×2 對齊瀏覽器的 60Hz
    if (m.hurt > 0) m.hurt -= 2; if (m.aggro > 0) m.aggro -= 2;
    const seg = D.SEG[m.seg];
    if (m.frozen > 0) { m.frozen -= 2; m.kx = 0; }
    else if (m.kx) { m.x += m.kx * 1.6; m.kx *= .64; if (Math.abs(m.kx) < .1) m.kx = 0; }
    else if (m.hurt < 6) {
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
    if (d.boss && m.aggro && !m.frozen && (m.stomp -= 2) <= 0) { m.stomp = ri(170, 250); m.vy = -4.5; m.hop = -.01; m.stomping = 1; }
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
  function playerPub(pl) { const c = char(pl.uid) || {}; return [pl.uid, nameOf(pl.uid), c.cls, c.job || 0, c.wep || 0, c.lv || 1, Math.round(pl.x), Math.round(pl.y), pl.f, pl.act || 0, pl.rope ? 1 : 0, pl.dead ? 1 : 0, pl.hpPct ?? 100, pl.clone ? 1 : 0]; }

  // ---------------- 擊殺與經驗 ----------------
  function kill(w, m, killer) {
    const d = D.MON[m.t];
    m.dead = d.boss ? 30 * 90 : 30 * 7; m.hp = 0;
    ns.to('m' + w.mi).emit('kill', { i: m.i });
    const y = D.SEG[m.seg].y, now = Date.now(), news = [];
    const add = (t, v, dx) => { const id = w.dseq++; const dr = { id, t, v, x: clamp(m.x + dx, 10, D.WW - 10), y, until: now + 25000, fy: y - m.w * .5 }; w.drops.set(id, dr); news.push(dr); };
    add('gold', ri(...d.gold), 0);
    if (Math.random() < (d.boss ? 1 : .12)) add(Math.random() < .6 ? 'pot' : 'eth', 1, 8);
    if (d.boss) for (let k = 0; k < 4; k++) add('gold', Math.round(ri(...d.gold) / 6), rnd(-30, 30));
    ns.to('m' + w.mi).emit('drop', news);
    // 經驗：所有有出手、仍在這張地圖的玩家都分得到，一起打比較划算
    const total = Object.values(m.dmgBy).reduce((a, b) => a + b, 0) || 1;
    for (const [uid, dmg] of Object.entries(m.dmgBy)) {
      const c = char(uid); if (!c || !w.players.has(uid)) continue;
      const share = Math.min(1, dmg / total + .3), ld = d.lv - c.lv, ef = ld < -10 ? .3 : ld < -5 ? .65 : 1;
      const e = Math.max(1, Math.round(d.exp * ef * share)), lv0 = c.lv, up = D.addExp(c, e);
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

    socket.emit('hello', { me: me(uid), name: nameOf(uid), id: uid });
    socket.on('create', ({ cls } = {}, ack) => {
      if (char(uid)) return ack && ack({ ok: false });
      if (!D.CL[cls]) return ack && ack({ ok: false });
      S.rpg[uid] = D.newChar(cls); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('reset', (_, ack) => { delete S.rpg[uid]; if (w) { w.players.delete(uid); ns.to('m' + w.mi).emit('pleave', { id: uid }); socket.leave('m' + w.mi); w = null; } save(); ack && ack({ ok: true }); });
    socket.on('enter', (_, ack) => { const c = char(uid); if (!c) return ack && ack({ ok: false }); enter(c.map || 0); ack && ack({ ok: true }); });
    socket.on('pos', (p = {}) => {
      if (!w) return;
      pl.x = clamp(+p.x || 0, 0, D.WW); pl.y = clamp(+p.y || 0, -100, D.WH + 60); pl.f = p.f < 0 ? -1 : 1; pl.act = p.act ? 1 : 0; pl.rope = p.rope ? 1 : 0; pl.dead = p.dead ? 1 : 0;
      pl.hpPct = clamp(Math.round(+p.hp || 0), 0, 100); pl.clone = p.clone ? 1 : 0;
    });
    socket.on('hit', (list) => {
      const c = char(uid); if (!w || !c || !Array.isArray(list) || pl.dead) return;
      const now = Date.now(); if (now - rate.t > 1000) { rate = { t: now, n: 0 }; }
      const st = D.stats(c), out = [];
      for (const h of list.slice(0, 20)) {
        if (++rate.n > 60) break;
        const m = w.mons[h.m | 0]; if (!m || m.dead || m.hp <= 0) continue;
        if (Math.abs(m.x - pl.x) > 360) continue;
        const mult = clamp(+h.mult || 1, .1, 3.2), cb = clamp(+h.cb || 0, 0, 40);
        const crit = Math.random() * 100 < st.crit + cb;
        const dmg = Math.max(1, Math.round(st.atk * mult * rnd(.85, 1.15) * (crit ? 1.7 : 1)));
        m.hp -= dmg; m.hurt = 28; m.aggro = 840; m.target = uid; m.dmgBy[uid] = (m.dmgBy[uid] || 0) + dmg;
        if (!D.MON[m.t].boss && h.kb) m.kx = clamp(+h.kb, 0, 4) * (m.x < pl.x ? -1 : 1);
        // 冰凍：一般怪 1 秒、Boss 0.5 秒；被凍過之後有抗凍時間，避免一直被凍住
        // 冰凍：Boss 免疫；凍結 0.75 秒，解凍後 3 秒內不會再被凍住
        if (h.fz && !D.MON[m.t].boss && now > (m.fzImm || 0)) { m.frozen = 45; m.fzImm = now + 750 + 3000; }
        out.push([m.i, dmg, crit ? 1 : 0, h.s | 0]);
        if (m.hp <= 0) kill(w, m, uid);
      }
      if (out.length) ns.to('m' + w.mi).emit('hits', { by: uid, h: out });
    });
    socket.on('cast', (p = {}) => { if (!w || !char(uid)) return; if (!D.SK[char(uid).cls][p.k]) return; socket.to('m' + w.mi).emit('cast', { id: uid, k: p.k, x: +p.x || 0, y: +p.y || 0, f: p.f < 0 ? -1 : 1 }); });
    socket.on('pick', ({ id } = {}, ack) => {
      const c = char(uid); if (!w || !c) return;
      const d = w.drops.get(id); if (!d) return ack && ack({ ok: false });
      if (Math.abs(d.x - pl.x) > 60 || Math.abs(d.y - pl.y) > 60) return ack && ack({ ok: false });
      w.drops.delete(id);
      if (d.t === 'gold') c.gold += d.v; else c[d.t] = (c[d.t] || 0) + 1;
      ns.to('m' + w.mi).emit('dgone', { id, by: uid }); save(); pushMe(uid); ack && ack({ ok: true, t: d.t, v: d.v });
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
        const it = D.WEAPONS[c.cls][i | 0]; if (!it || (i | 0) <= c.wep) return no('無法購買');
        if (c.lv < it[2]) return no(`需要 Lv ${it[2]}`); if (c.gold < it[3]) return no('金幣不足');
        c.gold -= it[3]; c.wep = i | 0;
      } else if (k === 'arm') {
        const it = D.ARMORS[i | 0]; if (!it || (i | 0) <= c.arm) return no('無法購買');
        if (c.lv < it[3]) return no(`需要 Lv ${it[3]}`); if (c.gold < it[4]) return no('金幣不足');
        c.gold -= it[4]; c.arm = i | 0;
      } else return no('無法購買');
      save(); ack && ack({ ok: true, me: me(uid), rest: k === 'rest' });
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
      if (pt.req && c.lv < pt.req) return ack && ack({ ok: false, msg: `${pt.label}需要 Lv ${pt.req}` });
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
    top: () => Object.entries(S.rpg).map(([uid, c]) => ({ name: nameOf(uid), lv: c.lv, job: D.CL[c.cls]?.jobs[c.job] || '' })).sort((a, b) => b.lv - a.lv).slice(0, 10),
  };
};
