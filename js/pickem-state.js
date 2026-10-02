export function pickemState(board, now = new Date()) {
  const lockTime = new Date(board?.locksAt).getTime();
  const isLocked = !!board?.locksAt && Number.isFinite(lockTime) && lockTime <= Number(now);
  const picks = board?.entry?.picks || {};
  const chosen = Object.keys(picks).length;
  const total = (board?.games || []).length;
  const entered = !!board?.entry && chosen > 0;
  const correct = Number(board?.entry?.liveCorrect) || 0;
  const wrong = Number(board?.entry?.liveWrong) || 0;
  const pending = Math.max(0, chosen - correct - wrong);
  return { isLocked, picks, chosen, total, entered, correct, wrong, pending };
}
