// =====================================================================
// teams.js - team colours used for a member's personal app theme
// ---------------------------------------------------------------------
// Each entry is [id, name, primary, secondary].
// A member's favorite_team is stored as "league:id", e.g. "nfl:KC".
//
// To add a team: drop another row into the right list. Nothing else
// needs changing - the picker and the theme both read from here.
// =====================================================================

export const LEAGUES = [
  { key: "nfl",  label: "NFL" },
  { key: "nba",  label: "NBA" },
  { key: "mlb",  label: "MLB" },
  { key: "nhl",  label: "NHL" },
  { key: "ncaa", label: "College" },
];

export const TEAMS = {
  nfl: [
    ["ARI", "Arizona Cardinals",      "#97233F", "#FFB612"],
    ["ATL", "Atlanta Falcons",        "#A71930", "#A5ACAF"],
    ["BAL", "Baltimore Ravens",       "#241773", "#9E7C0C"],
    ["BUF", "Buffalo Bills",          "#00338D", "#C60C30"],
    ["CAR", "Carolina Panthers",      "#0085CA", "#BFC0BF"],
    ["CHI", "Chicago Bears",          "#C83803", "#0B162A"],
    ["CIN", "Cincinnati Bengals",     "#FB4F14", "#000000"],
    ["CLE", "Cleveland Browns",       "#FF3C00", "#311D00"],
    ["DAL", "Dallas Cowboys",         "#041E42", "#869397"],
    ["DEN", "Denver Broncos",         "#FB4F14", "#002244"],
    ["DET", "Detroit Lions",          "#0076B6", "#B0B7BC"],
    ["GB",  "Green Bay Packers",      "#FFB612", "#203731"],
    ["HOU", "Houston Texans",         "#A71930", "#03202F"],
    ["IND", "Indianapolis Colts",     "#002C5F", "#A2AAAD"],
    ["JAX", "Jacksonville Jaguars",   "#D7A22A", "#006778"],
    ["KC",  "Kansas City Chiefs",     "#E31837", "#FFB81C"],
    ["LV",  "Las Vegas Raiders",      "#A5ACAF", "#000000"],
    ["LAC", "Los Angeles Chargers",   "#0080C6", "#FFC20E"],
    ["LAR", "Los Angeles Rams",       "#003594", "#FFA300"],
    ["MIA", "Miami Dolphins",         "#008E97", "#FC4C02"],
    ["MIN", "Minnesota Vikings",      "#4F2683", "#FFC62F"],
    ["NE",  "New England Patriots",   "#C60C30", "#002244"],
    ["NO",  "New Orleans Saints",     "#D3BC8D", "#101820"],
    ["NYG", "New York Giants",        "#0B2265", "#A71930"],
    ["NYJ", "New York Jets",          "#125740", "#FFFFFF"],
    ["PHI", "Philadelphia Eagles",    "#004C54", "#A5ACAF"],
    ["PIT", "Pittsburgh Steelers",    "#FFB612", "#101820"],
    ["SF",  "San Francisco 49ers",    "#AA0000", "#B3995D"],
    ["SEA", "Seattle Seahawks",       "#69BE28", "#002244"],
    ["TB",  "Tampa Bay Buccaneers",   "#D50A0A", "#FF7900"],
    ["TEN", "Tennessee Titans",       "#4B92DB", "#0C2340"],
    ["WAS", "Washington Commanders",  "#FFB612", "#5A1414"],
  ],

  nba: [
    ["ATL", "Atlanta Hawks",          "#E03A3E", "#C1D32F"],
    ["BOS", "Boston Celtics",         "#007A33", "#BA9653"],
    ["BKN", "Brooklyn Nets",          "#C4CED4", "#000000"],
    ["CHA", "Charlotte Hornets",      "#00788C", "#1D1160"],
    ["CHI", "Chicago Bulls",          "#CE1141", "#000000"],
    ["CLE", "Cleveland Cavaliers",    "#860038", "#FDBB30"],
    ["DAL", "Dallas Mavericks",       "#00538C", "#B8C4CA"],
    ["DEN", "Denver Nuggets",         "#FEC524", "#0E2240"],
    ["DET", "Detroit Pistons",        "#C8102E", "#1D42BA"],
    ["GSW", "Golden State Warriors",  "#1D428A", "#FFC72C"],
    ["HOU", "Houston Rockets",        "#CE1141", "#C4CED4"],
    ["IND", "Indiana Pacers",         "#FDBB30", "#002D62"],
    ["LAC", "LA Clippers",            "#C8102E", "#1D428A"],
    ["LAL", "Los Angeles Lakers",     "#FDB927", "#552583"],
    ["MEM", "Memphis Grizzlies",      "#5D76A9", "#12173F"],
    ["MIA", "Miami Heat",             "#98002E", "#F9A01B"],
    ["MIL", "Milwaukee Bucks",        "#00471B", "#EEE1C6"],
    ["MIN", "Minnesota Timberwolves", "#236192", "#78BE20"],
    ["NOP", "New Orleans Pelicans",   "#C8102E", "#0C2340"],
    ["NYK", "New York Knicks",        "#F58426", "#006BB6"],
    ["OKC", "Oklahoma City Thunder",  "#007AC1", "#EF3B24"],
    ["ORL", "Orlando Magic",          "#0077C0", "#C4CED4"],
    ["PHI", "Philadelphia 76ers",     "#006BB6", "#ED174C"],
    ["PHX", "Phoenix Suns",           "#E56020", "#1D1160"],
    ["POR", "Portland Trail Blazers", "#E03A3E", "#C4CED4"],
    ["SAC", "Sacramento Kings",       "#5A2D81", "#63727A"],
    ["SAS", "San Antonio Spurs",      "#C4CED4", "#000000"],
    ["TOR", "Toronto Raptors",        "#CE1141", "#000000"],
    ["UTA", "Utah Jazz",              "#F9A01B", "#002B5C"],
    ["WAS", "Washington Wizards",     "#E31837", "#002B5C"],
  ],

  mlb: [
    ["ARI", "Arizona Diamondbacks",   "#A71930", "#E3D4AD"],
    ["ATL", "Atlanta Braves",         "#CE1141", "#13274F"],
    ["BAL", "Baltimore Orioles",      "#DF4601", "#000000"],
    ["BOS", "Boston Red Sox",         "#BD3039", "#0C2340"],
    ["CHC", "Chicago Cubs",           "#0E3386", "#CC3433"],
    ["CWS", "Chicago White Sox",      "#C4CED4", "#27251F"],
    ["CIN", "Cincinnati Reds",        "#C6011F", "#000000"],
    ["CLE", "Cleveland Guardians",    "#E50022", "#00385D"],
    ["COL", "Colorado Rockies",       "#8B6FB5", "#C4CED4"],
    ["DET", "Detroit Tigers",         "#FA4616", "#0C2340"],
    ["HOU", "Houston Astros",         "#EB6E1F", "#002D62"],
    ["KC",  "Kansas City Royals",     "#004687", "#BD9B60"],
    ["LAA", "Los Angeles Angels",     "#BA0021", "#003263"],
    ["LAD", "Los Angeles Dodgers",    "#3A7DD1", "#EF3E42"],
    ["MIA", "Miami Marlins",          "#00A3E0", "#EF3340"],
    ["MIL", "Milwaukee Brewers",      "#FFC52F", "#12284B"],
    ["MIN", "Minnesota Twins",        "#D31145", "#002B5C"],
    ["NYM", "New York Mets",          "#FF5910", "#002D72"],
    ["NYY", "New York Yankees",       "#C4CED4", "#0C2340"],
    ["ATH", "Athletics",              "#EFB21E", "#003831"],
    ["PHI", "Philadelphia Phillies",  "#E81828", "#002D72"],
    ["PIT", "Pittsburgh Pirates",     "#FDB827", "#27251F"],
    ["SD",  "San Diego Padres",       "#FFC425", "#2F241D"],
    ["SF",  "San Francisco Giants",   "#FD5A1E", "#27251F"],
    ["SEA", "Seattle Mariners",       "#0C2C56", "#005C5C"],
    ["STL", "St. Louis Cardinals",    "#C41E3A", "#0C2340"],
    ["TB",  "Tampa Bay Rays",         "#8FBCE6", "#092C5C"],
    ["TEX", "Texas Rangers",          "#C0111F", "#003278"],
    ["TOR", "Toronto Blue Jays",      "#1D8DEB", "#134A8E"],
    ["WSH", "Washington Nationals",   "#AB0003", "#14225A"],
  ],

  nhl: [
    ["ANA", "Anaheim Ducks",          "#F47A38", "#B9975B"],
    ["BOS", "Boston Bruins",          "#FFB81C", "#000000"],
    ["BUF", "Buffalo Sabres",         "#FCB514", "#002654"],
    ["CGY", "Calgary Flames",         "#C8102E", "#F1BE48"],
    ["CAR", "Carolina Hurricanes",    "#CC0000", "#A2AAAD"],
    ["CHI", "Chicago Blackhawks",     "#CF0A2C", "#FF671B"],
    ["COL", "Colorado Avalanche",     "#6F263D", "#236192"],
    ["CBJ", "Columbus Blue Jackets",  "#CE1126", "#002654"],
    ["DAL", "Dallas Stars",           "#00A94F", "#8F8F8C"],
    ["DET", "Detroit Red Wings",      "#CE1126", "#FFFFFF"],
    ["EDM", "Edmonton Oilers",        "#FF4C00", "#041E42"],
    ["FLA", "Florida Panthers",       "#C8102E", "#B9975B"],
    ["LAK", "Los Angeles Kings",      "#A2AAAD", "#111111"],
    ["MIN", "Minnesota Wild",         "#A6192E", "#154734"],
    ["MTL", "Montreal Canadiens",     "#AF1E2D", "#192168"],
    ["NSH", "Nashville Predators",    "#FFB81C", "#041E42"],
    ["NJD", "New Jersey Devils",      "#CE1126", "#000000"],
    ["NYI", "New York Islanders",     "#F47D30", "#00539B"],
    ["NYR", "New York Rangers",       "#0038A8", "#CE1126"],
    ["OTT", "Ottawa Senators",        "#C52032", "#C2912C"],
    ["PHI", "Philadelphia Flyers",    "#F74902", "#000000"],
    ["PIT", "Pittsburgh Penguins",    "#FCB514", "#000000"],
    ["SJS", "San Jose Sharks",        "#00A9B8", "#EA7200"],
    ["SEA", "Seattle Kraken",         "#99D9D9", "#001628"],
    ["STL", "St. Louis Blues",        "#FCB514", "#002F87"],
    ["TBL", "Tampa Bay Lightning",    "#3B7FD4", "#FFFFFF"],
    ["TOR", "Toronto Maple Leafs",    "#00205B", "#FFFFFF"],
    ["UTA", "Utah Hockey Club",       "#71AFE5", "#090909"],
    ["VAN", "Vancouver Canucks",      "#00843D", "#00205B"],
    ["VGK", "Vegas Golden Knights",   "#B4975A", "#333F42"],
    ["WSH", "Washington Capitals",    "#C8102E", "#041E42"],
    ["WPG", "Winnipeg Jets",          "#55C5EF", "#041E42"],
  ],

  ncaa: [
    ["NDSU", "North Dakota State",    "#009639", "#FFC72C"],
    ["UND",  "North Dakota",          "#009A44", "#FF671F"],
    ["ALA",  "Alabama",               "#9E1B32", "#828A8F"],
    ["AUB",  "Auburn",                "#E87722", "#0C2340"],
    ["ARK",  "Arkansas",              "#9D2235", "#FFFFFF"],
    ["ARIZ", "Arizona",               "#CC0033", "#003366"],
    ["BAY",  "Baylor",                "#FFB81C", "#154734"],
    ["CLEM", "Clemson",               "#F66733", "#522D80"],
    ["UCONN","UConn",                 "#3A8DDE", "#000E2F"],
    ["DUKE", "Duke",                  "#0059B3", "#FFFFFF"],
    ["FLA",  "Florida",               "#FA4616", "#0021A5"],
    ["FSU",  "Florida State",         "#CEB888", "#782F40"],
    ["UGA",  "Georgia",               "#BA0C2F", "#000000"],
    ["GONZ", "Gonzaga",               "#C8102E", "#041E42"],
    ["IOWA", "Iowa",                  "#FFCD00", "#000000"],
    ["KU",   "Kansas",                "#0051BA", "#E8000D"],
    ["UK",   "Kentucky",              "#0033A0", "#FFFFFF"],
    ["LSU",  "LSU",                   "#FDD023", "#461D7C"],
    ["MIA",  "Miami",                 "#F47321", "#005030"],
    ["MICH", "Michigan",              "#FFCB05", "#00274C"],
    ["MSU",  "Michigan State",        "#18453B", "#FFFFFF"],
    ["MINN", "Minnesota",             "#FFCC33", "#7A0019"],
    ["MIZ",  "Missouri",              "#F1B82D", "#000000"],
    ["NEB",  "Nebraska",              "#E41C38", "#FFFFFF"],
    ["UNC",  "North Carolina",        "#7BAFD4", "#13294B"],
    ["ND",   "Notre Dame",            "#C99700", "#0C2340"],
    ["OSU",  "Ohio State",            "#BB0000", "#A7B1B7"],
    ["OU",   "Oklahoma",              "#841617", "#FDF9D8"],
    ["ORE",  "Oregon",                "#FEE123", "#154733"],
    ["PSU",  "Penn State",            "#3B7FD4", "#FFFFFF"],
    ["USC",  "USC",                   "#FFC72C", "#990000"],
    ["TENN", "Tennessee",             "#FF8200", "#58595B"],
    ["TEX",  "Texas",                 "#BF5700", "#333F48"],
    ["TAMU", "Texas A&M",             "#8C1D40", "#FFFFFF"],
    ["UCLA", "UCLA",                  "#2D68C4", "#F2A900"],
    ["VILL", "Villanova",             "#13B5EA", "#00205B"],
    ["WASH", "Washington",            "#B7A57A", "#4B2E83"],
    ["WIS",  "Wisconsin",             "#E4002B", "#FFFFFF"],
  ],
};

/** Look up a team from a "league:id" string. */
export function findTeam(value) {
  if (!value) return null;
  const [league, id] = String(value).split(":");
  const row = (TEAMS[league] || []).find((t) => t[0] === id);
  if (!row) return null;
  return {
    value, league,
    id:        row[0],
    name:      row[1],
    primary:   row[2],
    secondary: row[3],
    leagueLabel: LEAGUES.find((l) => l.key === league)?.label || league.toUpperCase(),
  };
}

/** Flat [{value, label}] list for a dropdown, grouped by league order. */
export function teamOptions() {
  const out = [{ value: "", label: "— league green (default) —" }];
  for (const { key, label } of LEAGUES) {
    for (const [id, name] of TEAMS[key]) {
      out.push({ value: `${key}:${id}`, label: `${name} (${label})` });
    }
  }
  return out;
}
