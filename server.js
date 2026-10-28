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

// ---------- storage ----------
// DATABASE_URL set  -> PostgreSQL (Neon, Supabase, Render Postgres, ...). Data survives redeploys.
// DATABASE_URL empty -> JSON file in DATA_DIR (fine for local testing only).
const DATABASE_URL = process.env.DATABASE_URL || '';
let SECRET = process.env.SESSION_SECRET || '';

function pgStore() {
  const { Pool } = require('pg'); // installed by `npm install`
  const local = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
  const q = (text, params) => pool.query(text, params);
  const row = r => r && { id: r.id, name: r.name, email: r.email, salt: r.salt, hash: r.hash,
    created: Number(r.created), lastLogin: Number(r.last_login), state: r.state };
  return {
    kind: 'postgres',
    async init() {
      await q(`CREATE TABLE IF NOT EXISTS users(
        id uuid PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, salt text NOT NULL, hash text NOT NULL,
        created bigint NOT NULL, last_login bigint NOT NULL, logins int NOT NULL DEFAULT 1, state jsonb, state_at bigint)`);
      await q(`CREATE TABLE IF NOT EXISTS activity(
        id bigserial PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        t bigint NOT NULL, type text NOT NULL, detail text NOT NULL DEFAULT '')`);
      await q('CREATE INDEX IF NOT EXISTS activity_user_idx ON activity(user_id, id DESC)');
      await q('CREATE TABLE IF NOT EXISTS meta(key text PRIMARY KEY, value text NOT NULL)');
      await q("INSERT INTO meta(key,value) VALUES('secret',$1) ON CONFLICT DO NOTHING", [crypto.randomBytes(32).toString('hex')]);
      return (await q("SELECT value FROM meta WHERE key='secret'")).rows[0].value;
    },
    byEmail: async e => row((await q('SELECT * FROM users WHERE email=$1', [e])).rows[0]),
    byId: async id => row((await q('SELECT * FROM users WHERE id=$1', [id])).rows[0]),
    create: async u => { await q('INSERT INTO users(id,name,email,salt,hash,created,last_login) VALUES($1,$2,$3,$4,$5,$6,$6)', [u.id, u.name, u.email, u.salt, u.hash, u.created]); },
    login: async id => { await q('UPDATE users SET last_login=$2, logins=logins+1 WHERE id=$1', [id, Date.now()]); },
    setState: async (id, state) => { await q('UPDATE users SET state=$2::jsonb, state_at=$3 WHERE id=$1', [id, JSON.stringify(state), Date.now()]); },
    act: async (id, events) => {
      await q('INSERT INTO activity(user_id,t,type,detail) SELECT $1,$2,x.type,x.detail FROM jsonb_to_recordset($3::jsonb) AS x(type text, detail text)', [id, Date.now(), JSON.stringify(events)]);
      await q('DELETE FROM activity WHERE user_id=$1 AND id < (SELECT id FROM activity WHERE user_id=$1 ORDER BY id DESC OFFSET 2000 LIMIT 1)', [id]);
    },
    acts: async (id, n) => (await q('SELECT t,type,detail FROM activity WHERE user_id=$1 ORDER BY id DESC LIMIT $2', [id, n])).rows.map(r => ({ t: Number(r.t), type: r.type, detail: r.detail })),
    del: async id => { await q('DELETE FROM users WHERE id=$1', [id]); },
    count: async () => Number((await q('SELECT count(*) FROM users')).rows[0].count),
    close: () => pool.end()
  };
}

function fileStore() {
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const DB_FILE = path.join(DATA_DIR, 'db.json');
  let db = { users: {}, byEmail: {} }, timer = null;
  try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* first run */ }
  const writeNow = () => { try { fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); } catch (e) { console.error('Could not save data:', e.message); } };
  const save = () => { if (!timer) timer = setTimeout(() => { timer = null; writeNow(); }, 300); };
  return {
    kind: 'file (' + DATA_DIR + ')',
    async init() { db.secret = db.secret || crypto.randomBytes(32).toString('hex'); save(); return db.secret; },
    byEmail: async e => db.users[db.byEmail[e]] || null,
    byId: async id => db.users[id] || null,
    create: async u => { db.users[u.id] = Object.assign({ logins: 1, state: null, activity: [] }, u); db.byEmail[u.email] = u.id; save(); },
    login: async id => { const u = db.users[id]; if (u) { u.lastLogin = Date.now(); u.logins = (u.logins || 0) + 1; save(); } },
    setState: async (id, state) => { db.users[id].state = state; save(); },
    act: async (id, events) => { const u = db.users[id]; if (!u) return; events.forEach(e => u.activity.push({ t: Date.now(), type: e.type, detail: e.detail })); if (u.activity.length > 2000) u.activity.splice(0, u.activity.length - 2000); save(); },
    acts: async (id, n) => db.users[id].activity.slice(-n).reverse(),
    del: async id => { const u = db.users[id]; if (u) { delete db.byEmail[u.email]; delete db.users[id]; save(); } },
    count: async () => Object.keys(db.users).length,
    close: writeNow
  };
}
const store = DATABASE_URL ? pgStore() : fileStore();
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { try { await store.close(); } catch (e) {} process.exit(0); });

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
async function userOf(req) {
  const m = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith('pl_sid='));
  const p = m && verify(m.slice(7));
  return p ? await store.byId(p.uid) : null;
}
function cookie(req, value, maxAge) {
  const secure = (req.headers['x-forwarded-proto'] || '') === 'https' ? '; Secure' : '';
  return { 'Set-Cookie': 'pl_sid=' + value + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + secure };
}
const startSession = (req, u) => cookie(req, sign({ uid: u.id, exp: Date.now() + 30 * 864e5 }), 30 * 86400);
const pub = u => ({ id: u.id, name: u.name, email: u.email, created: u.created, lastLogin: u.lastLogin });

