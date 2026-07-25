/* ==================================================================
   路網距離
   叫用 OSRM 的公開示範伺服器（router.project-osrm.org）算「沿路網」的
   距離，取代直線（Haversine）距離。免金鑰，但這是別人維運的公開示範
   服務，不保證高可用、也有流量限制——連不上時會退回直線距離乘上一個
   經驗係數概算，並標記 approx:true，畫面上要講清楚這是估算值。

   公開示範伺服器目前只有汽車路網資料，profile 參數（foot/bike/driving）
   實測下來都回傳一樣的結果，所以這裡老實只當「driving」在叫，
   顯示文案也統一講「路網距離」而不是硬說是步行路線。
   ================================================================== */
window.ROUTEDIST = (function () {

  const BASE = 'https://router.project-osrm.org/route/v1/driving/';
  const TIMEOUT_MS = 5000;
  const DETOUR_FACTOR = 1.3; // 連不上路網服務時，直線距離乘上這個係數概估
  const cache = new Map();

  function cacheKey(lat1, lon1, lat2, lon2) {
    const r = (n) => n.toFixed(5);
    return `${r(lat1)},${r(lon1)}|${r(lat2)},${r(lon2)}`;
  }

  /* 兩點之間的路網距離（公尺）；連不上或逾時回傳 null，由呼叫端決定怎麼退回。 */
  async function roadDistance(lat1, lon1, lat2, lon2) {
    const key = cacheKey(lat1, lon1, lat2, lon2);
    if (cache.has(key)) return cache.get(key);

    let meters = null;
    try {
      const url = `${BASE}${lon1},${lat1};${lon2},${lat2}?overview=false`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes[0]) meters = data.routes[0].distance;
      }
    } catch { /* 連不上、逾時、CORS 被擋……都當作失敗，外層退回估算值 */ }

    cache.set(key, meters);
    return meters;
  }

  /* 幫一批候選點（每個至少要有 lat/lon 跟直線 distance）都補上路網距離，
     連不上的那幾筆用「直線距離 × 概算係數」頂著，並標記 approx:true。
     回傳依最終距離排序過的陣列。 */
  async function annotate(originLat, originLon, candidates) {
    const results = await Promise.all(candidates.map(async (c) => {
      const meters = await roadDistance(originLat, originLon, c.lat, c.lon);
      if (meters != null) return { ...c, distance: Math.round(meters), approx: false };
      return { ...c, distance: Math.round(c.distance * DETOUR_FACTOR), approx: true };
    }));
    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  return { roadDistance, annotate };
})();
