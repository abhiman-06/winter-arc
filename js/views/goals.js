/* ============================================================
   views/goals.js — the 1-year arc and the goals inside it
   ============================================================ */
(function () {
  'use strict';
  window.Views = window.Views || {};

  let areaFilter = null;   // area id, or null for all

  function goalModal(existing) {
    const a = Store.arc();
    const g = existing || {
      title: '', area: 'health', type: 'milestone', target: 10, current: 0,
      unit: '', deadline: a.end, status: 'in-progress', pinned: false, milestones: []
    };
    const areaOpts = Store.AREAS.map(x =>
      `<option value="${x.id}"${x.id === g.area ? ' selected' : ''}>${x.icon} ${esc(x.name)}</option>`).join('');

    UI.modal(existing ? 'Edit goal' : 'New 1-year goal', `
      <label class="field"><span>Goal</span>
        <input class="input" id="gTitle" maxlength="90" value="${esc(g.title)}"
               placeholder="e.g. Get consistently fit"></label>
      <div class="field-row">
        <label class="field"><span>Area of life</span>
          <select class="select" id="gArea">${areaOpts}</select></label>
        <label class="field"><span>Target date</span>
          <input class="input" type="date" id="gDate" value="${esc(g.deadline || a.end)}"></label>
      </div>
      <div class="field-row">
        <label class="field"><span>Measured by</span>
          <select class="select" id="gType">
            <option value="milestone">Milestones</option>
            <option value="numeric">A number</option>
          </select></label>
        <label class="field"><span>Status</span>
          <select class="select" id="gStatus">
            <option value="planned">Planned</option>
            <option value="in-progress">In progress</option>
            <option value="achieved">Achieved</option>
          </select></label>
      </div>
      <div id="numWrap" class="field-row" hidden>
        <label class="field"><span>Target amount</span>
          <input class="input" type="number" id="gTarget" min="1" value="${g.target || 10}"></label>
        <label class="field"><span>Unit</span>
          <input class="input" id="gUnit" maxlength="16" value="${esc(g.unit || '')}"
                 placeholder="books, kg, ₹"></label>
      </div>
      <label class="field" id="msWrap"><span>Milestones — one per line</span>
        <textarea class="textarea" id="gMs" rows="4"
          placeholder="Run 1K without stopping&#10;Run 3K&#10;Run 5K">${esc((g.milestones || []).map(m => m.text).join('\n'))}</textarea></label>
      <label class="row" style="gap:8px;cursor:pointer">
        <input type="checkbox" id="gPin" ${g.pinned ? 'checked' : ''}>
        <span class="muted">Pin to top priorities</span></label>
      <div class="modal-actions">
        ${existing ? `<button class="btn btn-danger" id="gDel">Delete</button>` : ''}
        <span class="grow"></span>
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="gSave">${existing ? 'Save' : 'Add goal'}</button>
      </div>`, m => {
      const type = m.querySelector('#gType');
      const num = m.querySelector('#numWrap');
      const ms = m.querySelector('#msWrap');
      type.value = g.type;
      m.querySelector('#gStatus').value = g.status;
      const sync = () => {
        const isNum = type.value === 'numeric';
        num.hidden = !isNum;
        ms.hidden = isNum;
      };
      type.onchange = sync; sync();

      m.querySelector('#gSave').onclick = () => {
        const title = m.querySelector('#gTitle').value.trim();
        if (!title) { UI.toast('Give the goal a name.'); return; }
        const gType = type.value;
        const prev = g.milestones || [];
        const milestones = gType === 'numeric' ? [] :
          m.querySelector('#gMs').value.split('\n').map(s => s.trim()).filter(Boolean)
            .map(text => {
              const old = prev.find(p => p.text === text);
              return { id: old ? old.id : Store.uid(), text, done: old ? old.done : false };
            });
        const patch = {
          title,
          area: m.querySelector('#gArea').value,
          deadline: m.querySelector('#gDate').value || null,
          type: gType,
          target: Math.max(1, parseInt(m.querySelector('#gTarget').value, 10) || 1),
          unit: m.querySelector('#gUnit').value.trim(),
          status: m.querySelector('#gStatus').value,
          pinned: m.querySelector('#gPin').checked,
          milestones
        };
        Store.commit(s => {
          if (existing) Object.assign(s.goals.find(x => x.id === existing.id), patch);
          else s.goals.push(Object.assign({ id: Store.uid(), current: 0,
                                            createdAt: D.todayKey() }, patch));
        });
        UI.close();
      };

      if (existing) m.querySelector('#gDel').onclick = () => {
        UI.confirm(`Delete "${existing.title}"?`, () => {
          Store.commit(s => { s.goals = s.goals.filter(x => x.id !== existing.id); });
          UI.toast('Goal deleted.');
        }, 'Delete');
      };
    });
  }

  function goalCard(g) {
    const pct = Store.goalProgress(g);
    const left = Store.daysLeft(g);
    const area = Store.area(g.area);
    const done = g.status === 'achieved';
    const statusPill = done ? '<span class="pill pill-good">Achieved</span>'
      : g.status === 'planned' ? '<span class="pill">Planned</span>'
      : '<span class="pill pill-accent">In progress</span>';
    const overdue = left != null && left < 0 && !done;

    return `
      <div class="goal-card${done ? ' is-done' : ''}" data-goal="${g.id}">
        <div class="between">
          <div class="grow">
            <div class="goal-title">${esc(g.title)}</div>
            <div class="row" style="margin-top:9px;gap:8px;flex-wrap:wrap">
              ${statusPill}
              <span class="pill">${area.icon} ${esc(area.name)}</span>
              ${left != null ? `<span class="pill${overdue ? ' pill-warn' : ''}">
                ${overdue ? `${Math.abs(left)} days over` : `${left} days left`}</span>` : ''}
            </div>
          </div>
          <div class="row">
            <button class="pin${g.pinned ? ' is-on' : ''}" data-act="pin"
                    aria-label="Pin goal" title="Pin to top priorities">${UI.ICON.pin}</button>
            <button class="icon-btn sm" data-act="edit" aria-label="Edit goal">${UI.ICON.edit}</button>
          </div>
        </div>

        ${g.type === 'numeric' ? `
          <div class="row" style="margin-top:13px;gap:8px">
            <input class="input" type="number" style="width:92px" data-act="num"
                   value="${g.current || 0}" min="0" aria-label="Current progress">
            <span class="dim" style="font-size:12.5px">of ${g.target} ${esc(g.unit || '')}</span>
            <span class="grow"></span>
            <b style="font-variant-numeric:tabular-nums">${pct}%</b>
          </div>` : `
          <div class="between" style="margin-top:13px">
            <span class="dim" style="font-size:12.5px">
              ${(g.milestones || []).filter(m => m.done).length} of ${(g.milestones || []).length} milestones</span>
            <b style="font-variant-numeric:tabular-nums">${pct}%</b>
          </div>`}

        <div class="gtrack"><div class="gfill" style="width:${pct}%"></div></div>

        ${(g.milestones || []).length ? `
          <div class="ms-list">
            ${g.milestones.map(mm => `
              <div class="ms-item${mm.done ? ' is-done' : ''}">
                <button class="check${mm.done ? ' is-done' : ''}" data-act="ms" data-ms="${mm.id}"
                        aria-pressed="${mm.done}" aria-label="${esc(mm.text)}">${UI.ICON.check}</button>
                <span>${esc(mm.text)}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  }

  Views.goals = {
    title: 'GOALS',
    newGoal: goalModal,
    render(el) {
      const a = Store.arc();
      const goals = Store.state.goals;
      const achieved = goals.filter(g => g.status === 'achieved').length;
      const areasUsed = new Set(goals.map(g => g.area)).size;
      const pinned = goals.filter(g => g.pinned && g.status !== 'achieved');
      const shown = areaFilter ? goals.filter(g => g.area === areaFilter) : goals;

      const areaCards = Store.AREAS.map(x => {
        const list = goals.filter(g => g.area === x.id);
        const ach = list.filter(g => g.status === 'achieved').length;
        return `<button class="area-card${areaFilter === x.id ? ' is-active' : ''}" data-area="${x.id}">
          <b>${x.icon} ${esc(x.name)}</b>
          <span>${list.length} goal${list.length === 1 ? '' : 's'} · ${ach} achieved</span>
        </button>`;
      }).join('');

      el.innerHTML = `
        <div class="card goal-hero">
          ${Charts.ring(goals.length ? Math.round(achieved / goals.length * 100) : 0,
                        { size: 92, stroke: 9 })}
          <div class="grow">
            <div class="card-label">Goals achieved</div>
            <div style="font-size:19px;font-weight:650;margin-top:4px">
              ${achieved}/${goals.length} · mastering ${areasUsed} area${areasUsed === 1 ? '' : 's'}
            </div>
            <div class="row" style="margin-top:9px;gap:8px;flex-wrap:wrap">
              <span class="pill">${esc(D.parse(a.start).toDateString().slice(4))} → ${esc(D.parse(a.end).toDateString().slice(4))}</span>
              <span class="pill pill-accent">${a.left} days left in the arc</span>
            </div>
            <div class="arc-track"><div class="arc-fill" style="width:${a.pct}%"></div></div>
          </div>
          <button class="btn btn-primary" id="newG">${UI.ICON.plus} New Goal</button>
        </div>

        <div class="section-label">Areas of life</div>
        <div class="areas" id="areas">${areaCards}</div>

        ${pinned.length ? `
          <div class="section-label">Top priorities</div>
          <div id="pinnedList">${pinned.map(goalCard).join('')}</div>` : ''}

        <div class="section-label">
          ${areaFilter ? `${esc(Store.area(areaFilter).name)} goals` : 'All goals'}
          ${areaFilter ? ` · <button class="btn btn-ghost btn-sm" id="clearF">clear filter</button>` : ''}
        </div>
        <div id="goalList">
          ${shown.length ? shown.map(goalCard).join('')
            : `<div class="card empty">No goals here yet. Set one with <b>+ New Goal</b> —
               the arc runs to ${esc(a.end)}.</div>`}
        </div>`;

      el.querySelector('#newG').onclick = () => goalModal(null);
      const cf = el.querySelector('#clearF');
      if (cf) cf.onclick = () => { areaFilter = null; App.render(); };

      el.querySelector('#areas').addEventListener('click', e => {
        const b = e.target.closest('[data-area]');
        if (!b) return;
        areaFilter = areaFilter === b.dataset.area ? null : b.dataset.area;
        App.render();
      });

      function wire(scope) {
        if (!scope) return;
        scope.addEventListener('click', e => {
          const b = e.target.closest('[data-act]');
          if (!b) return;
          const id = b.closest('[data-goal]').dataset.goal;
          const g = Store.state.goals.find(x => x.id === id);
          if (b.dataset.act === 'edit') goalModal(g);
          else if (b.dataset.act === 'pin') Store.commit(() => { g.pinned = !g.pinned; });
          else if (b.dataset.act === 'ms') {
            Store.commit(() => {
              const mm = g.milestones.find(x => x.id === b.dataset.ms);
              mm.done = !mm.done;
              if (g.milestones.every(x => x.done)) g.status = 'achieved';
              else if (g.status === 'achieved') g.status = 'in-progress';
            });
          }
        });
        scope.addEventListener('change', e => {
          const inp = e.target.closest('[data-act="num"]');
          if (!inp) return;
          const id = inp.closest('[data-goal]').dataset.goal;
          Store.commit(s => {
            const g = s.goals.find(x => x.id === id);
            g.current = Math.max(0, parseFloat(inp.value) || 0);
            if (g.current >= g.target) g.status = 'achieved';
            else if (g.status === 'achieved') g.status = 'in-progress';
          });
        });
      }
      wire(el.querySelector('#goalList'));
      wire(el.querySelector('#pinnedList'));
    }
  };
})();
