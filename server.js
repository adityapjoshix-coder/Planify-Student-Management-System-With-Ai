// Planify server: serves the website, user accounts (sign up / sign in), per-user data + activity, and the /api/ai proxy.
// No npm packages needed (Node 18+).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BASE = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const KEY = process.env.AI_API_KEY || process.env.GROQ_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'llama-3.1-8b-instant';

// ---------- storage (JSON file; see README for Render persistence) ----------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'db.json');
let db = { users: {}, byEmail: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* first run */ }
let writeTimer = null;
function writeNow() {
  try { fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); }
  catch (e) { console.error('Could not save data:', e.message); }
}
function save() { if (writeTimer) return; writeTimer = setTimeout(() => { writeTimer = null; writeNow(); }, 300); }
const SECRET = process.env.SESSION_SECRET || (db.secret = db.secret || crypto.randomBytes(32).toString('hex'));
save();
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { writeNow(); process.exit(0); });

// ---------- helpers ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml'
};
const STATIC = new Set(['index.html', 'style.css', 'script.js', 'auth.js']);

function send(res, code, obj, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, headers));
  res.end(JSON.stringify(obj));
}
function ipOf(req) { return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }

const buckets = new Map();
function limited(key, max, winMs) {
  const now = Date.now(), list = (buckets.get(key) || []).filter(t => now - t < winMs);
  list.push(now); buckets.set(key, list);
  return list.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of buckets) { const f = v.filter(t => now - t < 3600e3); f.length ? buckets.set(k, f) : buckets.delete(k); } }, 600e3).unref();

async function readBody(req, limit) {
  if (!/json/i.test(req.headers['content-type'] || '')) throw { code: 'bad_json' };
  let body = '';
  for await (const ch of req) { body += ch; if (body.length > limit) throw { code: 'too_large' }; }
  try { return JSON.parse(body || '{}'); } catch (e) { throw { code: 'bad_json' }; }
}

