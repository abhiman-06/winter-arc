/* ============================================================
   views/today.js — the daily check-in
   ============================================================ */
(function () {
  'use strict';
  window.Views = window.Views || {};

  function periodLabel(h, key) {
    const done = Store.periodCount(h, key);
    const word = h.cadence === 'weekly' ? 'this week' : 'this month';
    return `${done}/${h.target} ${word}`;
  }

  function habitRow(h, key) {
    const st   = Store.status(h.id, key);
    const met  = Store.isMet(h, key);
    const done = st === true;
    const frozen = st === 'freeze';
    const cls = ['habit-row'];
    if (met || frozen) cls.push('is-done');

    const right = h.cadence === 'daily'
      ? UI.streakChip(Store.streak(h))
      : `<span class="pill">${esc(periodLabel(h, key))}</span>${UI.streakChip(Store.streak(h))}`;

    return `
      <div class="${cls.join(' ')}" data-habit="${h.id}">
        <button class="check${done ? ' is-done' : ''}${frozen ? ' is-freeze' : ''}"
                data-act="toggle" aria-pressed="${done}"
                aria-label="${esc(h.name)}">${frozen ? UI.ICON.snow : UI.ICON.check}</button>
        <span class="cdot" style="background:${h.color}"></span>
        <span class="habit-name grow truncate">${esc(h.name)}</span>
        <span class="habit-meta">
          ${(!done && !frozen) ? `<button class="freeze-btn" data-act="freeze"
              title="Use a freeze token to protect this streak">${UI.ICON.snow}</button>` : ''}
          ${right}
        </span>
      </div>`;
  }

  Views.today = {
    title: 'TODAY',
    render(el) {
      const key = D.todayKey();
      const d = D.parse(key);
      const hs = Store.activeHabits();
      const tally = Store.dayTally(key);
      const pct = Store.dayScore(key);
      const tokens = Store.state.freezeTokens;
      const a = Store.arc();

      const left = hs.filter((_, i) => i % 2 === 0);
      const right = hs.filter((_, i) => i % 2 === 1);

      el.innerHTML = `
        <div class="today-hero">
          ${Charts.ring(pct, { size: 164, stroke: 14, sub: 'TODAY' })}
          <div class="today-date">${esc(D.longDate(d))}</div>
          <div class="today-sub">${tally.done} / ${tally.total} habits completed</div>
          <div class="row" style="margin-top:12px;gap:8px">
            <button class="pill pill-accent" id="tokBtn">
              ${UI.ICON.snow} ${tokens} freeze token${tokens === 1 ? '' : 's'} available
            </button>
            <span class="pill">Day ${a.elapsed} of ${a.total}</span>
          </div>
        </div>

        ${hs.length ? `
        <div class="today-grid" id="habitList">
          <div>${left.map(h => habitRow(h, key)).join('')}</div>
          <div>${right.map(h => habitRow(h, key)).join('')}</div>
        </div>` : `
        <div class="card empty" style="margin-top:20px">
          No habits yet. Head to <b>Habits</b> and add your first one.
        </div>`}

        <div class="section-label">Today's tasks</div>
        <div class="card" id="todayTasks"></div>
      `;

      /* habit interactions */
      const list = el.querySelector('#habitList');
      if (list) list.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const id = btn.closest('[data-habit]').dataset.habit;
        if (btn.dataset.act === 'toggle') Store.toggle(id, key);
        else {
          if (!Store.freeze(id, key)) UI.toast('No freeze tokens left.');
          else UI.toast('Streak protected for today.');
        }
      });

      el.querySelector('#tokBtn').onclick = () => UI.modal('Freeze tokens', `
        <p class="muted" style="margin:0 0 14px;line-height:1.6">
          A freeze token holds a streak for a day you genuinely couldn't show up —
          the streak survives, but the day isn't counted as completed in your rates.
          Tap the snowflake on any habit to spend one.
        </p>
        <label class="field"><span>Tokens available</span>
          <input class="input" type="number" min="0" max="99" id="tokVal"
                 value="${Store.state.freezeTokens}"></label>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Cancel</button>
          <button class="btn btn-primary" id="tokSave">Save</button>
        </div>`, m => {
        m.querySelector('#tokSave').onclick = () => {
          const v = Math.max(0, parseInt(m.querySelector('#tokVal').value, 10) || 0);
          Store.commit(s => { s.freezeTokens = v; });
          UI.close();
        };
      });

      /* today's tasks — mirrors the Tasks board for the current day */
      renderTasks(el.querySelector('#todayTasks'), key);
    }
  };

  function renderTasks(box, key) {
    const list = Store.tasksOf(key);
    const pct = Store.taskScore(key);
    box.innerHTML = `
      <div class="between" style="margin-bottom:12px">
        <span class="card-label">${list.filter(t => t.done).length} / ${list.length} done</span>
        <span class="pill">${pct}%</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${list.map(t => `
          <div class="task-item${t.done ? ' is-done' : ''}" data-task="${t.id}">
            <button class="check${t.done ? ' is-done' : ''}" data-act="t"
                    aria-pressed="${t.done}">${UI.ICON.check}</button>
            <span class="task-text">${esc(t.text)}</span>
            <button class="task-del" data-act="d" aria-label="Delete task">${UI.ICON.x}</button>
          </div>`).join('')}
      </div>
      <input class="add-task" style="margin-top:8px" placeholder="+ Add task" id="addT">`;

    box.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const id = b.closest('[data-task]').dataset.task;
      if (b.dataset.act === 't') Store.toggleTask(key, id);
      else Store.delTask(key, id);
    });
    const inp = box.querySelector('#addT');
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && inp.value.trim()) {
        Store.addTask(key, inp.value);
        App.focusAfterRender('#todayTasks #addT');
      }
    });
  }
})();
