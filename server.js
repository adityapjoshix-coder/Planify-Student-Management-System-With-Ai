// Planify server: serves the website and a small /api/ai proxy so your AI key stays secret.
// No npm packages needed (Node 18+).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const KEY = process.env.AI_API_KEY || process.env.GROQ_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'llama-3.1-8b-instant';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml'
};
const STATIC = new Set(['index.html', 'style.css', 'script.js']);

// very small per-IP limit (20 requests / 10 minutes) so nobody can drain your free quota
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function handleAI(req, res) {
  if (!KEY) return send(res, 500, { error: 'The server has no AI_API_KEY set yet. Add it in Render › Environment.' });
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { error: 'Too many AI requests. Please wait a few minutes.' });
  let body = '';
  for await (const ch of req) { body += ch; if (body.length > 20000) return send(res, 413, { error: 'Request too large.' }); }
  let prompt;
  try { prompt = String(JSON.parse(body).prompt || '').slice(0, 8000); } catch (e) { return send(res, 400, { error: 'Bad request.' }); }
  if (!prompt.trim()) return send(res, 400, { error: 'Empty prompt.' });
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

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'POST' && url === '/api/ai') return handleAI(req, res);
  if (req.method === 'GET' && url === '/health') return send(res, 200, { ok: true, ai: !!KEY });
  const name = url === '/' ? 'index.html' : url.slice(1);
  if (req.method === 'GET' && STATIC.has(name)) {
    return fs.readFile(path.join(__dirname, name), (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] || 'application/octet-stream' });
      res.end(data);
    });
  }
  res.writeHead(404); res.end('Not found');
}).listen(PORT, () => console.log('Planify running on port ' + PORT));
