export const OFFER_TIERS = ['fair', 'aggressive', 'steal'];

// Each intent uses a different candidate search. Count its own generated
// results rather than another intent's truncated fallback list.
export function createTradeOfferCatalog({search, onChange = (_result) => {}, cacheLimit = 4}) {
  const cache = new Map();
  let active = null, generation = 0, stopped = false;
  const cancel = () => {
    generation++;
    if (active) {
      const entry = cache.get(active.key);
      if (entry?.[active.tier]?.state === 'loading') entry[active.tier] = {state:'idle', offers:[]};
    }
    active = null;
    search.cancel();
  };
  const start = (key, query, entry) => {
    const token = ++generation;
    active = {key, tier:query.intent};
    void (async () => {
      for (const tier of [query.intent, ...OFFER_TIERS.filter(tier => tier !== query.intent)]) {
        if (stopped || token !== generation) return;
        if (entry[tier].state !== 'idle') continue;
        active.tier = tier;
        entry[tier] = {state:'loading', offers:[]};
        try {
          const offers = await search.run({...query, intent:tier});
          if (stopped || token !== generation) return;
          entry[tier] = {state:'ready', offers};
        } catch (error) {
          if (stopped || token !== generation || error.name === 'AbortError') return;
          entry[tier] = {state:'error', offers:[]};
        }
        onChange({key, tier});
      }
      if (token === generation) active = null;
    })();
  };
  return {
    read(key, query) {
      if (stopped) return {state:'error', offers:[], counts:{}, countErrors:{}};
      if (active && active.key !== key) cancel();
      let entry = cache.get(key);
      if (!entry) {
        entry = Object.fromEntries(OFFER_TIERS.map(tier => [tier, {state:'idle', offers:[]}]));
        cache.set(key, entry);
        while (cache.size > cacheLimit) cache.delete(cache.keys().next().value);
      }
      // A tap on an unsearched tier takes priority over background work.
      if (active && active.tier !== query.intent && entry[query.intent].state === 'idle') cancel();
      if (!active && OFFER_TIERS.some(tier => entry[tier].state === 'idle')) start(key, query, entry);
      const result = entry[query.intent];
      return {...result, state:result.state === 'idle' ? 'loading' : result.state,
        counts:Object.fromEntries(OFFER_TIERS.map(tier => [tier, entry[tier].state === 'ready'
          ? entry[tier].offers.filter(offer => offer.tier === tier).length : null])),
        countErrors:Object.fromEntries(OFFER_TIERS.map(tier => [tier, entry[tier].state === 'error']))};
    },
    retry(key, intent) {
      const entry = cache.get(key);
      if (entry?.[intent]?.state === 'error') entry[intent] = {state:'idle', offers:[]};
    },
    cancel,
    stop() { stopped = true; cancel(); search.stop(); cache.clear(); },
  };
}