// ---------- passwords + sessions ----------
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, (e, k) => e ? no(e) : ok(k)));
const sign = p => { const d = Buffer.from(JSON.stringify(p)).toString('base64url'); return d + '.' + crypto.createHmac('sha256', SECRET).update(d).digest('base64url'); };
function verify(tok) {
  if (!tok) return null;
  const [d, s] = tok.split('.'); if (!d || !s) return null;
  const want = crypto.createHmac('sha256', SECRET).update(d).digest(), got = Buffer.from(s, 'base64url');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try { const p = JSON.parse(Buffer.from(d, 'base64url')); return p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
function userOf(req) {
  const m = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith('pl_sid='));
  const p = m && verify(m.slice(7));
  return p && db.users[p.uid] || null;
}
function cookie(req, value, maxAge) {
  const secure = (req.headers['x-forwarded-proto'] || '') === 'https' ? '; Secure' : '';
  return { 'Set-Cookie': 'pl_sid=' + value + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + secure };
}
const startSession = (req, u) => cookie(req, sign({ uid: u.id, exp: Date.now() + 30 * 864e5 }), 30 * 86400);
const pub = u => ({ id: u.id, name: u.name, email: u.email, created: u.created, lastLogin: u.lastLogin });

function logAct(u, type, detail) {
  u.activity.push({ t: Date.now(), type: String(type).slice(0, 40), detail: String(detail || '').slice(0, 120) });
  if (u.activity.length > 2000) u.activity.splice(0, u.activity.length - 2000);
  save();
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

// ---------- API ----------
async function handleApi(req, res, url, qs) {
  const m = req.method;

  if (m === 'POST' && url === '/api/signup') {
    if (limited('su:' + ipOf(req), 10, 3600e3)) return send(res, 429, { error: 'Too many sign-ups from this network. Try again later.' });
    const b = await readBody(req, 5000);
    const name = clean(b.name, 60), email = clean(b.email, 120).toLowerCase(), pw = String(b.password || '');
    if (!name) return send(res, 400, { error: 'Enter your name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: 'Enter a valid email address.' });
    if (pw.length < 8 || pw.length > 200) return send(res, 400, { error: 'Use a password with at least 8 characters.' });
    if (db.byEmail[email]) return send(res, 409, { error: 'That email already has an account. Sign in instead.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const u = { id: crypto.randomUUID(), name, email, salt, hash: (await scrypt(pw, salt)).toString('hex'),
      created: Date.now(), lastLogin: Date.now(), logins: 1, state: null, activity: [] };
    db.users[u.id] = u; db.byEmail[email] = u.id; logAct(u, 'signup');
    return send(res, 201, { user: pub(u), state: null }, startSession(req, u));
  }

  if (m === 'POST' && url === '/api/login') {
    const b = await readBody(req, 5000);
    const email = clean(b.email, 120).toLowerCase(), pw = String(b.password || '');
    if (limited('li:' + ipOf(req) + ':' + email, 10, 15 * 60e3)) return send(res, 429, { error: 'Too many attempts. Wait a few minutes and try again.' });
    const u = db.users[db.byEmail[email]];
    const hash = await scrypt(pw.slice(0, 200), u ? u.salt : 'x'.repeat(32));
    if (!u || !crypto.timingSafeEqual(hash, Buffer.from(u.hash, 'hex'))) return send(res, 401, { error: 'Incorrect email or password.' });
    u.lastLogin = Date.now(); u.logins = (u.logins || 0) + 1; logAct(u, 'login');
    return send(res, 200, { user: pub(u), state: u.state }, startSession(req, u));
  }

  if (m === 'POST' && url === '/api/logout') {
    const u = userOf(req); if (u) logAct(u, 'logout');
    return send(res, 200, { ok: true }, cookie(req, '', 0));
  }

  const u = userOf(req);
  if (!u) return send(res, 401, { error: 'Please sign in.' });

  if (m === 'GET' && url === '/api/me') return send(res, 200, { user: pub(u), state: u.state });

  if ((m === 'PUT' || m === 'POST') && url === '/api/state') {
    const b = await readBody(req, 2.5e6);
    if (!b.state || typeof b.state !== 'object' || Array.isArray(b.state)) return send(res, 400, { error: 'Bad data.' });
    u.state = b.state; u.stateAt = Date.now(); save();
    return send(res, 200, { ok: true });
  }

  if (m === 'POST' && url === '/api/activity') {
    const b = await readBody(req, 20000);
    (Array.isArray(b.events) ? b.events : []).slice(0, 50).forEach(ev => {
      const type = clean(ev && ev.type, 40).replace(/[^\w:.\- ]/g, '');
      if (type) logAct(u, type, clean(ev.detail, 120));
    });
    return send(res, 200, { ok: true });
  }

  if (m === 'GET' && url === '/api/activity') {
    const n = Math.min(200, Math.max(1, +qs.get('limit') || 50));
    return send(res, 200, { events: u.activity.slice(-n).reverse() });
  }

  if (m === 'POST' && url === '/api/delete-account') {
    const b = await readBody(req, 2000);
    const hash = await scrypt(String(b.password || '').slice(0, 200), u.salt);
    if (!crypto.timingSafeEqual(hash, Buffer.from(u.hash, 'hex'))) return send(res, 401, { error: 'Incorrect password.' });
    delete db.byEmail[u.email]; delete db.users[u.id]; save();
    return send(res, 200, { ok: true }, cookie(req, '', 0));
  }

  if (m === 'POST' && url === '/api/ai') return handleAI(req, res, u);
  return send(res, 404, { error: 'Not found.' });
}

async function handleAI(req, res, u) {
  if (!KEY) return send(res, 500, { error: 'The server has no AI_API_KEY set yet. Add it in Render › Environment.' });
  if (limited('ai:' + u.id, 20, 10 * 60e3)) return send(res, 429, { error: 'Too many AI requests. Please wait a few minutes.' });
  const b = await readBody(req, 20000);
  const prompt = String(b.prompt || '').slice(0, 8000);
  if (!prompt.trim()) return send(res, 400, { error: 'Empty prompt.' });
  logAct(u, 'ai_request', prompt.length + ' chars');
  try {
    const r = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
      body: JSON.stringify({
        model: MODEL, temperature: 0.6, max_tokens: 700,
        messages: [
          { role: 'system', content: 'You are Planify, a friendly, concise study coach for students. Use short paragraphs or simple bullet points.' },
          { role: 'user', content: prompt }
        ]
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return send(res, 502, { error: 'AI provider error ' + r.status + ': ' + ((j.error && j.error.message) || 'check key and model') });
    send(res, 200, { text: (j.choices && j.choices[0] && j.choices[0].message.content || '').trim() });
  } catch (e) {
    send(res, 502, { error: 'Could not reach the AI provider.' });
  }
}

// ---------- server ----------
http.createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];
    if (url.startsWith('/api/')) return await handleApi(req, res, url, new URL(req.url, 'http://x').searchParams);
    if (req.method === 'GET' && url === '/health') return send(res, 200, { ok: true, ai: !!KEY, users: Object.keys(db.users).length });
    const name = url === '/' ? 'index.html' : url.slice(1);
    if (req.method === 'GET' && STATIC.has(name)) {
      return fs.readFile(path.join(__dirname, name), (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
        res.end(data);
      });
    }
    res.writeHead(404); res.end('Not found');
  } catch (e) {
    if (e && e.code === 'too_large') return send(res, 413, { error: 'Request too large.' });
    if (e && e.code === 'bad_json') return send(res, 400, { error: 'Bad request.' });
    console.error(e); send(res, 500, { error: 'Server error.' });
  }
}).listen(PORT, () => console.log('Planify running on port ' + PORT + ' (data in ' + DATA_DIR + ')'));
