// The regular-season navigation. Draft and golf remain available, but the
// fixed bar belongs to the things the league checks every week now.
export const PRIMARY_SEASON_ROUTES = [
  { route: "home", label: "Home", icon: "home" },
  { route: "clubhouse", label: "Clubhouse", icon: "record" },
  { route: "sportsbook", label: "Sportsbook", icon: "versus" },
  /* The trade desk earned the slot Rules had. Rules is a reference you read
     once a season; a trade is a decision with a clock on it, and it was two
     taps deep inside another page. Rules keeps its place in More. */
  { route: "trade", label: "Trades", icon: "trade" },
  { route: "analyzer", label: "Analyzer", icon: "analyzer", lead: true },
];

export const SECONDARY_SEASON_ROUTES = [
  { route: "wall", label: "Wall", icon: "polls" },
  { route: "facts", label: "Fun Facts", icon: "record" },
  { route: "finances", label: "Fees", icon: "finances" },
  { route: "rules", label: "Rules", icon: "rules" },
  { route: "notifications", label: "Notifications", icon: "bell" },
  { route: "profile", label: "Profile", icon: "profile" },
  { route: "calendar", label: "Calendar", icon: "calendar" },
  { route: "history", label: "History", icon: "history" },
  { route: "keepers", label: "Keepers", icon: "keepers" },
  { route: "golf", label: "Golf", icon: "golf" },
  { route: "polls", label: "Polls", icon: "polls" },
  { route: "arena", label: "Arena", icon: "arena" },
  { route: "admin", label: "Admin", icon: "admin" },
];

const navLabel=label=>label;
const primaryIcons = { home: 'house', clubhouse: 'users-round', sportsbook: 'banknote', trade: 'arrow-left-right', analyzer: 'chart-no-axes-column-increasing' };
let navSizeObserver;
const link = ({ route, label, icon, lead = false }) =>
  `<a href="#/${route}" data-route="${route}"${lead ? ' class="season-lead-tab"' : ""}><svg class="ico" aria-hidden="true"><use href="#dfl-nav-${primaryIcons[route]}"></use></svg><span>${navLabel(label)}</span></a>`;

const quickLink = ({ route, label, icon }) =>
  `<a href="#/${route}"><svg class="ico" aria-hidden="true"><use href="#i-${icon}-steel"></use></svg><span class="qn-label">${label}</span></a>`;

export function primarySeasonNavMarkup() {
  return `${PRIMARY_SEASON_ROUTES.map(link).join("")}<button type="button" id="more-btn" class="tabmore" aria-expanded="false" aria-controls="more"><svg class="ico" aria-hidden="true"><use href="#dfl-nav-ellipsis"></use></svg><span>More</span></button>`;
}

export function secondarySeasonNavMarkup() {
  return SECONDARY_SEASON_ROUTES.map(quickLink).join("");
}

export function mountSeasonNavigation(root = document) {
  const bar = root.getElementById?.("tabbar");
  const more = root.querySelector?.("#more .quicknav");
  if (!bar || !more) return false;
  bar.classList.add("is-in-season");
  bar.innerHTML = primarySeasonNavMarkup();
  more.innerHTML = secondarySeasonNavMarkup();
  const syncSize=()=>{root.documentElement?.style.setProperty("--season-nav-height",`${Math.ceil(bar.getBoundingClientRect().height)}px`);const active=bar.querySelector(".on");if(active)bar.style.setProperty("--tab-y",`${active.offsetTop}px`)};
  if(typeof bar.getBoundingClientRect==="function"){syncSize();navSizeObserver?.disconnect();if(globalThis.ResizeObserver){navSizeObserver=new ResizeObserver(syncSize);navSizeObserver.observe(bar)}}
  return true;
}

