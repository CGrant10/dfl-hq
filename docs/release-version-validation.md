# Installed-app release discovery repair — 1.381.0

`version.txt` remained at 1.373.0 while the published HTML, JavaScript release
floor and service-worker cache reached 1.381.0. Existing clients on 1.379.0
therefore saw an older server marker and never displayed the update prompt.
Fresh-browser checks of the shipped assets did not cover this installed-client
release discovery path.

The marker now points to the existing 1.381.0 release. App code and the release
number are unchanged. `pnpm release:check` verifies that package.json, version.txt,
index.html's release metadata, js/config.js's release floor and sw.js's app-cache
version agree. `pnpm check` runs this guard before its normal checks, so a future
release with a forgotten marker fails CI. Regressions cover the actual forgotten
marker, inconsistent HTML/config/worker versions and missing version fields.

A read-only browser fixture runs the real 1.379 service worker, update module and
version calculation, with service workers enabled. It first caches and reloads
the old shell, then switches the server to the current assets while retaining
the stale marker. The old client reports no newer release. Repairing only the
marker produces the 1.381 update prompt; clicking the real Update Now control
navigates to the latest shell and loads the current position/flex trade model and
scroll controller. The new worker retires only the old app cache. Saved draft
and preference keys, football data caches and the worker registration survive.
The fixture uses an isolated document and synthetic state rather than league
writes or a real user's login. Artifacts are in `/workspace/dfl-update-1381/`.