const track = (u, type, detail) => store.act(u.id, [{ type: String(type).slice(0, 40), detail: String(detail || '').slice(0, 120) }])
  .catch(e => console.error('activity not saved:', e.message));
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
    if (await store.byEmail(email)) return send(res, 409, { error: 'That email already has an account. Sign in instead.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const u = { id: crypto.randomUUID(), name, email, salt, hash: (await scrypt(pw, salt)).toString('hex'),
      created: Date.now(), lastLogin: Date.now(), logins: 1, state: null, activity: [] };
    try { await store.create(u); } catch (e) {
      if (e && e.code === '23505') return send(res, 409, { error: 'That email already has an account. Sign in instead.' });
      throw e;
    }
    await track(u, 'signup');
    return send(res, 201, { user: pub(u), state: null }, startSession(req, u));
  }

  if (m === 'POST' && url === '/api/login') {
    const b = await readBody(req, 5000);
    const email = clean(b.email, 120).toLowerCase(), pw = String(b.password || '');
    if (limited('li:' + ipOf(req) + ':' + email, 10, 15 * 60e3)) return send(res, 429, { error: 'Too many attempts. Wait a few minutes and try again.' });
    const u = await store.byEmail(email);
    const hash = await scrypt(pw.slice(0, 200), u ? u.salt : 'x'.repeat(32));
    if (!u || !crypto.timingSafeEqual(hash, Buffer.from(u.hash, 'hex'))) return send(res, 401, { error: 'Incorrect email or password.' });
    await store.login(u.id); u.lastLogin = Date.now(); await track(u, 'login');
    return send(res, 200, { user: pub(u), state: u.state }, startSession(req, u));
  }

  if (m === 'POST' && url === '/api/logout') {
    const u = await userOf(req); if (u) await track(u, 'logout');
    return send(res, 200, { ok: true }, cookie(req, '', 0));
  }

  const u = await userOf(req);
  if (!u) return send(res, 401, { error: 'Please sign in.' });

  if (m === 'GET' && url === '/api/me') return send(res, 200, { user: pub(u), state: u.state });

  if ((m === 'PUT' || m === 'POST') && url === '/api/state') {
    const b = await readBody(req, 2.5e6);
    if (!b.state || typeof b.state !== 'object' || Array.isArray(b.state)) return send(res, 400, { error: 'Bad data.' });
    await store.setState(u.id, b.state);
    return send(res, 200, { ok: true });
  }

  if (m === 'POST' && url === '/api/activity') {
    const b = await readBody(req, 20000);
    const events = [];
    (Array.isArray(b.events) ? b.events : []).slice(0, 50).forEach(ev => {
      const type = clean(ev && ev.type, 40).replace(/[^\w:.\- ]/g, '');
      if (type) events.push({ type, detail: clean(ev.detail, 120) });
    });
    if (events.length) await store.act(u.id, events);
    return send(res, 200, { ok: true });
  }

  if (m === 'GET' && url === '/api/activity') {
    const n = Math.min(200, Math.max(1, +qs.get('limit') || 50));
    return send(res, 200, { events: await store.acts(u.id, n) });
  }

  if (m === 'POST' && url === '/api/delete-account') {
    const b = await readBody(req, 2000);
    const hash = await scrypt(String(b.password || '').slice(0, 200), u.salt);
    if (!crypto.timingSafeEqual(hash, Buffer.from(u.hash, 'hex'))) return send(res, 401, { error: 'Incorrect password.' });
    await store.del(u.id);
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
  await track(u, 'ai_request', prompt.length + ' chars');
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
const server = http.createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];
    if (url.startsWith('/api/')) return await handleApi(req, res, url, new URL(req.url, 'http://x').searchParams);
    if (req.method === 'GET' && url === '/health') return send(res, 200, { ok: true, ai: !!KEY, users: await store.count(), db: store.kind.split(' ')[0] });
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
});

store.init().then(secret => {
  SECRET = SECRET || secret;
  server.listen(PORT, () => console.log('Planify running on port ' + PORT + ' · storage: ' + store.kind));
}).catch(e => { console.error('Could not start the database: ' + e.message); process.exit(1); });
