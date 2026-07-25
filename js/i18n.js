/* ==================================================================
   語言切換
   字典用扁平 key，{{var}} 做參數代換。畫面上固定不變的字用
   data-i18n / data-i18n-placeholder / data-i18n-aria 屬性標記，
   動態產生的字（看板、清單…）直接呼叫 I18N.t()。
   ================================================================== */
window.I18N = (function () {

  const DICT = {
    'zh-Hant': {
      appEyebrow: '新竹市區公車',
      pickTitle: '要去哪裡？',
      pickSub: '選一個站牌，看接下來會來什麼車',
      backAria: '回到選站畫面',
      bigToggleTitle: '放大字級',
      freshLive: '資料即時更新中',
      freshStale: '資料延遲中',
      freshDead: '來源端已停止回傳',
      searchPlaceholder: '搜尋站牌或路線，例如「清華」或「81」',
      nearBtn: '附近站牌',
      nearBtnLocating: '定位中…',
      nearBtnRouting: '計算路網距離中…',
      favTitle: '我的收藏',
      favHint: '點星號可移除',
      nearHead: '熱門站牌',
      nearHeadLocated: '附近站牌',
      nearNote: '按上面的「附近站牌」用定位排序',
      nearNoteLocated: '依路網距離排序',
      nearNoteFallback: '拿不到定位權限，改用新竹火車站當基準',
      nearNoteNoGeo: '這個瀏覽器不支援定位',
      searchResultsHead: '搜尋結果',
      searchResultsCount: '{{n}} 筆',
      searchEmpty: '找不到「{{q}}」',
      listEmpty: '沒有結果',
      favAdd: '收藏 {{name}}',
      favRemove: '取消收藏 {{name}}',
      boardHead: '接下來會來的車',
      boardSub: '依到站時間排序',
      arriving: '進站中',
      minuteUnit: '分',
      notStarted: '尚未發車',
      finished: '今日已收班',
      noSignal: '等待下一班',
      sourceRealtime: '車機定位',
      sourceSchedule: '時刻表推估',
      sourceNone: '無動態',
      noDispatch: '尚未派車',
      delayedFlag: '誤點',
      towards: '往 {{name}}',
      onlineCount: '{{route}} 路 往 {{towards}} · 線上 {{n}} 輛',
      incidentTitle: '{{route}} 路 目前延誤中',
      incidentBody: '{{where}}發生事故，往 {{towards}} 方向預估延誤 {{min}} 分鐘。',
      incidentNoAlt: '這一站目前沒有可替代的路線。',
      altBody: '改搭可到 {{stops}}',
      altEtaUnit: '{{n}} 分',
      staleNotice: '距離上次成功更新已經 {{age}}。以下時間仍是上次收到的值，尚未反映目前路況。',
      deadNotice: '這些到站時間停留在 {{age}}前，之後沒有再更新過。車可能已經過站，也可能還沒出發 —— 現在的數字不可信，請以現場站牌為準。',
      ageSuffix: '{{age}}前',
      ageSeconds: '{{n}} 秒',
      ageMinutes: '{{n}} 分鐘',
      ageHours: '{{n}} 小時',
      toolsLabel: '示範開關',
      incidentBtnOff: '模擬光復路事故',
      incidentBtnOn: '解除事故',
      freezeBtnOff: '模擬資料停止更新',
      freezeBtnOn: '恢復資料更新',
      foot: '示範用途，班次與到站時間皆為模擬產生，非真實資料。',
      mapPickHint: '點地圖上的站牌圖示查看到站看板',
      mapStopPopupBtn: '查看看板',
      mapRouteStart: '起點',
      mapRouteEnd: '終點',
      mapResetBtn: '重整地圖',
      mapTripFrom: '出發',
      mapTripTo: '抵達',
      mapTripTransfer: '轉乘',
      themeToggleToLight: '切換為亮色模式',
      themeToggleToDark: '切換為暗色模式',
      langToggle: 'EN',

      tripTitle: '幫你規劃怎麼去',
      tripSub: '打字告訴我你要去哪裡，我幫你找最適合的公車',
      tripPlaceholder: '例如：我要從新竹火車站去內灣',
      tripBtn: '規劃路線',
      tripThinking: '正在幫你比對路網…',
      tripLocating: '沒說要從哪裡出發，正在確認你目前的位置…',
      tripErrorNoDest: '看不出你想去哪一站，要不要換個說法？例如「我要去清華大學」',
      tripErrorSameStop: '起點和終點聽起來是同一站（{{name}}），麻煩換個目的地',
      tripErrorNoRoute: '照目前的路網，從 {{from}} 到 {{to}} 就算轉乘也找不到搭法，兩地之間可能還沒有公車覆蓋',
      tripAssumedOrigin: '拿不到你的位置，先用「{{stop}}」幫你試算',
      tripOriginGeoNote: '偵測到你目前位置最近的站牌是「{{stop}}」（沿路網距離約 {{dist}} 公尺），幫你從這一站規劃',
      tripOriginPoiNote: '「{{poi}}」不是公車站，離它最近的是「{{stop}}」站（沿路網距離約 {{dist}} 公尺），幫你從這一站規劃',
      tripDestPoiNote: '「{{poi}}」不是公車站，離它最近的是「{{stop}}」站（沿路網距離約 {{dist}} 公尺），幫你規劃到這一站',
      tripApproxSuffix: '（連不上路網服務，改用估算值）',
      tripDirectLabel: '不用轉乘，直接搭這班',
      tripTransferLabel: '建議轉乘 {{n}} 次',
      tripStepBoard: '在 {{stop}} 站搭 {{route}}，往 {{towards}}',
      tripStepTransfer: '在 {{stop}} 站換搭 {{route}}，往 {{towards}}',
      tripStepAlight: '在 {{stop}} 站下車',
      tripWaitEta: '約 {{min}} 分鐘後到站',
      tripWaitArriving: '即將進站',
      tripWaitUnknown: '目前沒有即時預估，改用時刻表推算',
      tripTotal: '車程約 {{min}} 分鐘（不含轉乘等待）',
      tripViewBoard: '查看 {{stop}} 站看板',
      tripCaveat: '轉乘等待時間是用目前班距概估，實際到站仍以看板為準。',
    },
    en: {
      appEyebrow: 'Hsinchu City Bus',
      pickTitle: 'Where to?',
      pickSub: 'Pick a stop to see what’s coming next',
      backAria: 'Back to stop picker',
      bigToggleTitle: 'Larger text',
      freshLive: 'Live and updating',
      freshStale: 'Data delayed',
      freshDead: 'Feed has stopped',
      searchPlaceholder: 'Search a stop or route, e.g. "Tsing Hua" or "81"',
      nearBtn: 'Nearby stops',
      nearBtnLocating: 'Locating…',
      nearBtnRouting: 'Calculating road distance…',
      favTitle: 'My Favorites',
      favHint: 'Tap the star to remove',
      nearHead: 'Popular Stops',
      nearHeadLocated: 'Nearby Stops',
      nearNote: 'Tap "Nearby stops" above to sort by location',
      nearNoteLocated: 'Sorted by road-network distance',
      nearNoteFallback: 'Couldn’t get your location — using Hsinchu Station instead',
      nearNoteNoGeo: 'This browser doesn’t support geolocation',
      searchResultsHead: 'Search results',
      searchResultsCount: '{{n}} found',
      searchEmpty: 'No results for "{{q}}"',
      listEmpty: 'No results',
      favAdd: 'Add {{name}} to favorites',
      favRemove: 'Remove {{name}} from favorites',
      boardHead: 'Coming up next',
      boardSub: 'Sorted by arrival time',
      arriving: 'Arriving',
      minuteUnit: 'm',
      notStarted: 'Not yet in service',
      finished: 'Service ended today',
      noSignal: 'Waiting for next bus',
      sourceRealtime: 'Live GPS',
      sourceSchedule: 'Scheduled estimate',
      sourceNone: 'No data',
      noDispatch: 'Not dispatched yet',
      delayedFlag: 'Delayed',
      towards: 'To {{name}}',
      onlineCount: 'Route {{route}} · to {{towards}} · {{n}} on the road',
      incidentTitle: 'Route {{route}} is delayed',
      incidentBody: 'An incident near {{where}} is delaying the direction toward {{towards}} by about {{min}} min.',
      incidentNoAlt: 'No alternative route is available from this stop right now.',
      altBody: 'Also reaches {{stops}}',
      altEtaUnit: '{{n}} min',
      staleNotice: 'It’s been {{age}} since the last successful update. Times below are still from that last update and may not reflect current conditions.',
      deadNotice: 'These arrival times haven’t updated in {{age}}. The bus may have already passed or not yet departed — treat these numbers as unreliable and check the physical stop sign.',
      ageSuffix: '{{age}} ago',
      ageSeconds: '{{n}}s',
      ageMinutes: '{{n}} min',
      ageHours: '{{n}} h',
      toolsLabel: 'Demo switches',
      incidentBtnOff: 'Simulate incident on Guangfu Rd.',
      incidentBtnOn: 'Clear incident',
      freezeBtnOff: 'Simulate feed outage',
      freezeBtnOn: 'Resume updates',
      foot: 'For demo purposes only — schedules and arrival times are simulated, not real data.',
      mapPickHint: 'Tap a stop marker on the map to see its board',
      mapStopPopupBtn: 'View board',
      mapRouteStart: 'Start',
      mapRouteEnd: 'End',
      mapResetBtn: 'Reset map view',
      mapTripFrom: 'Depart',
      mapTripTo: 'Arrive',
      mapTripTransfer: 'Transfer',
      themeToggleToLight: 'Switch to light mode',
      themeToggleToDark: 'Switch to dark mode',
      langToggle: '中',

      tripTitle: 'Plan my trip',
      tripSub: "Tell me where you're headed and I'll find the best bus",
      tripPlaceholder: 'e.g. From Hsinchu Station to Neiwan',
      tripBtn: 'Plan trip',
      tripThinking: 'Matching this against the network…',
      tripLocating: "You didn't say where you're starting from — figuring out where you are…",
      tripErrorNoDest: 'I couldn’t tell where you want to go — try something like "I want to go to Tsing Hua University"',
      tripErrorSameStop: 'Origin and destination both sound like {{name}} — try a different destination',
      tripErrorNoRoute: 'Even with a transfer, there’s currently no way from {{from}} to {{to}} in this network — that area may not be covered yet',
      tripAssumedOrigin: 'Couldn’t get your location — using "{{stop}}" as a guess',
      tripOriginGeoNote: 'Detected your nearest stop as "{{stop}}" (about {{dist}} m by road) — planning from there',
      tripOriginPoiNote: '"{{poi}}" isn’t a bus stop — the closest one is "{{stop}}" (about {{dist}} m by road), so planning from that stop',
      tripDestPoiNote: '"{{poi}}" isn’t a bus stop — the closest one is "{{stop}}" (about {{dist}} m by road), so planning to that stop',
      tripApproxSuffix: ' (routing service unavailable — using an estimate)',
      tripDirectLabel: 'No transfer needed — take this one',
      tripTransferLabel: '{{n}} transfer(s) suggested',
      tripStepBoard: 'Board {{route}} at {{stop}}, toward {{towards}}',
      tripStepTransfer: 'Transfer to {{route}} at {{stop}}, toward {{towards}}',
      tripStepAlight: 'Get off at {{stop}}',
      tripWaitEta: 'arriving in about {{min}} min',
      tripWaitArriving: 'arriving now',
      tripWaitUnknown: 'no live estimate right now — using the schedule instead',
      tripTotal: 'About {{min}} min of riding time (not counting transfer waits)',
      tripViewBoard: 'View {{stop}}’s board',
      tripCaveat: 'Transfer waits are rough estimates based on current headways — check the board for the real numbers.',
    },
  };

  let lang = null;
  try {
    lang = localStorage.getItem('hsinchu-bus-lang');
  } catch { /* 存不了就算了 */ }
  if (!lang || !DICT[lang]) {
    lang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en';
  }

  const listeners = [];

  function t(key, vars) {
    let s = DICT[lang]?.[key] ?? DICT['zh-Hant'][key] ?? key;
    if (vars) {
      for (const k of Object.keys(vars)) s = s.replaceAll(`{{${k}}}`, vars[k]);
    }
    return s;
  }

  function getLang() { return lang; }

  function setLang(l) {
    if (!DICT[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem('hsinchu-bus-lang', l); } catch { /* 存不了就算了 */ }
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-Hant';
    listeners.forEach((fn) => fn(lang));
  }

  function onChange(fn) { listeners.push(fn); }

  /* 套用所有 data-i18n* 靜態標記 */
  function applyStatic(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.dataset.i18nTitle));
    });
  }

  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';

  return { t, getLang, setLang, onChange, applyStatic };
})();
