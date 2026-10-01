/* ============================================================
   views/insights.js — consistency over time, leaderboard, months
   ============================================================ */
(function () {
  'use strict';
  window.Views = window.Views || {};

  let scope = 'overall';   // 'overall' | habit id
  let range = '30';        // '30' | '90' | 'month' | 'arc'
  let lbPeriod = '7';      // leaderboard window in days

  function rangeKeys() {
    const today = D.todayKey();
    if (range === 'month') {
      const d = D.today();
      return D.range(D.key(D.startOfMonth(d)), today);
    }
    if (range === 'arc') {
      const a = Store.arc();
      return D.range(a.start > today ? today : a.start, today);
    }
    return D.range(D.addKey(today, -(parseInt(range, 10) - 1)), today);
  }

  /** score for the current scope on a given day */
  function scoreOn(key) {
    if (scope === 'overall') return Store.dayScore(key);
    const h = Store.state.habits.find(x => x.id === scope);
    if (!h || h.createdAt > key) return 0;
    const st = Store.status(h.id, key);
    if (st === 'freeze') return null;
    return Store.isMet(h, key) ? 100 : 0;
  }

  /** smooth a noisy 0/100 habit series so the shape is readable */
  function smooth(vals, win) {
    return vals.map((_, i) => {
      const from = Math.max(0, i - win + 1);
      const slice = vals.slice(from, i + 1).filter(v => v != null);
      if (!slice.length) return 0;
      return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
    });
  }

  function monthsOfArc() {
    const a = Store.arc();
    const s = D.parse(a.start), e = D.parse(a.end), today = D.today();
    const out = [];
    let c = new Date(s.getFullYear(), s.getMonth(), 1);
    while (c <= e && out.length < 24) {
      const first = D.key(new Date(Math.max(c, s)));
      const lastD = new Date(c.getFullYear(), c.getMonth() + 1, 0);
      const last = D.key(lastD > today ? today : lastD);
      out.push({
        label: D.MONTHS[c.getMonth()].slice(0, 3),
        year: c.getFullYear(),
        future: c > today && c.getMonth() !== today.getMonth(),
        score: first <= last ? Store.rangeScore(first, last) : null
      });
      c = new Date(c.getFullYear(), c.getMonth() + 1, 1);
    }
    return out;
  }

  Views.insights = {
    title: 'INSIGHTS',
    render(el) {
      const habits = Store.activeHabits();
      const keys = rangeKeys();
      const raw = keys.map(scoreOn);
      const vals = scope === 'overall' ? raw.map(v => v == null ? 0 : v) : smooth(raw, 7);
      const valid = raw.filter(v => v != null);
      const overall = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;

      // week comparison
      const ws = Store.state.settings.weekStart;
      const thisWeekStart = D.key(D.startOfWeek(D.today(), ws));
      const lastWeekStart = D.addKey(thisWeekStart, -7);
      const thisWeek = Store.rangeScore(thisWeekStart, D.todayKey());
      const lastWeek = Store.rangeScore(lastWeekStart, D.addKey(thisWeekStart, -1));
      const delta = thisWeek - lastWeek;

      const best = habits.reduce((m, h) => Math.max(m, Store.bestStreak(h)), 0);

      const lbFrom = D.addKey(D.todayKey(), -(parseInt(lbPeriod, 10) - 1));
      const board = habits
        .map(h => ({ h, v: Store.rate(h, lbFrom, D.todayKey()) }))
        .sort((a, b) => b.v - a.v);
      const weak = board.length ? board[board.length - 1].h : null;

      const streaks = habits.map(h => ({ h, s: Store.streak(h) }))
        .sort((a, b) => b.s - a.s).slice(0, 6);

      const months = monthsOfArc();
      const maxM = Math.max(1, ...months.map(m => m.score || 0));

      const habitOpts = habits.map(h =>
        `<option value="${h.id}"${scope === h.id ? ' selected' : ''}>${esc(h.name)}</option>`).join('');

      el.innerHTML = `
        <div class="card" style="margin-top:8px">
          <div class="between">
            <div>
              <div class="card-label">Overall consistency</div>
              <div style="font-size:34px;font-weight:750;letter-spacing:-.02em;margin-top:2px">${overall}%</div>
            </div>
            <div class="row">
              <select class="select" id="scopeSel" style="width:auto">
                <option value="overall"${scope === 'overall' ? ' selected' : ''}>Overall</option>
                ${habitOpts}
              </select>
              <select class="select" id="rangeSel" style="width:auto">
                <option value="30"${range === '30' ? ' selected' : ''}>Last 30 days</option>
                <option value="90"${range === '90' ? ' selected' : ''}>Last 90 days</option>
                <option value="month"${range === 'month' ? ' selected' : ''}>This month</option>
                <option value="arc"${range === 'arc' ? ' selected' : ''}>Whole arc</option>
              </select>
            </div>
          </div>
          <div class="chart" id="consChart" style="margin-top:16px"></div>
          ${scope !== 'overall'
            ? `<p class="dim" style="font-size:11.5px;margin:8px 2px 0">7-day rolling average for this habit.</p>` : ''}
        </div>

        <div class="tiles">
          <div class="tile"><span class="card-label">This week</span><b>${thisWeek}%</b></div>
          <div class="tile"><span class="card-label">vs last week</span>
            <b style="color:${delta > 0 ? 'var(--good)' : delta < 0 ? 'var(--critical)' : 'inherit'}">
              ${delta > 0 ? '+' : ''}${delta}%</b></div>
          <div class="tile"><span class="card-label">Best streak</span>
            <b style="color:var(--flame)">${best}<span style="font-size:14px"> days</span></b></div>
          <div class="tile"><span class="card-label">Needs attention</span>
            <b class="sm truncate">${weak ? esc(weak.name) : '—'}</b></div>
        </div>

        <div class="two-col">
          <div class="card">
            <div class="between">
              <div class="card-label">Habit leaderboard</div>
              <div class="seg seg-sm" id="lbSeg">
                <button data-p="7"  class="${lbPeriod === '7'  ? 'is-active' : ''}">7d</button>
                <button data-p="30" class="${lbPeriod === '30' ? 'is-active' : ''}">30d</button>
                <button data-p="90" class="${lbPeriod === '90' ? 'is-active' : ''}">90d</button>
              </div>
            </div>
            ${board.length ? board.map((b, i) => `
              <div class="lb-item">
                <span class="rank">${i + 1}</span>
                <div>
                  <div class="lb-name truncate">${esc(b.h.name)}</div>
                  <div class="lb-track" title="${b.v}%">
                    <div class="lb-fill" style="width:${b.v}%;background:${b.h.color}"></div></div>
                </div>
                <span class="lb-val">${b.v}%</span>
              </div>`).join('') : '<div class="empty">No habits yet.</div>'}
          </div>

          <div class="card">
            <div class="card-label">Top streaks</div>
            ${streaks.length ? streaks.map(s => `
              <div class="lb-item">
                <span class="rank" style="color:var(--flame)">${UI.ICON.flame}</span>
                <div>
                  <div class="lb-name truncate">${esc(s.h.name)}</div>
                  <div class="lb-track" title="${s.s} day streak">
                    <div class="lb-fill" style="width:${Math.min(100, s.s / Math.max(1, best) * 100)}%;
                         background:${s.h.color}"></div></div>
                </div>
                <span class="lb-val" style="color:var(--accent)">${s.s}d</span>
              </div>`).join('') : '<div class="empty">No habits yet.</div>'}
          </div>
        </div>

        <div class="card" style="margin-top:12px">
          <div class="card-label">Month by month · consistency across the arc</div>
          <div class="wbars" style="margin-top:16px;height:132px">
            ${months.map(mo => `
              <div class="wbar" title="${mo.label} ${mo.year}: ${mo.score == null ? 'not started' : mo.score + '%'}">
                <div class="wbar-track">
                  <div class="wbar-fill" style="height:${mo.score == null ? 0 : Math.max(mo.score, 2)}%;
                       background:${mo.score == null ? 'var(--surface-3)' : 'var(--accent)'}"></div>
                </div>
                <span>${mo.label}</span>
                <span style="font-size:9.5px;color:var(--text-muted)">${mo.score == null ? '–' : mo.score + '%'}</span>
              </div>`).join('')}
          </div>
        </div>`;

      Charts.lines(el.querySelector('#consChart'), {
        height: 230, area: true, yMax: 100,
        labels: keys.map(k => {
          const d = D.parse(k);
          return `${d.getDate()} ${D.MONTHS[d.getMonth()].slice(0, 3)}`;
        }),
        tipTitle: i => D.longDate(D.parse(keys[i])),
        fmt: v => v + '%',
        series: [{
          name: scope === 'overall' ? 'Consistency'
                : (Store.state.habits.find(h => h.id === scope) || {}).name || 'Habit',
          color: 'var(--accent)', values: vals
        }]
      });

      el.querySelector('#scopeSel').onchange = e => { scope = e.target.value; App.render(); };
      el.querySelector('#rangeSel').onchange = e => { range = e.target.value; App.render(); };
      el.querySelector('#lbSeg').addEventListener('click', e => {
        const b = e.target.closest('[data-p]');
        if (b) { lbPeriod = b.dataset.p; App.render(); }
      });
    }
  };
})();
