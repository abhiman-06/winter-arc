/* ============================================================
   views/habits.js — the month grid (click a cell to log a day)
   ============================================================ */
(function () {
  'use strict';
  window.Views = window.Views || {};

  let cursor = D.startOfMonth(D.today());   // month on screen
  let filter = 'daily';                     // daily | weekly | monthly

  /** % of `habits` satisfied on a day (empty/future days return null) */
  function scoreFor(habits, key) {
    if (D.isFuture(key)) return null;
    const hs = habits.filter(h => h.createdAt <= key);
    if (!hs.length) return 0;
    const counted = hs.filter(h => Store.status(h.id, key) !== 'freeze');
    if (!counted.length) return 100;
    return Math.round(counted.filter(h => Store.isMet(h, key)).length / counted.length * 100);
  }

  function habitModal(existing) {
    const h = existing || { name: '', color: Store.COLORS[0], cadence: 'daily', target: 3 };
    UI.modal(existing ? 'Edit habit' : 'New habit', `
      <label class="field"><span>Habit name</span>
        <input class="input" id="hName" maxlength="60" value="${esc(h.name)}"
               placeholder="e.g. Gym"></label>
      <label class="field"><span>Colour</span></label>
      ${UI.colorSwatches(h.color)}
      <div class="field-row" style="margin-top:16px">
        <label class="field"><span>Cadence</span>
          <select class="select" id="hCad">
            <option value="daily">Every day</option>
            <option value="weekly">Times per week</option>
            <option value="monthly">Times per month</option>
          </select></label>
        <label class="field" id="tgtWrap"><span>Target</span>
          <input class="input" type="number" min="1" max="31" id="hTgt" value="${h.target}"></label>
      </div>
      <div class="modal-actions">
        ${existing ? `<button class="btn btn-danger" id="hDel">Delete</button>` : ''}
        <span class="grow"></span>
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="hSave">${existing ? 'Save' : 'Add habit'}</button>
      </div>`, m => {
      const getColor = UI.bindSwatches(m, h.color);
      const cad = m.querySelector('#hCad');
      const tgt = m.querySelector('#tgtWrap');
      cad.value = h.cadence;
      const sync = () => { tgt.style.visibility = cad.value === 'daily' ? 'hidden' : 'visible'; };
      cad.onchange = sync; sync();

      m.querySelector('#hSave').onclick = () => {
        const name = m.querySelector('#hName').value.trim();
        if (!name) { UI.toast('Give the habit a name.'); return; }
        const cadence = cad.value;
        const target = cadence === 'daily' ? 1
          : Math.max(1, parseInt(m.querySelector('#hTgt').value, 10) || 1);
        Store.commit(s => {
          if (existing) {
            const t = s.habits.find(x => x.id === existing.id);
            Object.assign(t, { name, color: getColor(), cadence, target });
          } else {
            s.habits.push({ id: Store.uid(), name, color: getColor(), cadence, target,
                            archived: false, createdAt: D.todayKey() });
          }
        });
        UI.close();
      };

      if (existing) m.querySelector('#hDel').onclick = () => {
        UI.confirm(`Delete "${existing.name}" and all of its logged days?`, () => {
          Store.commit(s => {
            s.habits = s.habits.filter(x => x.id !== existing.id);
            delete s.logs[existing.id];
          });
          UI.toast('Habit deleted.');
        }, 'Delete');
      };
    });
  }

  Views.habits = {
    title: 'HABITS',
    newHabit: habitModal,
    render(el) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      const nDays = D.daysInMonth(y, m);
      const todayK = D.todayKey();
      const monthKeys = [];
      for (let i = 1; i <= nDays; i++) monthKeys.push(D.key(new Date(y, m, i)));

      const all = Store.activeHabits();
      const habits = all.filter(h => h.cadence === filter);
      const tally = Store.dayTally(todayK);

      const trend = monthKeys.map(k => scoreFor(habits, k));
      const past  = trend.filter(v => v != null);
      const avg   = past.length ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : 0;

      const dayHead = monthKeys.map((k, i) => {
        const dow = new Date(y, m, i + 1).getDay();
        const cls = ['d-head'];
        if (k === todayK) cls.push('is-today');
        else if (dow === 0 || dow === 6) cls.push('is-weekend');
        return `<th class="${cls.join(' ')}">${i + 1}</th>`;
      }).join('');

      const rows = habits.map(h => {
        const cells = monthKeys.map(k => {
          const st = Store.status(h.id, k);
          const cls = ['cell'];
          if (st === true) cls.push('is-done');
          if (st === 'freeze') cls.push('is-freeze');
          if (k === todayK) cls.push('is-today');
          if (D.isFuture(k)) cls.push('is-future');
          if (k < h.createdAt) cls.push('is-off');
          const ico = st === 'freeze' ? UI.ICON.snow : UI.ICON.check;
          return `<td class="d-cell"><button class="${cls.join(' ')}" data-k="${k}"
                    title="${esc(h.name)} · ${k}${D.isFuture(k) ? ' (future)' : ''}"
                    ${D.isFuture(k) ? 'disabled' : ''}>${ico}</button></td>`;
        }).join('');

        const monthRate = Store.rate(h, monthKeys[0], monthKeys[nDays - 1]);
        return `<tr data-habit="${h.id}">
          <td class="col-habit">
            <button class="hname" data-act="edit" title="Edit habit"
                    style="background:none;border:0;padding:0;cursor:pointer;text-align:left;width:100%">
              <span class="cdot" style="background:${h.color}"></span>
              <b class="grow">${esc(h.name)}</b>
            </button>
          </td>
          ${cells}
          <td class="col-stats">
            <span class="stat-mini" style="color:var(--text-secondary)">${monthRate}%</span>
            <span class="stat-mini" style="color:var(--flame);margin-left:9px">
              ${UI.ICON.flame}${Store.streak(h)}</span>
            <span class="stat-mini" style="color:var(--warning);margin-left:9px"
                  title="Best streak">${UI.ICON.star}${Store.bestStreak(h)}</span>
          </td>
        </tr>`;
      }).join('');

      el.innerHTML = `
        <div class="card arc-bar between" style="margin-top:8px">
          <div class="grow">
            <div class="card-label">${esc(D.monthLabel(cursor))}</div>
            <div style="margin-top:5px;font-size:13px">
              <b>${tally.done}/${tally.total}</b> <span class="muted">habits done today</span>
            </div>
            <div class="arc-track"><div class="arc-fill" style="width:${avg}%"></div></div>
          </div>
          <div class="row">
            <button class="icon-btn" id="prevM" aria-label="Previous month">${UI.ICON.left}</button>
            <button class="icon-btn" id="nextM" aria-label="Next month">${UI.ICON.right}</button>
          </div>
        </div>

        <div class="row" style="margin-top:12px;gap:12px;align-items:stretch">
          <div class="seg grow" id="cadSeg">
            <button data-f="daily"   class="${filter === 'daily'   ? 'is-active' : ''}">Daily</button>
            <button data-f="weekly"  class="${filter === 'weekly'  ? 'is-active' : ''}">Weekly</button>
            <button data-f="monthly" class="${filter === 'monthly' ? 'is-active' : ''}">Monthly</button>
          </div>
          <button class="btn btn-primary" id="newH">${UI.ICON.plus} New Habit</button>
        </div>

        ${habits.length ? `
        <div class="grid-wrap scroll-x">
          <table class="hgrid">
            <thead>
              <tr class="trend-row">
                <th class="col-habit" style="text-align:left">
                  <span class="legend-item"><span class="legend-swatch"
                        style="background:var(--accent)"></span>Trend</span>
                </th>
                <th colspan="${nDays}" style="padding:0 6px !important">
                  <div id="sparkBox"></div>
                </th>
                <th class="col-stats" style="text-align:center">
                  <div class="card-label">Avg</div>
                  <div class="pill pill-accent" style="margin-top:4px">${avg}%</div>
                </th>
              </tr>
              <tr><th class="col-habit" style="text-align:left">Habit</th>
                  ${dayHead}
                  <th class="col-stats" style="text-align:center">Stats</th></tr>
            </thead>
            <tbody id="gridBody">${rows}</tbody>
          </table>
        </div>
        <p class="dim" style="margin:10px 2px;font-size:12px">
          Click a circle to mark the day · right-click a circle to spend a freeze token
          (${Store.state.freezeTokens} left) · click a habit name to edit it.
        </p>` : `
        <div class="card empty" style="margin-top:12px">
          No ${filter} habits yet. Add one with <b>+ New Habit</b>.
        </div>`}
      `;

      el.querySelector('#sparkBox') &&
        (el.querySelector('#sparkBox').innerHTML =
          Charts.spark(trend.map(v => v == null ? 0 : v), { h: 42 }));

      el.querySelector('#prevM').onclick = () => { cursor = new Date(y, m - 1, 1); App.render(); };
      el.querySelector('#nextM').onclick = () => { cursor = new Date(y, m + 1, 1); App.render(); };
      el.querySelector('#newH').onclick = () => habitModal(null);
      el.querySelector('#cadSeg').addEventListener('click', e => {
        const b = e.target.closest('[data-f]');
        if (b) { filter = b.dataset.f; App.render(); }
      });

      const bodyEl = el.querySelector('#gridBody');
      if (bodyEl) {
        bodyEl.addEventListener('click', e => {
          const cell = e.target.closest('.cell');
          const edit = e.target.closest('[data-act="edit"]');
          const id = e.target.closest('[data-habit]').dataset.habit;
          if (edit) { habitModal(Store.state.habits.find(h => h.id === id)); return; }
          if (cell && !cell.disabled) Store.toggle(id, cell.dataset.k);
        });
        bodyEl.addEventListener('contextmenu', e => {
          const cell = e.target.closest('.cell');
          if (!cell || cell.disabled) return;
          e.preventDefault();
          const id = e.target.closest('[data-habit]').dataset.habit;
          if (!Store.freeze(id, cell.dataset.k)) UI.toast('No freeze tokens left.');
        });
      }
    }
  };
})();
