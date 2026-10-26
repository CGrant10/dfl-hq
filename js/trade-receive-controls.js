export const TRADE_RECEIVE_POSITIONS = ['QB','RB','WR','TE'];

// Undefined means the existing unrestricted search; an empty selection means none.
export function normalizeReceivePositions(value) {
  return TRADE_RECEIVE_POSITIONS.filter(position => !Array.isArray(value) || value.includes(position));
}

export function receivePackageAllowed(ids, pool, positions) {
  return ids.every(id => positions.includes(pool.get(String(id))?.position));
}

export function setReceivePositions(shop, positions, pool) {
  shop.receivePositions = normalizeReceivePositions(positions);
  shop.receiveAnchors = (shop.receiveAnchors || []).filter(id => receivePackageAllowed([id],pool,shop.receivePositions));
  if (TRADE_RECEIVE_POSITIONS.includes(shop.goal) && !shop.receivePositions.includes(shop.goal)) shop.goal = 'best';
}

export function receivePositionsMarkup(value) {
  const positions = normalizeReceivePositions(value);
  return `<fieldset class="tb-receive-positions"><legend>I’ll receive</legend>
    <div class="tb-receive-options">${TRADE_RECEIVE_POSITIONS.map(position=>`<label><input type="checkbox" value="${position}" data-tb-receive-position="${position}"${positions.includes(position)?' checked':''}><span>${position}</span></label>`).join('')}
      <button type="button" data-tb-receive-preset="all" aria-label="Receive all positions" aria-pressed="${positions.length===4}">All</button>
      <button type="button" data-tb-receive-preset="flex-skill" aria-label="Receive running backs and wide receivers only" aria-pressed="${positions.join(',')==='RB,WR'}">RB + WR</button>
    </div>
  </fieldset>`;
}
