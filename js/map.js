/* ==================================================================
   地圖
   用 Leaflet + CARTO 免金鑰地圖圖磚（亮色 light_all／暗色 dark_all），
   不需要申請任何 API 金鑰。同一支檔案管兩張地圖：
   一張是選站畫面的總覽地圖，一張是站牌看板裡「在地圖上顯示」的路線圖。
   ================================================================== */
window.MAP = (function () {

  const D = window.DATA;

  const TILE = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };
  const ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors ' +
    '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
  const CENTER = [24.8018, 120.9718]; // 新竹火車站，找不到定位時的預設中心

  const instances = {}; // containerId -> { map, tile, themeName, markers, route, user }

  function available() { return typeof L !== 'undefined'; }

  function ensure(id, opts = {}) {
    if (!available()) return null;
    let inst = instances[id];
    if (inst) return inst;

    const el = document.getElementById(id);
    if (!el) return null;

    const map = L.map(el, {
      center: opts.center || CENTER,
      zoom: opts.zoom || 13,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());

    const themeName = window.THEME ? window.THEME.get() : 'light';
    const tile = L.tileLayer(TILE[themeName], { subdomains: 'abcd', maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);

    inst = {
      map, tile, themeName,
      // 用 featureGroup 而非 layerGroup：resetView() 要靠 getBounds() 算範圍，
      // 這個方法只有 featureGroup 才有
      markers: L.featureGroup().addTo(map),
      route: L.featureGroup().addTo(map),
      user: null,
    };
    instances[id] = inst;
    return inst;
  }

  function setTheme(themeName) {
    Object.values(instances).forEach((inst) => {
      if (inst.themeName === themeName) return;
      inst.map.removeLayer(inst.tile);
      inst.tile = L.tileLayer(TILE[themeName], { subdomains: 'abcd', maxZoom: 19, attribution: ATTRIBUTION }).addTo(inst.map);
      inst.tile.bringToBack();
      inst.themeName = themeName;
    });
  }

  // 容器從 hidden 變成可見時，Leaflet 需要重新量一次尺寸才不會畫錯
  function invalidate(id) {
    const inst = instances[id];
    if (!inst) return;
    setTimeout(() => inst.map.invalidateSize(), 50);
  }

  function stopIcon(color, big) {
    return L.divIcon({
      className: 'mapstopicon' + (big ? ' big' : ''),
      html: `<i style="background:${color}"></i>`,
      iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10],
    });
  }
  function busIcon(color, plate) {
    return L.divIcon({
      className: 'mapbusicon',
      html: `<span style="background:${color}">${plate}</span>`,
      iconSize: [0, 0], iconAnchor: [0, 10],
    });
  }
  function endpointLabelIcon(color, label) {
    return L.divIcon({
      className: 'maproutelabel',
      html: `<span style="background:${color}">${label}</span>`,
      iconSize: [0, 0], iconAnchor: [0, 8],
    });
  }
  function userIcon() {
    return L.divIcon({ className: 'mapuserdot', html: '<i></i>', iconSize: [16, 16], iconAnchor: [8, 8] });
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- 選站畫面：所有站牌總覽 ---------------- */
  function renderStops(id, stopNames, opts = {}) {
    const inst = ensure(id);
    if (!inst) return;
    inst.markers.clearLayers();

    const lang = window.I18N ? window.I18N.getLang() : 'zh-Hant';
    const btnText = window.I18N ? window.I18N.t('mapStopPopupBtn') : '查看看板';
    const bounds = [];

    stopNames.forEach((name) => {
      const s = D.STOPS[name];
      if (!s) return;
      bounds.push([s.lat, s.lon]);
      const routes = [...new Set((D.STOP_INDEX[name] || []).map((e) => e.route))];
      const color = routes.length ? D.ROUTE_BY_NAME[routes[0]].color : '#8A7F6B';

      const marker = L.marker([s.lat, s.lon], { icon: stopIcon(color, opts.isFav?.(name)) });
      const pills = routes.map((r) =>
        `<i class="pill" style="background:${D.ROUTE_BY_NAME[r].color}">${esc(D.routeLabel(r, lang))}</i>`).join('');

      const popupEl = document.createElement('div');
      popupEl.className = 'mappopup';
      popupEl.innerHTML =
        `<b>${esc(D.stopLabel(name, lang))}</b><small>${esc(D.roadLabel(name, lang))}</small>` +
        `<span class="pills">${pills}</span>` +
        `<button type="button" class="tbtn mappopupbtn">${esc(btnText)}</button>`;
      popupEl.querySelector('.mappopupbtn').addEventListener('click', () => opts.onPick?.(name));
      marker.bindPopup(popupEl, { minWidth: 180 });
      inst.markers.addLayer(marker);
    });

    // 涵蓋範圍已擴大到整個新竹縣市，第一次畫這張地圖時自動縮放到能看見所有站牌
    // （之後收藏切換等重畫不會再搶使用者手動平移/縮放的視角）
    if (bounds.length > 1 && !inst.fitted && opts.fitAll !== false) {
      inst.map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24] });
      inst.fitted = true;
    }
  }

  function setUserLocation(id, lat, lon, center = true) {
    const inst = ensure(id);
    if (!inst) return;
    if (inst.user) inst.map.removeLayer(inst.user);
    inst.user = L.marker([lat, lon], { icon: userIcon(), zIndexOffset: 1000, keyboard: false }).addTo(inst.map);
    if (center) inst.map.setView([lat, lon], 14);
  }

  /* ---------------- 看板畫面：目前站牌位置 ---------------- */
  function focusStop(id, stopName) {
    const inst = ensure(id);
    if (!inst) return;
    const s = D.STOPS[stopName];
    if (!s) return;
    inst.markers.clearLayers();
    inst.markers.addLayer(L.marker([s.lat, s.lon], { icon: stopIcon('#B5651D', true) }));
    inst.map.setView([s.lat, s.lon], 15);
  }

  /* ---------------- 展開路線：畫線＋即時車輛 ---------------- */
  function showRoute(id, row, stopName, opts = {}) {
    const inst = ensure(id);
    if (!inst) return;
    inst.route.clearLayers();

    const S = window.SIM;
    const seq = D.sequence(row.route, row.direction);
    const seg = D.segments(row.route, row.direction);
    const latlngs = seq.map((n) => { const s = D.STOPS[n]; return [s.lat, s.lon]; });

    L.polyline(latlngs, { color: row.color, weight: 4, opacity: .8 }).addTo(inst.route);

    const startLabel = window.I18N ? window.I18N.t('mapRouteStart') : '起點';
    const endLabel = window.I18N ? window.I18N.t('mapRouteEnd') : '終點';

    seq.forEach((name, i) => {
      const here = name === stopName;
      const passed = i < seq.indexOf(stopName);
      L.circleMarker(latlngs[i], {
        radius: here ? 7 : (i === 0 || i === seq.length - 1) ? 6 : 4,
        color: '#fff', weight: 2,
        fillColor: here ? '#B5651D' : row.color,
        fillOpacity: passed ? .35 : 1,
      }).addTo(inst.route);

      // 起點／終點加上文字標籤，一眼看出這條路線頭尾在哪
      if (i === 0) L.marker(latlngs[i], { icon: endpointLabelIcon(row.color, startLabel) }).addTo(inst.route);
      else if (i === seq.length - 1) L.marker(latlngs[i], { icon: endpointLabelIcon(row.color, endLabel) }).addTo(inst.route);
    });

    const total = seg.reduce((a, b) => a + b, 0);
    (S.activeBuses(row.route, row.direction) || []).forEach((b) => {
      const pos = positionAlong(seq, seg, Math.min(b.progress, total));
      if (pos) L.marker(pos, { icon: busIcon(row.color, b.plate) }).addTo(inst.route);
    });

    if (opts.fit !== false) inst.map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28] });
  }

  function clearRoute(id) {
    const inst = instances[id];
    if (!inst) return;
    inst.route.clearLayers();
  }

  /* ---------------- 問路規劃結果：把每一段行程畫在地圖上 ---------------- */
  function showPlan(id, legs) {
    const inst = ensure(id);
    if (!inst || !legs || !legs.length) return;
    inst.route.clearLayers();

    const t = (k, fallback) => (window.I18N ? window.I18N.t(k) : fallback);
    const allPoints = [];

    legs.forEach((leg) => {
      const seq = D.sequence(leg.route, leg.direction).slice(leg.fromIdx, leg.toIdx + 1);
      const latlngs = seq.map((n) => { const s = D.STOPS[n]; return [s.lat, s.lon]; });
      allPoints.push(...latlngs);

      L.polyline(latlngs, { color: leg.color, weight: 5, opacity: .85 }).addTo(inst.route);
      latlngs.slice(1, -1).forEach((ll) => {
        L.circleMarker(ll, { radius: 4, color: '#fff', weight: 2, fillColor: leg.color, fillOpacity: 1 }).addTo(inst.route);
      });
    });

    const markEndpoint = (latlng, color, label) => {
      L.circleMarker(latlng, { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).addTo(inst.route);
      L.marker(latlng, { icon: endpointLabelIcon(color, label) }).addTo(inst.route);
    };

    markEndpoint(allPoints[0], '#2E6B57', t('mapTripFrom', '出發'));
    markEndpoint(allPoints[allPoints.length - 1], '#B5651D', t('mapTripTo', '抵達'));
    for (let i = 1; i < legs.length; i++) {
      const s = D.STOPS[legs[i].from];
      markEndpoint([s.lat, s.lon], '#7A6B3D', t('mapTripTransfer', '轉乘'));
    }

    inst.map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
  }

  /* ---------------- 重整地圖：回到目前狀態該有的位置與縮放 ----------------
     有展開的路線就回到那條路線的範圍；沒有的話，
     站牌總覽回到能看到所有站牌，單一站牌就回到那一站原本的縮放。 */
  function resetView(id) {
    const inst = instances[id];
    if (!inst) return;

    const routeLayers = inst.route.getLayers();
    if (routeLayers.length) {
      inst.map.fitBounds(inst.route.getBounds(), { padding: [28, 28] });
      return;
    }

    const stopLayers = inst.markers.getLayers();
    if (stopLayers.length > 1) {
      inst.map.fitBounds(inst.markers.getBounds(), { padding: [24, 24] });
    } else if (stopLayers.length === 1) {
      inst.map.setView(stopLayers[0].getLatLng(), 15);
    }
  }

  function positionAlong(seq, seg, progress) {
    let acc = 0;
    for (let i = 0; i < seg.length; i++) {
      const d = seg[i];
      if (progress <= acc + d || i === seg.length - 1) {
        const frac = d > 0 ? Math.max(0, Math.min(1, (progress - acc) / d)) : 0;
        const a = D.STOPS[seq[i]], b = D.STOPS[seq[i + 1]];
        return [a.lat + (b.lat - a.lat) * frac, a.lon + (b.lon - a.lon) * frac];
      }
      acc += d;
    }
    return null;
  }

  return {
    available, ensure, setTheme, invalidate,
    renderStops, setUserLocation, focusStop, showRoute, showPlan, clearRoute, resetView,
  };
})();
