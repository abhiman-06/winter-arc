/* ============================================================
   views/tasks.js — weekly task board + mindset tracker
   ============================================================ */
(function () {
  'use strict';
  window.Views = window.Views || {};

  const SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MIND = [
    { key: 'energy',     label: 'Energy',     short: 'E', color: 'var(--series-2)' },
    { key: 'focus',      label: 'Focus',      short: 'F', color: 'var(--series-1)' },
    { key: 'motivation', label: 'Motivation', short: 'M', color: 'var(--series-3)' }
  ];

  let weekCursor = null;   // Date — start of the displayed week

  function weekStartOf(d) { return D.startOfWeek(d, Store.state.settings.weekStart); }

  function dayCard(key, idx) {
    const d = D.parse(key);
    const todayK = D.todayKey();
    const list = Store.tasksOf(key);
    const done = list.filter(t => t.done).length;
    const pct = Store.taskScore(key);
    const mind = Store.mindsetOf(key);
    const prev = D.addKey(key, -1);

    return `
      <div class="day-card${key === todayK ? ' is-today' : ''}" data-day="${key}">
        <div class="day-head">
          <b>${D.DAYS[d.getDay()]}</b>
          <span>${D.shortDate(d)}</span>
        </div>
        <div style="display:grid;place-items:center">
          ${Charts.ring(pct, { size: 86, stroke: 8 })}
        </div>

        <div class="card-label">Tasks</div>
        <div style="display:flex;flex-direction:column;gap:5px">
          ${list.map(t => `
            <div class="task-item${t.done ? ' is-done' : ''}" data-task="${t.id}">
              <button class="check${t.done ? ' is-done' : ''}" data-act="t"
                      aria-pressed="${t.done}" aria-label="${esc(t.text)}">${UI.ICON.check}</button>
              <span class="task-text">${esc(t.text)}</span>
              <button class="task-del" data-act="d" aria-label="Delete">${UI.ICON.x}</button>
            </div>`).join('')}
        </div>
        <input class="add-task" placeholder="+ Add task" data-add="${key}" data-i="${idx}">
        ${(!list.length && Store.tasksOf(prev).length) ? `
          <button class="btn btn-ghost btn-sm" data-act="copy"
                  style="justify-content:flex-start">Copy yesterday's list</button>` : ''}

        <div class="mindset-box">
          <div class="between">
            <span class="card-label">Mindset</span>
            <span class="dim" style="font-size:11px">${done}/${list.length} done</span>
          </div>
          ${MIND.map(mm => `
            <div class="mind-row">
              <label title="${mm.label}" style="color:${mm.color}">${mm.short}</label>
              <input type="range" min="0" max="10" value="${mind[mm.key] || 0}"
                     data-mind="${mm.key}" aria-label="${mm.label} on ${key}">
              <b>${mind[mm.key] || 0}</b>
            </div>`).join('')}
        </div>
      </div>`;
  }

  Views.tasks = {
    title: 'TASK TRACKER',
    render(el) {
      if (!weekCursor) weekCursor = weekStartOf(D.today());
      const start = weekCursor;
      const keys = [];
      for (let i = 0; i < 7; i++) keys.push(D.key(D.add(start, i)));
      const endD = D.add(start, 6);
      const todayK = D.todayKey();

      const allTasks = keys.flatMap(k => Store.tasksOf(k));
      const doneAll = allTasks.filter(t => t.done).length;
      const weekPct = allTasks.length ? Math.round(doneAll / allTasks.length * 100) : 0;
      const isThisWeek = D.key(weekStartOf(D.today())) === D.key(start);

      const label = `${start.getDate()} ${D.MONTHS[start.getMonth()].slice(0,3)}` +
                    ` – ${endD.getDate()} ${D.MONTHS[endD.getMonth()].slice(0,3)} ${endD.getFullYear()}`;

      const bars = keys.map((k, i) => {
        const p = Store.taskScore(k);
        const n = Store.tasksOf(k).length;
        return `<div class="wbar${k === todayK ? ' is-today' : ''}"
                     title="${SHORT[i]}: ${n ? p + '% of ' + n + ' tasks' : 'no tasks'}">
          <div class="wbar-track">
            ${p > 0 ? `<div class="wbar-fill" style="height:${p}%"></div>` : ''}
          </div>
          <span>${SHORT[i]}</span></div>`;
      }).join('');

      el.innerHTML = `
        <div class="tasks-top">
          <div class="card">
            <div class="between">
              <div>
                <div class="card-label">Week starting</div>
                <div class="pill pill-accent" style="margin-top:6px">${esc(label)}</div>
              </div>
              <div class="row">
                <button class="icon-btn" id="prevW" aria-label="Previous week">${UI.ICON.left}</button>
                <button class="btn btn-sm" id="thisW">This week</button>
                <button class="icon-btn" id="nextW" aria-label="Next week">${UI.ICON.right}</button>
              </div>
            </div>
            <div class="between" style="margin-top:18px;gap:20px">
              <div class="grow">
                <div class="card-label">Overall progress</div>
                <div class="wbars" style="margin-top:12px">${bars}</div>
              </div>
              <div style="text-align:center">
                ${Charts.ring(weekPct, { size: 112, stroke: 10 })}
                <div class="dim" style="font-size:11.5px;margin-top:8px">
                  ${doneAll} / ${allTasks.length} completed</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="between">
              <div class="card-label">Mindset tracker</div>
              ${Charts.legend(MIND.map(m => ({ name: m.label, color: m.color })))}
            </div>
            <div class="chart" id="mindChart" style="margin-top:14px"></div>
          </div>
        </div>

        <div class="week-board" id="board">
          ${keys.map((k, i) => dayCard(k, i)).join('')}
        </div>`;

      /* mindset chart — 3 validated categorical hues, legend + tooltip */
      Charts.lines(el.querySelector('#mindChart'), {
        height: 176, yMax: 10,
        labels: keys.map((k, i) => SHORT[i]),
        tipTitle: i => D.longDate(D.parse(keys[i])),
        series: MIND.map(m => ({
          name: m.label, color: m.color,
          // days that haven't happened are a gap, not a zero
          values: keys.map(k => D.isFuture(k) ? null : (Store.mindsetOf(k)[m.key] || 0))
        }))
      });

      el.querySelector('#prevW').onclick = () => { weekCursor = D.add(start, -7); App.render(); };
      el.querySelector('#nextW').onclick = () => { weekCursor = D.add(start, 7);  App.render(); };
      el.querySelector('#thisW').onclick = () => { weekCursor = weekStartOf(D.today()); App.render(); };
      if (isThisWeek) el.querySelector('#thisW').classList.add('btn-primary');

      const board = el.querySelector('#board');

      board.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const key = b.closest('[data-day]').dataset.day;
        if (b.dataset.act === 'copy') {
          const n = Store.copyTasks(D.addKey(key, -1), key);
          UI.toast(`Copied ${n} task${n === 1 ? '' : 's'}.`);
          return;
        }
        const id = b.closest('[data-task]').dataset.task;
        if (b.dataset.act === 't') Store.toggleTask(key, id);
        else Store.delTask(key, id);
      });

      board.addEventListener('keydown', e => {
        const inp = e.target.closest('[data-add]');
        if (!inp || e.key !== 'Enter' || !inp.value.trim()) return;
        Store.addTask(inp.dataset.add, inp.value);
        App.focusAfterRender(`[data-add="${inp.dataset.add}"]`);
      });

      // live label while dragging, commit on release (avoids re-render thrash)
      board.addEventListener('input', e => {
        const r = e.target.closest('[data-mind]');
        if (r) r.parentElement.querySelector('b').textContent = r.value;
      });
      board.addEventListener('change', e => {
        const r = e.target.closest('[data-mind]');
        if (!r) return;
        const key = r.closest('[data-day]').dataset.day;
        Store.setMindset(key, r.dataset.mind, parseInt(r.value, 10));
      });
    }
  };
})();
