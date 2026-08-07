// =====================================================================
// DFL Golf - the draft party event, and its own sport.
//
//   #/golf          the outings list and the history
//   #/golf?id=7     one outing: who is playing, and the teams
//
// Golf is deliberately separate from the fantasy draft and Arena.
// =====================================================================

import { db, insertRow, updateRow } from "../supabase.js";
import { esc, empty, errorBox, toast, fmtDate, loading } from "../ui.js";
import { loadMembers } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible