// 屁眼王國大冒險 — 獨立伺服器（帳號、存檔、遊戲連線）
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || '';
const KV_KEY = process.env.KV_KEY || 'pyan-rpg'; // 和其他遊戲共用資料庫時，用不同的 key 分開存

// ---------------- 儲存：Postgres（Render）或本機 JSON 檔 ----------------
const S = { users: {}, sessions: {}, rpg: {}, seq: 1 };
let pool = null;
const FILE = path.join(__dirname, 'data.json');
async function load() {
  if (DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: DATABASE_URL, ssl: /render\.com|sslmode=require/.test(DATABASE_URL) ? { rejectUnauthorized: false } : false });
    // 兩個遊戲共用資料庫，同時啟動時可能一起建立資料表：撞到「已經存在」就當作成功
    try { await pool.query('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v JSONB NOT NULL)'); } catch (e) { if (!['23505', '42P07'].includes(e.code)) throw e; }
    const r = await pool.query('SELECT v FROM kv WHERE k=$1', [KV_KEY]);
    if (r.rows[0]) Object.assign(S, r.rows[0].v);
    console.log('已連上 Postgres 資料庫');
  } else if (fs.existsSync(FILE)) {
    Object.assign(S, JSON.parse(fs.readFileSync(FILE, 'utf8')));
    console.log('使用本機 data.json（未設定 DATABASE_URL）');
  }
  if (!S.rpg) S.rpg = {};
  if (!S.rpgAlt) S.rpgAlt = {};
  loadedAt = Date.now();
}
// ---------------- 還原備份後自動重新載入 ----------------
// 牛牛管理後台還原備份時，會在資料庫寫入「<KV_KEY>:reload」的時間；這裡發現比上次載入還新，就重新讀取資料
let loadedAt = 0, ioRef = null;
async function reloadedAt() { if (!pool) return 0; try { const r = await pool.query('SELECT v FROM kv WHERE k=$1', [KV_KEY + ':reload']); return r.rows[0] ? +r.rows[0].v.at || 0 : 0; } catch (e) { return 0; } }
async function checkReload() {
  const at = await reloadedAt(); if (!at || at <= loadedAt) return false;
  const r = await pool.query('SELECT v FROM kv WHERE k=$1', [KV_KEY]);
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, { users: {}, sessions: {}, rpg: {}, rpgAlt: {}, seq: 1 }, r.rows[0] ? r.rows[0].v : {});
  loadedAt = Date.now(); clearTimeout(saveTimer);
  console.log('偵測到備份還原，已重新載入資料');
  if (ioRef) ioRef.of('/rpg').disconnectSockets(true);
  return true;
}
setInterval(() => { if (pool) checkReload().catch(() => {}); }, 15000);
let saveTimer = null, saving = false, again = false;
let firstDirty = 0;
function save() { const now = Date.now(); if (!firstDirty) firstDirty = now; clearTimeout(saveTimer); saveTimer = setTimeout(() => { firstDirty = 0; flush(); }, now - firstDirty > 5000 ? 0 : 800); }   // 一直在打怪時最多 5 秒也會存一次
async function flush() {
  if (saving) { again = true; return; }
  saving = true;
  try {
    if (pool && await checkReload()) { saving = false; again = false; return; }   // 剛還原過備份：不要用舊資料蓋掉
    const data = JSON.stringify(S);
    if (pool) await pool.query('INSERT INTO kv (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v', [KV_KEY, data]);
    else fs.writeFileSync(FILE, data);
  } catch (e) { console.error('儲存失敗', e.message); }
  saving = false;
  if (again) { again = false; flush(); }
}
const newId = () => (S.seq++).toString(36) + crypto.randomBytes(3).toString('hex');

