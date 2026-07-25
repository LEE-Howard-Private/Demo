/* ==================================================================
   畫面繪製
   ================================================================== */
window.UI = (function () {

  const D = window.DATA;
  const S = window.SIM;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (key, vars) => window.I18N.t(key, vars);
  const lang = () => window.I18N.getLang();

  const STALE_AT = 60;
  const DEAD_AT = 180;

  /* ---------------- 站牌清單 ---------------- */
  function stopList(container, stops, opts = {}) {
    container.innerHTML = '';
    if (!stops.length) {
      container.innerHTML = `<div class="empty">${esc(opts.emptyText || t('listEmpty'))}</div>`;
      return;
    }

    const l = lang();
    for (const s of stops) {
      const routes = [...new Set((D.STOP_INDEX[s.name] || []).map((e) => e.route))];

      const row = document.createElement('div');
      row.className = 'item';

      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'itemmain';
      main.style.cssText = 'background:none;border:0;text-align:left;cursor:pointer;padding:0';
      main.innerHTML =
        `<b>${esc(D.stopLabel(s.name, l))}</b>` +
        `<small>${esc(D.roadLabel(s.name, l) || D.STOPS[s.name]?.road || '')}</small>` +
        `<span class="pills">${routes.map((r) =>
          `<i class="pill" style="background:${D.ROUTE_BY_NAME[r].color}">${esc(r)}</i>`).join('')}</span>`;
      main.onclick = () => opts.onPick?.(s.name);

      row.appendChild(main);

      if (s.distance != null) {
        const d = document.createElement('span');
        d.className = 'dist';
        d.textContent = s.distance >= 1000
          ? `${(s.distance / 1000).toFixed(1)} km`
          : `${s.distance} m`;
        row.appendChild(d);
      }

      const isFav = opts.isFav?.(s.name);
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'star' + (isFav ? ' on' : '');
      star.textContent = isFav ? '★' : '☆';
      star.setAttribute('aria-label', t(isFav ? 'favRemove' : 'favAdd', { name: D.stopLabel(s.name, l) }));
      star.onclick = (e) => { e.stopPropagation(); opts.onFav?.(s.name); };
      row.appendChild(star);

      container.appendChild(row);
    }
  }

  /* ---------------- 到站看板 ---------------- */
  function board(container, stopName, state) {
    const rows = S.board(stopName);
    const fresh = S.dataAge() < STALE_AT;
    const l = lang();
    container.innerHTML = '';

    for (const r of rows) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'row' + (r.status !== 'ok' ? ' dim' : '');
      const key = `${r.route}|${r.direction}`;
      btn.setAttribute('aria-expanded', String(state.openKey === key));

      let etaHTML;
      if (r.status === 'ok' && r.eta < 45) {
        etaHTML = `<span class="word">${t('arriving')}</span>`;
      } else if (r.status === 'ok') {
        etaHTML = `<span class="big">${Math.floor(r.eta / 60)}<span class="u">${t('minuteUnit')}</span></span>`;
      } else {
        const label = { notStarted: t('notStarted'), finished: t('finished'), noSignal: t('noSignal') }[r.status];
        etaHTML = `<span class="word${r.status === 'noSignal' ? ' warn' : ''}">${label}</span>`;
      }

      const tagText = r.source === 'realtime' ? t('sourceRealtime') : r.source === 'schedule' ? t('sourceSchedule') : t('sourceNone');
      const hollow = r.source !== 'realtime' || !fresh;

      btn.innerHTML = `
        <span class="badge num" style="background:${r.color}">${esc(r.route)}</span>
        <span class="dest">
          <b>${esc(t('towards', { name: D.stopLabel(r.towards, l) }))}${r.delayed ? `<i class="flag">${esc(t('delayedFlag'))}</i>` : ''}</b>
          <small>${r.plate ? esc(r.plate) : esc(t('noDispatch'))}</small>
        </span>
        <span class="eta">${etaHTML}
          <span class="tag"><i class="dot${hollow ? ' hollow' : ''}"></i>${esc(tagText)}</span>
        </span>`;

      btn.onclick = () => {
        state.openKey = state.openKey === key ? null : key;
        board(container, stopName, state);
        window.APP?.onRowToggle?.(state.openKey === key ? r : null, stopName);
      };
      container.appendChild(btn);

      if (state.openKey === key) container.appendChild(routeStrip(r, stopName));
    }
  }

  /* ---------------- 展開後的沿線位置 ---------------- */
  function routeStrip(row, stopName) {
    const seq = D.sequence(row.route, row.direction);
    const buses = S.activeBuses(row.route, row.direction);
    const hereIdx = seq.indexOf(stopName);
    const l = lang();

    // 每輛車目前落在哪一段
    const busAt = {};
    for (const b of buses) {
      const i = S.stopIndexOf(row.route, row.direction, b.progress);
      (busAt[i] ||= []).push(b);
    }

    const strip = document.createElement('div');
    strip.className = 'strip';
    strip.innerHTML =
      `<h3><span>${esc(t('onlineCount', { route: D.routeLabel(row.route, l), towards: D.stopLabel(row.towards, l), n: buses.length }))}</span></h3>` +
      '<div class="line">' +
      seq.map((name, i) => {
        const here = i === hereIdx;
        const passed = i < hereIdx;
        const tag = busAt[i]
          ? `<span class="bus num" style="background:${row.color}">${esc(busAt[i][0].plate)}</span>`
          : '';
        return `<div class="stopdot${here ? ' here' : ''}${passed ? ' passed' : ''}">${tag}${esc(D.stopLabel(name, l))}</div>`;
      }).join('') +
      '</div>';

    return strip;
  }

  /* ---------------- 事故通報 ---------------- */
  function incident(container, stopName, onPickAlt) {
    const inc = S.getIncident();
    if (!inc) { container.hidden = true; return; }

    const affects = (D.STOP_INDEX[stopName] || [])
      .some((e) => e.route === inc.route && e.direction === inc.direction);

    if (!affects) { container.hidden = true; return; }

    const l = lang();
    const blocked = { route: inc.route, direction: inc.direction };
    const alts = S.alternatives(stopName, blocked);

    container.hidden = false;
    container.innerHTML =
      `<h3>${esc(t('incidentTitle', { route: D.routeLabel(inc.route, l) }))}</h3>` +
      `<p>${esc(t('incidentBody', {
        where: l === 'en' ? (inc.whereEn || inc.where) : inc.where,
        towards: D.stopLabel(D.headsign(inc.route, inc.direction), l),
        min: Math.round(inc.delay / 60),
      }))}</p>` +
      (alts.length
        ? '<div class="alts"></div>'
        : `<p style="margin-top:8px">${esc(t('incidentNoAlt'))}</p>`);

    if (alts.length) {
      const box = container.querySelector('.alts');
      for (const a of alts) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'alt';
        b.innerHTML =
          `<i class="pill" style="background:${a.color};font-size:.9em;padding:3px 8px">${esc(a.route)}</i>` +
          `<span class="altmain"><b>${esc(t('altBody', { stops: a.reaches.slice(0, 3).map((n) => D.stopLabel(n, l)).join('、') }))}</b>` +
          `<small>${esc(t('towards', { name: D.stopLabel(D.headsign(a.route, a.direction), l) }))}</small></span>` +
          `<span class="alteta num">${esc(t('altEtaUnit', { n: Math.max(1, Math.floor(a.eta / 60)) }))}</span>`;
        b.onclick = () => onPickAlt?.(a);
        box.appendChild(b);
      }
    }
  }

  /* ---------------- 資料新鮮度 ---------------- */
  function freshness(noticeHost) {
    const age = S.dataAge();
    const root = document.documentElement;

    $('railFill').style.setProperty('--fill', `${(Math.max(0, 1 - age / STALE_AT) * 100).toFixed(1)}%`);
    $('ageText').textContent = t('ageSuffix', { age: fmtAge(age) });
    $('clock').textContent = S.clockText();

    let notice = null;
    if (age >= DEAD_AT) {
      root.style.setProperty('--accent', 'var(--dead)');
      $('freshText').textContent = t('freshDead');
      notice = t('deadNotice', { age: fmtAge(age) });
    } else if (age >= STALE_AT) {
      root.style.setProperty('--accent', 'var(--stale)');
      $('freshText').textContent = t('freshStale');
      notice = t('staleNotice', { age: fmtAge(age) });
    } else {
      root.style.setProperty('--accent', 'var(--live)');
      $('freshText').textContent = t('freshLive');
    }

    const existing = noticeHost.querySelector('.notice');
    if (notice) {
      if (existing) existing.textContent = notice;
      else {
        const d = document.createElement('div');
        d.className = 'notice';
        d.textContent = notice;
        noticeHost.appendChild(d);
      }
    } else if (existing) existing.remove();
  }

  function fmtAge(s) {
    if (s < 60) return t('ageSeconds', { n: s });
    const m = Math.floor(s / 60);
    return m < 60 ? t('ageMinutes', { n: m }) : t('ageHours', { n: Math.floor(m / 60) });
  }

  /* ---------------- 問路規劃結果 ---------------- */
  function tripWaitText(est) {
    if (est && est.status === 'ok') {
      return est.eta < 45 ? t('tripWaitArriving') : t('tripWaitEta', { min: Math.floor(est.eta / 60) });
    }
    return t('tripWaitUnknown');
  }

  function tripPlan(container, result, opts = {}) {
    container.innerHTML = '';
    if (!result) return;
    const l = lang();

    if (result.loading) {
      const box = document.createElement('div');
      box.className = 'tripplan tripplan--loading';
      box.textContent = t('tripLocating');
      container.appendChild(box);
      return;
    }

    const approxSuffix = (note) => (note && note.approx ? t('tripApproxSuffix') : '');

    function notesHTML(originNote, destNote) {
      let out = '';
      if (destNote) {
        out += `<p class="tripnote">${esc(t('tripDestPoiNote', {
          poi: D.poiLabel(destNote.poi, l), stop: D.stopLabel(destNote.stop, l), dist: destNote.distance,
        }) + approxSuffix(destNote))}</p>`;
      }
      if (originNote) {
        const key = { geo: 'tripOriginGeoNote', poi: 'tripOriginPoiNote', assumed: 'tripAssumedOrigin' }[originNote.type];
        const vars = originNote.type === 'poi'
          ? { poi: D.poiLabel(originNote.poi, l), stop: D.stopLabel(originNote.stop, l), dist: originNote.distance }
          : { stop: D.stopLabel(originNote.stop, l), dist: originNote.distance };
        out += `<p class="tripnote">${esc(t(key, vars) + approxSuffix(originNote))}</p>`;
      }
      return out;
    }

    if (result.error) {
      const vars = result.error === 'sameStop' ? { name: D.stopLabel(result.name, l) }
        : result.error === 'noRoute' ? { from: D.stopLabel(result.from, l), to: D.stopLabel(result.to, l) }
        : undefined;
      const key = { noDest: 'tripErrorNoDest', sameStop: 'tripErrorSameStop', noRoute: 'tripErrorNoRoute' }[result.error];
      const box = document.createElement('div');
      box.className = 'tripplan';
      box.innerHTML = notesHTML(result.originNote, result.destNote) +
        `<p class="tripplan--error">${esc(t(key, vars))}</p>`;
      container.appendChild(box);
      return;
    }

    const { plan, originNote, destNote } = result;
    const box = document.createElement('div');
    box.className = 'tripplan';

    let html = notesHTML(originNote, destNote);
    html += `<p class="tripbadge">${esc(plan.legs.length > 1
      ? t('tripTransferLabel', { n: plan.legs.length - 1 })
      : t('tripDirectLabel'))}</p>`;

    html += '<div class="tripsteps">';
    plan.legs.forEach((leg, i) => {
      const key = i === 0 ? 'tripStepBoard' : 'tripStepTransfer';
      html += `
        <div class="tripstep">
          <i class="pill" style="background:${leg.color}">${esc(leg.route)}</i>
          <div class="tripstepmain">
            <b>${esc(t(key, { stop: D.stopLabel(leg.from, l), route: D.routeLabel(leg.route, l), towards: D.stopLabel(leg.towards, l) }))}</b>
            <small>${esc(tripWaitText(leg.est))}</small>
          </div>
        </div>`;
    });
    html += `
        <div class="tripstep tripstep--end">
          <i class="tripdot"></i>
          <div class="tripstepmain"><b>${esc(t('tripStepAlight', { stop: D.stopLabel(plan.to, l) }))}</b></div>
        </div>
      </div>`;

    html += `<p class="triptotal">${esc(t('tripTotal', { min: Math.max(1, Math.round(plan.totalTravelSec / 60)) }))}</p>`;
    if (plan.legs.length > 1) html += `<p class="tripcaveat">${esc(t('tripCaveat'))}</p>`;
    html += `<button type="button" class="tbtn tripviewbtn">${esc(t('tripViewBoard', { stop: D.stopLabel(plan.from, l) }))}</button>`;

    box.innerHTML = html;
    box.querySelector('.tripviewbtn').addEventListener('click', () => opts.onViewBoard?.(plan.from));
    container.appendChild(box);
  }

  return { stopList, board, incident, freshness, tripPlan };
})();
