/* ==================================================================
   模擬引擎
   核心想法：不要寫死到站時間，而是讓車真的沿著路線在跑，
   到站時間從車的位置反推出來。這樣看板、路線圖、車輛位置
   三者永遠是一致的，點開來也不會露餡。
   ================================================================== */
window.SIM = (function () {

  const D = window.DATA;

  /* ---------- 模擬時鐘 ----------
     跟著真實時間走，讓「已收班」「尚未發車」這些狀態是真的會出現的。
     但如果現在是深夜，整頁會什麼都沒有，所以這時把起點挪到早上八點十五分。 */
  const realNow = new Date();
  const realMinutes = realNow.getHours() * 60 + realNow.getMinutes();
  const inService = realMinutes >= 6 * 60 && realMinutes <= 22 * 60 + 30;
  const startMinutes = inService ? realMinutes : 8 * 60 + 15;
  const bootMs = Date.now();

  /** 目前的模擬時間，回傳「當日第幾秒」 */
  function nowSeconds() {
    return startMinutes * 60 + (Date.now() - bootMs) / 1000;
  }

  function clockText() {
    const t = nowSeconds();
    const h = Math.floor(t / 3600) % 24;
    const m = Math.floor(t / 60) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /* ---------- 事故 ----------
     結構：{ route, direction, delay(秒), since(秒), where(站名) }
     這是簡報第一期「智慧應變」的那一段，做成可以按的。 */
  let incident = null;

  function raiseIncident() {
    incident = {
      route: '81',
      direction: 0,
      delay: 480,
      since: nowSeconds(),
      where: '光復路二段',
      whereEn: 'Guangfu Rd. Sec. 2',
    };
  }
  function clearIncident() { incident = null; }
  function getIncident() { return incident; }

  function delayFor(routeName, direction) {
    if (!incident) return 0;
    if (incident.route !== routeName || incident.direction !== direction) return 0;
    return incident.delay;
  }

  /* ---------- 每輛車的個性 ----------
     同一班次每次算出來的誤差要一樣，不然畫面會抖。
     用班次序號當種子做一個穩定的偽亂數。 */
  function jitter(routeName, direction, k) {
    let h = 2166136261;
    const s = `${routeName}|${direction}|${k}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const unit = ((h >>> 0) % 1000) / 1000;      // 0 ~ 1
    return Math.round((unit - 0.35) * 240);      // -84 ~ +156 秒
  }

  /* ---------- 目前線上的車 ----------
     班次是算出來的：第 k 班在 open + k * head 發車。
     只要發車時間已過、而且還沒跑完全程，這班車就在線上。 */
  function activeBuses(routeName, direction) {
    const r = D.ROUTE_BY_NAME[routeName];
    const seg = D.segments(routeName, direction);
    const total = seg.reduce((a, b) => a + b, 0);
    const t = nowSeconds();
    const extra = delayFor(routeName, direction);

    // 返程的首班比去程晚半個班距發車
    const first = r.open * 60 + (direction === 1 ? r.head / 2 : 0);
    const last = r.close * 60;

    const buses = [];
    const maxK = Math.floor((last - first) / r.head);

    for (let k = 0; k <= maxK; k++) {
      const departAt = first + k * r.head + jitter(routeName, direction, k);
      const progress = t - departAt;                    // 已跑了幾秒
      if (progress < 0 || progress > total + extra) continue;

      buses.push({
        plate: plateOf(routeName, direction, k),
        progress: Math.max(0, progress - extra * progressShare(progress, total)),
        raw: progress,
        total,
        delayed: extra > 0,
      });
    }
    return buses;
  }

  // 事故造成的延誤不是一次加完，而是隨著車靠近事故點慢慢累積
  function progressShare(progress, total) {
    return Math.min(1, Math.max(0, progress / total));
  }

  function plateOf(routeName, direction, k) {
    const pool = ['KKA', 'FAB', 'EAA', 'KKB', 'FAD', 'EBB'];
    const a = pool[Math.abs(routeName.charCodeAt(0) + k) % pool.length];
    const n = String(100 + ((k * 37 + direction * 11 + routeName.length * 13) % 900));
    return `${a}-${n}${(k % 10)}`;
  }

  /* ---------- 車跑到哪一站了 ---------- */
  function stopIndexOf(routeName, direction, progress) {
    const seg = D.segments(routeName, direction);
    let acc = 0;
    for (let i = 0; i < seg.length; i++) {
      acc += seg[i];
      if (progress < acc) return i;      // 還沒到第 i+1 站，所以停在 i 和 i+1 之間
    }
    return seg.length;
  }

  /* ---------- 某站某路線的到站預估 ----------
     回傳 { eta, status, plate, source }
     status: 'ok' | 'notStarted' | 'finished' | 'noSignal'
  */
  function estimate(routeName, direction, stopName) {
    const r = D.ROUTE_BY_NAME[routeName];
    const seq = D.sequence(routeName, direction);
    const idx = seq.indexOf(stopName);
    if (idx < 0) return null;

    const t = nowSeconds();
    const seg = D.segments(routeName, direction);

    // 這一站在路線上的累積秒數
    let cum = 0;
    for (let i = 0; i < idx; i++) cum += seg[i];

    // 還沒到首班發車時間
    const first = r.open * 60 + (direction === 1 ? r.head / 2 : 0);
    if (t < first) return { eta: null, status: 'notStarted', plate: null, source: 'none' };

    // 已經過末班發車 + 全程時間
    const total = seg.reduce((a, b) => a + b, 0);
    if (t > r.close * 60 + total) return { eta: null, status: 'finished', plate: null, source: 'none' };

    const buses = activeBuses(routeName, direction);
    let best = null;
    for (const b of buses) {
      const eta = cum - b.progress;
      if (eta >= -30 && (best === null || eta < best.eta)) best = { eta: Math.max(0, eta), bus: b };
    }

    if (!best) {
      // 現在沒有車在線上，改用班表推估下一班會幾點到
      // 這正是「車機定位」和「時刻表推估」要在畫面上分開標示的原因：
      // 前者是真的有車在回報位置，後者只是照班表算的，準度差很多。
      const maxK = Math.ceil((r.close * 60 - first) / r.head);
      for (let k = 0; k <= maxK; k++) {
        const arrive = first + k * r.head + cum;
        if (arrive > t) {
          return { eta: Math.round(arrive - t), status: 'ok', plate: null, source: 'schedule' };
        }
      }
      return { eta: null, status: 'finished', plate: null, source: 'none' };
    }

    return {
      eta: Math.round(best.eta),
      status: 'ok',
      plate: best.bus.plate,
      source: 'realtime',
      delayed: best.bus.delayed,
    };
  }

  /* ---------- 一整個站牌的看板 ---------- */
  function board(stopName) {
    const entries = (D.STOP_INDEX[stopName] || []).filter(({ route, direction }) => {
      // 這一站若是該方向的終點站，就不該出現在看板上 —— 那班車到這裡就結束了
      const seq = D.sequence(route, direction);
      return seq[seq.length - 1] !== stopName;
    });

    const rows = entries.map(({ route, direction }) => {
      const est = estimate(route, direction, stopName);
      return {
        route,
        direction,
        color: D.ROUTE_BY_NAME[route].color,
        towards: D.headsign(route, direction),
        ...est,
      };
    });

    rows.sort((a, b) => {
      const av = a.eta === null ? Infinity : a.eta;
      const bv = b.eta === null ? Infinity : b.eta;
      if (av !== bv) return av - bv;
      return a.route.localeCompare(b.route, 'zh-Hant');
    });

    return rows;
  }

  /* ---------- 替代路線建議 ----------
     事故發生時，找出同一站也能到達目的地的其他路線。
     這就是簡報裡「建議候車乘客改搭其他路線」那一段。 */
  function alternatives(stopName, blockedRow) {
    if (!blockedRow) return [];
    const targetSeq = D.sequence(blockedRow.route, blockedRow.direction);
    const after = targetSeq.slice(targetSeq.indexOf(stopName) + 1);   // 這班車接下來會到的站

    const found = [];
    for (const { route, direction } of (D.STOP_INDEX[stopName] || [])) {
      if (route === blockedRow.route && direction === blockedRow.direction) continue;
      const seq = D.sequence(route, direction);
      const here = seq.indexOf(stopName);
      const shared = seq.slice(here + 1).filter((s) => after.includes(s));
      if (!shared.length) continue;

      const est = estimate(route, direction, stopName);
      if (!est || est.status !== 'ok') continue;

      found.push({
        route,
        direction,
        color: D.ROUTE_BY_NAME[route].color,
        eta: est.eta,
        reaches: shared,
      });
    }
    return found.sort((a, b) => a.eta - b.eta).slice(0, 3);
  }

  /* ---------- 附近站牌 ---------- */
  function nearby(lat, lon, limit = 8) {
    return Object.entries(D.STOPS)
      .map(([name, s]) => ({
        name,
        ...s,
        distance: Math.round(haversine(lat, lon, s.lat, s.lon)),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  function haversine(la1, lo1, la2, lo2) {
    const R = 6371000, rad = (d) => (d * Math.PI) / 180;
    const dLa = rad(la2 - la1), dLo = rad(lo2 - lo1);
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /* ---------- 資料新鮮度 ----------
     模擬「來源端多久前回報一次」。正常大約每 20 秒一次，
     按下示範按鈕之後就停止更新，讓畫面示範它會怎麼講話。 */
  let frozenAt = null;
  let lastTick = Date.now();

  function freeze() { frozenAt = Date.now(); }
  function unfreeze() { frozenAt = null; lastTick = Date.now(); }
  function isFrozen() { return frozenAt !== null; }

  function dataAge() {
    if (frozenAt !== null) return Math.floor((Date.now() - frozenAt) / 1000);
    const age = Math.floor((Date.now() - lastTick) / 1000);
    if (age >= 20) { lastTick = Date.now(); return 0; }
    return age;
  }

  return {
    nowSeconds, clockText,
    board, estimate, activeBuses, stopIndexOf, alternatives, nearby,
    raiseIncident, clearIncident, getIncident,
    freeze, unfreeze, isFrozen, dataAge,
  };
})();
