// DFL Sportsbook entry in the existing More sheet. Kept out of index.html so
// the shell markup stays stable; the router calls this once at startup.
export function ensureSportsbookNav() {
  const nav = document.querySelector("#more .quicknav");
  if (!nav || nav.querySelector('a[href="#/sportsbook"]')) return;
  const link = document.createElement("a");
  link.href = "#/sportsbook";
  link.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-versus"></use></svg><span class="qn-label">Sportsbook</span>`;
  const admin = nav.querySelector('a[href="#/admin"]');
  nav.insertBefore(link, admin || null);
}
