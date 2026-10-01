/* ============================================================
   ui.js — icons, modal, toast, small shared widgets
   ============================================================ */
(function () {
  'use strict';
  const esc = window.esc;

  const ICON = {
    check:  '<svg viewBox="0 0 24 24" class="ico"><path d="m5 13 4.5 4.5L19 7"/></svg>',
    plus:   '<svg viewBox="0 0 24 24" class="ico"><path d="M12 5v14M5 12h14"/></svg>',
    x:      '<svg viewBox="0 0 24 24" class="ico"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    left:   '<svg viewBox="0 0 24 24" class="ico"><path d="m15 5-7 7 7 7"/></svg>',
    right:  '<svg viewBox="0 0 24 24" class="ico"><path d="m9 5 7 7-7 7"/></svg>',
    trash:  '<svg viewBox="0 0 24 24" class="ico"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg>',
    edit:   '<svg viewBox="0 0 24 24" class="ico"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/></svg>',
    pin:    '<svg viewBox="0 0 24 24" class="ico"><path d="M9 3h6l-1 6 4 4H6l4-4z" fill="currentColor" stroke="none" opacity=".9"/><path d="M12 13v8"/></svg>',
    flame:  '<svg viewBox="0 0 24 24" class="ico" style="fill:currentColor;stroke:none"><path d="M12 2s4.5 4.2 4.5 8.2a4.5 4.5 0 0 1-1.6 3.4c.1-1.9-.9-3.4-2.1-4.3.2 2.2-1.4 3.3-2.3 4.4-.7.9-1 1.7-1 2.6 0 2.4 2 4.3 4.5 4.3s4.5-2 4.5-4.5c0-1-.2-1.8-.5-2.6C19.4 14.6 20 16.2 20 18c0 3.3-3.6 5-8 5s-8-2.3-8-6c0-5 8-7.3 8-15z"/></svg>',
    star:   '<svg viewBox="0 0 24 24" class="ico" style="fill:currentColor;stroke:none"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.4 7L12 17.7 5.8 21.2l1.4-7L2 9.4l7-.8z"/></svg>',
    snow:   '<svg viewBox="0 0 24 24" class="ico"><path d="M12 2v20M4 6l16 12M20 6 4 18M12 6l-2.5-2M12 6l2.5-2M12 18l-2.5 2M12 18l2.5 2"/></svg>',
    gear:   '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>',
    target: '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>'
  };

  /* ---------------- modal ---------------- */
  const root  = document.getElementById('modalRoot');
  const title = document.getElementById('modalTitle');
  const body  = document.getElementById('modalBody');
  let lastFocus = null;
  let onCloseHook = null;

  /** onClose runs on cancel/Esc/backdrop as well as on close() after saving */
  function modal(heading, html, onMount, onClose) {
    lastFocus = document.activeElement;
    onCloseHook = onClose || null;
    title.textContent = heading;
    body.innerHTML = html;
    root.hidden = false;
    if (onMount) onMount(body);
    const first = body.querySelector('input, textarea, select, button');
    if (first) first.focus();
  }

  function close() {
    const hook = onCloseHook;
    onCloseHook = null;
    root.hidden = true;
    body.innerHTML = '';
    if (hook) hook();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  root.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !root.hidden) close();
  });

  /** simple yes/no */
  function confirm(message, onYes, yesLabel) {
    modal('Confirm', `
      <p class="muted" style="margin:0 0 4px;line-height:1.55">${esc(message)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="cfYes">${esc(yesLabel || 'Yes')}</button>
      </div>`, el => {
      el.querySelector('#cfYes').onclick = () => { close(); onYes(); };
    });
  }

  /* ---------------- toast ---------------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  /* ---------------- shared bits ---------------- */
  function colorSwatches(selected) {
    return `<div class="swatches">${Store.COLORS.map(c => `
      <button type="button" class="swatch${c === selected ? ' is-on' : ''}"
              data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}</div>`;
  }

  /** wire a .swatches group; returns a getter for the picked color */
  function bindSwatches(scope, initial) {
    let picked = initial;
    scope.querySelectorAll('.swatch').forEach(b => {
      b.onclick = () => {
        picked = b.dataset.color;
        scope.querySelectorAll('.swatch').forEach(x => x.classList.toggle('is-on', x === b));
      };
    });
    return () => picked;
  }

  function streakChip(n) {
    return `<span class="streak${n ? '' : ' is-zero'}">${ICON.flame}${n}</span>`;
  }

  window.UI = { ICON, modal, close, confirm, toast, colorSwatches, bindSwatches, streakChip };
})();
