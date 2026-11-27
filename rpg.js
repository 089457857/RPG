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
  // 手機「加入主畫面」：從桌面圖示開啟時沒有網址列，以全螢幕遊玩
  app.get('/manifest.webmanifest', (req, res) => res.type('application/manifest+json').send(JSON.stringify({
    name: '屁眼王國大冒險', short_name: '屁眼王國', start_url: '/', scope: '/', display: 'fullscreen', orientation: 'landscape', background_color: '#0b1020', theme_color: '#0b1020',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  })));
  app.get(['/icon.png', '/apple-touch-icon.png'], (req, res) => { const f = pick('icon.png'); fs.existsSync(f) ? res.sendFile(f) : res.status(404).end(); });
  app.get('/icon.svg', (req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="#4a8cf0"/><rect y="22" width="32" height="10" fill="#8a5a2b"/><rect y="22" width="32" height="2" fill="#5cbf4a"/><rect x="12" y="8" width="8" height="7" fill="#f4c79c"/><rect x="11" y="6" width="10" height="3" fill="#7a4a22"/><rect x="11" y="15" width="10" height="6" fill="#d8433a"/><rect x="22" y="9" width="2" height="10" fill="#e6ebf3"/><rect x="3" y="17" width="7" height="5" fill="#5cd65c"/></svg>'));
  if (!S.rpg) S.rpg = {};
  // 多角色：S.rpg[uid] 是目前使用中的角色；其他欄位的角色放在 S.rpgAlt[uid].slots（使用中的那格是 null）
  if (!S.rpgAlt) S.rpgAlt = {};
  const MAXSLOT = D.MAXSLOT || 6;
  const alt = uid => { const a = (S.rpgAlt[uid] ||= { slots: [], act: 0 }); while (a.slots.length < MAXSLOT) a.slots.push(null); return a; };
  const slotList = uid => { const a = alt(uid); return a.slots.map((c, i) => { const x = i === a.act ? S.rpg[uid] : c; return x ? { cls: x.cls, lv: x.lv, job: x.job, jobName: D.CL[x.cls].jobs[x.job], map: D.MAPS[x.map || 0].name } : null; }); };

  const ns = io.of('/rpg');
  const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const G = .34;

  // ---------------- 世界（每張地圖一個） ----------------
  const mkWorld = (mi, spawns, room) => ({ mi, room: room || 'm' + mi, mons: spawns.map((sp, i) => mkMon(sp, i, mi)), drops: new Map(), players: new Map(), dseq: 1 });
  const worlds = D.MAPS.map((m, mi) => mkWorld(mi, m.spawns));
  const trials = new Map();                       // 轉職試煉：每位玩家一個獨立世界
  const allWorlds = () => [...worlds, ...trials.values()];
  const ctl = new Map();                          // uid → 這位玩家連線的控制（伺服器移動玩家用）
  const duels = new Map(); let duelSeq = 1;
  const isPvp = w => !!(w && D.MAPS[w.mi].pvp);
  function mkMon(sp, i, mi) {
    const m = D.MON[sp.t], seg = D.MAPS[mi].seg[sp.s], a = sp.a ?? seg.x1 + 10, b = sp.b ?? seg.x2 - 10;
    return { mi, i, t: sp.t, sp, x: rnd(a, b), seg: sp.s, a, b, vx: 0, f: Math.random() < .5 ? -1 : 1, hp: m.hp, max: m.hp, dead: 0, hurt: 0, aggro: 0, target: null, think: ri(30, 120), hop: 0, vy: 0, w: m.w, kx: 0, frozen: 0, stomp: ri(120, 200), dmgBy: {}, warn: 0, dash: 0, leap: 0, rage: 0, pend: null, root: 0, vuln: 0 };
  }
  const char = uid => D.fix(S.rpg[uid]);
  const nameOf = uid => S.users[uid]?.name || '玩家';
  function me(uid) { const c = char(uid); return c ? { ...c, max: D.stats(c) } : null; }
  const pushMe = uid => ns.to('u:' + uid).emit('me', me(uid));

  // ---------------- 模擬 ----------------
  const TICK = 1000 / 30;
  setInterval(() => {
    for (const w of allWorlds()) {
      if (!w.players.size) continue;
      for (const m of w.mons) stepMon(w, m);
      for (const [id, d] of w.drops) if (Date.now() > d.until) { w.drops.delete(id); ns.to(w.room).emit('dgone', { id }); }
    }
  }, TICK);
  function stepMon(w, m) {
    const d = D.MON[m.t];
    if (m.dead) { if (d.trial) return; m.dead--; if (m.dead <= 0) { Object.assign(m, mkMon(m.sp, m.i, m.mi)); ns.to(w.room).emit('respawn', { i: m.i }); } return; }
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
      if (m.hop < 0 || m.vy) { for (let k = 0; k < 2; k++) { m.vy += G * .8; m.hop += m.vy; } if (m.hop >= 0) { m.hop = 0; m.vy = 0; if (m.stomping) { m.stomping = 0; ns.to(w.room).emit('stomp', { i: m.i, x: m.x, atk: Math.round(d.atk * 1.2) }); } } }
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
      if (!m.regen) { m.regen = 1; ns.to(w.room).emit('sys', { t: `${d.name} 碰不到任何人，開始快速回血！快下來跟它正面對決！` }); }
      m.hp = Math.min(m.max, m.hp + m.max * .03 / 30);
    }
    const rage = !d.trial && m.hp < m.max * .3;
    if (rage && !m.rage) { m.rage = 1; ns.to(w.room).emit('sys', { t: `${d.name} 暴怒了！招式變得更快更兇！` }); }
    if (m.warn > 0) { m.vx = 0; if ((m.warn -= 1) <= 0) { if (m.pend === 'charge') m.dash = 12; else if (m.pend === 'leap') { m.leap = 12; m.vy = -4.2; m.hop = -.01; m.pend = null; } } return; }
    if (m.leap > 0) { m.leap--; m.x += (m.ltx - m.x) / Math.max(1, m.leap); m.vx = 0; return; }
    if (m.dash > 0) {
      m.dash--; const seg = D.MAPS[m.mi].seg[m.seg], lo = Math.max(seg.x1 + m.w / 2, m.a), hi = Math.min(seg.x2 - m.w / 2, m.b);
      m.x = clamp(m.x + m.f * 7, lo, hi); m.vx = 0; return;
    }
    if (!m.aggro || m.frozen || m.hop < 0 || (m.stomp -= rage ? 3 : 2) > 0) return;
    m.stomp = ri(120, 190);
    const k = d.sk[ri(0, d.sk.length - 1)], atk = Math.round(d.atk * (rage ? 1.2 : 1)), seg = D.MAPS[m.mi].seg[m.seg];
    const tp = m.target && w.players.get(m.target);
    if (tp && !tp.dead) m.f = tp.x < m.x ? -1 : 1;
    const ev = { i: m.i, k, n: (d.skn && d.skn[k]) || '', x: Math.round(m.x), y: seg.y, f: m.f, atk, rage: rage ? 1 : 0 };
    if (k === 'slam') { m.vy = -4.5; m.hop = -.01; m.stomping = 1; return; }
    // 每隻 Boss 的 3 招都是牠獨有的；預警時間明顯、範圍收斂，看到提示就來得及躲
    const near = [...w.players.values()].filter(p => !p.dead && Math.abs(p.x - m.x) < 320);
    const lo = Math.max(seg.x1 + m.w / 2, m.a), hi = Math.min(seg.x2 - m.w / 2, m.b);
    if (k === 'rain') {          // 隕石雨：每位玩家附近一顆＋Boss 周圍兩顆
      const xs = []; for (const p of near) xs.push(Math.round(clamp(p.x + rnd(-30, 30), 10, D.WW - 10)));
      for (let j = 0; j < (rage ? 3 : 2); j++) xs.push(Math.round(clamp(m.x + rnd(-150, 150), 10, D.WW - 10)));
      ev.xs = xs; ev.warn = 1200; m.warn = 24;
    } else if (k === 'breath') { ev.warn = 1000; ev.len = 150; m.warn = 45; }
    else if (k === 'quake') { ev.warn = 900; ev.r = 180; m.warn = 34; }
    else if (k === 'charge') { ev.warn = 900; m.warn = 27; m.pend = 'charge'; }
    else if (k === 'roll') { ev.warn = 800; ev.dist = 240; m.warn = 24; }
    else if (k === 'pillars') { const off = rnd(0, 80), xs = []; for (let x = m.x - 240 + off; x < m.x + 240; x += 80) xs.push(Math.round(clamp(x, 10, D.WW - 10))); ev.xs = xs; ev.warn = 1300; m.warn = 30; }
    else if (k === 'pull') { ev.warn = 800; ev.dur = 1600; ev.r = 200; m.warn = 72; }
    else if (k === 'homing') { ev.tg = near.slice(0, rage ? 3 : 2).map(p => p.uid); ev.warn = 600; m.warn = 18; }
    else if (k === 'safe') { const n = rage ? 1 : 2, xs = []; for (let j = 0; j < n; j++) xs.push(Math.round(clamp(m.x + rnd(-170, 170), 40, D.WW - 40))); ev.xs = xs; ev.w = 80; ev.r = 260; ev.warn = 1800; m.warn = 60; }
    else if (k === 'bounce') {   // 蘑菇跳壓：跳到目標玩家所在位置
      const tg = (tp && !tp.dead ? tp : near[0]) || { x: m.x }; ev.tx = Math.round(clamp(tg.x, lo, hi)); ev.warn = 1000; m.warn = 30; m.pend = 'leap'; m.ltx = ev.tx;
    } else if (k === 'frostbreath') { ev.warn = 900; ev.len = 140; m.warn = 46; }
    else if (k === 'icering') { ev.warn = 900; ev.r = 75; m.warn = 40; }
    else if (k === 'firefloor') { ev.warn = 900; ev.len = 230; m.warn = 64; }
    else if (k === 'tail') { ev.warn = 650; ev.len = 95; m.warn = 28; }
    else if (k === 'laser') { ev.warn = 1000; ev.r = 240; m.warn = 46; }
    else if (k === 'orbit') { ev.warn = 700; ev.n = rage ? 4 : 3; ev.r = 85; ev.dur = 3200; m.warn = 40; }
    else if (k === 'split') { ev.warn = 700; ev.dist = 260; m.warn = 50; }
    if (d.trial) { ev.warn = Math.round((ev.warn || 0) * 1.4); m.warn = Math.round((m.warn || 0) * 1.4); ev.atk = Math.round(ev.atk * .75); ev.rage = 0; }
    if (k !== 'charge' && k !== 'bounce') m.pend = null;
    ns.to(w.room).emit('bskill', ev);
  }
  // 10Hz 廣播
  setInterval(() => {
    for (const w of allWorlds()) {
      if (!w.players.size) continue;
      const m = w.mons.map(m => [m.i, Math.round(m.x * 10) / 10, Math.round(m.hop), m.f, Math.max(0, Math.round(m.hp)), m.dead ? 1 : 0, m.frozen > 0 ? 1 : 0, m.hurt > 8 ? 1 : 0]);
      const p = [...w.players.values()].map(pl => playerPub(pl));
      ns.to(w.room).emit('st', { m, p });
    }
  }, 100);
  function playerPub(pl) { const c = char(pl.uid) || {}; return [pl.uid, nameOf(pl.uid), c.cls, c.job || 0, c.wep || 0, c.lv || 1, Math.round(pl.x), Math.round(pl.y), pl.f, pl.act || 0, pl.rope ? 1 : 0, pl.dead ? 1 : 0, pl.hpPct ?? 100, pl.clone ? 1 : 0, c.pet || '', pl.mount || 0]; }

  // ---------------- 擊殺與經驗 ----------------
  function kill(w, m, killer) {
    const d = D.MON[m.t];
    if (d.trial) {   // 轉職試煉：打倒試煉官就轉職
      m.dead = 1; m.hp = 0; ns.to(w.room).emit('kill', { i: m.i });
      for (const uid of w.players.keys()) { const c = char(uid); if (!c || c.job !== d.trial - 1) continue;
        c.job = d.trial; c.gold += d.gold[0]; save(); pushMe(uid);
        ns.to('u:' + uid).emit('trialDone', { job: c.job, name: D.CL[c.cls].jobs[c.job], gold: d.gold[0] });
        ns.to('m0').emit('sys', { t: `🎉 ${nameOf(uid)} 通過轉職試煉，成為「${D.CL[c.cls].jobs[c.job]}」！` });
        setTimeout(() => { const k = ctl.get(uid); if (k && k.inTrial()) k.goRet(); }, 4500); }
      return;
    }
    m.dead = d.boss ? 30 * 90 : 30 * 7; m.hp = 0;
    ns.to(w.room).emit('kill', { i: m.i });
    const y = D.MAPS[m.mi].seg[m.seg].y, now = Date.now(), news = [];
    const add = (t, v, dx) => { const id = w.dseq++; const dr = { id, t, v, x: clamp(m.x + dx, 10, D.WW - 10), y, until: now + 25000, fy: y - m.w * .5 }; w.drops.set(id, dr); news.push(dr); };
    add('gold', ri(...d.gold), 0);
    if (Math.random() < (d.boss ? 1 : .12)) add(Math.random() < .6 ? 'pot' : 'eth', 1, 8);
    if (d.boss) for (let k = 0; k < 4; k++) add('gold', Math.round(ri(...d.gold) / 6), rnd(-30, 30));
    for (const [id, mt] of Object.entries(D.MOUNTS)) if (mt.drop === m.t && Math.random() < mt.rate) { add('mnt:' + id, 1, 14); ns.to(w.room).emit('sys', { t: `🐎 ${d.name} 掉落了坐騎「${mt.n}」！` }); }
    if (d.leg && Math.random() < d.leg) { add('leg', 1, -10); ns.to(w.room).emit('sys', { t: `✦ ${d.name} 掉落了傳說武器！快去撿！` }); }
    ns.to(w.room).emit('drop', news);
    // 經驗：所有有出手、仍在這張地圖的玩家都分得到，一起打比較划算
    const total = Object.values(m.dmgBy).reduce((a, b) => a + b, 0) || 1;
    for (const [uid, dmg] of Object.entries(m.dmgBy)) {
      const c = char(uid); if (!c || !w.players.has(uid)) continue;
      const share = Math.min(1, dmg / total + .3), ld = d.lv - c.lv, ef = ld < -10 ? .3 : ld < -5 ? .65 : 1;
      // 低等玩家跟打高等怪：照樣有經驗，但單次最多約 1.5 級，避免一隻王直接衝十幾級
      let e = Math.max(1, Math.round(d.exp * ef * share)); if (ld > 12) e = Math.min(e, Math.round(D.needExp(c.lv) * 1.5));
      const lv0 = c.lv, up = D.addExp(c, e);
      ns.to('u:' + uid).emit('gain', { exp: e, lv: c.lv, up, newJob: up && D.JOBLV.some(j => j > lv0 && j <= c.lv) });
      if (up) ns.to(w.room).emit('lvup', { id: uid });
      pushMe(uid);
    }
    if (d.boss) ns.to(w.room).emit('sys', { t: `${D.MON[m.t].name} 被打倒了！最後一擊：${nameOf(killer)}` });
    m.dmgBy = {}; save();
  }

  // ---------------- 連線 ----------------
  ns.use((socket, next) => {
    const uid = S.sessions[socket.handshake.auth?.token];
    if (!uid || !S.users[uid]) return next(new Error('auth'));
    socket.data.uid = uid; next();
  });
  // ---------------- PVP：決鬥與競技場（血量與傷害都由伺服器判定） ----------------
  const pvpRec = c => (c.pvp ||= { pts: 0, k: 0, d: 0, w: 0, l: 0 });
  function pvpDamage(ac, tc, tpl, h, now) {
    const st = D.stats(ac), ts = D.stats(tc);
    const mult = clamp(+h.mult || 1, .1, 3.2), crit = Math.random() * 100 < st.crit + clamp(+h.cb || 0, 0, 40);
    let raw = st.atk * mult * rnd(.9, 1.1) * (crit ? st.critD || 1.7 : 1) * (h.sk ? 1 + (st.skillB || 0) : 1);
    let dmg = raw * .32 - ts.def * .5;
    const diff = ac.lv - tc.lv; dmg *= diff > 0 ? Math.max(.35, 1 - diff * .03) : Math.min(1.6, 1 - diff * .02);   // 等級差距修正
    dmg *= (D.CL[tc.cls].dr || 1) * (tpl.mount ? 1 - ((D.MOUNTS[tpl.mount] || {}).dr || .25) : 1);
    if (now < (tpl.guardT || 0)) dmg *= .7; if (now < (tpl.shieldT || 0)) dmg *= .6; if (now < (tpl.wingT || 0)) dmg *= .5;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }
  function duelEnd(id, winner, why) {
    const du = duels.get(id); if (!du) return; duels.delete(id);
    const loser = winner === du.a ? du.b : du.a;
    for (const u of [du.a, du.b]) { const c = char(u); if (c) { const r = pvpRec(c); if (u === winner) r.w++; else if (winner) r.l++; } const k = ctl.get(u); if (k) k.pl.duel = null; }
    save();
    const msg = winner ? `${nameOf(winner)} 贏得了決鬥！${why ? '（' + why + '）' : ''}` : `決鬥平手${why ? '（' + why + '）' : ''}`;
    for (const u of [du.a, du.b]) ns.to('u:' + u).emit('duelEnd', { win: winner === u, draw: !winner, msg });
    setTimeout(() => { for (const u of [du.a, du.b]) { const k = ctl.get(u); if (k && k.wmi() === 6) k.goRet(); } }, 3500);
  }
  setInterval(() => {
    const now = Date.now();
    for (const [id, du] of duels) {
      if (!du.go && now >= du.start) { du.go = 1; for (const u of [du.a, du.b]) ns.to('u:' + u).emit('duelGo', {}); }
      if (now > du.end) {   // 時間到：剩餘血量比例高的人贏
        const ka = ctl.get(du.a), kb = ctl.get(du.b), pa = ka ? ka.pl.php / ka.pl.pmax : 0, pb = kb ? kb.pl.php / kb.pl.pmax : 0;
        duelEnd(id, pa > pb + .001 ? du.a : pb > pa + .001 ? du.b : null, '時間到，比剩餘血量');
      }
    }
  }, 300);
  const pvpTop = () => [...Object.entries(S.rpg), ...Object.entries(S.rpgAlt).flatMap(([uid, a]) => a.slots.filter(Boolean).map(c => [uid, c]))]
    .filter(([, c]) => c.pvp && (c.pvp.pts || c.pvp.w)).map(([uid, c]) => ({ name: nameOf(uid), cls: D.CL[c.cls]?.jobs[c.job] || '', lv: c.lv, ...c.pvp }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w).slice(0, 10);

  ns.on('connection', socket => {
    const uid = socket.data.uid;
    socket.join('u:' + uid);
    let w = null; let rate = { t: 0, n: 0 }, chatT = 0;
    const pl = { uid, x: 0, y: D.GY, f: 1, act: 0, rope: 0, dead: 0, hpPct: 100, clone: 0 };
    const online = () => allWorlds().reduce((a, w2) => a + w2.players.size, 0);

    function enter(mi, x, world) {
      if (w) { w.players.delete(uid); socket.leave(w.room); ns.to(w.room).emit('pleave', { id: uid }); if (trials.get(uid) === w && world !== w) trials.delete(uid); }
      w = world || worlds[mi]; pl.x = x ?? D.MAPS[mi].start; pl.y = D.GY; pl.dead = 0;
      // 同一個帳號只留一個連線在世界裡
      for (const w2 of allWorlds()) w2.players.delete(uid);
      w.players.set(uid, pl); socket.join(w.room);
      if (isPvp(w)) { const st = D.stats(char(uid)); pl.pmax = st.hp; pl.php = st.hp; pl.prot = Date.now() + 2500; pl.hpPct = 100; }
      else { pl.php = null; }
      socket.emit('init', {
        map: mi, x: pl.x,
        mons: w.mons.map(m => ({ i: m.i, x: m.x, hop: m.hop, f: m.f, hp: m.hp, max: m.max, dead: m.dead ? 1 : 0, sp: m.sp })),
        pvp: D.MAPS[mi].pvp || null, php: pl.php, pmax: pl.pmax,
        drops: [...w.drops.values()], players: [...w.players.values()].filter(p => p.uid !== uid).map(playerPub), online: online(),
      });
      ns.to(w.room).emit('sys', { t: `${nameOf(uid)} 來到了${D.MAPS[mi].name}`, quiet: 1 });
    }
    // 離開特殊地圖（競技場／決鬥場／試煉）時回到原本的位置
    let ret = null;
    const goRet = () => { const r = ret || { mi: 0, x: D.MAPS[0].start }; ret = null; enter(r.mi, r.x); };
    const saveRet = () => { if (!ret && w && !isPvp(w) && !D.MAPS[w.mi].trial) ret = { mi: w.mi, x: Math.round(pl.x) }; };
    ctl.set(uid, { pl, goRet, wmi: () => w ? w.mi : -1, inTrial: () => !!(w && trials.get(uid) === w), enter: (mi, x) => { saveRet(); enter(mi, x); } });
    function pvpHp(v) { pl.php = clamp(Math.round(v), 0, pl.pmax); pl.hpPct = Math.round(pl.php / pl.pmax * 100); socket.emit('php', { hp: pl.php, max: pl.pmax }); }

    socket.emit('hello', { me: me(uid), name: nameOf(uid), id: uid, list: slotList(uid), act: alt(uid).act });
    function leaveWorld() { if (pl.duel) { const du = duels.get(pl.duel); if (du) duelEnd(pl.duel, du.a === uid ? du.b : du.a, '對手離開'); } if (w) { w.players.delete(uid); ns.to(w.room).emit('pleave', { id: uid }); socket.leave(w.room); if (trials.get(uid) === w) trials.delete(uid); w = null; } ret = null; }
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
    socket.on('enter', (_, ack) => { const c = char(uid); if (!c) return ack && ack({ ok: false }); if (D.MAPS[c.map || 0]?.pvp || D.MAPS[c.map || 0]?.trial) c.map = 0; enter(c.map || 0); ack && ack({ ok: true });
      if (c.apComp) { delete c.apComp; save(); socket.emit('notice', { t: `能力值系統改版補償：獲得 ${D.APRESET.toLocaleString()} 金幣，可以到「能力」重新配點！` }); } });
    socket.on('pos', (p = {}) => {
      if (!w) return;
      pl.x = clamp(+p.x || 0, 0, D.WW); pl.y = clamp(+p.y || 0, -100, D.WH + 60); pl.f = p.f < 0 ? -1 : 1; pl.act = p.act ? 1 : 0; pl.rope = p.rope ? 1 : 0; pl.dead = p.dead ? 1 : 0;
      if (isPvp(w)) { pl.dead = pl.php <= 0 ? 1 : 0; } else pl.hpPct = clamp(Math.round(+p.hp || 0), 0, 100);
      pl.clone = p.clone ? 1 : 0; pl.mount = p.mount && (char(uid)?.lv || 0) >= D.MOUNTLV ? (char(uid).mnt || 'horse') : 0;
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
      if (out.length) ns.to(w.room).emit('hits', { by: uid, h: out });
      // 朱雀：攻擊吸血 5%，每秒最多回復 12% 最大 HP
      if (c.pet === 'zhuque' && dealt > 0) {
        if (now - (pl.lsT || 0) > 1000) { pl.lsT = now; pl.ls = 0; }
        const cap = Math.round(st.hp * .12), heal = Math.min(Math.round(dealt * .05), cap - (pl.ls || 0));
        if (heal > 0) { pl.ls = (pl.ls || 0) + heal; socket.emit('heal', { hp: heal }); }
      }
    });
    socket.on('cast', (p = {}) => { if (!w || !char(uid)) return; if (!D.SK[char(uid).cls][p.k] && p.k !== 'dj') return;
      { const sk = D.SK[char(uid).cls][p.k], now = Date.now(); if (sk && sk.g && sk.g.buff === 'guard') pl.guardT = now + 15000; if (char(uid).cls === 'mech' && p.k === 's5') pl.shieldT = now + 10000; } socket.to(w.room).emit('cast', { id: uid, k: p.k, x: +p.x || 0, y: +p.y || 0, f: p.f < 0 ? -1 : 1 }); });
    // 天使的輔助技能：轉送給附近的隊友（含自己），由各自的瀏覽器套用效果
    socket.on('aid', ({ k } = {}, ack) => {
      const c = char(uid); if (!w || !c || c.cls !== 'angel' || !['s1', 's3', 's4', 's6'].includes(k) || D.skillLock(c, k)) return;
      const now = Date.now(); if (now - (pl.aidT || 0) < 600) return; pl.aidT = now;
      const hb = D.stats(c).healB || 0, pv = isPvp(w), du = pl.duel && duels.get(pl.duel);
      for (const o of w.players.values()) {
        if (!(Math.abs(o.x - pl.x) < 300 && Math.abs(o.y - pl.y) < 160)) continue;
        if (pv && o.uid !== uid) continue;   // PVP 裡天使的輔助只對自己有效
        ns.to('u:' + o.uid).emit('aid', { k, by: uid, name: nameOf(uid), hb });
        if (pv && o.php > 0) { const k2 = ctl.get(o.uid); if (k === 's1' || k === 's6') { o.php = Math.min(o.pmax, o.php + o.pmax * (k === 's1' ? .2 : .5) * (1 + hb)); } if (k === 's4') o.wingT = Date.now() + 6000; ns.to('u:' + o.uid).emit('php', { hp: Math.round(o.php), max: o.pmax }); o.hpPct = Math.round(o.php / o.pmax * 100); }
      }
    });
    socket.on('pick', ({ id } = {}, ack) => {
      const c = char(uid); if (!w || !c) return;
      const d = w.drops.get(id); if (!d) return ack && ack({ ok: false });
      if (Math.abs(d.x - pl.x) > 60 || Math.abs(d.y - pl.y) > 60) return ack && ack({ ok: false });
      w.drops.delete(id);
      let leg = null;
      if (d.t === 'gold') c.gold += d.v;
      else if (d.t.startsWith('mnt:')) {
        const id = d.t.slice(4), mt = D.MOUNTS[id];
        if (!mt || c.mounts.includes(id)) { c.gold += 30000; leg = { mntDup: mt ? mt.n : '' }; }
        else { c.mounts.push(id); leg = { mnt: id }; ns.to(w.room).emit('sys', { t: `🐎 ${nameOf(uid)} 獲得了坐騎「${mt.n}」！` }); }
      }
      else if (d.t === 'leg') {
        if (c.wep === D.LEGI) { c.gold += D.LEGGOLD; leg = { dup: 1 }; }
        else { c.wep = D.LEGI; leg = { name: D.WEAPONS[c.cls][D.LEGI][0] }; ns.to(w.room).emit('sys', { t: `✦ ${nameOf(uid)} 獲得了傳說武器「${leg.name}」！` }); }
      } else c[d.t] = (c[d.t] || 0) + 1;
      ns.to(w.room).emit('dgone', { id, by: uid }); save(); pushMe(uid); ack && ack({ ok: true, t: d.t, v: d.v, leg });
    });
    socket.on('use', ({ k } = {}, ack) => {
      const c = char(uid); if (!c || !['pot', 'eth'].includes(k) || !(c[k] > 0)) return ack && ack({ ok: false });
      c[k]--; save(); ack && ack({ ok: true, me: me(uid) });
      if (k === 'pot' && isPvp(w) && pl.php > 0) { const st = D.stats(c); pvpHp(pl.php + (st.hp * .35 + 40) * (1 + (st.potB || 0))); }
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
      } else if (k === 'mount') {
        const mt = D.MOUNTS[i]; if (!w || w.mi !== 0) return no('要在晨露村才能購買');
        if (!mt || !mt.price) return no('這個坐騎買不到，只能打 Boss 取得'); if (c.mounts.includes(i)) return no('已經擁有了');
        if (c.lv < mt.lv) return no(`需要 Lv ${mt.lv}`); if (c.gold < mt.price) return no('金幣不足');
        c.gold -= mt.price; c.mounts.push(i); c.mnt = i;
      } else return no('無法購買');
      save(); ack && ack({ ok: true, me: me(uid), rest: k === 'rest' });
    });
    socket.on('setMount', ({ id } = {}, ack) => {
      const c = char(uid); if (!c || !D.MOUNTS[id] || !c.mounts.includes(id)) return ack && ack({ ok: false, msg: '還沒有這個坐騎' });
      if (c.lv < D.MOUNTS[id].lv) return ack && ack({ ok: false, msg: `需要 Lv ${D.MOUNTS[id].lv}` });
      c.mnt = id; save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('pet', ({ p } = {}, ack) => {
      const c = char(uid); if (!c || !D.PETS[p]) return ack && ack({ ok: false });
      if (c.lv < D.PETLV) return ack && ack({ ok: false, msg: `Lv ${D.PETLV} 才能擁有寵物` });
      if (c.pet === p) return ack && ack({ ok: false, msg: '已經是這隻寵物了' });
      if (c.pet) { if (c.gold < D.PETSWAP) return ack && ack({ ok: false, msg: `更換寵物需要 ${D.PETSWAP} 金幣` }); c.gold -= D.PETSWAP; }
      c.pet = p; save(); ack && ack({ ok: true, me: me(uid) });
      if (w) ns.to(w.room).emit('sys', { t: `${nameOf(uid)} 的寵物「${D.PETS[p].n}」現身了！` });
    });
    socket.on('slots', ({ slots } = {}, ack) => {
      const c = char(uid); if (!c || !Array.isArray(slots) || slots.length !== D.SLOTN) return ack && ack({ ok: false });
      const sk = D.SK[c.cls], seen = new Set();
      for (const k of slots) { if (k === '') continue; if (k === 'atk' || !sk[k] || seen.has(k)) return ack && ack({ ok: false, msg: '技能配置有誤' }); seen.add(k); }
      c.slots = slots.map(String); save(); ack && ack({ ok: true, me: me(uid) });
    });
    // ---- 轉職試煉 ----
    socket.on('trial', (_, ack) => {
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      const next = c.job + 1; if (next > 4) return ack && ack({ ok: false, msg: '已經完成所有轉職' });
      if (c.lv < D.JOBLV[next]) return ack && ack({ ok: false, msg: `需要 Lv ${D.JOBLV[next]}` });
      if (!w || w.mi !== 0) return ack && ack({ ok: false, msg: '要在晨露村找轉職教官' });
      const tw = mkWorld(8, [{ t: 'trial' + next, s: 0, a: 1000, b: 1600 }], 'trial:' + uid); trials.set(uid, tw);
      ret = { mi: 0, x: 120 }; ack && ack({ ok: true }); enter(8, 300, tw);
      socket.emit('notice', { t: `轉職試煉開始！打倒「${D.MON['trial' + next].name}」就能轉職成「${D.CL[c.cls].jobs[next]}」` });
    });
    // ---- PVP ----
    socket.on('pvpInfo', (_, ack) => {
      const c = char(uid); if (!c || !w) return ack && ack({ ok: false });
      const list = [...w.players.values()].filter(o => o.uid !== uid).map(o => { const oc = char(o.uid) || {}; return { uid: o.uid, name: nameOf(o.uid), lv: oc.lv, job: D.CL[oc.cls]?.jobs[oc.job] || '', busy: !!o.duel }; });
      ack && ack({ ok: true, rec: pvpRec(c), top: pvpTop(), list, arena: worlds[7].players.size, map: w.mi, duel: !!pl.duel });
    });
    socket.on('arena', ({ go } = {}, ack) => {
      const c = char(uid); if (!c || !w) return ack && ack({ ok: false });
      if (go) { if (c.lv < 10) return ack && ack({ ok: false, msg: 'Lv 10 才能進入競技場' }); if (pl.duel || isPvp(w) || D.MAPS[w.mi].trial) return ack && ack({ ok: false, msg: '現在不能進入競技場' });
        saveRet(); ack && ack({ ok: true }); const m = D.MAPS[7]; enter(7, Math.round(rnd(m.lo, m.hi))); }
      else { if (!w || w.mi !== 7) return ack && ack({ ok: false }); ack && ack({ ok: true }); goRet(); }
    });
    socket.on('duelInv', ({ to } = {}, ack) => {
      const c = char(uid), o = w && w.players.get(to); if (!c || !o || to === uid) return ack && ack({ ok: false, msg: '對方不在這張地圖' });
      if (isPvp(w) || D.MAPS[w.mi].trial) return ack && ack({ ok: false, msg: '這裡不能邀請決鬥' });
      if (pl.duel || o.duel) return ack && ack({ ok: false, msg: '有人正在決鬥中' });
      o.inv = { from: uid, at: Date.now() }; ns.to('u:' + to).emit('duelReq', { from: uid, name: nameOf(uid), lv: c.lv, job: D.CL[c.cls].jobs[c.job] });
      ack && ack({ ok: true });
    });
    socket.on('duelAns', ({ from, ok } = {}, ack) => {
      const inv = pl.inv; pl.inv = null; if (!inv || inv.from !== from || Date.now() - inv.at > 20000) return ack && ack({ ok: false, msg: '邀請已經過期' });
      const k = ctl.get(from), o = w && w.players.get(from);
      if (!ok) { ns.to('u:' + from).emit('notice', { t: `${nameOf(uid)} 拒絕了你的決鬥邀請` }); return ack && ack({ ok: true }); }
      if (!k || !o || o.duel || pl.duel) return ack && ack({ ok: false, msg: '對方已經離開或正在決鬥' });
      const id = duelSeq++, now = Date.now(); duels.set(id, { a: from, b: uid, start: now + 3500, end: now + 3500 + 180000 });
      pl.duel = id; o.duel = id; k.enter(6, 1000); saveRet(); enter(6, 1200);
      for (const [u, op] of [[from, uid], [uid, from]]) ns.to('u:' + u).emit('duelStart', { opp: op, oppName: nameOf(op), start: now + 3500, end: now + 3500 + 180000 });
      ack && ack({ ok: true });
    });
    socket.on('duelQuit', () => { if (pl.duel) { const du = duels.get(pl.duel); if (du) duelEnd(pl.duel, du.a === uid ? du.b : du.a, '對手投降'); } });
    socket.on('pheal', ({ k } = {}) => {   // PVP 裡的自我治療技能
      const c = char(uid); if (!c || !isPvp(w) || !(pl.php > 0)) return; const sk = D.SK[c.cls][k]; if (!sk || !sk.g || sk.g.type !== 'heal' || D.skillLock(c, k)) return;
      const now = Date.now(); pl.hcd ||= {}; if (now - (pl.hcd[k] || 0) < sk.cd * 1000 / 60 * .7) return; pl.hcd[k] = now;
      pvpHp(pl.php + pl.pmax * sk.g.pct * (1 + (D.stats(c).healB || 0)));
    });
    socket.on('phit', (list) => {
      const c = char(uid); if (!w || !c || !Array.isArray(list) || !isPvp(w) || !(pl.php > 0) || pl.mount) return;
      const now = Date.now(); if (now - rate.t > 1000) { rate = { t: now, n: 0 }; }
      const du = pl.duel && duels.get(pl.duel), arena = D.MAPS[w.mi].pvp === 'arena';
      if (!arena && !(du && now >= du.start)) return;
      for (const h of list.slice(0, 20)) {
        if (++rate.n > 40) break;
        const tu = String(h.u), o = w.players.get(tu), tc = char(tu); if (!o || !tc || tu === uid || !(o.php > 0)) continue;
        if (du && tu !== (du.a === uid ? du.b : du.a)) continue;
        if (now < (o.prot || 0) || Math.abs(o.x - pl.x) > 360) continue;
        const { dmg, crit } = pvpDamage(c, tc, o, h, now);
        o.php = Math.max(0, o.php - dmg); o.hpPct = Math.round(o.php / o.pmax * 100);
        ns.to(w.room).emit('phurt', { u: tu, by: uid, dmg, crit: crit ? 1 : 0, s: h.s | 0 });
        ns.to('u:' + tu).emit('php', { hp: o.php, max: o.pmax, by: nameOf(uid) });
        if (c.pet === 'zhuque') pvpHp(pl.php + Math.min(dmg * .05, pl.pmax * .04));
        if (h.heal) pvpHp(pl.php + pl.pmax * Math.min(.04, +h.heal || 0));
        if (o.php <= 0) {   // 打倒
          o.dead = 1; ns.to('u:' + tu).emit('pdie', { by: nameOf(uid) });
          if (du) duelEnd(pl.duel, uid, '');
          else if (arena) { const r1 = pvpRec(c), r2 = pvpRec(tc), pts = tc.lv >= c.lv - 15 ? 10 : 2; r1.pts += pts; r1.k++; r2.d++; r2.pts = Math.max(0, r2.pts - 3); save();
            socket.emit('notice', { t: `打倒了 ${nameOf(tu)}！競技場積分 +${pts}（目前 ${r1.pts}）` }); ns.to(w.room).emit('sys', { t: `⚔ ${nameOf(uid)} 打倒了 ${nameOf(tu)}`, quiet: 1 }); }
          break;
        }
      }
    });
    socket.on('advance', (_, ack) => { return ack && ack({ ok: false, msg: '轉職要先通過轉職試煉喔' });
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      const next = c.job + 1; if (next > 4) return ack && ack({ ok: false, msg: '已經完成所有轉職' });
      if (c.lv < D.JOBLV[next]) return ack && ack({ ok: false, msg: `需要 Lv ${D.JOBLV[next]}` });
      if (!w || w.mi !== 0) return ack && ack({ ok: false, msg: '要在晨露村找轉職教官' });
      c.job = next; save(); ack && ack({ ok: true, me: me(uid) });
      ns.to(w.room).emit('sys', { t: `${nameOf(uid)} 轉職成為「${D.CL[c.cls].jobs[next]}」！` });
    });
    socket.on('portal', ({ to } = {}, ack) => {
      const c = char(uid); if (!c || !w) return ack && ack({ ok: false });
      const pt = D.MAPS[w.mi].portals.find(p => p.to === to); if (!pt) return ack && ack({ ok: false });
      if (Math.abs(pl.x - pt.x) > 60) return ack && ack({ ok: false, msg: '離傳送門太遠' });
      if (pt.ret) { ack && ack({ ok: true }); goRet(); return; }
            c.map = to; save(); ack && ack({ ok: true }); enter(to, pt.tx);
    });
    socket.on('revive', (_, ack) => {
      const c = char(uid); if (!c) return;
      if (w && D.MAPS[w.mi].pvp === 'arena') { ack && ack({ ok: true }); const m = D.MAPS[7]; enter(7, Math.round(rnd(m.lo, m.hi))); return; }   // 競技場：場內復活
      if (w && (D.MAPS[w.mi].pvp || D.MAPS[w.mi].trial)) { ack && ack({ ok: true }); if (D.MAPS[w.mi].trial) socket.emit('notice', { t: '試煉失敗了，沒關係！回轉職教官那裡隨時可以再挑戰（不會扣經驗）' }); goRet(); return; }
      c.exp = Math.max(0, c.exp - Math.floor(D.needExp(c.lv) * .06)); c.map = 0; save(); pushMe(uid); ack && ack({ ok: true }); enter(0, D.MAPS[0].start);
    });
    socket.on('chat', ({ t } = {}) => {
      if (!w) return; const now = Date.now(); if (now - chatT < 800) return; chatT = now;
      t = String(t || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60); if (!t) return;
      ns.to(w.room).emit('chat', { id: uid, name: nameOf(uid), t });
    });
    socket.on('disconnect', () => {
      // 同帳號若還有其他分頁連著，就不移除
      setTimeout(() => {
        const still = (ns.adapter.rooms.get('u:' + uid)?.size || 0) > 0;
        if (w && !still) { w.players.delete(uid); ns.to(w.room).emit('pleave', { id: uid }); if (trials.get(uid) === w) trials.delete(uid); if (pl.duel) { const du = duels.get(pl.duel); if (du) duelEnd(pl.duel, du.a === uid ? du.b : du.a, '對手離線'); } ctl.delete(uid); }
      }, 300);
    });
  });

  // 給大廳顯示的線上人數與排行
  return {
    online: () => worlds.reduce((a, w) => a + w.players.size, 0),
    top: () => [...Object.entries(S.rpg), ...Object.entries(S.rpgAlt).flatMap(([uid, a]) => a.slots.filter(Boolean).map(c => [uid, c]))].map(([uid, c]) => ({ name: nameOf(uid), lv: c.lv, job: D.CL[c.cls]?.jobs[c.job] || '' })).sort((a, b) => b.lv - a.lv).slice(0, 10),
  };
};