// ---------------- HTTP ----------------
const app = express();
app.set('trust proxy', true);   // Render 在代理後面：記錄真正的 IP
app.use(express.json({ limit: '10kb' }));
// ---------------- 帳號規則：帳號與密碼都是 8～16 碼，必須同時有英文字母和數字 ----------------
const ACC_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{8,16}$/;
const accErr = (login, pass) => !ACC_RE.test(login) ? '帳號需 8～16 碼，只能用英文字母和數字，而且兩種都要有' : !ACC_RE.test(pass) ? '密碼需 8～16 碼，只能用英文字母和數字，而且兩種都要有' : '';
const loginTaken = (login, self) => Object.values(S.users).some(u => u !== self && ((u.login && u.login.toLowerCase() === login.toLowerCase()) || (!u.login && String(u.name).toLowerCase() === login.toLowerCase())));
const newRecCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (const b of crypto.randomBytes(12)) c += A[b % A.length]; return c; };
async function setRec(u) { const code = newRecCode(); u.rec = await bcrypt.hash(code, 10); return code.replace(/(.{4})(?=.)/g, '$1-'); }
function logLogin(u, req) { (u.logins ||= []).unshift({ t: Date.now(), ip: req.ip }); u.logins.length = Math.min(u.logins.length, 20); }
function newSession(u) { const token = crypto.randomBytes(24).toString('hex'); S.sessions[token] = u.id; return token; }
const userOf = req => { const uid = S.sessions[String(req.body.token || '')]; return uid && S.users[uid]; };
function kickOthers(u, keep) { for (const [t, id] of Object.entries(S.sessions)) if (id === u.id && t !== keep) delete S.sessions[t]; if (ioRef) for (const s of ioRef.of('/rpg').sockets.values()) if (s.data.uid === u.id && s.handshake.auth?.token !== keep) { s.emit('kicked', { why: 'pw' }); s.disconnect(true); } }
const tries = {};
function limited(ip) { const now = Date.now(); const t = (tries[ip] || []).filter(x => now - x < 60000); t.push(now); tries[ip] = t; return t.length > 15; }
app.post('/api/register', async (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: '嘗試太多次，請稍後再試' });
  const login = String(req.body.name || '').trim(), pass = String(req.body.pass || '');
  const er = accErr(login, pass); if (er) return res.status(400).json({ error: er });
  if (loginTaken(login)) return res.status(400).json({ error: '這個帳號已經有人用了' });
  const u = { id: newId(), name: login, login, hash: await bcrypt.hash(pass, 10), created: Date.now() };
  const rec = await setRec(u); logLogin(u, req);
  S.users[u.id] = u; const token = newSession(u); save();
  res.json({ token, rec });
});
app.post('/api/login', async (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: '嘗試太多次，請稍後再試' });
  const name = String(req.body.name || '').trim(), pass = String(req.body.pass || '');
  const lk = name.toLowerCase(), u = Object.values(S.users).find(x => x.login ? x.login.toLowerCase() === lk : x.name.toLowerCase() === lk);
  if (!u || !(await bcrypt.compare(pass, u.hash))) return res.status(400).json({ error: '帳號或密碼錯誤' });
  if (u.frozen) return res.status(403).json({ error: '這個帳號已被凍結，請聯絡管理員' });
  logLogin(u, req); const token = newSession(u); save();
  res.json({ token, migrate: u.login ? 0 : 1 });   // 舊帳號：登入後要先改成新規則的帳號密碼
});
// 舊帳號換成新規則的帳號密碼（只能做一次）
app.post('/api/migrate', async (req, res) => {
  const u = userOf(req); if (!u) return res.status(401).json({ error: '請重新登入' }); if (u.login) return res.status(400).json({ error: '已經設定過了' });
  const login = String(req.body.login || '').trim(), pass = String(req.body.pass || '');
  const er = accErr(login, pass); if (er) return res.status(400).json({ error: er });
  if (loginTaken(login, u)) return res.status(400).json({ error: '這個帳號已經有人用了' });
  u.login = login; u.hash = await bcrypt.hash(pass, 10); const rec = await setRec(u); kickOthers(u, String(req.body.token)); save();
  res.json({ ok: 1, rec });
});
// 修改密碼：改完之後其他裝置自動登出
app.post('/api/password', async (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: '嘗試太多次，請稍後再試' });
  const u = userOf(req); if (!u) return res.status(401).json({ error: '請重新登入' });
  if (!(await bcrypt.compare(String(req.body.old || ''), u.hash))) return res.status(400).json({ error: '舊密碼錯誤' });
  const pass = String(req.body.pass || ''); if (!ACC_RE.test(pass)) return res.status(400).json({ error: '新密碼需 8～16 碼，只能用英文字母和數字，而且兩種都要有' });
  u.hash = await bcrypt.hash(pass, 10); kickOthers(u, String(req.body.token)); save(); res.json({ ok: 1 });
});
// 重新產生復原碼（要輸入密碼）
app.post('/api/reccode', async (req, res) => {
  const u = userOf(req); if (!u) return res.status(401).json({ error: '請重新登入' });
  if (!(await bcrypt.compare(String(req.body.pass || ''), u.hash))) return res.status(400).json({ error: '密碼錯誤' });
  const rec = await setRec(u); save(); res.json({ rec });
});
// 用復原碼重設密碼（忘記密碼或被盜用）：成功後所有裝置登出，並換一組新的復原碼
app.post('/api/recover', async (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: '嘗試太多次，請稍後再試' });
  const login = String(req.body.login || '').trim().toLowerCase(), code = String(req.body.code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(), pass = String(req.body.pass || '');
  const u = Object.values(S.users).find(x => x.login && x.login.toLowerCase() === login);
  if (!u || !u.rec || !(await bcrypt.compare(code, u.rec))) return res.status(400).json({ error: '帳號或復原碼錯誤' });
  if (!ACC_RE.test(pass)) return res.status(400).json({ error: '新密碼需 8～16 碼，只能用英文字母和數字，而且兩種都要有' });
  u.hash = await bcrypt.hash(pass, 10); kickOthers(u, null); const rec = await setRec(u); logLogin(u, req); const token = newSession(u); save();
  res.json({ token, rec });
});
app.get('/healthz', (_, res) => res.send('ok'));

const server = http.createServer(app);
const io = new Server(server); ioRef = io;
const rpg = require('./rpg')({ io, app, S, save, dir: __dirname, page: 'index.html', routes: ['/', '/rpg'] });
app.get('/rpg-data.js', (req, res) => res.type('application/javascript').sendFile(path.join(__dirname, 'rpg-data.js')));
app.get('/api/rpg-top', (req, res) => res.json({ online: rpg.online(), top: rpg.top() }));

load().then(() => {
  server.listen(PORT, () => console.log('屁眼王國大冒險 伺服器啟動於 port ' + PORT));
}).catch(e => { console.error('啟動失敗', e); process.exit(1); });
process.on('SIGTERM', async () => { clearTimeout(saveTimer); await flush(); process.exit(0); });
