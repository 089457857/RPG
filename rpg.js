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
  const slotList = uid => { const a = alt(uid); return a.slots.map((c, i) => { const x = i === a.act ? S.rpg[uid] : c; return x ? { nm: x.nm || '', cls: x.cls, lv: x.lv, job: x.job, jobName: D.jobName(x), map: D.MAPS[x.map || 0].name } : null; }); };

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
  function me(uid) { const c = char(uid); return c ? { ...c, max: D.stats(c), gmOk: isGM(uid), dia: (S.users[uid] && S.users[uid].dia) || 0, cos: (S.users[uid] && S.users[uid].cos) || [], pity: (S.users[uid] && S.users[uid].pity) || 0, wear: c.wear || {} } : null; }
  const pushMe = uid => ns.to('u:' + uid).emit('me', me(uid));

  // ---------------- 模擬 ----------------
  const TICK = 1000 / 30;
  setInterval(() => {
    const now0 = Date.now();
    for (const w of allWorlds()) {
      if (!w.players.size) { for (const m of w.mons) if (D.MON[m.t].boss && !m.dead && m.hp < m.max) bossRegen(w, m, D.MON[m.t], now0, false); continue; }
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
  const monMask = (m, now) => (m.frozen > 0 ? ({ fz: 1, pz: 2, st: 4 }[m.ccK] || 1) : 0) | (m.root > 0 ? 8 : 0) | (m.slow > 0 ? 16 : 0) | (m.bn && now <= m.bn.until ? 32 : 0) | (m.ps && now <= m.ps.until ? 64 : 0) | (m.dark ? 128 : 0);
  function stepMon(w, m) {
    const d = D.MON[m.t];
    if (m.dead) { if (d.trial || d.rival) return; m.dead--; if (m.dead <= 0) { Object.assign(m, mkMon(m.sp, m.i, m.mi)); m.dark = 0; m.fight = null; rollDark(w, m, true); ns.to(w.room).emit('respawn', { i: m.i, max: m.max, dark: m.dark ? 1 : 0 }); } return; }
    // 30Hz 模擬，速度 ×2 對齊瀏覽器的 60Hz
    if (m.hurt > 0) m.hurt -= 2; if (m.aggro > 0) m.aggro -= 2;
    const seg = D.MAPS[m.mi].seg[m.seg];
    if (m.root > 0) m.root -= 2; if (m.slow > 0) m.slow -= 2;
    if (m.bn || m.ps) { tickDot(w, m, Date.now()); if (m.dead) return; }
    if (m.frozen > 0) { m.frozen -= 2; m.kx = 0; }
    else if (m.kx) { m.x += m.kx * 1.6; m.kx *= .64; if (Math.abs(m.kx) < .1) m.kx = 0; }
    else if (m.hurt < 6 && !(m.warn > 0) && !(m.dash > 0) && !(m.root > 0)) {
      const tp = m.aggro && m.target ? w.players.get(m.target) : null, home = m.x < m.a ? 1 : m.x > m.b ? -1 : 0;
      if (tp && tp.fakeT > Date.now()) { m.aggro = 0; m.target = null; }   // 戰五渣裝死：怪物失去目標
      // 仇恨中的小怪可以追出自己的區域（最多 LEASH 像素）；目標跑太遠就放棄，走回原本的區域
      if (tp && !d.boss && (tp.x < m.a - LEASH - 160 || tp.x > m.b + LEASH + 160)) { m.aggro = 0; m.target = null; }
      if (tp && !tp.dead && m.aggro && Math.abs(tp.y - seg.y) < 60) { m.f = tp.x < m.x ? -1 : 1; m.vx = d.spd * 1.5 * m.f; }
      else if (home && !d.boss) { m.vx = d.spd * home; m.f = home; m.think = ri(60, 120); }
      else if ((m.think -= 2) <= 0) { m.think = ri(60, 180); const r = Math.random(); m.vx = r < .3 ? 0 : d.spd * (Math.random() < .5 ? -1 : 1); if (m.vx) m.f = Math.sign(m.vx); }
      m.x += m.vx * 2 * (m.slow > 0 ? .5 : 1);
    }
    const lsh = d.boss ? 0 : LEASH; let lo = Math.max(seg.x1 + m.w / 2, m.a - lsh), hi = Math.min(seg.x2 - m.w / 2, m.b + lsh);
    if (!m.aggro && !d.boss) { if (m.x >= m.a) lo = Math.max(lo, m.a); if (m.x <= m.b) hi = Math.min(hi, m.b); }   // 沒在追人：回到區域後就不再走出去
    if (m.fight) { lo = Math.max(lo, m.fight.x1 + m.w / 2); hi = Math.min(hi, m.fight.x2 - m.w / 2); }
    m.x = clamp(m.x, lo, hi); if ((m.x <= lo + .1 || m.x >= hi - .1) && m.vx) { m.vx = -m.vx; m.f = Math.sign(m.vx); }
    if (!m.frozen) {
      if (m.hop < 0 || m.vy) { for (let k = 0; k < 2; k++) { m.vy += G * .8; m.hop += m.vy; } if (m.hop >= 0) { m.hop = 0; m.vy = 0; if (m.stomping) { m.stomping = 0; ns.to(w.room).emit('stomp', { i: m.i, x: m.x, atk: bossAtk(m, d.atk * 1.2) }); } } }
      else if (/slime|shroom/.test(m.t) && Math.random() < .016) { m.vy = -2.6; m.hop = -.01; }
    }
    if (d.boss && !(m.frozen > 0)) bossAI(w, m, d);   // 被凍結／麻痺／暈眩時 Boss 不會出招
    else if (d.sp && !(m.frozen > 0)) mobAI(w, m, d);
  }
  // 小怪特殊攻擊：被打過（仇恨中）、目標在射程內而且站在同一層才出招；出招前原地蓄力，預警時間足夠閃開
  const LEASH = 150;
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
  // ---------------- Boss 對話開戰／暗黑版 ----------------
  // 一般 Boss（不含轉職／覺醒試煉）要先「對話」才會開戰；開戰後參戰者被空氣牆關在危險區，限時 10 分鐘
  const isOpenBoss = m => { const d = D.MON[m.t]; return d.boss && !d.trial && !d.rival && !D.MAPS[m.mi].trial; };
  const fightPub = m => m.fight ? { i: m.i, u: [...m.fight.u], x1: m.fight.x1, x2: m.fight.x2, until: m.fight.until, by: m.fight.by } : { i: m.i, end: 1 };
  function bossReset(w, m) { m.hp = m.max; m.dmgBy = {}; m.aggro = 0; m.target = null; m.rage = 0; m.warn = 0; m.pend = null; m.dash = 0; m.leap = 0; m.bn = null; m.ps = null; m.frozen = 0; m.root = 0; m.slow = 0; m.ccImm = {}; m.regen = 0; m.noReach = 0; }
  function fightEnd(w, m, why) {   // why: win | wipe | time | gone
    const f = m.fight; if (!f) return; m.fight = null;
    for (const u of f.u) { const k = ctl.get(u); if (k) k.pl.bf = null; }
    ns.to(w.room).emit('bfight', { i: m.i, end: 1, why });
    if (why !== 'win') { bossReset(w, m); ns.to(w.room).emit('sys', { t: `${D.MON[m.t].name}：${why === 'time' ? '時間到了，挑戰失敗！' : '挑戰者全倒了……'} 牠的血量回滿了` }); }
    if (m.dark && why !== 'win' && Date.now() > m.darkUntil) darkOff(w, m);
  }
  function darkOff(w, m) { const d = D.MON[m.t]; m.dark = 0; m.max = d.hp; m.hp = Math.min(m.hp, m.max); ns.to(w.room).emit('bdark', { i: m.i, dark: 0, max: m.max }); ns.to(w.room).emit('sys', { t: `暗黑${d.name}的力量消散了，變回一般版` }); }
  function rollDark(w, m, say) { const d = D.MON[m.t]; if (!isOpenBoss(m)) return;
    if (Math.random() < D.DARK.rate) { m.dark = 1; m.max = Math.round(d.hp * D.DARK.hp); m.hp = m.max; m.darkUntil = Date.now() + D.DARK.dur;
      if (say) ns.to(w.room).emit('sys', { t: `☠️ 暗黑${d.name} 降臨了！血量與傷害大幅提升，掉落神話裝備的機會大增（${Math.round(D.DARK.dur / 60000)} 分鐘內沒人打倒就會消散）` }); } }
  const bossAtk = (m, base) => Math.round(base * (m.dark ? D.DARK.atk : 1));
  // ---------------- Boss 招式 ----------------
  // 伺服器決定 Boss 何時放什麼招、打哪裡；每位玩家的瀏覽器依預警範圍自行判定是否被打中。
  // 玩家是否站在 Boss 的危險區裡：水平距離在範圍內，而且腳踩的是 Boss 那一層（跳起來也算，爬上高處平台不算）
  function inZone(p, m) {
    const sy = D.MAPS[m.mi].seg[m.seg].y, gy = p.rope || p.gy == null ? p.y : p.gy;
    return Math.abs(p.x - m.x) <= D.bossZone(m.t) && gy > sy - 50 && gy < sy + 20;
  }
  function bossRegen(w, m, d, now, say) {
    if (!m.regen) { m.regen = 1; m.regT = now + D.BOSSREGEN.every; if (say) ns.to(w.room).emit('sys', { t: `${d.name} 偵測不到可以攻擊的人，開始回血！（每 5 秒回復 20%）` }); }
    if (now >= m.regT) { m.hp = Math.min(m.max, m.hp + m.max * D.BOSSREGEN.pct); m.regT += D.BOSSREGEN.every; }
  }
  function bossAI(w, m, d) {
    if (isOpenBoss(m)) {
      const now = Date.now();
      if (m.dark && !m.fight && now > m.darkUntil) darkOff(w, m);
      if (!m.fight) { m.vx = 0; m.aggro = 0; m.warn = 0; if (m.hp < m.max) m.hp = m.max; return; }   // 還沒人挑戰：站著不動、不出招
      const f = m.fight; let alive = 0;
      for (const u of [...f.u]) { const p = w.players.get(u); if (!p) { f.u.delete(u); const k = ctl.get(u); if (k) k.pl.bf = null; continue; } if (!p.dead) alive++; }
      if (!f.u.size) return fightEnd(w, m, 'gone');
      if (!alive) return fightEnd(w, m, 'wipe');
      if (now > f.until) return fightEnd(w, m, 'time');
      if (!m.target || !f.u.has(m.target) || w.players.get(m.target)?.dead) { const cand = [...f.u].filter(u => !w.players.get(u)?.dead); m.target = cand[ri(0, cand.length - 1)] || null; }
      m.aggro = 840; m.x = clamp(m.x, f.x1 + m.w / 2, f.x2 - m.w / 2);
    }
    if (d.rival) { const p0 = [...w.players.values()][0]; if (p0) { m.aggro = 840; m.target = p0.uid; } }   // 試煉之影一開場就主動攻擊挑戰者
    // 偵測不到可攻擊的玩家（全員倒地、離開、躲在危險區外或高處）超過 4 秒：每 5 秒回復 20% 血量
    let reach = false; for (const p of w.players.values()) if (!p.dead && inZone(p, m) && (!m.fight || m.fight.u.has(p.uid))) { reach = true; break; }
    if (reach || m.hp >= m.max) { m.noReach = 0; m.regen = 0; }
    else if ((m.noReach = (m.noReach || 0) + 1) > 120) bossRegen(w, m, d, Date.now(), true);
    const rage = !d.trial && m.hp < m.max * .3;   // 覺醒試煉的影子會暴怒
    if (rage && !m.rage) { m.rage = 1; ns.to(w.room).emit('sys', { t: `${d.name} 暴怒了！招式變得更快更兇！` }); }
    if (m.warn > 0) { m.vx = 0; if ((m.warn -= 1) <= 0) { if (m.pend === 'charge') m.dash = 12; else if (m.pend === 'leap') { m.leap = 12; m.vy = -4.2; m.hop = -.01; m.pend = null; } } return; }
    if (m.leap > 0) { m.leap--; m.x += (m.ltx - m.x) / Math.max(1, m.leap); m.vx = 0; return; }
    if (m.dash > 0) {
      m.dash--; const seg = D.MAPS[m.mi].seg[m.seg], lo = Math.max(seg.x1 + m.w / 2, m.a), hi = Math.min(seg.x2 - m.w / 2, m.b);
      m.x = clamp(m.x + m.f * 7, lo, hi); m.vx = 0; return;
    }
    if (!m.aggro || m.frozen || m.hop < 0 || (m.stomp -= rage ? 3 : 2) > 0) return;
    m.stomp = ri(120, 190);
    const k = d.sk[ri(0, d.sk.length - 1)], atk = bossAtk(m, d.atk * (rage ? 1.2 : 1)), seg = D.MAPS[m.mi].seg[m.seg];
    const tp = m.target && w.players.get(m.target);
    if (tp && !tp.dead) m.f = tp.x < m.x ? -1 : 1;
    const ev = { i: m.i, k, n: (d.skn && d.skn[k]) || '', x: Math.round(m.x), y: seg.y, f: m.f, atk, rage: rage ? 1 : 0 };
    if (k === 'slam') { m.vy = -4.5; m.hop = -.01; m.stomping = 1; return; }
    // 每隻 Boss 的 3 招都是牠獨有的；預警時間明顯、範圍收斂，看到提示就來得及躲
    const near = [...w.players.values()].filter(p => !p.dead && Math.abs(p.x - m.x) < 320 && (!m.fight || m.fight.u.has(p.uid)));
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
    const now = Date.now();
    for (const w of allWorlds()) {
      if (!w.players.size) continue;
      const m = w.mons.map(m => [m.i, Math.round(m.x * 10) / 10, Math.round(m.hop), m.f, Math.max(0, Math.round(m.hp)), m.dead ? 1 : 0, monMask(m, now), m.hurt > 8 ? 1 : 0]);
      const p = [...w.players.values()].map(pl => playerPub(pl));
      ns.to(w.room).volatile.emit('st', { m, p });   // 網路塞住時丟掉舊的狀態，不要排隊造成延遲
    }
  }, 100);
  function playerPub(pl) { const c = char(pl.uid) || {}; return [pl.uid, nameOf(pl.uid), c.cls, c.job || 0, c.wep || 0, c.lv || 1, Math.round(pl.x), Math.round(pl.y), pl.f, pl.act || 0, pl.rope ? 1 : 0, pl.dead ? 1 : 0, pl.hpPct ?? 100, pl.clone ? 1 : 0, c.pet || '', pl.mount || 0, plMask(pl, Date.now()), awkEl(pl, Date.now()), c.lookW ?? c.wep ?? 0, c.lookA ?? c.arm ?? 0, c.elem || '', c.helm || 0, c.cape || 0, ...['fashion', 'wlook', 'clook', 'hlook', 'dragon'].map(k => (c.wear && c.wear[k]) || ''), pl.fk ? 1 : 0]; }

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
    m.dead = d.boss ? 30 * D.BOSSRESPAWN : 30 * 7; m.hp = 0; if (m.fight) fightEnd(w, m, 'win');
    ns.to(w.room).emit('kill', { i: m.i });
    const y = D.MAPS[m.mi].seg[m.seg].y, now = Date.now(), news = [];
    const add = (t, v, dx) => { const id = w.dseq++; const dr = { id, t, v, x: clamp(m.x + dx, 10, D.WW - 10), y, until: now + 25000, fy: y - m.w * .5 }; w.drops.set(id, dr); news.push(dr); };
    add('gold', ri(...d.gold), 0);
    if (Math.random() < (d.boss ? 1 : .12)) add(Math.random() < .6 ? 'pot' : 'eth', 1, 8);
    if (d.boss) for (let k = 0; k < 4; k++) add('gold', Math.round(ri(...d.gold) / 6), rnd(-30, 30));
    for (const [id, mt] of Object.entries(D.MOUNTS)) if (mt.drop === m.t && Math.random() < mt.rate) { add('mnt:' + id, 1, 14); ns.to(w.room).emit('sys', { t: `🐎 ${d.name} 掉落了坐騎「${mt.n}」！` }); }
    if (d.boss && !d.trial && !d.rival) {   // 傳說 0.5%（Lv55 以上 Boss）、神話 0.1%（深淵海溝以後的 Boss 與所有暗黑版）；暗黑版 ×5
      const L = D.LOOT, mul = m.dark ? L.darkMul : 1, nm = (m.dark ? '暗黑' : '') + d.name;
      if ((d.lv >= L.legLv || m.dark) && Math.random() < L.leg * mul) { add('leg', 1, -10); ns.to(w.room).emit('sys', { t: `✦ ${nm} 掉落了傳說裝備！快去撿！` }); }
      if ((D.MAPS[m.mi].deep || m.dark) && Math.random() < L.myth * (m.dark && D.MAPS[m.mi].deep ? L.darkMul : 1)) { add('myth', 1, 10); ns.to(w.room).emit('sys', { t: `🌌 ${nm} 掉落了神話裝備！！快去撿！` }); }
    }
    ns.to(w.room).emit('drop', news);
    // 經驗：有出手的人，加上他們在同一張地圖的隊友（沒出手也有基本份額），一起打比較划算
    const total = Object.values(m.dmgBy).reduce((a, b) => a + b, 0) || 1, gain = new Set(Object.keys(m.dmgBy));
    for (const u of [...gain]) for (const v of partyMates(u)) if (w.players.has(v)) gain.add(v);
    for (const uid of gain) {
      const dmg = m.dmgBy[uid] || 0, c = char(uid); if (!c || !w.players.has(uid)) continue;
      const share = Math.min(1, dmg / total + .3), ld = d.lv - c.lv, ef = ld < -10 ? .3 : ld < -5 ? .65 : 1;
      // 低等玩家跟打高等怪：照樣有經驗，但單次最多約 1.5 級，避免一隻王直接衝十幾級
      let e = Math.max(1, Math.round(d.exp * ef * share)); if (ld > 12) e = Math.min(e, Math.round(D.needExp(c.lv) * 1.5));
      // 強化材料：海洋地圖
      if (D.MAPS[m.mi].sea || (d.boss && m.dark)) { const got = {}, give = (k2, v) => { if (v > 0) { c.mat[k2] = (c.mat[k2] || 0) + v; got[k2] = v; } }, mul = m.dark ? 5 : 1, deep = D.MAPS[m.mi].deep, sea = D.MAPS[m.mi].sea;
        if (d.boss) { if (sea) { give('s1', ri(5, 10) * mul); give('s2', ri(2, 4) * mul); if (deep) give('s3', ri(1, 3) * mul + Math.max(0, Math.floor((d.lv - 105) / 5))); if (Math.random() < .15) give('luck', 1); if (Math.random() < .1) give('guard', 1); }
          if ((deep && Math.random() < .03 * mul) || (!deep && m.dark && Math.random() < .15)) give('nodown', 1);
          if (Math.random() < .05) give('luck2', 1); }
        else { if (Math.random() < .08) give('s1', 1); if (deep && Math.random() < .02) give('s2', 1); if (Math.random() < .01) give('luck2', 1); }
        if (Object.keys(got).length) ns.to('u:' + uid).emit('mat', got); }
      if (c.cls === 'novice' && c.lv >= D.NOVLV) e = Math.max(1, Math.round(e * D.NOVEXP));   // 戰五渣 10 等之後經驗減半
      // 龍蛋：只有戰五渣在蘑菇森林打怪會掉，巨菇王第 5 次必掉（不公告）
      if (c.cls === 'novice' && !c.egg && D.EGG.maps.includes(m.mi) && D.EGG.rate[m.t]) {
        if (m.t === 'king') c.eggK = (c.eggK || 0) + 1;
        if (Math.random() < D.EGG.rate[m.t] || (m.t === 'king' && c.eggK >= D.EGG.pity)) { c.egg = 1; ns.to('u:' + uid).emit('notice', { t: '🥚 你撿到了一顆溫熱的龍蛋！10 等之後帶去像素村找「龍語者」' }); }
      }
      const lv0 = c.lv, up = D.addExp(c, e);
      ns.to('u:' + uid).emit('gain', { exp: e, lv: c.lv, up, newJob: up && D.JOBLV.some(j => j > lv0 && j <= c.lv) });
      if (up) ns.to(w.room).emit('lvup', { id: uid });
      pushMe(uid);
    }
    if (d.boss) ns.to(w.room).emit('sys', { t: `${D.MON[m.t].name} 被打倒了！最後一擊：${nameOf(killer)}` });
    // 記錄打倒過的 Boss（地獄之門、虛空之門、之後的嚮導捷徑都看這個）
    if (d.boss) for (const u of new Set([killer, ...gain])) {
      const c = char(u); if (!c || !w.players.has(u)) continue; c.slain ||= {}; const first = !c.slain[m.t]; c.slain[m.t] = 1;
      const gate = first && D.MAPS.some(mp => (mp.portals || []).some(p => p.gate === m.t)) && D.MAPS.flatMap(mp => mp.portals || []).find(p => p.gate === m.t);
      if (gate) ns.to('u:' + u).emit('notice', { t: `🚪 你打倒了${D.MON[m.t].name}，「${gate.label.replace(/ →$/, '')}」為你開啟了！` });
      pushMe(u);
    }
    // 突破等級上限：天穹泰坦 → 100、黑龍王 → 120（有出手的玩家，和他們在同一張地圖的隊友）
    const capTo = D.CAPBOSS[m.t];
    if (capTo) for (const u of new Set([killer, ...gain])) {
      const c = char(u); if (!c || !w.players.has(u) || D.capOf(c) >= capTo) continue;
      c.cap = capTo; pushMe(u);
      const next = { 100: '繼續往「暗黑神殿」前進吧', 120: '最後的戰場「虛空裂隙」在等著你' }[capTo];
      ns.to('u:' + u).emit('notice', { t: `🌊 你突破了極限！等級上限提升到 ${capTo}，${next}` });
      ns.emit('sys', { t: `🌊 ${nameOf(u)} 擊敗${D.MON[m.t].name}，突破等級上限到 ${capTo}！` });
    }
    m.dmgBy = {}; save();
  }

  // ---------------- 守護靈覺醒 ----------------
  // pl.awT：啟動時間；pl.awCd：冷卻結束時間；c.ag：覺醒值（存檔）；c.awk：已解鎖
  const awkEl = (pl, now) => (pl.awT && now - pl.awT < D.AWK.dur ? now - pl.awT : -1);
  const awkOf = (pl, now, pvp) => D.awkFx(awkEl(pl, now), pvp);
  // 覺醒狀態跟著「角色」走：換角色、重新整理網頁、斷線重連都不會弄丟或帶到別的角色身上
  const AWS = new Map();
  const awKey = uid => uid + ':' + alt(uid).act;
  function awSave(uid, pl) { AWS.set(awKey(uid), { awT: pl.awT || 0, awCd: pl.awCd || 0, finUsed: pl.finUsed || 0, finUntil: pl.finUntil || 0 }); }
  function awLoad(uid, pl) { const s = AWS.get(awKey(uid)) || {}, now = Date.now(); pl.awT = s.awT || 0; pl.awCd = s.awCd || 0; pl.finUsed = s.finUsed || 0; pl.finUntil = s.finUntil || 0;
    if (pl.awT && now - pl.awT >= D.AWK.dur) { pl.awCd = Math.max(pl.awCd, pl.awT + D.AWK.dur + D.AWK.cd); pl.awT = 0; pl.finUntil = 0; } }
  const awPub = (pl, now) => ({ el: awkEl(pl, now), cd: Math.max(0, (pl.awCd || 0) - now), fu: pl.finUsed ? 1 : 0 });
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
    if (S.maint && !isGM(uid)) return next(new Error('maint'));   // 維護中：只有 GM 能進
    socket.data.uid = uid; next();
  });
  // ---------------- PVP：決鬥與競技場（血量與傷害都由伺服器判定） ----------------
  const pvpRec = c => (c.pvp ||= { pts: 0, k: 0, d: 0, w: 0, l: 0 });
  function pvpDamage(ac, tc, tpl, h, now, apl) {
    const st = D.stats(ac), ts = D.stats(tc), aa = apl && awkOf(apl, now, true), ta = awkOf(tpl, now, true);
    const fin = apl && h.fin && now < (apl.finUntil || 0), mult = clamp(+h.mult || 1, .1, fin ? 6 : 3.2), crit = Math.random() * 100 < st.crit + clamp(+h.cb || 0, 0, 40);
    const G = D.GUARD[ac.cls], dm = fin ? G.fdm || 1 : h.ga && aa ? G.gdm || 1 : typeof h.k === 'string' && D.SK[ac.cls][h.k] && !D.skillLock(ac, h.k) ? (D.SK[ac.cls][h.k].dm || 1) * (h.g9 && aa && ac.lv >= D.AWSKLV && D.AWSK[ac.cls] && D.AWSK[ac.cls][h.k] ? D.AWSK_MULT : 1) : 1;
    let raw = st.atk * mult * rnd(.9, 1.1) * (crit ? st.critD || 1.7 : 1) * (h.sk ? 1 + (st.skillB || 0) : 1) * (aa ? aa.atk : 1) * dm;
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
    awLoad(uid, pl);
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
        mons: w.mons.map(m => ({ i: m.i, x: m.x, hop: m.hop, f: m.f, hp: m.hp, max: m.max, dead: m.dead ? 1 : 0, sp: m.sp, dark: m.dark ? 1 : 0 })),
        fights: w.mons.filter(m => m.fight).map(fightPub),
        pvp: D.MAPS[mi].pvp || null, php: pl.php, pmax: pl.pmax, aw: awPub(pl, Date.now()),
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

    socket.emit('hello', { gm: isGM(uid) ? 1 : 0, me: me(uid), name: S.users[uid]?.name || '玩家', id: uid, list: slotList(uid), act: alt(uid).act });
    function leaveWorld() { if (pl.duel) { const du = duels.get(pl.duel); if (du) duelEnd(pl.duel, du.a === uid ? du.b : du.a, '對手離開'); } if (w) { w.players.delete(uid); ns.to(w.room).emit('pleave', { id: uid }); socket.leave(w.room); if (trials.get(uid) === w) trials.delete(uid); w = null; } ret = null; }
    // 切換到第 i 格（使用中的角色收回自己的格子）
    function swapTo(i) { const a = alt(uid); if (i === a.act) return; a.slots[a.act] = S.rpg[uid] || null; S.rpg[uid] = a.slots[i]; a.slots[i] = null; a.act = i; if (!S.rpg[uid]) delete S.rpg[uid]; }
    socket.on('chars', (_, ack) => ack && ack({ list: slotList(uid), act: alt(uid).act }));
    socket.on('useSlot', ({ i } = {}, ack) => {
      i = i | 0; if (i < 0 || i >= MAXSLOT) return ack && ack({ ok: false });
      const a = alt(uid), c = i === a.act ? S.rpg[uid] : a.slots[i]; if (!c) return ack && ack({ ok: false, msg: '這一格沒有角色' });
      awSave(uid, pl); leaveWorld(); swapTo(i); awLoad(uid, pl); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('create', ({ cls, slot, nm } = {}, ack) => {
      if (!D.CL[cls]) return ack && ack({ ok: false });
      if (!isGM(uid)) cls = 'novice';   // 新角色一律從戰五渣開始（GM 測試可以直接建立任何職業）
      if (D.HIDDEN[cls] && !isGM(uid)) return ack && ack({ ok: false, msg: '這個職業還沒開放' });
      nm = String(nm || '').trim(); if (nm) { const er = nameErr(uid, nm, null); if (er) return ack && ack({ ok: false, msg: er }); }
      const a = alt(uid); slot = slot == null ? a.act : slot | 0; if (slot < 0 || slot >= MAXSLOT) return ack && ack({ ok: false });
      if ((slot === a.act ? S.rpg[uid] : a.slots[slot])) return ack && ack({ ok: false, msg: '這一格已經有角色了' });
      awSave(uid, pl); leaveWorld(); swapTo(slot); awLoad(uid, pl); S.rpg[uid] = D.newChar(cls); if (nm) S.rpg[uid].nm = nm; save(); ack && ack({ ok: true, me: me(uid) });
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
    socket.on('enter', (_, ack) => { const c = char(uid); if (!c) return ack && ack({ ok: false }); if (D.MAPS[c.map || 0]?.pvp || D.MAPS[c.map || 0]?.trial) c.map = 0; if (!D.MAPS[c.map || 0]) c.map = 0; enter(c.map || 0); ack && ack({ ok: true });
      if (D.VERSION && S.users[uid] && S.users[uid].seenVer !== D.VERSION) socket.emit('news', { v: D.VERSION, list: D.newsSince(S.users[uid].seenVer) });
      if (c.apComp) { delete c.apComp; save(); socket.emit('notice', { t: `能力值系統改版補償：獲得 ${D.APRESET.toLocaleString()} 金幣，可以到「能力」重新配點！` }); } });
    socket.on('pos', (p = {}) => {
      if (!w) return;
      pl.x = clamp(+p.x || 0, 0, D.WW); pl.y = clamp(+p.y || 0, -100, D.WH + 60); pl.f = p.f < 0 ? -1 : 1; pl.act = p.act ? 1 : 0; pl.rope = p.rope ? 1 : 0; pl.dead = p.dead ? 1 : 0;
      if (isPvp(w)) { pl.dead = pl.php <= 0 ? 1 : 0; } else { const hp = clamp(Math.round(+p.hp || 0), 0, 100); if (hp < (pl.hpPct ?? 100) && !pl.dead) addAg(uid, pl, Math.min(15, (pl.hpPct ?? 100) - hp) * D.AWK.hurtPer); pl.hpPct = hp; }
      if (pl.bf && pl.bf.fight && pl.bf.fight.u.has(uid)) pl.x = clamp(pl.x, pl.bf.fight.x1, pl.bf.fight.x2); else pl.bf = null;
      if (pl.fakeT) { if (!p.fk) pl.fakeT = 0; } pl.fk = p.fk ? 1 : 0;
      pl.clone = p.clone ? 1 : 0; if (p.gy != null) pl.gy = clamp(+p.gy || 0, -100, D.WH + 60); pl.mount = p.mount && (char(uid)?.lv || 0) >= D.MOUNTLV && awkEl(pl, Date.now()) < 0 ? (char(uid).mnt || 'horse') : 0;
    });
    socket.on('elem', ({ e } = {}, ack) => {   // 巨龍使者：一轉時免費選屬性，之後找轉職教官花金幣更換
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || c.cls !== 'dragon') return no('');
      if (!D.ELEM[e]) return no('沒有這個屬性'); if (c.job < 1) return no('一轉後才能選擇龍的屬性'); if (c.elem === e) return no('已經是這個屬性了');
      if (c.elem) { if (!w || w.mi !== 0) return no('要在像素村找龍語者更換'); if (c.gold < D.ELEMSWAP) return no(`更換屬性需要 ${D.ELEMSWAP.toLocaleString()} 金幣`); c.gold -= D.ELEMSWAP; }
      c.elem = e; D.fix(c); save(); pushMe(uid); ack && ack({ ok: true, me: me(uid) });
      if (w) ns.to(w.room).emit('sys', { t: `🐉 ${nameOf(uid)} 的龍覺醒了「${D.ELEM[e].n}」之力！`, quiet: 1 });
    });
    socket.on('equip', ({ k, i } = {}, ack) => {   // 換上已擁有的武器／防具（商店最好的那件，或傳說／神話）
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c) return no(''); D.gearOk(c); i = i | 0;
      if (k === 'w') { const it = D.WEAPONS[c.cls][i]; if (!it || !(i === c.shopW || c.own.w.includes(i))) return no('還沒有這把武器'); if (c.lv < it[2]) return no(`需要 Lv ${it[2]}`); c.wep = i; }
      else if (k === 'a') { const it = D.ARMORS[i]; if (!it || !(i === c.shopA || c.own.a.includes(i))) return no('還沒有這件防具'); if (c.lv < it[3]) return no(`需要 Lv ${it[3]}`); c.arm = i; }
      else if (k === 'h' || k === 'c') { const L = k === 'h' ? D.HELMS : D.CAPES, it = L[i]; if (!it || (i && !c.own[k].includes(i))) return no('還沒有這件裝備'); if (c.lv < it[3]) return no(`需要 Lv ${it[3]}`); c[k === 'h' ? 'helm' : 'cape'] = i; }
      else return no(''); save(); ack && ack({ ok: true, me: me(uid) });
    });
    // ---------------- 背包：賣掉商店裝備 ----------------
    const GK = ['w', 'a', 'h', 'c'], SLOT = { w: 'wep', a: 'arm', h: 'helm', c: 'cape' };
    const gearList = (c, k) => k === 'w' ? D.WEAPONS[c.cls] : k === 'a' ? D.ARMORS : k === 'h' ? D.HELMS : D.CAPES, tierOf = (c, k, i) => (gearList(c, k)[i] || [])[k === 'w' ? 4 : 5] || 0, priceOf = (c, k, i) => (gearList(c, k)[i] || [])[k === 'w' ? 3 : 4] || 0;
    const fixShopBest = c => { for (const k of ['w', 'a']) { const ord = k === 'w' ? D.SHOPW : D.SHOPA; let best = ord[0]; for (const i of c.own[k]) if (!tierOf(c, k, i) && ord.indexOf(i) > ord.indexOf(best)) best = i; if (k === 'w') c.shopW = best; else c.shopA = best; } };
    const loseGear = (c, k, i) => { c.own[k] = c.own[k].filter(x => x !== i); delete c.enh[k][i];
      if (k === 'h' || k === 'c') { if (c[SLOT[k]] === i) c[SLOT[k]] = 0; return; }   // 頭盔、披風：直接卸下
      if (!c.own[k].length) c.own[k].push(0);   // 至少留一件最基本的
      const cur = k === 'w' ? 'wep' : 'arm'; if (c[cur] === i) { const L = gearList(c, k), lvI = k === 'w' ? 2 : 3, ok = c.own[k].filter(x => (L[x] || [])[lvI] <= c.lv); c[cur] = ok.sort((a, b) => L[b][1] - L[a][1])[0] ?? 0; }
      if (k === 'w' && c.lookW === i) delete c.lookW; if (k === 'a' && c.lookA === i) delete c.lookA; fixShopBest(c); };
    socket.on('sellGear', ({ k, i } = {}, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || !GK.includes(k)) return no(''); i = i | 0;
      if (!c.own[k].includes(i)) return no('沒有這件裝備'); if (tierOf(c, k, i)) return no('傳說和神話裝備不能賣');
      if (c[SLOT[k]] === i) return no('正在穿的裝備不能賣，先換上別件');
      const g = Math.floor(priceOf(c, k, i) * D.SELLR); loseGear(c, k, i); c.gold += g; save(); ack && ack({ ok: true, me: me(uid), gold: g });
    });
    // ---------------- 鐵匠 老鐵：強化、移植、賣卷軸（只在潮聲港） ----------------
    const atSmith = () => { const n = w && (D.MAPS[w.mi].npcs || []).find(x => x.kind === 'smith'); if (!n) return '要在城鎮找鐵匠'; return Math.abs(pl.x - n.x) > 90 ? '離鐵匠太遠了' : ''; };
    const gearName = (c, k, i) => (gearList(c, k)[i] || ['?'])[0];
    // 打鐵小遊戲（+6 以上）：先領開始單，敲完再送 enh；伺服器檢查時間合不合理
    socket.on('enhStart', ({ k, i } = {}, ack) => { const c = char(uid); if (!c) return ack && ack({ ok: false }); { const e = atSmith(); if (e) return ack && ack({ ok: false, msg: e }); }
      pl.enhTok = { k, i: i | 0, t: Date.now() }; ack && ack({ ok: true }); });
    socket.on('enh', ({ k, i, luck, guard, perf, auto, skip, use, nodown } = {}, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || !GK.includes(k)) return no(''); { const e = atSmith(); if (e) return no(e); }
      i = i | 0; if (!c.own[k].includes(i) || ((k === 'h' || k === 'c') && !i)) return no('沒有這件裝備');
      const cur = D.enhOf(c, k, i), n = cur + 1; if (n > D.ENHMAX) return no(`已經強化到 +${D.ENHMAX} 了`);
      const E = D.ENH[n], m = c.mat, O = E.opts.find(x => x.mat === use) || E.opts[0]; if ((m[O.mat] || 0) < O.num) return no(`需要 ${D.MATN[O.mat]} ×${O.num}`); if (c.gold < E.gold) return no(`需要 ${E.gold.toLocaleString()} 金幣`);
      if (luck && luck !== 'luck' && luck !== 'luck2') luck = null; if (luck && !(m[luck] > 0)) return no(`沒有${D.MATN[luck]}`);
      guard = !!guard && E.brk > 0; if (guard && !(m.guard > 0)) return no('沒有守護卷軸');
      nodown = !!nodown && n >= D.SCROLL.nodown.lv; if (nodown && !(m.nodown > 0)) return no('沒有防降級卷軸'); if (nodown) m.nodown--;
      m[O.mat] -= O.num; c.gold -= E.gold; if (luck) m[luck]--; if (guard) m.guard--;
      // 敲擊加成：完美 1 次 +1%、2 次 +3%、3 次 +5%；5 秒沒敲自動敲時隨機 0／1／3／5%（60／20／15／5%）；跳過 0%
      let hb = 0; if (n >= 6) { const tk = pl.enhTok, okT = tk && tk.k === k && tk.i === i && Date.now() - tk.t < 120000; pl.enhTok = null;
        if (okT && !skip) { if (auto) { const r = Math.random(); hb = r < .6 ? 0 : r < .8 ? .01 : r < .95 ? .03 : .05; }
          else { let p = Math.max(0, Math.min(3, perf | 0)); if (Date.now() - tk.t < 700 * p) p = 0; hb = [0, .01, .03, .05][p]; } } }
      const rate = Math.min(1, O.rate + (luck ? D.SCROLL[luck].add : 0) + hb), nm = gearName(c, k, i), t = tierOf(c, k, i);
      let res;
      if (Math.random() < rate) { c.enh[k][i] = n; res = { r: 'ok', n };
        if (n >= 10) ns.emit('sys', { t: `🔥 ${nameOf(uid)} 成功把「${nm}」強化到 +${n}！` }); }
      else if (E.brk && !guard && Math.random() < E.brk) {
        if (t) { c.enh[k][i] = 0; res = { r: 'reset', n: 0 }; ns.emit('sys', { t: `💥 ${nameOf(uid)} 的「${nm}」在強化 +${n} 時失敗，被打回 +0……` }); }
        else { loseGear(c, k, i); res = { r: 'broke' }; ns.emit('sys', { t: `💥 ${nameOf(uid)} 的「${nm}」在強化 +${n} 時碎掉了……` }); }
      } else { const nn = !nodown && E.down && Math.random() < E.down ? Math.max(0, cur - 1) : cur; c.enh[k][i] = nn; res = { r: 'fail', n: nn, down: nn < cur, saved: !!(E.brk && guard) }; }
      save(); ack && ack({ ok: true, ...res, hb: Math.round(hb * 100), rate: Math.round(rate * 100), me: me(uid) });
    });
    socket.on('xfer', ({ k, from, to } = {}, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || !GK.includes(k)) return no(''); { const e = atSmith(); if (e) return no(e); }
      from = from | 0; to = to | 0; if (from === to || !c.own[k].includes(from) || !c.own[k].includes(to)) return no('要選兩件不同的裝備');
      const n = D.enhOf(c, k, from), nn = Math.max(0, n - D.XFER.lose); if (n < 1) return no('原本那件沒有強化');
      if (D.enhOf(c, k, to) >= nn) return no(`移植後只剩 +${nn}，沒有比目標裝備現在的強化高`);
      const g = D.XFER.gold * n; if (c.gold < g) return no(`需要 ${g.toLocaleString()} 金幣`); c.gold -= g;
      const ok = Math.random() < D.XFER.rate; c.enh[k][from] = 0; if (ok) c.enh[k][to] = nn;
      save(); ack && ack({ ok: true, success: ok, n: nn, me: me(uid) });
    });
    socket.on('buyScroll', ({ s: sc, n } = {}, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c) return no(''); { const e = atSmith(); if (e) return no(e); }
      const S0 = D.SCROLL[sc]; if (!S0 || !S0.price) return no('這個卷軸買不到'); n = Math.max(1, Math.min(10, n | 0 || 1));
      if (c.gold < S0.price * n) return no('金幣不足'); c.gold -= S0.price * n; c.mat[sc] = (c.mat[sc] || 0) + n; save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('look', ({ k, i } = {}, ack) => {   // 外觀欄：選一件擁有的傳說以上裝備當外觀（null = 顯示身上裝備）
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c) return no(''); D.gearOk(c);
      if (i == null) { if (k === 'w') delete c.lookW; else delete c.lookA; }
      else if (k === 'w') { i = i | 0; if (!c.own.w.includes(i) || !(D.WEAPONS[c.cls][i] || [])[4]) return no('只能選擁有的傳說以上武器'); c.lookW = i; }
      else if (k === 'a') { i = i | 0; if (!c.own.a.includes(i) || !(D.ARMORS[i] || [])[5]) return no('只能選擁有的傳說以上防具'); c.lookA = i; }
      else return no(''); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('bEngage', ({ i } = {}, ack) => {
      const no = msg => ack && ack({ ok: false, msg }); const c = char(uid); if (!w || !c || pl.dead) return no('現在不能挑戰');
      const m = w.mons[i | 0]; if (!m || m.dead || !isOpenBoss(m)) return no('這裡沒有可以挑戰的 Boss');
      if (m.fight) return no(`${D.MON[m.t].name} 正在和其他冒險者戰鬥，等這場打完再來`);
      const z = D.bossZone(m.t), seg = D.MAPS[m.mi].seg[m.seg]; if (Math.abs(pl.x - m.x) > z + 20) return no('離 Boss 太遠了');
      const x1 = Math.round(Math.max(seg.x1 + 4, m.x - z)), x2 = Math.round(Math.min(seg.x2 - 4, m.x + z));
      const u = new Set([uid]); for (const v of partyMates(uid)) { const p = w.players.get(v); if (p && !p.dead) u.add(v); }
      bossReset(w, m); m.fight = { u, x1, x2, until: Date.now() + D.FIGHT_MS, by: uid };
      for (const v of u) { const k = ctl.get(v); if (!k) continue; k.pl.bf = m; if (v !== uid || k.pl.x < x1 || k.pl.x > x2) { const tx = v === uid ? clamp(k.pl.x, x1 + 10, x2 - 10) : clamp(pl.x + rnd(-30, 30), x1 + 10, x2 - 10); k.pl.x = tx; ns.to('u:' + v).emit('bfTp', { x: Math.round(tx), y: seg.y }); } }
      ns.to(w.room).emit('bfight', fightPub(m));
      ns.to(w.room).emit('sys', { t: `⚔️ ${nameOf(uid)}${u.size > 1 ? ` 和 ${u.size - 1} 位隊友` : ''} 向${m.dark ? '暗黑' : ''}${D.MON[m.t].name} 發起挑戰！` });
      ack && ack({ ok: true });
    });
    socket.on('hit', (list) => {
      const c = char(uid); if (!w || !c || !Array.isArray(list) || pl.dead || pl.mount) return;
      const now = Date.now(); if (now - rate.t > 1000) { rate = { t: now, n: 0 }; }
      const st = D.stats(c), out = [], efs = D.efOf(c.cls, c), aw = awkOf(pl, now), G = D.GUARD[c.cls]; let dealt = 0;
      const skScale = h => (h.fin ? G.fdm || 1 : h.ga && aw ? G.gdm || 1 : typeof h.k === 'string' && D.SK[c.cls][h.k] && !D.skillLock(c, h.k) ? (D.SK[c.cls][h.k].dm || 1) * (h.g9 && aw && c.lv >= D.AWSKLV && D.AWSK[c.cls] && D.AWSK[c.cls][h.k] ? D.AWSK_MULT : 1) : 1);
      for (const h of list.slice(0, 20)) {
        if (++rate.n > 60) break;
        const m = w.mons[h.m | 0]; if (!m || m.dead || m.hp <= 0) continue;
        if (Math.abs(m.x - pl.x) > 360) continue;
        const fin = h.fin && now < (pl.finUntil || 0), mult = clamp(+h.mult || 1, .1, fin ? 6 : 3.2), cb = clamp(+h.cb || 0, 0, 40);
        const crit = Math.random() * 100 < st.crit + cb;
        const boss = D.MON[m.t].boss;
        if (boss && isOpenBoss(m) && !(m.fight && m.fight.u.has(uid))) { if (now - (pl.immT || 0) > 400) { pl.immT = now; socket.emit('bimm', { i: m.i, why: m.fight ? 'busy' : 'talk' }); } continue; }   // 沒有對話開戰：打不到
        if (boss && !inZone(pl, m)) { if (now - (pl.immT || 0) > 400) { pl.immT = now; socket.emit('bimm', { i: m.i }); } continue; }   // 危險區外偷打：Boss 不受傷
        let dmg = Math.max(1, Math.round(st.atk * mult * rnd(.85, 1.15) * (crit ? st.critD || 1.7 : 1) * (now < m.vuln ? 1.2 : 1) * (h.sk ? 1 + (st.skillB || 0) : 1) * (aw ? aw.atk : 1) * (fin && boss ? D.AWK.finBoss : 1) * skScale(h)));
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
      { const sk = D.SK[char(uid).cls][p.k], now = Date.now(); if (sk && sk.g && sk.g.buff === 'guard') pl.guardT = now + 15000; if (char(uid).cls === 'mech' && p.k === 's5') pl.shieldT = now + 10000; if (char(uid).cls === 'novice' && p.k === 's3' && !D.skillLock(char(uid), 's3')) pl.fakeT = now + 3000; } socket.to(w.room).emit('cast', { id: uid, k: p.k, x: +p.x || 0, y: +p.y || 0, f: p.f < 0 ? -1 : 1, r: p.r ? 1 : 0 }); });
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
      if ((d.t === 'pot' || d.t === 'eth') && (c[d.t] || 0) >= D.POTMAX) return ack && ack({ ok: false, full: 1, msg: `${d.t === 'pot' ? '紅' : '藍'}藥水最多帶 ${D.POTMAX} 瓶` });
      w.drops.delete(id);
      let leg = null;
      if (d.t === 'gold') c.gold += d.v;
      else if (d.t.startsWith('mnt:')) {
        const id = d.t.slice(4), mt = D.MOUNTS[id];
        if (!mt || c.mounts.includes(id)) { c.gold += 30000; leg = { mntDup: mt ? mt.n : '' }; }
        else { c.mounts.push(id); leg = { mnt: id }; ns.to(w.room).emit('sys', { t: `🐎 ${nameOf(uid)} 獲得了坐騎「${mt.n}」！` }); }
      }
      else if (d.t === 'leg' || d.t === 'myth') {
        const tier = d.t === 'leg' ? 1 : 2, pool = D.legPool(c, tier), tn = D.TIERN[tier];
        if (!pool.length) { const g = tier === 1 ? 200000 : 600000; c.gold += g; leg = { dup: 1, gold: g, tier }; }
        else { const it = pool[ri(0, pool.length - 1)]; let name;
          if (it.k === 'w') { c.own.w.push(it.i); name = D.WEAPONS[c.cls][it.i][0]; } else if (it.k === 'a') { c.own.a.push(it.i); name = D.ARMORS[it.i][0]; } else if (it.k === 'h') { c.own.h.push(it.i); name = D.HELMS[it.i][0]; } else if (it.k === 'c') { c.own.c.push(it.i); name = D.CAPES[it.i][0]; } else { c.mounts.push(it.id); name = D.MOUNTS[it.id].n; }
          leg = { name, tier, kind: it.k }; ns.emit('sys', { t: `${tier === 2 ? '🌌' : '✦'} ${nameOf(uid)} 獲得了${tn}${({ w: '武器', a: '防具', h: '頭盔', c: '披風' })[it.k] || '坐騎'}「${name}」！` }); }
      } else c[d.t] = (c[d.t] || 0) + 1;
      ns.to(w.room).emit('dgone', { id, by: uid }); save(); pushMe(uid); ack && ack({ ok: true, t: d.t, v: d.v, leg });
    });
    const potT = {}; // 每個連線各自記錄喝藥時間，換地圖也不會重置
    socket.on('use', ({ k } = {}, ack) => {
      const c = char(uid); if (!c || !['pot', 'eth'].includes(k) || !(c[k] > 0)) return ack && ack({ ok: false });
      const now = Date.now();
      if (now - (potT[k] || 0) < D.POTCD - 250) return ack && ack({ ok: false, cd: 1, me: me(uid) }); // 留 250ms 給網路延遲
      potT[k] = now; c[k]--; save(); ack && ack({ ok: true, me: me(uid) });
      if (k === 'pot' && isPvp(w) && pl.php > 0) { const st = D.stats(c); pvpHp(pl.php + (st.hp * .35 + 40) * (1 + (st.potB || 0))); }
    });
    socket.on('buy', ({ k, i, n } = {}, ack) => {
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      const no = msg => ack && ack({ ok: false, msg });
      if (k === 'home') {
        if (!w || !D.MAPS[w.mi].town) return no('要在城鎮才能購買'); n = Math.max(1, Math.min(20, n | 0 || 1)); const price = D.HOMESCROLL.price * n;
        if (c.gold < price) return no('金幣不足'); c.gold -= price; D.gearOk(c); c.mat.home = (c.mat.home || 0) + n;
      } else if (k === 'pot' || k === 'eth' || k === 'pot10' || k === 'rest') {
        if (!w || !D.MAPS[w.mi].town) return no('要在村莊（像素村、潮聲港）才能購買');
        const price = D.shopPrice(k, c.lv); if (c.gold < price) return no('金幣不足');
        if ((k === 'pot' && c.pot >= D.POTMAX) || (k === 'eth' && c.eth >= D.POTMAX)) return no(`藥水最多帶 ${D.POTMAX} 瓶`);
        if (k === 'pot10' && c.pot + 10 > D.POTMAX) return no(`紅藥水最多帶 ${D.POTMAX} 瓶，現在只能再買 ${Math.max(0, D.POTMAX - c.pot)} 瓶`);
        c.gold -= price; if (k === 'pot') c.pot++; else if (k === 'eth') c.eth++; else if (k === 'pot10') c.pot += 10;
      } else if (k === 'wep') {
        i = i | 0; const it = D.WEAPONS[c.cls][i]; D.gearOk(c);
        if (!it || it[4]) return no(it && it[4] ? `${D.TIERN[it[4]]}武器只能打倒 Boss 取得` : '無法購買');
        if (c.own.w.includes(i)) return no('已經擁有這把武器了（在「裝備」裡可以換上）');
        if (c.lv < it[2]) return no(`需要 Lv ${it[2]}`); if (c.gold < it[3]) return no('金幣不足');
        c.gold -= it[3]; c.own.w.push(i); c.wep = i; if (D.SHOPW.indexOf(i) > D.SHOPW.indexOf(c.shopW)) c.shopW = i;
      } else if (k === 'arm') {
        i = i | 0; const it = D.ARMORS[i]; D.gearOk(c);
        if (!it || it[5]) return no(it && it[5] ? `${D.TIERN[it[5]]}防具只能打倒 Boss 取得` : '無法購買');
        if (c.own.a.includes(i)) return no('已經擁有這件防具了（在「裝備」裡可以換上）');
        if (c.lv < it[3]) return no(`需要 Lv ${it[3]}`); if (c.gold < it[4]) return no('金幣不足');
        c.gold -= it[4]; c.own.a.push(i); c.arm = i; if (D.SHOPA.indexOf(i) > D.SHOPA.indexOf(c.shopA)) c.shopA = i;
      } else if (k === 'helm' || k === 'cape') {
        const kk = k === 'helm' ? 'h' : 'c', L = kk === 'h' ? D.HELMS : D.CAPES; i = i | 0; const it = L[i]; D.gearOk(c);
        if (!w || !D.MAPS[w.mi].town) return no('要在村莊（像素村、潮聲港）才能購買');
        if (!it || !i || it[5]) return no(it && it[5] ? `${D.TIERN[it[5]]}裝備只能打倒 Boss 取得` : '無法購買'); if (c.own[kk].includes(i)) return no('已經擁有了（在「裝備」裡可以換上）');
        if (c.lv < it[3]) return no(`需要 Lv ${it[3]}`); if (c.gold < it[4]) return no('金幣不足');
        c.gold -= it[4]; c.own[kk].push(i); c[kk === 'h' ? 'helm' : 'cape'] = i;
      } else if (k === 'mount') {
        const mt = D.MOUNTS[i]; if (!w || !D.MAPS[w.mi].town) return no('要在村莊（像素村、潮聲港）才能購買');
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
      if (c.cls === 'dragon') return ack && ack({ ok: false, msg: '巨龍使者的龍就是夥伴，不能另外擁有寵物' });
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
    // ---------------- 鑽石：GM 手動發放（留紀錄）、商城購買 ----------------
    const findUser = nm => { nm = String(nm || '').trim().toLowerCase(); if (!nm) return null; for (const [u, us] of Object.entries(S.users)) if (String(us.name || '').toLowerCase() === nm) return u;
      for (const u of Object.keys(S.users)) if (String(nameOf(u) || '').toLowerCase() === nm) return u; return null; };
    socket.on('maint', ({ on } = {}, ack) => {   // GM：開關維護模式（開啟時把非 GM 玩家請出去）
      if (!isGM(uid)) return ack && ack({ ok: false, msg: '只有 GM 帳號可以使用' });
      if (on != null) {
        S.maint = on ? 1 : 0; save();
        if (S.maint) { let n = 0; for (const s2 of ns.sockets.values()) { if (isGM(s2.data.uid)) continue; n++; s2.emit('maint', {}); setTimeout(() => s2.disconnect(true), 300); } return ack && ack({ ok: true, on: 1, kicked: n }); }
      }
      ack && ack({ ok: true, on: S.maint ? 1 : 0 });
    });
    socket.on('giveDia', ({ name, n, note } = {}, ack) => {
      const no = msg => ack && ack({ ok: false, msg }); if (!isGM(uid)) return no('只有 GM 帳號可以使用');
      n = Math.round(Number(n) || 0); if (!n || Math.abs(n) > 1000000) return no('數量錯誤'); const to = findUser(name); if (!to) return no('找不到這個玩家（帳號名稱或角色名稱）');
      const us = S.users[to]; us.dia = Math.max(0, (us.dia || 0) + n);
      (S.diaLog = S.diaLog || []).push({ t: Date.now(), by: S.users[uid].name, to: us.name, n, note: String(note || '').slice(0, 40), bal: us.dia }); if (S.diaLog.length > 2000) S.diaLog.splice(0, S.diaLog.length - 2000);
      save(); pushMe(to); ns.to('u:' + to).emit('notice', { t: n > 0 ? `💎 你獲得了 ${n} 顆鑽石！` : `💎 鑽石 ${n}` }); ack && ack({ ok: true, to: us.name, bal: us.dia, log: S.diaLog.slice(-15).reverse() });
    });
    socket.on('diaLog', (_, ack) => { if (!isGM(uid)) return ack && ack({ ok: false }); ack && ack({ ok: true, log: (S.diaLog || []).slice(-30).reverse() }); });
    socket.on('cashBuy', ({ id, n } = {}, ack) => {
      const c = char(uid), us = S.users[uid], no = msg => ack && ack({ ok: false, msg }); if (!c || !us) return no('');
      const it = D.CASH.find(x => x.id === id); if (!it) return no('沒有這個商品'); n = Math.max(1, Math.min(10, n | 0 || 1)); const cost = D.cashPrice(it) * n;
      if ((us.dia || 0) < cost) return no(`鑽石不足（需要 ${cost} 💎）`); us.dia -= cost; c.mat[it.mat] = (c.mat[it.mat] || 0) + it.q * n;
      (S.cashLog = S.cashLog || []).push({ t: Date.now(), u: us.name, id, n, cost }); if (S.cashLog.length > 5000) S.cashLog.splice(0, S.cashLog.length - 5000);
      save(); ack && ack({ ok: true, me: me(uid) });
    });
    // ---------------- 外觀：購買（帳號永久）、穿上／卸下 ----------------
    socket.on('cosBuy', ({ id } = {}, ack) => {
      const c = char(uid), us = S.users[uid], no = msg => ack && ack({ ok: false, msg }); if (!c || !us) return no('');
      const it = D.COS[id]; if (!it || it.src !== 'shop') return no('這個外觀買不到'); if (it.hidden && !isGM(uid) && D.HIDDEN.dragon) return no('還沒開放');
      us.cos = us.cos || []; if (us.cos.includes(id)) return no('已經擁有了'); const cost = D.cashPrice(it); if ((us.dia || 0) < cost) return no(`鑽石不足（需要 ${cost} 💎）`);
      us.dia -= cost; us.cos.push(id); c.wear = c.wear || {}; c.wear[it.k] = id;
      (S.cashLog = S.cashLog || []).push({ t: Date.now(), u: us.name, id, n: 1, cost }); save(); ack && ack({ ok: true, me: me(uid) });
    });
    socket.on('wear', ({ k, id } = {}, ack) => {
      const c = char(uid), us = S.users[uid], no = msg => ack && ack({ ok: false, msg }); if (!c || !us || !D.COSK[k]) return no('');
      c.wear = c.wear || {}; if (!id) { delete c.wear[k]; save(); return ack && ack({ ok: true, me: me(uid) }); }
      const it = D.COS[id]; if (!it || it.k !== k || !(us.cos || []).includes(id)) return no('還沒有這個外觀'); c.wear[k] = id; save(); ack && ack({ ok: true, me: me(uid) });
    });
    // ---------------- 轉蛋：公開機率、50 抽保底（50 抽內沒抽到傳說級外觀，第 50 抽必中） ----------------
    socket.on('gacha', ({ n } = {}, ack) => {
      const c = char(uid), us = S.users[uid], no = msg => ack && ack({ ok: false, msg }); if (!c || !us) return no('');
      const G = D.GACHA; n = n === 10 ? 10 : 1; const cost = (n === 10 ? G.price10 : G.price1) * D.CASHMUL; if ((us.dia || 0) < cost) return no(`鑽石不足（需要 ${cost} 💎）`);
      us.dia -= cost; us.cos = us.cos || []; const res = [];
      for (let k = 0; k < n; k++) {
        us.pity = (us.pity || 0) + 1; let it;
        if (us.pity >= G.pity) { const L = G.pool.filter(x => x.g === 2); it = L[ri(0, L.length - 1)]; }
        else { let r = Math.random(); it = G.pool[G.pool.length - 1]; for (const x of G.pool) { if (r < x.r) { it = x; break; } r -= x.r; } }
        if (it.g === 2) us.pity = 0;
        if (it.cos) { if (us.cos.includes(it.cos)) { c.mat.luck2 = (c.mat.luck2 || 0) + 2; res.push({ cos: it.cos, g: it.g, dup: 1 }); } else { us.cos.push(it.cos); res.push({ cos: it.cos, g: it.g }); }
          if (it.g === 2) ns.emit('sys', { t: `🎰 ${nameOf(uid)} 從轉蛋抽中了傳說外觀「${D.COS[it.cos].n}」！` }); }
        else { c.mat[it.mat] = (c.mat[it.mat] || 0) + it.q; res.push({ mat: it.mat, q: it.q }); }
      }
      (S.gachaLog = S.gachaLog || []).push({ t: Date.now(), u: us.name, n, cost, res: res.map(x => x.cos || `${x.mat}x${x.q}`) }); if (S.gachaLog.length > 5000) S.gachaLog.splice(0, S.gachaLog.length - 5000);
      save(); ack && ack({ ok: true, res, pity: us.pity, me: me(uid) });
    });
    socket.on('gm', ({ cls, job, lv, pet } = {}, ack) => {
      const no = msg => ack && ack({ ok: false, msg });
      if (!isGM(uid)) return no('只有 GM 帳號可以使用');
      if (!D.CL[cls]) return no('職業錯誤');
      if (w && (isPvp(w) || D.MAPS[w.mi].trial)) return no('請先離開決鬥場／競技場／試煉再切換');
      lv = clamp(lv | 0 || D.MAXLV, 1, D.MAXTOP); job = clamp(job | 0, 0, 4); while (job > 0 && D.JOBLV[job] > lv) job--;
      const old = S.rpg[uid] || {}, c = D.newChar(cls), wl = D.WEAPONS[cls];
      let wep = 0; wl.forEach((it, i) => { if (!it[4] && it[2] <= lv) wep = i; });
      let arm = 0; D.ARMORS.forEach((it, i) => { if (!it[5] && it[3] <= lv) arm = i; });
      c.own = { w: lv >= 80 ? [D.LEGI] : [], a: [] }; c.shopW = wep; c.shopA = arm;
      const mounts = Object.keys(D.MOUNTS).filter(k => (D.MOUNTS[k].lv || 0) <= lv); if (!mounts.length) mounts.push('horse');
      Object.assign(c, { gm: 1, lv, job, exp: 0, wep, arm, gold: 9999999, pot: 999, eth: 999, ap: (lv - 1) * D.APL, map: w ? w.mi : (old.map || 0), mounts,
        mnt: mounts.includes(old.mnt) ? old.mnt : mounts[mounts.length - 1], pet: lv >= D.PETLV && D.PETS[pet] ? pet : null });
      if (old.nm) c.nm = old.nm; if (old.wear) c.wear = old.wear; if (old.rnN) c.rnN = old.rnN; { const cp = Math.max(old.cap || 0, lv > 100 ? 120 : lv > D.MAXLV ? 100 : 0); if (cp) c.cap = cp; } if (lv >= D.AWK.lv && (job >= 4 || cls === 'novice')) { c.awk = 1; c.ag = D.AWK.max; } pl.awT = 0; pl.awCd = 0;   // 保留角色名字
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
      const g = D.GUARD[c.cls]; if (!c.awk) return no(`80 級四轉後（戰五渣 80 級即可），找像素村的師傅完成「覺醒試煉」才能喚醒守護靈`);
      if (!g.ready) return no(`${g.n} 還在準備中，下次更新開放`);
      const el = awkEl(pl, now);
      if (el >= 0) {
        if (pl.finUsed) return no('這次覺醒的終結技已經用過了');
        pl.finUsed = 1; pl.finUntil = now + D.AWK.finWin; ack && ack({ ok: true, fin: 1 });
        socket.to(w.room).emit('awkFin', { u: uid, x: Math.round(pl.x), f: pl.f }); return;
      }
      if (pl.dead) return no(''); if (pl.mount && c.cls !== 'dragon') return no('騎乘中不能覺醒，按 F 下坐騎'); pl.mount = 0;
      if (D.MAPS[w.mi].trial) return no('試煉中不能覺醒');
      if (now < (pl.awCd || 0)) return no(`守護靈冷卻中（還要 ${Math.ceil((pl.awCd - now) / 1000)} 秒）`);
      if ((c.ag || 0) < D.AWK.max) return no(`覺醒值還不夠（${Math.floor(c.ag || 0)}/${D.AWK.max}），繼續打怪或承受傷害就會累積`);
      c.ag = 0; pl.awT = now; pl.finUsed = 0; pl.finUntil = 0; pl.finAid = 0; save();
      ack && ack({ ok: true, on: 1 }); socket.emit('ag', { v: 0 });
      ns.to(w.room).emit('sys', { t: `🔥 ${nameOf(uid)} 喚醒了守護靈「${g.n}」！` });
    });
    socket.on('awkTrial', (_, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c) return no('');
      if (c.awk) return no('你已經喚醒過守護靈了');
      if (c.lv < D.AWK.lv || (c.job < 4 && c.cls !== 'novice')) return no(`要 Lv ${D.AWK.lv} 並完成四轉`);
      if (!D.GUARD[c.cls].ready) return no(`${D.GUARD[c.cls].n} 還在準備中，下次更新開放`);
      if (!w || w.mi !== 0) return no('要在像素村找師傅');
      const opts = Object.keys(D.CL).filter(k => k !== c.cls && !D.HIDDEN[k] && D.MON['rival_' + k]), rc = opts[ri(0, opts.length - 1)];
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
    socket.on('sail', ({ to } = {}, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || !w || w.mi !== 9) return no('要在潮聲港的碼頭搭船');
      const boat = D.MAPS[9].npcs.find(n => n.kind === 'boat'); if (Math.abs(pl.x - boat.x) > 90) return no('離船長太遠了');
      to = to === 11 ? 11 : 10; c.map = to; save(); ack && ack({ ok: true }); enter(to, D.MAPS[to].start);
    });
    // ---- 接待員：付一次，之後雙向免費 ----
    socket.on('guide', ({ g, i } = {}, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || !w) return no('');
      const G = D.GUIDES[g]; const npc = G && (D.MAPS[w.mi].npcs || []).find(n => n.kind === 'guide' && n.g === g);
      if (!npc) return no('這裡沒有這位接待員'); if (Math.abs(pl.x - npc.x) > 90 || Math.abs(pl.y - (npc.y || D.GY)) > 40) return no('離接待員太遠了');
      const o = G.opts[i | 0]; if (!o) return no('沒有這條路線');
      if (o.need && !(c.slain || {})[o.need] && !isGM(uid)) return no(`要先打倒「${D.MON[o.need].name}」才能直接前往${o.place}`);
      if (o.key && !o.nowalk && !(c.walked || {})[o.key] && !(c.guide || {})[o.key] && !isGM(uid)) return no(G.walk || `你得先自己走一趟，認得路了我才能帶你去${o.place}`);
      c.guide ||= {}; let paid = 0;
      if (o.each || !c.guide[o.key]) { if (c.gold < o.fee) return no(`需要 ${o.fee.toLocaleString()} 金幣`); c.gold -= o.fee; paid = o.fee; if (!o.each) c.guide[o.key] = 1; }
      c.map = o.to; save(); pushMe(uid); ack && ack({ ok: true, paid, each: o.each ? 1 : 0 }); enter(o.to, o.tx ?? D.MAPS[o.to].start);
    });
    // ---- 回城卷軸：唸 2 秒，回到這個區域的城鎮 ----
    const recallBlock = () => { if (!w) return '現在不能使用'; const mp = D.MAPS[w.mi]; if (mp.pvp || mp.trial) return '這裡不能使用回城卷軸';
      if (w.mons.some(m => m.fight && pl.x >= m.fight.x1 - 10 && pl.x <= m.fight.x2 + 10)) return 'Boss 戰中不能使用回城卷軸'; return ''; };
    socket.on('recallStart', (_, ack) => { const c = char(uid); if (!c) return; if (!((c.mat || {}).home > 0)) return ack && ack({ ok: false, msg: '沒有回城卷軸（雜貨商有賣）' });
      const e = recallBlock(); if (e) return ack && ack({ ok: false, msg: e }); pl.recallT = Date.now(); ack && ack({ ok: true }); });
    socket.on('recall', (_, ack) => { const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c) return no('');
      if (!pl.recallT || Date.now() - pl.recallT < D.HOMESCROLL.cast - 250) return no('還在唸咒語'); pl.recallT = 0;
      if (!((c.mat || {}).home > 0)) return no('沒有回城卷軸'); const e = recallBlock(); if (e) return no(e);
      const home = D.MAPS[w.mi].home ?? 0; c.mat.home--; c.map = home; save(); pushMe(uid); ack && ack({ ok: true }); enter(home, D.MAPS[home].start); });
    socket.on('recallCancel', () => { pl.recallT = 0; });
    // ---- 更新公告：每個帳號每個版本只看一次 ----
    socket.on('newsSeen', ({ v } = {}) => { const u = S.users[uid]; if (u && v === D.VERSION) { u.seenVer = D.VERSION; save(); } });
    // ---- 轉職試煉 ----
    // ---- 戰五渣拜師：10 等後找像素村的師傅選職業（巨龍使者要有龍蛋）----
    socket.on('apprentice', ({ cls } = {}, ack) => {
      const c = char(uid), no = msg => ack && ack({ ok: false, msg }); if (!c || !w) return no('');
      if (c.cls !== 'novice') return no('你已經有師父了');
      if (!D.CL[cls] || cls === 'novice' || !D.MASTERS[cls]) return no('沒有這位師傅');
      if (c.lv < D.NOVLV) return no(`要 Lv ${D.NOVLV} 才能拜師`);
      if (w.mi !== 0) return no('要在像素村找師傅');
      const npc = (D.MAPS[0].npcs || []).find(n => n.kind === 'master' && n.cls === cls); if (!npc || Math.abs(pl.x - npc.x) > 90) return no('離師傅太遠了');
      if (D.HIDDEN[cls] && !isGM(uid)) return no('龍蛋還沒孵化，再等等吧');
      if (cls === 'dragon' && !c.egg && !isGM(uid)) return no('沒有龍蛋，龍是不會認你的');
      // 能力值依新職業重新計算（等於這個職業從 1 等練到現在）
      const gr = D.CL[cls].grow, b = { ...D.CL[cls].base }; for (let l = 1; l < c.lv; l++) { b.hp += gr.hp; b.mp += gr.mp; b.atk = Math.round((b.atk + gr.atk) * 10) / 10; b.def = Math.round((b.def + gr.def) * 10) / 10; }
      c.cls = cls; c.job = 0; c.base = b; c.slots = [...D.DEFSLOTS]; if (!D.WEAPONS[cls][c.wep]) c.wep = 0; if (c.lookW != null && !D.WEAPONS[cls][c.lookW]) delete c.lookW;
      if (cls === 'dragon') delete c.egg;
      D.fix(c); save(); pushMe(uid); ack && ack({ ok: true, me: me(uid) });
      ns.to(w.room).emit('sys', { t: cls === 'dragon' ? `🐉 ${nameOf(uid)} 的龍蛋孵化了！拜入龍語者門下，成為「巨龍使者」！` : `🎓 ${nameOf(uid)} 拜入${D.MASTERS[cls].name}門下，成為「${D.CL[cls].jobs[0]}」！` });
    });
    socket.on('trial', (_, ack) => {
      const c = char(uid); if (!c) return ack && ack({ ok: false });
      if (c.cls === 'novice') return ack && ack({ ok: false, msg: '戰五渣要先拜師才能轉職' });
      const next = c.job + 1; if (next > 4) return ack && ack({ ok: false, msg: '已經完成所有轉職' });
      if (c.lv < D.JOBLV[next]) return ack && ack({ ok: false, msg: `需要 Lv ${D.JOBLV[next]}` });
      if (!w || w.mi !== 0) return ack && ack({ ok: false, msg: '要在像素村找你的師傅' });
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
    // 守護靈輔助技能（90 級四轉招式裡帶 sup 的，以及天使終結技「聖域」）：自己和同地圖的隊友一起套用
    socket.on('gAid', ({ k } = {}) => {
      const c = char(uid), now = Date.now(); if (!w || !c) return;
      let sup = null;
      if (k === 'fin') { const g = D.GUARD[c.cls]; if (g.finSup && now < (pl.finUntil || 0) && !pl.finAid) { sup = g.finSup; pl.finAid = 1; } }
      else { const a = D.AWSK[c.cls] && D.AWSK[c.cls][k]; if (a && a.sup && c.lv >= D.AWSKLV && awkEl(pl, now) >= 0 && !D.skillLock(c, k) && now - ((pl.gAidT ||= {})[k] || 0) >= 5000) { sup = a.sup; pl.gAidT[k] = now; } }
      if (!sup) return;
      const hb = D.stats(c).healB || 0;
      for (const u of [uid, ...partyMates(uid)]) {
        const o = w.players.get(u); if (!o) continue;
        ns.to('u:' + u).emit('gAid', { k, cls: c.cls, by: uid, name: nameOf(uid), hb, sup });
        if (isPvp(w) && o.php > 0) {   // PVP 的血量和護盾由伺服器處理
          if (sup.heal) { o.php = Math.min(o.pmax, o.php + o.pmax * sup.heal * (1 + hb)); o.hpPct = Math.round(o.php / o.pmax * 100); ns.to('u:' + u).emit('php', { hp: Math.round(o.php), max: o.pmax }); }
          if (sup.shield) o.shieldT = now + 8000;
        }
      }
    });
    socket.on('pheal', ({ k } = {}) => {   // PVP 裡的自我治療技能
      const c = char(uid); if (!c || !isPvp(w) || !(pl.php > 0)) return; const sk = D.SK[c.cls][k]; if (!sk || !sk.g || sk.g.type !== 'heal' || D.skillLock(c, k)) return;
      const now = Date.now(); pl.hcd ||= {}; if (now - (pl.hcd[k] || 0) < sk.cd * 1000 / 60 * .7) return; pl.hcd[k] = now;
      pvpHp(pl.php + pl.pmax * sk.g.pct * (1 + (D.stats(c).healB || 0)));
    });
    socket.on('phit', (list) => {
      const c = char(uid); if (!w || !c || !Array.isArray(list) || !isPvp(w) || !(pl.php > 0) || pl.mount) return;
      const now = Date.now(); if (now - rate.t > 1000) { rate = { t: now, n: 0 }; }
      const du = pl.duel && duels.get(pl.duel), arena = D.MAPS[w.mi].pvp === 'arena', efs = D.efOf(c.cls, c);
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
      if (!w || w.mi !== 0) return ack && ack({ ok: false, msg: '要在像素村找轉職教官' });
      c.job = next; save(); ack && ack({ ok: true, me: me(uid) });
      ns.to(w.room).emit('sys', { t: `${nameOf(uid)} 轉職成為「${D.CL[c.cls].jobs[next]}」！` });
    });
    socket.on('portal', ({ to } = {}, ack) => {
      const c = char(uid); if (!c || !w) return ack && ack({ ok: false });
      const pt = D.MAPS[w.mi].portals.find(p => p.to === to); if (!pt) return ack && ack({ ok: false });
      if (Math.abs(pl.x - pt.x) > 60) return ack && ack({ ok: false, msg: '離傳送門太遠' });
      if (pt.ret) { ack && ack({ ok: true }); goRet(); return; }
      if (pt.unlock) { c.walked ||= {}; if (!c.walked[pt.unlock]) { c.walked[pt.unlock] = 1; pushMe(uid); socket.emit('notice', { t: `🗺 你認得路了！之後在風語驛站或村莊找接待員就能直接往返。` }); } }
      if (pt.gate && !(c.slain || {})[pt.gate] && !isGM(uid)) return ack && ack({ ok: false, msg: `要先打倒「${D.MON[pt.gate].name}」，${pt.label.replace(/ →$/, '')}才會為你開啟` });
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
      awSave(uid, pl);
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
