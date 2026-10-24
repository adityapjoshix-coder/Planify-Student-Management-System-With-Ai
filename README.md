# Planify – accounts + free AI

Files: `index.html`, `style.css`, `script.js`, `auth.js`, `server.js`, `package.json`

## Run it on your computer
```
npm start
```
Open http://localhost:3000 and create an account. Data is saved in `data/db.json`.
(Open it through this address, not by double-clicking index.html: sign-in needs the server.)

## Deploy on Render
1. Free AI key: https://console.groq.com
2. Push all six files to GitHub. Start command: `npm start`.
3. Render › Environment:
   - `AI_API_KEY` = your Groq key
   - `SESSION_SECRET` = any long random text (keeps people signed in after restarts)
   - `DATA_DIR` = `/var/data` (only if you attach a Render Disk, see below)
   - optional `AI_MODEL`, `AI_BASE_URL`
4. Open `/health`: it shows `"ai":true` and how many accounts exist.

## IMPORTANT: where accounts are stored
Accounts and activity live in one JSON file. Render's free web service has a temporary
file system: the file is erased on every redeploy or restart, and all accounts vanish.
To keep them, either attach a Render Disk (paid) mounted at `/var/data` and set `DATA_DIR=/var/data`,
or move the storage to a hosted database (Postgres, MongoDB Atlas or Supabase free tiers).

## What is stored per user
Name, email, hashed password (scrypt), sign-up and last-login time, their planner data
(tasks, exams, settings), and an activity log (last 2,000 actions such as app_open, login,
add, tog, gen, setting). Typed text and AI prompts are not logged.
Users can view their activity, log out, or delete their account from ⚙ Customize › Account.
