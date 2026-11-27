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
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 800); }
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
app.use(express.json({ limit: '10kb' }));
const tries = {};
function limited(ip) { const now = Date.now(); const t = (tries[ip] || []).filter(x => now - x < 60000); t.push(now); tries[ip] = t; return t.length > 15; }
app.post('/api/register', async (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: '嘗試太多次，請稍後再試' });
  const name = String(req.body.name || '').trim(), pass = String(req.body.pass || '');
  if (!/^[\p{L}\p{N}_\-]{2,16}$/u.test(name)) return res.status(400).json({ error: '暱稱需 2～16 個字，只能用文字、數字、底線或減號' });
  if (pass.length < 4 || pass.length > 64) return res.status(400).json({ error: '密碼需 4～64 個字元' });
  if (Object.values(S.users).some(u => u.name.toLowerCase() === name.toLowerCase())) return res.status(400).json({ error: '這個暱稱已經有人用了' });
  const u = { id: newId(), name, hash: await bcrypt.hash(pass, 10), created: Date.now() };
  S.users[u.id] = u;
  const token = crypto.randomBytes(24).toString('hex'); S.sessions[token] = u.id; save();
  res.json({ token });
});
app.post('/api/login', async (req, res) => {
  if (limited(req.ip)) return res.status(429).json({ error: '嘗試太多次，請稍後再試' });
  const name = String(req.body.name || '').trim(), pass = String(req.body.pass || '');
  const u = Object.values(S.users).find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!u || !(await bcrypt.compare(pass, u.hash))) return res.status(400).json({ error: '暱稱或密碼錯誤' });
  const token = crypto.randomBytes(24).toString('hex'); S.sessions[token] = u.id; save();
  res.json({ token });
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
