/* ==================================================================
   問路規劃（純前端「智慧」比對，不叫用任何語言模型 API）
   兩件事：
   1. parseQuery：從一句自然語言裡猜出「從哪裡」「到哪裡」
   2. planTrip：在現有路網裡找出最少轉乘的搭法，最多算到轉乘兩次
   ================================================================== */
window.PLAN = (function () {

  const D = window.DATA;
  const S = window.SIM;

  // 比對用的候選字串：中文站名本身、英文站名；長的排前面，避免子字串誤配
  // （例如要先比對到「新竹科學園區」而不是先比對到「新竹」）
  function buildCandidates(namesObj) {
    return Object.keys(namesObj)
      .flatMap((n) => {
        const en = namesObj[n].en;
        return en ? [{ name: n, text: n }, { name: n, text: en }] : [{ name: n, text: n }];
      })
      .sort((a, b) => b.text.length - a.text.length);
  }
  const STOP_CANDIDATES = buildCandidates(D.STOPS);
  const POI_CANDIDATES = buildCandidates(D.POIS);

  function matchText(raw, candidates) {
    if (!raw) return null;
    const q = raw.trim();
    if (!q) return null;
    const ql = q.toLowerCase();

    // 1) 完全對上（中文名或英文名）
    for (const c of candidates) {
      if (c.text === q || c.text.toLowerCase() === ql) return c.name;
    }
    // 2) 使用者打的句子裡「包含」某個名字／英文名
    for (const c of candidates) {
      if (c.text.length >= 2 && (q.includes(c.text) || ql.includes(c.text.toLowerCase()))) return c.name;
    }
    // 3) 反過來：使用者打得比較短，是某個名字的一部分（例如「內灣」對到「內灣老街」）
    if (q.length >= 2) {
      for (const c of candidates) {
        if (c.text.includes(q) || c.text.toLowerCase().includes(ql)) return c.name;
      }
    }
    return null;
  }

  /* ---------------- 站名比對（只找公車站） ---------------- */
  function findStopByText(raw) {
    return matchText(raw, STOP_CANDIDATES);
  }

  /* ---------------- 地標 → 最近公車站，距離改用路網距離 ----------------
     先用直線距離抓幾個候選站（快、不用等網路），再只對這幾個候選站
     呼叫 ROUTEDIST 算真正沿路網的距離，這樣不用每次都對 40 幾站都打一次
     OSRM。連不上路網服務時 ROUTEDIST 會自動退回估算值並標記 approx。 */
  async function nearestStopRoad(lat, lon, poolSize = 5) {
    const candidates = S.nearby(lat, lon, poolSize);
    if (!candidates.length) return null;
    const ranked = await window.ROUTEDIST.annotate(lat, lon, candidates);
    return ranked[0];
  }

  async function resolvePoi(poiName) {
    const p = D.POIS[poiName];
    const best = await nearestStopRoad(p.lat, p.lon);
    return best ? { stop: best.name, poi: poiName, distance: best.distance, approx: best.approx } : null;
  }

  /* ---------------- 地點比對：先試公車站，找不到再試地標 ----------------
     地標（巨城、市政府這類非公車站的地方）找到之後，改成「找離這個地標
     最近的公車站」來規劃——這是使用者實際要問的：不是問站名本身，
     而是問「我要去這個地方，該去哪一站搭／在哪一站下車」。
     回傳 { stop, poi, distance, approx } 或 null；poi 有值代表是靠地標反查出來的。 */
  async function findPlaceOrStop(raw) {
    const stop = matchText(raw, STOP_CANDIDATES);
    if (stop) return { stop, poi: null, distance: 0, approx: false };

    const poi = matchText(raw, POI_CANDIDATES);
    return poi ? resolvePoi(poi) : null;
  }

  /* ---------------- 從一句話拆出「起點」「終點」 ----------------
     回傳的 from / to 一律是「公車站名」；如果是靠地標反查出來的，
     fromPoi / toPoi 會帶著 { name, distance, approx }，畫面上要講清楚
     「這是離你說的地方最近的站，不是那個地方本身」。
     這支函式現在會等路網距離查詢，所以是 async。 */
  async function parseQuery(raw) {
    const empty = { from: null, fromPoi: null, to: null, toPoi: null };
    const q = (raw || '').trim();
    if (!q) return empty;

    const wrap = (fromR, toR) => ({
      from: fromR ? fromR.stop : null,
      fromPoi: fromR && fromR.poi ? { name: fromR.poi, distance: fromR.distance, approx: fromR.approx } : null,
      to: toR.stop,
      toPoi: toR.poi ? { name: toR.poi, distance: toR.distance, approx: toR.approx } : null,
    });

    const patterns = [
      /從(.+?)(?:到|去|出發到|前往)(.+)/,
      /(.+?)(?:到|去)(.+)/,
      /from\s+(.+?)\s+to\s+(.+)/i,
    ];
    for (const re of patterns) {
      const m = q.match(re);
      if (m) {
        const fromR = await findPlaceOrStop(m[1]);
        const toR = await findPlaceOrStop(m[2]);
        // 就算 from／to 反查出來是同一站也照實回傳——這種情況留給呼叫端用
        // 「起點終點同站」的錯誤訊息講清楚，而不是默默丟掉使用者明講的起點。
        if (toR) return wrap(fromR, toR);
      }
    }

    // 沒有「從…到…」這種句型，就整句掃過去找地名（公車站或地標混在一起找）；
    // 找到兩個以上，第一個當起點、最後一個當終點；只找到一個就當終點。
    const combined = [
      ...STOP_CANDIDATES.map((c) => ({ ...c, kind: 'stop' })),
      ...POI_CANDIDATES.map((c) => ({ ...c, kind: 'poi' })),
    ].sort((a, b) => b.text.length - a.text.length);

    const found = [];
    let rest = q;
    for (const c of combined) {
      const idx = rest.indexOf(c.text);
      if (idx >= 0 && c.text.length >= 2) {
        found.push({ ...c, idx });
        rest = rest.slice(0, idx) + ' '.repeat(c.text.length) + rest.slice(idx + c.text.length);
      }
    }
    found.sort((a, b) => a.idx - b.idx);

    const seen = new Set();
    const uniq = found.filter((f) => {
      const key = `${f.kind}:${f.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const resolve = (entry) => entry.kind === 'stop'
      ? Promise.resolve({ stop: entry.name, poi: null, distance: 0, approx: false })
      : resolvePoi(entry.name);

    if (uniq.length >= 2) {
      const toR = await resolve(uniq[uniq.length - 1]);
      if (toR) return wrap(await resolve(uniq[0]), toR);
    }
    if (uniq.length === 1) {
      const toR = await resolve(uniq[0]);
      if (toR) return wrap(null, toR);
    }

    // 整句話裡完全掃不到任何完整字串（例如使用者只打了「內灣」這種
    // 比某個地名還短的詞，或整句就是一個地標名）——反向比對再試一次。
    const single = await findPlaceOrStop(q);
    return single ? wrap(null, single) : empty;
  }

  /* ---------------- 路網搜尋：BFS，最多算到「轉乘三次」（四段） ----------------
     節點是「目前在哪一站」，一個 edge 是「搭一班車，可以直接坐到同方向後面任何一站」。
     BFS 保證第一次找到終點時，用的段數（轉乘次數）是最少的。
     縣市全區域涵蓋之後，有些偏遠鄉鎮之間確實需要轉乘三次才到得了。 */
  function bfsLegs(fromName, toName, maxLegs = 4) {
    if (!D.STOPS[fromName] || !D.STOPS[toName] || fromName === toName) return null;

    let frontier = [{ stop: fromName, legs: [] }];
    const visited = new Set([fromName]);

    for (let depth = 0; depth < maxLegs; depth++) {
      const completions = [];
      const next = [];

      for (const state of frontier) {
        const options = D.STOP_INDEX[state.stop] || [];
        for (const { route, direction, index } of options) {
          const seq = D.sequence(route, direction);
          for (let j = index + 1; j < seq.length; j++) {
            const stopName = seq[j];
            const leg = { route, direction, from: state.stop, to: stopName, fromIdx: index, toIdx: j };
            if (stopName === toName) {
              completions.push([...state.legs, leg]);
              break; // 這條路線再往後的站不用繼續看，終點已經到了
            }
            if (!visited.has(stopName)) {
              visited.add(stopName);
              next.push({ stop: stopName, legs: [...state.legs, leg] });
            }
          }
        }
      }

      if (completions.length) return pickBestPath(completions, fromName);
      frontier = next;
      if (!frontier.length) break;
    }
    return null;
  }

  // 同樣段數的走法可能不只一種，挑「現在等車+全程車程」加總最小的那個
  function pickBestPath(paths, fromName) {
    let best = null, bestScore = Infinity;
    for (const legs of paths) {
      const est0 = S.estimate(legs[0].route, legs[0].direction, fromName);
      const wait = est0 && est0.status === 'ok' ? est0.eta : 1800; // 沒有即時預估就給一個保守的懲罰值
      let travel = 0;
      for (const leg of legs) {
        const seg = D.segments(leg.route, leg.direction);
        for (let k = leg.fromIdx; k < leg.toIdx; k++) travel += seg[k];
      }
      const score = wait + travel;
      if (score < bestScore) { bestScore = score; best = legs; }
    }
    return best;
  }

  /* ---------------- 組出完整的規劃結果，含每段的即時預估 ---------------- */
  function planTrip(fromName, toName) {
    const legs = bfsLegs(fromName, toName);
    if (!legs) return null;

    const detailed = legs.map((leg, i) => {
      const est = S.estimate(leg.route, leg.direction, leg.from);
      let travelSec = 0;
      const seg = D.segments(leg.route, leg.direction);
      for (let k = leg.fromIdx; k < leg.toIdx; k++) travelSec += seg[k];
      return {
        ...leg,
        color: D.ROUTE_BY_NAME[leg.route].color,
        towards: D.headsign(leg.route, leg.direction),
        est,
        travelSec,
        isTransfer: i > 0,
      };
    });

    const totalTravelSec = detailed.reduce((a, l) => a + l.travelSec, 0);
    const firstWaitSec = (detailed[0].est && detailed[0].est.status === 'ok') ? detailed[0].est.eta : null;

    return { from: fromName, to: toName, legs: detailed, totalTravelSec, firstWaitSec };
  }

  return { findStopByText, findPlaceOrStop, parseQuery, planTrip };
})();
