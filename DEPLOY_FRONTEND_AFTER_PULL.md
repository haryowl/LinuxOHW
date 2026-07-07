# Fix "Loading chunk failed" after deploy

## What you see

```
Something went wrong
Loading chunk 40 failed.
(timeout: http://YOUR_SERVER:8081/static/js/40.xxxxx.chunk.js)
```

## Cause

The React app uses **lazy-loaded chunks** (one file per page). After `git pull`:

1. **Backend** updates from git.
2. **Frontend `build/`** is **not** rebuilt automatically.
3. The browser may still have an old `main.*.js` that requests chunk files that no longer exist on the server.

`git pull` alone is **not enough** for UI changes.

## Fix on server (required)

```bash
cd /opt/linuxParser2
git pull

# Clean rebuild — removes stale/mixed chunk files
cd frontend
rm -rf build
npm install    # only if package.json changed
npm run build

# Verify chunks exist (you should see main.*.js AND numbered *.chunk.js files)
ls -la build/static/js/

cd ..
pm2 restart gali-parse
```

If you use **nginx** on port 80/8080, reload nginx after updating `nginx.conf`:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Fix in browser (users)

1. Hard refresh: **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac)
2. Or clear site data for `81.17.100.7`
3. Click **Reload Page** on the error screen

## Recommended URL

| Service | Port | Use |
|---------|------|-----|
| Frontend (nginx) | **8080** | Preferred for UI |
| API + static fallback | **8081** | API; also serves UI if nginx not used |

Using **8081** for the UI works but shares the API process; always rebuild `frontend/build` after pull.

## One-line deploy (backend + frontend)

```bash
cd /opt/linuxParser2 && git pull && cd frontend && rm -rf build && npm run build && cd .. && pm2 restart gali-parse
```
