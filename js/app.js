/* ==================================================================
   啟動與狀態
   ================================================================== */
window.APP = (function () {

  const D = window.DATA;
  const S = window.SIM;
  const UI = window.UI;
  const I18N = window.I18N;
  const THEME = window.THEME;
  const MAP = window.MAP;
  const PLAN = window.PLAN;
  const ROUTEDIST = window.ROUTEDIST;
  const $ = (id) => document.getElementById(id);
  const t = (key, vars) => I18N.t(key, vars);

  const state = { stop: null, openKey: null };
  // 定位狀態：畫面文字（附近站牌 vs 熱門站牌）跟著這個走，語言切換時要重套用
  const nearState = { mode: 'default', coords: null };
  // 上一次問路的結果存起來，語言切換時要用新語言重畫一次
  let lastTripResult = null;

  /* ---------------- 收藏 ----------------
     localStorage 可能被瀏覽器擋掉（無痕模式、以 file:// 開啟的某些情況），
     所以包一層，失敗就退回記憶體，畫面不會壞掉。 */
  const favStore = (() => {
    const KEY = 'hsinchu-bus-favs';
    let mem = [];
    try {
      mem = JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch { mem = []; }
    return {
      list: () => mem,
      has: (n) => mem.includes(n),
      toggle(n) {
        mem = mem.includes(n) ? mem.filter((x) => x !== n) : [...mem, n];
        try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* 存不了就算了 */ }
      },
    };
  })();

  /* ---------------- 畫面切換 ---------------- */
  function showPick() {
    state.stop = null; state.openKey = null;
    $('pickScreen').hidden = false;
    $('boardScreen').hidden = true;
    $('backBtn').hidden = true;
    $('title').textContent = t('pickTitle');
    $('sub').textContent = t('pickSub');
    $('mapHint').hidden = false;
    renderPick();
    syncHeaderHeight();
  }

  function showBoard(stopName) {
    state.stop = stopName; state.openKey = null;
    $('pickScreen').hidden = true;
    $('boardScreen').hidden = false;
    $('backBtn').hidden = false;
    $('title').textContent = D.stopLabel(stopName, I18N.getLang());
    $('sub').textContent = D.roadLabel(stopName, I18N.getLang()) || '';
    $('mapHint').hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (MAP.available()) {
      MAP.clearRoute('mainMap');
      MAP.focusStop('mainMap', stopName);
    }
    syncHeaderHeight();
    refresh();
  }

  /* ---------------- 選站畫面 ---------------- */
  let nearbyStops = null;   // 定位過就記著

  function currentNearList() {
    return nearbyStops || [
      { name: '新竹火車站' }, { name: '清華大學' }, { name: '新竹科學園區' },
      { name: '東門城' }, { name: '南寮漁港' }, { name: '工研院' },
      { name: '竹北轉運站' }, { name: '竹東轉運站' }, { name: '內灣老街' }, { name: '香山車站' },
    ];
  }

  function renderPick() {
    const favs = favStore.list();
    $('favBlock').hidden = favs.length === 0;
    if (favs.length) {
      UI.stopList($('favList'), favs.map((n) => ({ name: n })), {
        onPick: showBoard,
        isFav: favStore.has,
        onFav: (n) => { favStore.toggle(n); renderPick(); },
      });
    }

    UI.stopList($('nearList'), currentNearList(), {
      onPick: showBoard,
      isFav: favStore.has,
      onFav: (n) => { favStore.toggle(n); renderPick(); },
    });

    renderPickMap();
  }

  function renderPickMap() {
    if (!MAP.available()) return;
    MAP.ensure('mainMap');
    MAP.renderStops('mainMap', Object.keys(D.STOPS), {
      onPick: showBoard,
      isFav: favStore.has,
    });
    if (nearState.coords) MAP.setUserLocation('mainMap', nearState.coords.lat, nearState.coords.lon, false);
  }

  function applyNearNote() {
    const map = {
      default: 'nearNote',
      located: 'nearNoteLocated',
      fallback: 'nearNoteFallback',
      nogeo: 'nearNoteNoGeo',
    };
    $('nearHead').textContent = t(nearState.mode === 'default' ? 'nearHead' : 'nearHeadLocated');
    $('nearNote').textContent = t(map[nearState.mode] || 'nearNote');
  }

  /* 搜尋：站牌名稱與路線號碼一起找 */
  $('search').addEventListener('input', (e) => {
    const q = e.target.value.trim();
    const box = $('searchResults');
    if (!q) { box.innerHTML = ''; return; }

    const byStop = Object.keys(D.STOPS).filter((n) => n.includes(q) || (D.STOPS[n].en || '').toLowerCase().includes(q.toLowerCase()));
    const byRoute = D.ROUTES
      .filter((r) => r.name.includes(q))
      .flatMap((r) => r.stops)
      .filter((n) => !byStop.includes(n));

    const hits = [...byStop, ...byRoute].slice(0, 12).map((name) => ({ name }));

    box.innerHTML = `<div class="sectionhead"><h2>${I18N.t('searchResultsHead')}</h2><span>${I18N.t('searchResultsCount', { n: hits.length })}</span></div>`;
    const list = document.createElement('div');
    list.className = 'list';
    box.appendChild(list);
    UI.stopList(list, hits, {
      emptyText: t('searchEmpty', { q }),
      onPick: showBoard,
      isFav: favStore.has,
      onFav: (n) => { favStore.toggle(n); renderPick(); },
    });
  });

  // 先用直線距離抓幾個候選站（快），再只對這幾站呼叫 OSRM 算路網距離，
  // 不用每次都對全部 40 幾站打一次路網服務。
  async function nearbyByRoad(lat, lon, limit = 8) {
    const candidates = S.nearby(lat, lon, limit + 4);
    const ranked = await ROUTEDIST.annotate(lat, lon, candidates);
    return ranked.slice(0, limit);
  }

  $('nearBtn').addEventListener('click', async () => {
    const btn = $('nearBtn');
    if (!navigator.geolocation) return fallbackNearby('nogeo');
    const original = t('nearBtn');
    btn.disabled = true; btn.textContent = t('nearBtnLocating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        btn.textContent = t('nearBtnRouting');
        nearState.coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        nearbyStops = await nearbyByRoad(pos.coords.latitude, pos.coords.longitude);
        btn.disabled = false; btn.textContent = original;
        nearState.mode = 'located';
        applyNearNote();
        renderPick();
      },
      () => {
        btn.disabled = false; btn.textContent = original;
        fallbackNearby('fallback');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  // 拿不到定位就用市中心當基準，示範時不會卡住
  async function fallbackNearby(mode) {
    const c = D.STOPS['新竹火車站'];
    nearbyStops = await nearbyByRoad(c.lat, c.lon);
    nearState.mode = mode;
    applyNearNote();
    renderPick();
  }

  /* ---------------- 問路規劃：使用者打字問「怎麼去」 ----------------
     純前端的規則比對＋路網搜尋＋定位（js/plan.js），不叫用任何語言模型 API。
     目的地如果是「新竹巨城」這種不是公車站的地標，會改成規劃到離它最近的站牌；
     沒說起點的話，會先試著即時定位使用者目前位置，抓最近的站牌當起點。 */
  let tripBusy = false;

  async function runTripPlan() {
    if (tripBusy) return;
    const raw = $('tripQuery').value;
    if (!raw.trim()) return;

    tripBusy = true;
    $('tripBtn').disabled = true;
    lastTripResult = { loading: true };
    renderTripResult();

    try {
      const parsed = await PLAN.parseQuery(raw);
      if (!parsed.to) {
        lastTripResult = { error: 'noDest' };
        renderTripResult();
        return;
      }

      const destNote = parsed.toPoi
        ? { poi: parsed.toPoi.name, stop: parsed.to, distance: parsed.toPoi.distance, approx: parsed.toPoi.approx }
        : null;

      let fromName = parsed.from;
      let originNote = null;
      if (fromName) {
        originNote = parsed.fromPoi
          ? { type: 'poi', poi: parsed.fromPoi.name, stop: parsed.from, distance: parsed.fromPoi.distance, approx: parsed.fromPoi.approx }
          : null;
      } else {
        // 沒講起點：系統要先搞清楚使用者「現在在哪」，再去找最近的站牌
        originNote = await locateOrigin();
        fromName = originNote.stop;
      }

      finishTripPlan(fromName, parsed.to, originNote, destNote);
    } finally {
      tripBusy = false;
      $('tripBtn').disabled = false;
    }
  }

  async function locateOrigin() {
    if (nearState.coords) {
      const best = await nearestStopRoad(nearState.coords.lat, nearState.coords.lon);
      return { type: 'geo', stop: best.name, distance: best.distance, approx: best.approx };
    }
    if (!navigator.geolocation) {
      return { type: 'assumed', stop: '新竹火車站' };
    }

    lastTripResult = { loading: true };
    renderTripResult();

    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 }));
      nearState.coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const best = await nearestStopRoad(pos.coords.latitude, pos.coords.longitude);
      return { type: 'geo', stop: best.name, distance: best.distance, approx: best.approx };
    } catch {
      return { type: 'assumed', stop: '新竹火車站' };
    }
  }

  async function nearestStopRoad(lat, lon) {
    const candidates = S.nearby(lat, lon, 5);
    const ranked = await ROUTEDIST.annotate(lat, lon, candidates);
    return ranked[0];
  }

  function finishTripPlan(fromName, toName, originNote, destNote) {
    if (fromName === toName) {
      lastTripResult = { error: 'sameStop', name: fromName, originNote, destNote };
      renderTripResult();
      return;
    }

    const plan = PLAN.planTrip(fromName, toName);
    if (!plan) {
      lastTripResult = { error: 'noRoute', from: fromName, to: toName };
      renderTripResult();
      if (MAP.available()) MAP.clearRoute('mainMap');
      return;
    }

    lastTripResult = { plan, originNote, destNote };
    renderTripResult();
    if (MAP.available()) MAP.showPlan('mainMap', plan.legs);
  }

  function renderTripResult() {
    UI.tripPlan($('tripResult'), lastTripResult, { onViewBoard: showBoard });
  }

  $('tripBtn').addEventListener('click', runTripPlan);
  $('tripQuery').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTripPlan();
  });

  /* ---------------- 看板畫面 ---------------- */
  function refresh() {
    if (state.stop) {
      UI.incident($('alert'), state.stop, (alt) => {
        state.openKey = `${alt.route}|${alt.direction}`;
        refresh();
        updateBoardRoute(true);
        $('board').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      UI.board($('board'), state.stop, state);
      updateBoardRoute(false);
    }
    UI.freshness($('boardScreen').hidden ? $('pickScreen') : $('boardScreen'));
  }

  // 看板某一列展開／收合時，地圖跟著顯示那條路線；由 ui.js 呼叫
  function onRowToggle(row) {
    updateBoardRoute(true, row);
  }

  function updateBoardRoute(fit, forcedRow) {
    if (!MAP.available() || !state.stop) return;
    let row = forcedRow;
    if (row === undefined) {
      if (!state.openKey) { row = null; }
      else row = S.board(state.stop).find((r) => `${r.route}|${r.direction}` === state.openKey) || null;
    }
    if (row) MAP.showRoute('mainMap', row, state.stop, { fit: !!fit });
    else { MAP.clearRoute('mainMap'); MAP.focusStop('mainMap', state.stop); }
  }

  /* ---------------- 示範開關 ---------------- */
  function syncToolButtons() {
    $('incidentBtn').textContent = t(S.getIncident() ? 'incidentBtnOn' : 'incidentBtnOff');
    $('incidentBtn').setAttribute('aria-pressed', String(!!S.getIncident()));
    $('freezeBtn').textContent = t(S.isFrozen() ? 'freezeBtnOn' : 'freezeBtnOff');
    $('freezeBtn').setAttribute('aria-pressed', String(S.isFrozen()));
  }

  $('incidentBtn').addEventListener('click', () => {
    if (S.getIncident()) S.clearIncident(); else S.raiseIncident();
    syncToolButtons();
    refresh();
  });

  $('freezeBtn').addEventListener('click', () => {
    if (S.isFrozen()) S.unfreeze(); else S.freeze();
    syncToolButtons();
    refresh();
  });

  /* 放大字級：站在站牌前、光線不好的時候真的會用到 */
  $('bigBtn').addEventListener('click', () => {
    const on = document.body.classList.toggle('big');
    $('bigBtn').setAttribute('aria-pressed', String(on));
  });

  $('backBtn').addEventListener('click', showPick);

  /* 重整地圖：回到目前畫面該有的位置與縮放（總覽 / 單站 / 展開中的路線） */
  $('mapResetBtn').addEventListener('click', () => {
    if (MAP.available()) MAP.resetView('mainMap');
  });

  /* ---------------- 亮／暗模式 ---------------- */
  function syncThemeBtn() {
    const dark = THEME.get() === 'dark';
    const btn = $('themeBtn');
    btn.textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-pressed', String(dark));
    btn.title = t(dark ? 'themeToggleToLight' : 'themeToggleToDark');
  }
  $('themeBtn').addEventListener('click', () => THEME.toggle());
  THEME.onChange(() => {
    syncThemeBtn();
    if (MAP.available()) MAP.setTheme(THEME.get());
  });
  syncThemeBtn();
  if (MAP.available()) MAP.setTheme(THEME.get());

  /* ---------------- 語言切換 ---------------- */
  function syncLangBtn() { $('langBtn').textContent = t('langToggle'); }

  $('langBtn').addEventListener('click', () => {
    I18N.setLang(I18N.getLang() === 'en' ? 'zh-Hant' : 'en');
  });

  I18N.onChange(() => {
    I18N.applyStatic(document);
    syncLangBtn();
    syncThemeBtn();
    syncToolButtons();
    applyNearNote();
    if (state.stop) {
      $('title').textContent = D.stopLabel(state.stop, I18N.getLang());
      $('sub').textContent = D.roadLabel(state.stop, I18N.getLang()) || '';
      refresh();
    } else {
      $('title').textContent = t('pickTitle');
      $('sub').textContent = t('pickSub');
      renderPick();
    }
    if (lastTripResult) renderTripResult();
    syncHeaderHeight();
  });
  syncLangBtn();

  /* ---------------- 右側地圖常駐：頁首高度會隨標題長度變，
     地圖欄的 sticky 位置要跟著算 ---------------- */
  function syncHeaderHeight() {
    const top = document.querySelector('.top');
    if (top) document.documentElement.style.setProperty('--header-h', `${top.offsetHeight}px`);
  }
  window.addEventListener('resize', () => {
    syncHeaderHeight();
    if (MAP.available()) MAP.invalidate('mainMap');
  });

  /* ---------------- 主迴圈 ----------------
     每秒更新新鮮度與時鐘，每三秒重畫看板（車在動，分鐘數會變）。 */
  let tick = 0;
  setInterval(() => {
    tick++;
    UI.freshness($('boardScreen').hidden ? $('pickScreen') : $('boardScreen'));
    if (state.stop && tick % 3 === 0) refresh();
  }, 1000);

  I18N.applyStatic(document);
  syncToolButtons();
  applyNearNote();
  showPick();
  syncHeaderHeight();

  return { onRowToggle };
})();
