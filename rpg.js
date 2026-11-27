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
  const slotList = uid => { const a = alt(uid); return a.slots.map((c, i) => { const x = i === a.act ? S.rpg[uid] : c; return x ? { nm: x.nm || '', cls: x.cls, lv: x.lv, job: x.job, jobName: D.CL[x.cls].jobs[x.job], map: D.MAPS[x.map || 0].name } : null; }); };

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
  // GM 測試帳號：在 Render 的環境變數 RPG_GM 填入帳號暱稱（多個用逗號分開）
  // 也可以在專案裡放 gm.txt（一行一個暱稱），不用到 Render 設定環境變數
  const gmFile = (() => { try { return fs.readFileSync(path.join(dir, 'gm.txt'), 'utf8'); } catch (e) { return ''; } })();
  const GMS = new Set((String(process.env.RPG_GM || '') + '\n' + gmFile).split(/[,，\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean));
  const isGM = uid => GMS.size > 0 && GMS.has(String(S.users[uid]?.name || '').toLowerCase());
  // 角色名字：每個角色可以有自己的名字，沒取名就用帳號暱稱
  const charName = (uid, c) => ((c && c.nm) || S.users[uid]?.name || '玩家') + (c && c.gm ? '［GM］' : '');
  const nameOf = uid => charName(uid, S.rpg[uid]);
  const allChars = () => [...Object.entries(S.rpg), ...Object.entries(S.rpgAlt).flatMap(([u, a]) => a.slots.filter(Boolean).map(c => [u, c]))];
  const RENAME_GOLD = 50000;
  // 檢查名字：格式同帳號暱稱；不能和別人的帳號或任何其他角色撞名（自己帳號的暱稱可以用）
  function nameErr(uid, nm, self) {
    if (!/^[\p{L}\p{N}_\-]{2,16}$/u.test(nm)) return '名字需 2～16 個字，只能用文字、數字、底線或減號';
    const k = nm.toLowerCase();
    if (/gm/i.test(nm) && !isGM(uid)) return '名字不能包含 GM';
    if (Object.entries(S.users).some(([u, x]) => u !== uid && String(x.name).toLowerCase() === k)) return '這個名字已經有人用了';
    if (allChars().some(([, c]) => c !== self && c.nm && c.nm.toLowerCase() === k)) return '這個名字已經有人用了';
    return '';
  }
  function me(uid) { const c = char(uid); return c ? { ...c, max: D.stats(c), gmOk: isGM(uid) } : null; }
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
  // ---------------- 控制與持續傷害 ----------------
  // 一般怪：完整時間，硬控結束後 1 秒內不會再被硬控
  // Boss：時間 60%，同一位施放者要等「控制結束 + 5 秒」才能再控牠；不同玩家可以輪流接控
  const F60 = ms => Math.round(ms / 1000 * 60);   // 毫秒 → 60Hz 影格（怪物計時器的單位）
  function applyEf(w, m, uid, code, dmg, now) {
    const E = D.EF[code]; if (!E || m.dead || m.hp <= 0) return;
    const boss = D.MON[m.t].boss;
    if (E.dot) {   // 燒傷／中毒：不算控制，Boss 一樣全額；新的比較強就覆蓋，否則只延長時間
      const per = Math.max(1, Math.round(dmg * E.dot / (E.t / 1000))), cur = m[code];
      if (!cur || now > cur.until || per >= cur.per) m[code] = { per, until: now + E.t, by: uid, next: now + 1000 }; else cur.until = now + E.t;
      ns.to(w.room).emit('mef', { i: m.i, k: code }); return;
    }
    let t = E.t;
    if (boss) { m.ccImm ||= {}; if ((m.ccImm[uid] || 0) > now) return; t *= D.CC_RES; m.ccImm[uid] = now + t + D.CC_IMM; }
    else if (E.hard && now < (m.hardImm || 0)) return;
    if (E.hard) { m.frozen = F60(t); m.ccK = code; m.kx = 0; if (!boss) m.hardImm = now + t + 1000; }
    else if (code === 'rt') m.root = F60(t);
    else if (code === 'sl') m.slow = F60(t);
    ns.to(w.room).emit('mef', { i: m.i, k: code, boss: boss ? 1 : 0 });
  }
  function tickDot(w, m, now) {
    for (const code of ['bn', 'ps']) {
      const o = m[code]; if (!o) continue;
      if (now > o.until + 50 || m.dead || m.hp <= 0) { m[code] = null; continue; }
      if (now < o.next) continue; o.next += 1000;
      const dmg = Math.min(o.per, Math.ceil(m.hp)); m.hp -= dmg; m.dmgBy[o.by] = (m.dmgBy[o.by] || 0) + dmg; m.hurt = Math.max(m.hurt, 10);
      ns.to(w.room).emit('hits', { by: o.by, h: [[m.i, dmg, 0, 0, code]] });
      if (m.hp <= 0) { m[code] = null; kill(w, m, o.by); return; }
    }
  }
  // 狀態旗標（廣播給瀏覽器畫特效）：1 凍結 2 麻痺 4 暈眩 8 束縛 16 緩速 32 燒傷 64 中毒
  const monMask = (m, now) => (m.frozen > 0 ? ({ fz: 1, pz: 2, st: 4 }[m.ccK] || 1) : 0) | (m.root > 0 ? 8 : 0) | (m.slow > 0 ? 16 : 0) | (m.bn && now <= m.bn.until ? 32 : 0) | (m.ps && now <= m.ps.until ? 64 : 0);
  function stepMon(w, m) {
    const d = D.MON[m.t];
    if (m.dead) { if (d.trial || d.rival) return; m.dead--; if (m.dead <= 0) { Object.assign(m, mkMon(m.sp, m.i, m.mi)); ns.to(w.room).emit('respawn', { i: m.i }); } return; }
    // 30Hz 模擬，速度 ×2 對齊瀏覽器的 60Hz
    if (m.hurt > 0) m.hurt -= 2; if (m.aggro > 0) m.aggro -= 2;
    const seg = D.MAPS[m.mi].seg[m.seg];
    if (m.root > 0) m.root -= 2; if (m.slow > 0) m.slow -= 2;
    if (m.bn || m.ps) { tickDot(w, m, Date.now()); if (m.dead) return; }
    if (m.frozen > 0) { m.frozen -= 2; m.kx = 0; }
    else if (m.kx) { m.x += m.kx * 1.6; m.kx *= .64; if (Math.abs(m.kx) < .1) m.kx = 0; }
    else if (m.hurt < 6 && !(m.warn > 0) && !(m.dash > 0) && !(m.root > 0)) {
      const tp = m.aggro && m.target ? w.players.get(m.target) : null;
      if (tp && !tp.dead && Math.abs(tp.y - seg.y) < 60) { m.f = tp.x < m.x ? -1 : 1; m.vx = d.spd * 1.5 * m.f; }
      else if ((m.think -= 2) <= 0) { m.think = ri(60, 180); const r = Math.random(); m.vx = r < .3 ? 0 : d.spd * (Math.random() < .5 ? -1 : 1); if (m.vx) m.f = Math.sign(m.vx); }
      m.x += m.vx * 2 * (m.slow > 0 ? .5 : 1);
    }
    const lo = Math.max(seg.x1 + m.w / 2, m.a), hi = Math.min(seg.x2 - m.w / 2, m.b);
    m.x = clamp(m.x, lo, hi); if ((m.x <= lo + .1 || m.x >= hi - .1) && m.vx) { m.vx = -m.vx; m.f = Math.sign(m.vx); }
    if (!m.frozen) {
      if (m.hop < 0 || m.vy) { for (let k = 0; k < 2; k++) { m.vy += G * .8; m.hop += m.vy; } if (m.hop >= 0) { m.hop = 0; m.vy = 0; if (m.stomping) { m.stomping = 0; ns.to(w.room).emit('stomp', { i: m.i, x: m.x, atk: Math.round(d.atk * 1.2) }); } } }
      else if (/slime|shroom/.test(m.t) && Math.random() < .016) { m.vy = -2.6; m.hop = -.01; }
    }
    if (d.boss && !(m.frozen > 0)) bossAI(w, m, d);   // 被凍結／麻痺／暈眩時 Boss 不會出招
    else if (d.sp && !(m.frozen > 0)) mobAI(w, m, d);
  }
  // 小怪特殊攻擊：被打過（仇恨中）、目標在射程內而且站在同一層才出招；出招前原地蓄力，預警時間足夠閃開
  function mobAI(w, m, d) {
    if (m.warn > 0) { m.warn -= 2; m.vx = 0; return; }
    if (!m.aggro || m.hop < 0) return;
    if ((m.spT = (m.spT ?? ri(120, 240)) - 2) > 0) return;
    const sp = d.sp, sy = D.MAPS[m.mi].seg[m.seg].y, tp = m.target && w.players.get(m.target);
    const ty = tp ? (tp.rope || tp.gy == null ? tp.y : tp.gy) : 0;
    if (!tp || tp.dead || Math.abs(tp.x - m.x) > sp.r || Math.abs(ty - sy) > 20) { m.spT = 30; return; }
    m.spT = ri(260, 400); m.f = tp.x < m.x ? -1 : 1;
    const ev = { i: m.i, k: sp.k, n: sp.n, x: Math.round(m.x), y: sy, f: m.f, atk: Math.round(d.atk * .9), mob: 1, warn: 800 };
    if (sp.k === 'roll') ev.dist = sp.dist;
    else if (sp.k === 'breath') ev.len = sp.len;
    else if (sp.k === 'quake') { ev.r = sp.rad; ev.warn = 750; }
    else if (sp.k === 'icering') { ev.r = sp.rad; ev.warn = 850; }
    else if (sp.k === 'rain') { ev.xs = [Math.round(tp.x)]; if (sp.two) ev.xs.push(Math.round(clamp(tp.x + (Math.random() < .5 ? -36 : 36), 10, D.WW - 10))); ev.warn = 900; }
    else if (sp.k === 'homing') { ev.tg = [tp.uid]; ev.warn = 600; }
    m.warn = Math.round(ev.warn / 1000 * 60);
    ns.to(w.room).emit('bskill', ev);
  }
  // ---------------- Boss 招式 ----------------
  // 伺服器決定 Boss 何時放什麼招、打哪裡；每位玩家的瀏覽器依預警範圍自行判定是否被打中。
  // 玩家是否站在 Boss 的危險區裡：水平距離在範圍內，而且腳踩的是 Boss 那一層（跳起來也算，爬上高處平台不算）
  function inZone(p, m) {
    const sy = D.MAPS[m.mi].seg[m.seg].y, gy = p.rope || p.gy == null ? p.y : p.gy;
    return Math.abs(p.x - m.x) <= D.bossZone(m.t) && gy > sy - 50 && gy < sy + 20;
  }
  function bossAI(w, m, d) {
    // 打不到任何人時快速回血：沒有活著的玩家站在 Boss 這一層附近（例如全躲在高處平台上偷打）
    const sy = D.MAPS[m.mi].seg[m.seg].y;
    let reach = false; for (const p of w.players.values()) if (!p.dead && inZone(p, m)) { reach = true; break; }
    if (reach || m.hp >= m.max) { m.noReach = 0; if (m.regen) { m.regen = 0; } }
    else if ((m.noReach = (m.noReach || 0) + 1) > 120) {
      if (!m.regen) { m.regen = 1; ns.to(w.room).emit('sys', { t: `${d.name} 碰不到任何人，開始快速回血！快下來跟它正面對決！` }); }
      m.hp = Math.min(m.max, m.hp + m.max * .03 / 30);
    }
    const rage = !d.trial && !d.rival && m.hp < m.max * .3;
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
    if (d.trial || d.rival) { ev.warn = Math.round((ev.warn || 0) * 1.4); m.warn = Math.round((m.warn || 0) * 1.4); ev.atk = Math.round(ev.atk * .75); ev.rage = 0; }
    if (k !== 'charge' && k !== 'bounce') m.pend = null;
    ns.to(w.room).emit('bskill', ev);
  }
  // 10Hz 廣播
  setInterval(() => {
    const now = Date.now();
    for (const w of allWorlds()) {
      if (!w.players.size) continue;
      const m = w.mons.map(m => [m.i, Math.round(m.x * 10) / 10, Math.round(m.hop), m.f, Math.max(0, Math.round(m.hp)), m.dead ? 1 : 0, monMask(m, now), m.hurt > 8 ? 1 : 0]);
      const p = [...w.players.values()].map(pl => playerPub(pl));
      ns.to(w.room).emit('st', { m, p });
    }
  }, 100);
  function playerPub(pl) { const c = char(pl.uid) || {}; return [pl.uid, nameOf(pl.uid), c.cls, c.job || 0, c.wep || 0, c.lv || 1, Math.round(pl.x), Math.round(pl.y), pl.f, pl.act || 0, pl.rope ? 1 : 0, pl.dead ? 1 : 0, pl.hpPct ?? 100, pl.clone ? 1 : 0, c.pet || '', pl.mount || 0, plMask(pl, Date.now()), awkEl(pl, Date.now())]; }

  // ---------------- 擊殺與經驗 ----------------
  function kill(w, m, killer) {
    const d = D.MON[m.t];
    if (d.rival) {   // 覺醒試煉：打倒對手就解鎖守護靈
      m.dead = 1; m.hp = 0; ns.to(w.room).emit('kill', { i: m.i });
      for (const uid of w.players.keys()) { const c = char(uid); if (!c || c.awk) continue;
        c.awk = 1; c.ag = D.AWK.max; c.gold += d.gold[0]; save(); pushMe(uid);
        const g = D.GUARD[c.cls]; ns.to('u:' + uid).emit('awkUnlock', { n: g.n, fin: g.fin, gold: d.gold[0] });
        ns.to('m0').emit('sys', { t: `🔥 ${nameOf(uid)} 通過覺醒試煉，喚醒了守護靈「${g.n}」！` });
        setTimeout(() => { const k = ctl.get(uid); if (k && k.inTrial()) k.goRet(); }, 4500); }
      return;
    }
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
    // 經驗：有出手的人，加上他們在同一張地圖的隊友（沒出手也有基本份額），一起打比較划算
    const total = Object.values(m.dmgBy).reduce((a, b) => a + b, 0) || 1, gain = new Set(Object.keys(m.dmgBy));
    for (const u of [...gain]) for (const v of partyMates(u)) if (w.players.has(v)) gain.add(v);
    for (const uid of gain) {
      const dmg = m.dmgBy[uid] || 0, c = char(uid); if (!c || !w.players.has(uid)) continue;
      const share = Math.min(1, dmg / total + .3), ld = d.lv - c.lv, ef = ld < -10 ? .3 : ld < -5 ? .65 : 1;
      // 低等玩家跟打高等怪：照樣有經驗，但單次最多約 1.5 級，避免一隻王直接衝十幾級
      let e = Math.max(1, Math.round(d.exp * ef * share)); if (ld > 12) e = Math.min(e, Math.round(D.needExp(c.lv) * 1.5));
      const lv0 = c.lv, up = D.addExp(c, e);
      ns.to('u:' + uid).emit('gain', { exp: e, lv: c.lv, up, newJob: up && D.JOBLV.some(j => j > lv0 && j <= c.lv) });
      if (up) ns.to(w.room).emit('lvup', { id: uid });
      pushMe(uid);
    }
    if (d.boss) ns.to(w.room).emit('sys', { t: `${D.MON[m.t].name} 被打倒了！最後一擊：${nameOf(killer)}` });
    // 打倒虛空之主：最後一擊的玩家，和他在同一張地圖的隊友，等級上限變成 100
    if (m.t === 'voidking') for (const u of new Set([killer, ...partyMates(killer)])) {
      const c = char(u); if (!c || !w.players.has(u) || D.capOf(c) >= D.MAXLV2) continue;
      c.cap = D.MAXLV2; pushMe(u);
      ns.to('u:' + u).emit('notice', { t: `🌊 你突破了極限！等級上限提升到 ${D.MAXLV2}，可以到「潮聲港」找船長出海了` });
      ns.emit('sys', { t: `🌊 ${nameOf(u)} 擊敗虛空之主，突破等級上限到 ${D.MAXLV2}！` });
    }
    m.dmgBy = {}; save();
  }

  // ---------------- 守護靈覺醒 ----------------
  // pl.awT：啟動時間；pl.awCd：冷卻結束時間；c.ag：覺醒值（存檔）；c.awk：已解鎖
  const awkEl = (pl, now) => (pl.awT && now - pl.awT < D.AWK.dur ? now - pl.awT : -1);
  const awkOf = (pl, now, pvp) => D.awkFx(awkEl(pl, now), pvp);
  function addAg(uid, pl, v) {
    const c = char(uid), now = Date.now(); if (!c || !c.awk || !(v > 0) || awkEl(pl, now) >= 0 || now < (pl.awCd || 0)) return;
    const old = c.ag || 0; if (old >= D.AWK.max) return;
    c.ag = Math.min(D.AWK.max, old + v);
    if (Math.floor(c.ag) !== Math.floor(old)) ns.to('u:' + uid).emit('ag', { v: Math.floor(c.ag) });
  }
  setInterval(() => {   // 覺醒時間到：結束並開始冷卻
    const now = Date.now();
    for (const w of allWorlds()) for (const pl of w.players.values()) if (pl.awT && now - pl.awT >= D.AWK.dur) {
      pl.awT = 0; pl.awCd = now + D.AWK.cd; pl.finUntil = 0;
      ns.to('u:' + pl.uid).emit('awkSt', { on: 0, cd: D.AWK.cd }); ns.to(w.room).emit('sys', { t: `${nameOf(pl.uid)} 的守護靈消散了`, quiet: 1 });
    }
  }, 250);

  // ---------------- 組隊（最多 6 人；隊伍只存在伺服器記憶體，離線就離開隊伍） ----------------
  const PARTYMAX = 6, parties = new Map(), partyOf = new Map(), invites = new Map(); let partySeq = 1;
  const partyMates = uid => { const p = parties.get(partyOf.get(uid)); return p ? p.members.filter(u => u !== uid) : []; };
  function partyPub(p) {
    return { id: p.id, leader: p.leader, members: p.members.map(u => { const c = char(u), k = ctl.get(u), mi = k ? k.wmi() : -1;
      return { uid: u, name: nameOf(u), lv: c ? c.lv : 1, cls: c ? c.cls : '', job: c ? D.CL[c.cls].jobs[c.job] : '', mi, map: mi >= 0 ? D.MAPS[mi].name : '離線', hp: k ? (k.pl.dead ? 0 : k.pl.hpPct ?? 100) : 0 }; }) };
  }
  function pushParty(p) { const d = partyPub(p); for (const u of p.members) ns.to('u:' + u).emit('party', d); }
  function leaveParty(uid, why) {
    const p = parties.get(partyOf.get(uid)); partyOf.delete(uid); ns.to('u:' + uid).emit('party', null); if (!p) return;
    p.members = p.members.filter(u => u !== uid);
    if (p.members.length <= 1) { for (const u of p.members) { partyOf.delete(u); ns.to('u:' + u).emit('party', null); ns.to('u:' + u).emit('notice', { t: '隊伍解散了' }); } parties.delete(p.id); return; }
    if (p.leader === uid) p.leader = p.members[0];
    for (const u of p.members) ns.to('u:' + u).emit('sys', { t: `👥 ${nameOf(uid)} ${why || '離開了隊伍'}` });
    pushParty(p);
  }
  setInterval(() => { for (const p of parties.values()) pushParty(p); }, 1000);

  // ---------------- 連線 ----------------
  ns.use((socket, next) => {
    const uid = S.sessions[socket.handshake.auth?.token];
    if (!uid || !S.users[uid]) return next(new Error('auth'));
    socket.data.uid = uid; next();
  });
  // ---------------- PVP：決鬥與競技場（血量與傷害都由伺服器判定） ----------------
  const pvpRec = c => (c.pvp ||= { pts: 0, k: 0, d: 0, w: 0, l: 0 });
  function pvpDamage(ac, tc, tpl, h, now, apl) {
    const st = D.stats(ac), ts = D.stats(tc), aa = apl && awkOf(apl, now, true), ta = awkOf(tpl, now, true);
    const fin = apl && h.fin && now < (apl.finUntil || 0), mult = clamp(+h.mult || 1, .1, fin ? 6 : 3.2), crit = Math.random() * 100 < st.crit + clamp(+h.cb || 0, 0, 40);
    let raw = st.atk * mult * rnd(.9, 1.1) * (crit ? st.critD || 1.7 : 1) * (h.sk ? 1 + (st.skillB || 0) : 1) * (aa ? aa.atk : 1);
    let dmg = raw * .32 - ts.def * .5;
    const diff = ac.lv - tc.lv; dmg *= diff > 0 ? Math.max(.35, 1 - diff * .03) : Math.min(1.6, 1 - diff * .02);   // 等級差距修正
    // 所有減傷相乘，但總減傷最多 80%
    let red = (D.CL[tc.cls].dr || 1) * (tpl.mount ? 1 - ((D.MOUNTS[tpl.mount] || {}).dr || .25) : 1) * (now < (tpl.guardT || 0) ? .7 : 1) * (now < (tpl.shieldT || 0) ? .6 : 1) * (now < (tpl.wingT || 0) ? .5 : 1) * (ta ? 1 - ta.dr : 1);
    dmg *= Math.max(1 - D.AWK.drCap, red);
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }
  // ---- PVP 擊倒（直接攻擊或燒傷／中毒都會走這裡） ----
  function pvpKO(w, uid, tu) {
    const o = w.players.get(tu), c = char(uid), tc = char(tu); if (!o || o.dead) return;
    o.dead = 1; o.pdot = null; ns.to('u:' + tu).emit('pdie', { by: nameOf(uid) });
    const kp = w.players.get(uid), du = kp && kp.duel && duels.get(kp.duel);
    if (du) duelEnd(kp.duel, uid, '');
    else if (D.MAPS[w.mi].pvp === 'arena' && c && tc) { const r1 = pvpRec(c), r2 = pvpRec(tc), pts = tc.lv >= c.lv - 15 ? 10 : 2; r1.pts += pts; r1.k++; r2.d++; r2.pts = Math.max(0, r2.pts - 3); save();
      ns.to('u:' + uid).emit('notice', { t: `打倒了 ${nameOf(tu)}！競技場積分 +${pts}（目前 ${r1.pts}）` }); ns.to(w.room).emit('sys', { t: `⚔ ${nameOf(uid)} 打倒了 ${nameOf(tu)}`, quiet: 1 }); }
  }
  // ---- PVP 控制：時間 60%，同一位攻擊者要等「控制結束 + 5 秒」才能再控同一個人 ----
  function applyPef(w, o, uid, code, dmg, now) {
    const E = D.EF[code]; if (!E || !(o.php > 0)) return;
    if (E.dot) { const per = Math.max(1, Math.round(dmg * E.dot / (E.t / 1000))); if (!o.pdot || now > o.pdot.until || per >= o.pdot.per) o.pdot = { k: code, per, until: now + E.t, by: uid, next: now + 1000 }; else o.pdot.until = now + E.t; }
    else { o.pcImm ||= {}; if ((o.pcImm[uid] || 0) > now) return; const t = Math.round(E.t * D.CC_RES); o.pcImm[uid] = now + t + D.CC_IMM; o.pcc = { k: code, until: now + t }; ns.to('u:' + o.uid).emit('pctl', { k: code, ms: t, by: nameOf(uid) }); }
    ns.to(w.room).emit('pef', { u: o.uid, k: code });
  }
  setInterval(() => {   // PVP 的燒傷／中毒（伺服器扣血）
    const now = Date.now();
    for (const mi of [6, 7]) { const w = worlds[mi]; for (const o of w.players.values()) {
      const d = o.pdot; if (!d) continue; if (!(o.php > 0) || now > d.until + 50) { o.pdot = null; continue; } if (now < d.next) continue; d.next += 1000;
      const dmg = Math.min(d.per, o.php); o.php -= dmg; o.hpPct = Math.round(o.php / o.pmax * 100);
      ns.to(w.room).emit('phurt', { u: o.uid, by: d.by, dmg, crit: 0, s: 0, k: d.k }); ns.to('u:' + o.uid).emit('php', { hp: o.php, max: o.pmax, by: nameOf(d.by) });
      if (o.php <= 0) pvpKO(w, d.by, o.uid);
    } }
  }, 200);
  // 玩家身上的狀態旗標（給別人的畫面畫特效）
  const plMask = (pl, now) => (pl.pcc && now < pl.pcc.until ? ({ fz: 1, pz: 2, st: 4, rt: 8, sl: 16 }[pl.pcc.k] || 0) : 0) | (pl.pdot && now <= pl.pdot.until ? (pl.pdot.k === 'bn' ? 32 : 64) : 0);
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
    .filter(([, c]) => !c.gm && c.pvp && (c.pvp.pts || c.pvp.w)).map(([uid, c]) => ({ name: charName(uid, c), cls: D.CL[c.cls]?.jobs[c.job] || '', lv: c.lv, ...c.pvp }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w).slice(0, 10);

  ns.on('connection', socket => {
    const uid = socket.data.uid;
    socket.join('u:' + uid);
    let w = null; let rate = { t: 0, n: 0 }, chatT = 0;
    const pl = { uid, x: 0, y: D.GY, f: 1, act: 0, rope: 0, dead: 0, hpPct: 100, clone: 0 };
    const online = () => allWorlds().reduce((a, w2) => a + w2.players.size, 0);

    function enter(mi, x, world) {
      if (w) { w.players.delete(uid); socket.leave(w.room); ns.to(w.room).emit('pleave', { id: uid }); if (trials.get(uid) === w && world !== w) trials.delete(uid); }
      w = world || worlds[mi]; pl.x = x ?? D.MAPS[mi].start; pl.y = D.GY; pl.gy = null; pl.dead = 0; pl.pdot = null; pl.pcc = null; if (D.MAPS[mi].trial && pl.awT) { pl.awT = 0; pl.awCd = Date.now() + D.AWK.cd; }
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

    socket.emit('hello', { me: me(uid), name: S.users[uid]?.name || '玩家', id: uid, list: slotList(uid), act: alt(uid).act });
    function leaveWorld() { if (pl.duel) { const du = duels.get(pl.duel); if (du) duelEnd(pl.duel, du.a === uid ? du.b : du.a, '對手離開'); } if (w) { w.players.delete(uid); ns.to(w.room).emit('pleave', { id: uid }); socket.leave(w.room); if (trials.get(uid) === w) trials.delete(uid); w = null; } ret = null; }
    // 切換到第 i 格（使用中的角色收回自己的格子）
    function swapTo(i) { const a = alt(uid); if (i === a.act) return; a.slots[a.act] = S.rpg[uid] || null; S.rpg[uid] = a.slots[i]; a.slots[i] = null; a.act = i; if (!S.rpg[uid]) delete S.rpg[uid]; }
    socket.on('chars', (_, ack) => ack && ack({ list: slotList(uid), act: alt(uid).act }));
    socket.on('useSlot', ({ i } = {}, ack) => {
      i = i | 0; if (i < 0 || i >= MAXSLOT) return ack && ack({ ok: false });
      const a = alt(uid), c = i === a.act ? S.rpg[uid] : a.slots[i]; if (!c) return ack && ack({ ok: false, msg: '這一格沒有角色' });
      leaveWorld(); swapTo(i); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('create', ({ cls, slot, nm } = {}, ack) => {
      if (!D.CL[cls]) return ack && ack({ ok: false });
      nm = String(nm || '').trim(); if (nm) { const er = nameErr(uid, nm, null); if (er) return ack && ack({ ok: false, msg: er }); }
      const a = alt(uid); slot = slot == null ? a.act : slot | 0; if (slot < 0 || slot >= MAXSLOT) return ack && ack({ ok: false });
      if ((slot === a.act ? S.rpg[uid] : a.slots[slot])) return ack && ack({ ok: false, msg: '這一格已經有角色了' });
      leaveWorld(); swapTo(slot); S.rpg[uid] = D.newChar(cls); if (nm) S.rpg[uid].nm = nm; save(); ack && ack({ ok: true, me: me(uid) });
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
    socket.on('enter', (_, ack) => { const c = char(uid); if (!c) return ack && ack({ ok: false }); if (D.MAPS[c.map || 0]?.pvp || D.MAPS[c.map || 0]?.trial) c.map = 0; if (c.map === 10 && D.capOf(c) < D.MAXLV2) c.map = 9; enter(c.map || 0); ack && ack({ ok: true });
      if (D.VERSION && S.users[uid] && S.users[uid].seenVer !== D.VERSION) socket.emit('news', { v: D.VERSION, list: D.newsSince(S.users[uid].seenVer) });
      if (c.apComp) { delete c.apComp; save(); socket.emit('notice', { t: `能力值系統改版補償：獲得 ${D.APRESET.toLocaleString()} 金幣，可以到「能力」重新配點！` }); } });
    socket.on('pos', (p = {}) => {
      if (!w) return;
      pl.x = clamp(+p.x || 0, 0, D.WW); pl.y = clamp(+p.y || 0, -100, D.WH + 60); pl.f = p.f < 0 ? -1 : 1; pl.act = p.act ? 1 : 0; pl.rope = p.rope ? 1 : 0; pl.dead = p.dead ? 1 : 0;
      if (isPvp(w)) { pl.dead = pl.php <= 0 ? 1 : 0; } else { const hp = clamp(Math.round(+p.hp || 0), 0, 100); if (hp < (pl.hpPct ?? 100) && !pl.dead) addAg(uid, pl, Math.min(15, (pl.hpPct ?? 100) - hp) * D.AWK.hurtPer); pl.hpPct = hp; }
      pl.clone = p.clone ? 1 : 0; if (p.gy != null) pl.gy = clamp(+p.gy || 0, -100, D.WH + 60); pl.mount = p.mount && (char(uid)?.lv || 0) >= D.MOUNTLV && awkEl(pl, Date.now()) < 0 ? (char(uid).mnt || 'horse') : 0;
    });
    socket.on('hit', (list) => {
      const c = char(uid); if (!w || !c || !Array.isArray(list) || pl.dead || pl.mount) return;
      const now = Date.now(); if (now - rate.t > 1000) { rate = { t: now, n: 0 }; }
      const st = D.stats(c), out = [], efs = D.efOf(c.cls), aw = awkOf(pl, now); let dealt = 0;
      for (const h of list.slice(0, 20)) {
        if (++rate.n > 60) break;
        const m = w.mons[h.m | 0]; if (!m || m.dead || m.hp <= 0) continue;
        if (Math.abs(m.x - pl.x) > 360) continue;
        const fin = h.fin && now < (pl.finUntil || 0), mult = clamp(+h.mult || 1, .1, fin ? 6 : 3.2), cb = clamp(+h.cb || 0, 0, 40);
        const crit = Math.random() * 100 < st.crit + cb;
        const boss = D.MON[m.t].boss;
        if (boss && !inZone(pl, m)) { if (now - (pl.immT || 0) > 400) { pl.immT = now; socket.emit('bimm', { i: m.i }); } continue; }   // 危險區外偷打：Boss 不受傷
        let dmg = Math.max(1, Math.round(st.atk * mult * rnd(.85, 1.15) * (crit ? st.critD || 1.7 : 1) * (now < m.vuln ? 1.2 : 1) * (h.sk ? 1 + (st.skillB || 0) : 1) * (aw ? aw.atk : 1) * (fin && boss ? D.AWK.finBoss : 1)));
        // 靈魂收割：直接處決殘血的一般怪
        if (h.ex && !boss && m.hp - dmg < m.max * .15) dmg = Math.max(dmg, Math.ceil(m.hp));
        if (h.vu) m.vuln = now + 8000;
        m.hp -= dmg; m.hurt = 28; m.aggro = 840; m.target = uid; m.dmgBy[uid] = (m.dmgBy[uid] || 0) + dmg;
        if (!boss && h.pl) m.kx = clamp((pl.x + (m.x < pl.x ? -20 : 20) - m.x) / 4.4, -40, 40);
        else if (!boss && h.kb) m.kx = clamp(+h.kb, 0, 4) * (m.x < pl.x ? -1 : 1);
        if (typeof h.ef === 'string' && efs.has(h.ef)) applyEf(w, m, uid, h.ef, dmg, now);   // 控制／持續傷害（只接受這個職業會的效果）
        out.push([m.i, dmg, crit ? 1 : 0, h.s | 0]); dealt += dmg;
        if (m.hp <= 0) kill(w, m, uid);
      }
      if (out.length) ns.to(w.room).emit('hits', { by: uid, h: out });
      if (dealt > 0 && now - (pl.agT || 0) >= 1000) { pl.agT = now; addAg(uid, pl, D.AWK.perSec); }   // 每秒有在打怪就累積覺醒值
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
        if (!w || !D.MAPS[w.mi].town) return no('要在村莊（晨露村、潮聲港）才能購買');
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
        const mt = D.MOUNTS[i]; if (!w || !D.MAPS[w.mi].town) return no('要在村莊（晨露村、潮聲港）才能購買');
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
    // ---- GM 測試角色：直接變成指定職業／轉數／等級，裝備給到該等級最好的（不列入任何排行榜） ----
    socket.on('gm', ({ cls, job, lv, pet } = {}, ack) => {
      const no = msg => ack && ack({ ok: false, msg });
      if (!isGM(uid)) return no('只有 GM 帳號可以使用');
      if (!D.CL[cls]) return no('職業錯誤');
      if (w && (isPvp(w) || D.MAPS[w.mi].trial)) return no('請先離開決鬥場／競技場／試煉再切換');
      lv = clamp(lv | 0 || D.MAXLV, 1, D.MAXLV2); job = clamp(job | 0, 0, 4); while (job > 0 && D.JOBLV[job] > lv) job--;
      const old = S.rpg[uid] || {}, c = D.newChar(cls), wl = D.WEAPONS[cls];
      let wep = 0; wl.forEach((it, i) => { if (!it[4] && it[2] <= lv) wep = i; }); if (lv >= wl[D.LEGI][2]) wep = D.LEGI;
      let arm = 0; D.ARMORS.forEach((it, i) => { if (it[3] <= lv) arm = i; });
      const mounts = Object.keys(D.MOUNTS).filter(k => (D.MOUNTS[k].lv || 0) <= lv); if (!mounts.length) mounts.push('horse');
      Object.assign(c, { gm: 1, lv, job, exp: 0, wep, arm, gold: 9999999, pot: 999, eth: 999, ap: (lv - 1) * D.APL, map: w ? w.mi : (old.map || 0), mounts,
        mnt: mounts.includes(old.mnt) ? old.mnt : mounts[mounts.length - 1], pet: lv >= D.PETLV && D.PETS[pet] ? pet : null });
      if (old.nm) c.nm = old.nm; if (old.rnN) c.rnN = old.rnN; if (lv > D.MAXLV || old.cap) c.cap = D.MAXLV2; if (lv >= D.AWK.lv && job >= 4) { c.awk = 1; c.ag = D.AWK.max; } pl.awT = 0; pl.awCd = 0;   // 保留角色名字
      // 套用每一級的能力成長（和正常升級一樣），GM 角色的強度才會等於真正練到這個等級的角色
      const gr = D.CL[cls].grow; for (let l = 1; l < lv; l++) { c.base.hp += gr.hp; c.base.mp += gr.mp; c.base.atk = Math.round((c.base.atk + gr.atk) * 10) / 10; c.base.def = Math.round((c.base.def + gr.def) * 10) / 10; }
      S.rpg[uid] = c; save();
      ack && ack({ ok: true, me: me(uid) });
      if (w) enter(w.mi, pl.x);
    });
    // ---- 角色改名：第一次免費，之後每次 50,000 金幣（GM 角色免費） ----
    socket.on('rename', ({ nm } = {}, ack) => {
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      nm = String(nm || '').trim(); if (nm === (c.nm || '')) return ack && ack({ ok: false, msg: '名字沒有變' });
      const er = nameErr(uid, nm, c); if (er) return ack && ack({ ok: false, msg: er });
      const cost = c.gm || !c.rnN ? 0 : RENAME_GOLD; if (c.gold < cost) return ack && ack({ ok: false, msg: `改名需要 ${RENAME_GOLD.toLocaleString()} 金幣` });
      const old = nameOf(uid); c.gold -= cost; c.nm = nm; c.rnN = (c.rnN || 0) + 1; save();
      ack && ack({ ok: true, me: me(uid), cost });
      if (w) ns.to(w.room).emit('sys', { t: `${old} 改名為「${nameOf(uid)}」` });
    });
    // ---- 守護靈覺醒：第一次按＝啟動，覺醒中再按＝終結技（一次） ----
    socket.on('awk', (_, ack) => {
      const c = char(uid), now = Date.now(), no = msg => ack && ack({ ok: false, msg }); if (!c || !w) return no('');
      const g = D.GUARD[c.cls]; if (!c.awk) return no(`80 級四轉後，找轉職教官完成「覺醒試煉」才能喚醒守護靈`);
      if (!g.ready) return no(`${g.n} 還在準備中，下次更新開放`);
      const el = awkEl(pl, now);
      if (el >= 0) {
        if (pl.finUsed) return no('這次覺醒的終結技已經用過了');
        pl.finUsed = 1; pl.finUntil = now + D.AWK.finWin; ack && ack({ ok: true, fin: 1 });
        socket.to(w.room).emit('awkFin', { u: uid, x: Math.round(pl.x), f: pl.f }); return;
      }
      if (pl.dead) return no(''); if (pl.mount) return no('騎乘中不能覺醒，按 F 下坐騎');
      if (D.MAPS[w.mi].trial) return no('試煉中不能覺醒');
      if (now < (pl.awCd || 0)) return no(`守護靈冷卻中（還要 ${Math.ceil((pl.awCd - now) / 1000)} 秒）`);
      if ((c.ag || 0) < D.AWK.max) return no(`覺醒值還不夠（${Math.floor(c.ag || 0)}/${D.AWK.max}），繼續打怪或承受傷害就會累積`);
      c.ag = 0; pl.awT = now; pl.finUsed = 0; pl.finUntil = 0; save();
      ack && ack({ ok: true, on: 1 }); socket.emit('ag', { v: 0 });
      ns.to(w.room).emit('sys', { t: `🔥 ${nameOf(uid)} 喚醒了守護靈「${g.n}」！` });
    });
    socket.on('awkTrial', (_, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c) return no('');
      if (c.awk) return no('你已經喚醒過守護靈了');
      if (c.lv < D.AWK.lv || c.job < 4) return no(`要 Lv ${D.AWK.lv} 並完成四轉`);
      if (!D.GUARD[c.cls].ready) return no(`${D.GUARD[c.cls].n} 還在準備中，下次更新開放`);
      if (!w || w.mi !== 0) return no('要在晨露村找轉職教官');
      const opts = Object.keys(D.CL).filter(k => k !== c.cls), rc = opts[ri(0, opts.length - 1)];
      const tw = mkWorld(8, [{ t: 'rival_' + rc, s: 0, a: 1000, b: 1600 }], 'trial:' + uid); trials.set(uid, tw);
      ret = { mi: 0, x: 120 }; ack && ack({ ok: true, rival: D.MON['rival_' + rc].name }); enter(8, 300, tw);
      socket.emit('notice', { t: `覺醒試煉開始！打倒「${D.MON['rival_' + rc].name}」就能喚醒守護靈「${D.GUARD[c.cls].n}」` });
    });
    // ---- 組隊 ----
    socket.on('pInfo', (_, ack) => {
      const list = w ? [...w.players.values()].filter(o => o.uid !== uid && !partyOf.has(o.uid)).map(o => { const oc = char(o.uid) || {}; return { uid: o.uid, name: nameOf(o.uid), lv: oc.lv, job: D.CL[oc.cls]?.jobs[oc.job] || '' }; }) : [];
      const p = parties.get(partyOf.get(uid)); ack && ack({ ok: true, party: p ? partyPub(p) : null, list });
    });
    socket.on('pInv', ({ to, name } = {}, ack) => {
      const no = msg => ack && ack({ ok: false, msg });
      if (name) { const k = String(name).trim().toLowerCase(); to = [...ctl.keys()].find(u => u !== uid && (nameOf(u).toLowerCase() === k || nameOf(u).replace('［GM］', '').toLowerCase() === k || String(S.users[u]?.name || '').toLowerCase() === k)); if (!to) return no('找不到這位線上玩家'); }
      to = String(to || ''); if (!ctl.has(to) || to === uid) return no('對方不在線上');
      if (partyOf.has(to)) return no('對方已經在別的隊伍裡了');
      const p = parties.get(partyOf.get(uid)); if (p && p.members.length >= PARTYMAX) return no(`隊伍最多 ${PARTYMAX} 人`);
      if (p && p.leader !== uid) return no('只有隊長可以邀請');
      const iv = invites.get(to); if (iv && iv.until > Date.now() && iv.from === uid) return no('已經邀請過了，等對方回覆');
      invites.set(to, { from: uid, until: Date.now() + 30000 }); ns.to('u:' + to).emit('pInvite', { from: uid, name: nameOf(uid) });
      ack && ack({ ok: true, msg: `已邀請 ${nameOf(to)}` });
    });
    socket.on('pAns', ({ from, ok } = {}, ack) => {
      const iv = invites.get(uid); invites.delete(uid);
      if (!iv || iv.from !== String(from) || iv.until < Date.now()) return ack && ack({ ok: false, msg: '邀請已經過期了' });
      if (!ok) { ns.to('u:' + iv.from).emit('notice', { t: `${nameOf(uid)} 拒絕了組隊邀請` }); return ack && ack({ ok: true }); }
      if (partyOf.has(uid)) return ack && ack({ ok: false, msg: '你已經在隊伍裡了' });
      if (!ctl.has(iv.from)) return ack && ack({ ok: false, msg: '對方已經離線了' });
      let p = parties.get(partyOf.get(iv.from));
      if (!p) { p = { id: partySeq++, leader: iv.from, members: [iv.from] }; parties.set(p.id, p); partyOf.set(iv.from, p.id); }
      if (p.members.length >= PARTYMAX) return ack && ack({ ok: false, msg: '隊伍已經滿了' });
      p.members.push(uid); partyOf.set(uid, p.id);
      for (const u of p.members) ns.to('u:' + u).emit('sys', { t: `👥 ${nameOf(uid)} 加入了隊伍` });
      pushParty(p); ack && ack({ ok: true });
    });
    socket.on('pLeave', (_, ack) => { leaveParty(uid); ack && ack({ ok: true }); });
    socket.on('pKick', ({ u } = {}, ack) => {
      const p = parties.get(partyOf.get(uid)); if (!p || p.leader !== uid || !p.members.includes(String(u)) || String(u) === uid) return ack && ack({ ok: false, msg: '只有隊長可以踢人' });
      ns.to('u:' + u).emit('notice', { t: '你被請出了隊伍' }); leaveParty(String(u), '被請出了隊伍'); ack && ack({ ok: true });
    });
    socket.on('pLead', ({ u } = {}, ack) => {
      const p = parties.get(partyOf.get(uid)); if (!p || p.leader !== uid || !p.members.includes(String(u))) return ack && ack({ ok: false });
      p.leader = String(u); for (const v of p.members) ns.to('u:' + v).emit('sys', { t: `👥 ${nameOf(p.leader)} 成為新隊長` }); pushParty(p); ack && ack({ ok: true });
    });
    // ---- 潮聲港碼頭：搭船到深淵海溝（要先解鎖 100 等） ----
    socket.on('sail', (_, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || !w || w.mi !== 9) return no('要在潮聲港的碼頭搭船');
      const boat = D.MAPS[9].npcs.find(n => n.kind === 'boat'); if (Math.abs(pl.x - boat.x) > 90) return no('離船長太遠了');
      if (D.capOf(c) < D.MAXLV2) return no(`要先打倒虛空之主、把等級上限突破到 ${D.MAXLV2} 才能出海`);
      c.map = 10; save(); ack && ack({ ok: true }); enter(10, D.MAPS[10].start);
    });
    // ---- 更新公告：每個帳號每個版本只看一次 ----
    socket.on('newsSeen', ({ v } = {}) => { const u = S.users[uid]; if (u && v === D.VERSION) { u.seenVer = D.VERSION; save(); } });
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
      const du = pl.duel && duels.get(pl.duel), arena = D.MAPS[w.mi].pvp === 'arena', efs = D.efOf(c.cls);
      if (!arena && !(du && now >= du.start)) return;
      for (const h of list.slice(0, 20)) {
        if (++rate.n > 40) break;
        const tu = String(h.u), o = w.players.get(tu), tc = char(tu); if (!o || !tc || tu === uid || !(o.php > 0)) continue;
        if (du && tu !== (du.a === uid ? du.b : du.a)) continue;
        if (now < (o.prot || 0) || Math.abs(o.x - pl.x) > 360) continue;
        const { dmg, crit } = pvpDamage(c, tc, o, h, now, pl);
        o.php = Math.max(0, o.php - dmg); o.hpPct = Math.round(o.php / o.pmax * 100);
        if (now - (pl.agT || 0) >= 1000) { pl.agT = now; addAg(uid, pl, D.AWK.perSec * .5); }   // PVP 覺醒值累積減半
        addAg(tu, o, Math.min(15, dmg / o.pmax * 100) * D.AWK.hurtPer * .5);
        ns.to(w.room).emit('phurt', { u: tu, by: uid, dmg, crit: crit ? 1 : 0, s: h.s | 0 });
        ns.to('u:' + tu).emit('php', { hp: o.php, max: o.pmax, by: nameOf(uid) });
        if (c.pet === 'zhuque') pvpHp(pl.php + Math.min(dmg * .05, pl.pmax * .04));
        if (h.heal) pvpHp(pl.php + pl.pmax * Math.min(.04, +h.heal || 0));
        if (typeof h.ef === 'string' && efs.has(h.ef)) applyPef(w, o, uid, h.ef, dmg, now);
        if (o.php <= 0) { pvpKO(w, uid, tu); break; }
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
      const home = (w && D.MAPS[w.mi].home) || 0;   // 深淵海溝、潮聲港倒下 → 在潮聲港復活
      c.exp = Math.max(0, c.exp - Math.floor(D.needExp(c.lv) * .06)); c.map = home; save(); pushMe(uid); ack && ack({ ok: true }); enter(home, D.MAPS[home].start);
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
        if (!still) { leaveParty(uid, '離線了'); invites.delete(uid); }
        if (w && !still) { w.players.delete(uid); ns.to(w.room).emit('pleave', { id: uid }); if (trials.get(uid) === w) trials.delete(uid); if (pl.duel) { const du = duels.get(pl.duel); if (du) duelEnd(pl.duel, du.a === uid ? du.b : du.a, '對手離線'); } ctl.delete(uid); }
      }, 300);
    });
  });

  // 給大廳顯示的線上人數與排行
  return {
    online: () => worlds.reduce((a, w) => a + w.players.size, 0),
    top: () => [...Object.entries(S.rpg), ...Object.entries(S.rpgAlt).flatMap(([uid, a]) => a.slots.filter(Boolean).map(c => [uid, c]))].filter(([, c]) => !c.gm).map(([uid, c]) => ({ name: charName(uid, c), lv: c.lv, job: D.CL[c.cls]?.jobs[c.job] || '' })).sort((a, b) => b.lv - a.lv).slice(0, 10),
  };
};
