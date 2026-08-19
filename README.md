# Planning Doc Chatbot (PrepPartner)

Negotiation-prep chatbot. The app is an Express server (`ux/server.js`, port 3001)
that serves the React build from `ux/build/` and shells out to the Python scripts
in the repo root (`chatBotHandler.py`, `getSessionId.py`, `reset.py`, etc.) for
the chatbot / database logic. Live updates are pushed to the browser over SSE by
watching the per-user files in `ux/userdata/`.

## Prerequisites

- Node.js + npm
- Python 3
- pm2 (`npm install -g pm2`) — for production
- Caddy — only if serving the public domains (reverse-proxies to `localhost:3001`)

## Setup Instructions

All steps from the repo root unless noted.

1. **Point `localdir.txt` at this checkout.** Every Python script starts with
   `os.chdir(open('../localdir.txt').read())`, so it must contain the absolute
   path of the repo root on this machine — and *nothing else*. A stray leading
   space or trailing newline makes every script fail with `FileNotFoundError`:

   ```bash
   printf '%s' "$(pwd)" > localdir.txt
   ```

2. **Create `key_to_gpt.txt`** in the repo root containing your OpenAI API key
   (single line). It is gitignored; `askGpt.py`, `db_handler.py`, and
   `clientBot_.py` all read the key from it.

3. **Install Python dependencies into a virtualenv at `.venv`:**

   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```

   The server automatically uses `.venv/bin/python3` if it exists (falling
   back to system `python3`), so the venv never needs to be "activated" for
   production.

4. **Install Node dependencies and build the frontend:**

   ```bash
   cd ux
   npm install
   npm run build
   ```

   `server.js` serves the frontend from `ux/build/`, so the build step is
   required before starting the server.

## Running

The server **must be started from the `ux/` directory** — it invokes the Python
scripts with relative paths (`../getSessionId.py`, `../chatBotHandler.py`), and
those scripts read `../localdir.txt`.

### Production (pm2)

```bash
cd ux
pm2 start server.js --name server
pm2 save        # remember the process list
pm2 startup     # prints a sudo command — run it so pm2 resurrects on reboot
```

Day-to-day pm2:

```bash
pm2 list             # see what's running
pm2 logs             # tail logs
pm2 restart server   # restart the app
pm2 stop server      # stop the app
pm2 delete server    # remove from pm2
pm2 monit            # real-time monitoring
pm2 unstartup systemd  # undo boot script
```

App is at http://localhost:3001 (sanity check: `GET /test`).

### Production deployment notes

What the pm2/systemd/Caddy setup actually looks like in practice:

- `pm2 startup` doesn't change anything itself — it **prints a machine-specific
  sudo command** (e.g. `sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u <user> --hp /home/<user>`).
  Run that printed command; it installs and enables a `pm2-<user>` systemd unit.
- Then run `pm2 save`. On boot, systemd starts the pm2 daemon and pm2
  resurrects whatever was last saved to `~/.pm2/dump.pm2`. **Re-run `pm2 save`
  any time you add/remove/rename pm2 apps**, or the boot state will be stale.
- `systemctl status pm2-<user>` will show `inactive (dead)` until the next
  reboot — that's normal (systemd only starts enabled units at boot). What
  matters is `Loaded: ... enabled`. Run `sudo systemctl start pm2-<user>` if
  you want it active immediately.

### Reverse proxy (Caddy + Cloudflare)

- The site block belongs in **`/etc/caddy/Caddyfile`** — that's what the caddy
  systemd service loads. The `Caddyfile` in this repo is only a reference copy.
- Add to `/etc/caddy/Caddyfile`:

  ```
  planning.negotiation.solutions {
          reverse_proxy localhost:3001
  }
  ```

  then `sudo systemctl reload caddy`.
- DNS for the domain is proxied through Cloudflare; Caddy still obtains its own
  certificate automatically. Don't put the server's raw IP in the committed
  Caddyfile — that would leak the origin address Cloudflare is hiding.
- Verify end-to-end: `curl https://planning.negotiation.solutions/test` →
  `Test route working`.

Only needed on the public server; locally just hit port 3001 directly.

### Development

```bash
cd ux
npm run server   # backend via nodemon (auto-restarts, ignores userdata files)
npm start        # React dev server with hot reload
```

## Known quirks

- The `/auto-chat` route (and the `while true; do python3 clientBot.py; done`
  loop in `use.txt`) call `clientBot.py`, which doesn't exist — only
  `clientBot_.py` does. Rename/copy it if you need auto-chat. The main chat flow
  (`/runChatBot`) doesn't use it.
- Per-user runtime files (`formData_*.json`, `chatTranscript_*.json`,
  `user-input_*.txt`) live in `ux/userdata/` and are created on first
  connection.
