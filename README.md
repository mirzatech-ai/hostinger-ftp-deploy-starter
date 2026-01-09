# Hostinger FTP/SFTP Deploy (Vite starter)

This repository is a minimal Vite + vanilla JS site plus a Node deploy script that uploads the built `dist/` folder to Hostinger's `public_html` via FTP or SFTP.

Highlights
- Simple frontend using Vite (vanilla JS).
- `npm run build` builds to `dist/`.
- `npm run deploy` runs build then uploads `dist/` to Hostinger using credentials from a `.env` file (or environment variables).
- Supports both FTP and SFTP (set `FTP_PROTOCOL=ftp` for FTP; default: `sftp`).
- Optional remote cleanup (delete remote files not in `dist/`) by setting `DELETE_REMOTE=true`.
- Optional multi-site config via `domains.json` and `--site <name>` CLI argument.

Quick Start (local)
1. Clone this repo.
2. Install:
   ```bash
   npm install
   ```
3. Create a `.env` (copy `.env.example`) and set Hostinger details:
   - `FTP_PROTOCOL` - `sftp` (default) or `ftp`
   - `FTP_HOST` - Hostinger FTP/SFTP host (e.g. `ftp.superio.fun` or `sftp.hostinger.com`)
   - `FTP_PORT` - optional (default: `22` for sftp, `21` for ftp)
   - `FTP_USER` - your FTP/SFTP username
   - `FTP_PASSWORD` - your password
   - `FTP_REMOTE_DIR` - the remote folder to upload into (set this to Hostinger's `public_html` for the domain)
   - `DELETE_REMOTE` - `true` or `false` (optional) — when `true`, remote files not present locally in `dist/` will be deleted.
   Example: see `.env.example` in repo.

4. Build and deploy (single command):
   ```bash
   npm run deploy
   ```
   This will:
   - run `npm run build`
   - upload `dist/` files to `FTP_REMOTE_DIR`

Notes about `FTP_REMOTE_DIR`
- Hostinger shared/Cloud plans use `public_html` as the webroot for a domain/subdomain.
- For example, set `FTP_REMOTE_DIR=/home/username/domains/example.com/public_html` or the path Hostinger File Manager shows for that domain. If Hostinger gave a shorter path (e.g. `public_html`), test with that—if upload fails, ask Hostinger for the full absolute path.

Selecting a site from `domains.json` (optional)
- You can maintain multiple sites in `domains.json`:
  ```json
  {
    "siteA": {
      "FTP_PROTOCOL": "sftp",
      "FTP_HOST": "sftp.hostinger.com",
      "FTP_PORT": 22,
      "FTP_USER": "userA",
      "FTP_PASSWORD": "passwordA",
      "FTP_REMOTE_DIR": "/home/userA/domains/siteA.com/public_html"
    },
    "siteB": {
      "FTP_PROTOCOL": "ftp",
      "FTP_HOST": "ftp.example.com",
      "FTP_PORT": 21,
      "FTP_USER": "userB",
      "FTP_PASSWORD": "passwordB",
      "FTP_REMOTE_DIR": "public_html"
    }
  }
  ```
- Deploy a named site: `node ./scripts/deploy.mjs --site siteA`
- If `--site` is not passed, the script falls back to `.env` or environment variables.

Security advice
- Do not commit real credentials to Git. Use `.env` locally and add `.env` to `.gitignore`.
- For CI (GitHub Actions) you may store credentials in GitHub Secrets and run the deploy script on a workflow — but for Hostinger FTP/SFTP you will likely store secrets in Actions and run an FTP upload action or call this script on the runner with secrets.

Files in this repo
- `package.json` — scripts and dependencies
- `index.html`, `src/main.js`, `src/style.css` — tiny Vite site
- `scripts/deploy.mjs` — the deploy script (FTP + SFTP supported)
- `.env.example` — example env file
- `domains.json` — optional example multi-site file
- `.gitignore`

If you'd like I can:
- Push this into a GitHub repo for you,
- Add a GitHub Actions workflow that runs `npm run deploy` on push (requires adding secrets to GitHub repository),
- Or adapt this to React/Next if you prefer.
