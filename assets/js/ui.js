/*
 * Ascensão Delta · Lúmia
 * Utilitários de interface: escape, marcadores, gaveta, avisos, formulários.
 */
(function () {
  const LD = (window.LD = window.LD || {});

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('pt-BR') : '—');
  const fmtMult = (m) => (Math.round(m * 100) / 100).toLocaleString('pt-BR') + '×';

  function toast(msg, tipo) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3600);
  }

  /* ---------- Marcadores ---------- */
  function elemTag(key) {
    const e = LD.byKey(LD.ELEMENTOS, key);
    if (!e) return '';
    return `<span class="tag" style="color:${e.cor}"><i class="dot"></i>${esc(e.nome)}</span>`;
  }
  function viaTag(key) {
    const v = LD.byKey(LD.VIAS, key);
    return v ? `<span class="tag ice">${esc(v.nome)}</span>` : '';
  }
  function pips(total, on) {
    let s = '<span class="pips" title="Perfeições">';
    for (let i = 0; i < total; i++) s += `<i class="pip ${i < on ? 'on' : ''}"></i>`;
    return s + '</span>';
  }
  function lumiaBar(atual, max, interativo) {
    let s = `<span class="lumia-bar" ${interativo ? 'data-lumia-bar' : ''} title="Lúmia ${atual}/${max}">`;
    for (let i = 0; i < max; i++) {
      s += interativo
        ? `<button type="button" class="d-hit" data-lumia="${i + 1}" aria-label="Lúmia ${i + 1}"><i class="d ${i < atual ? 'on' : ''}"></i></button>`
        : `<i class="d ${i < atual ? 'on' : ''}"></i>`;
    }
    return s + '</span>';
  }
  function resp(r) {
    const def = LD.byKey(LD.RESPOSTAS, r);
    const label = r === 'F' ? '—' : r;
    return `<span class="resp ${esc(r)}" title="${esc(def ? def.nome : r)}">${esc(label)}</span>`;
  }
  function seq(str) {
    const parts = String(str || '').trim().split(/[\s→>,-]+/).filter(Boolean);
    return `<span class="seq">${parts.map((p) => resp(p.toUpperCase())).join('')}</span>`;
  }
  function custoTag(h) {
    const c = LD.rules.custoHabilidade(h);
    return `<span class="tag lumia" title="Custo em Lúmia">${lumiaBar(c, c)} ${c}</span>`;
  }

  /* ---------- Gaveta ---------- */
  let drawerEl, backEl, onCloseCb;
  function ensureDrawer() {
    if (drawerEl) return;
    backEl = document.createElement('div');
    backEl.className = 'drawer-back';
    backEl.addEventListener('click', closeDrawer);
    drawerEl = document.createElement('aside');
    drawerEl.className = 'drawer';
    drawerEl.setAttribute('role', 'dialog');
    document.body.append(backEl, drawerEl);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawerEl.classList.contains('open')) closeDrawer(); });
  }
  function openDrawer({ eyebrow, title, body, foot, onMount, onClose }) {
    ensureDrawer();
    onCloseCb = onClose;
    drawerEl.innerHTML = `
      <div class="drawer-head">
        <div><div class="eyebrow">${esc(eyebrow || '')}</div><h2 style="margin-top:8px">${esc(title || '')}</h2></div>
        <button class="icon-btn" data-close aria-label="Fechar"><span>×</span></button>
      </div>
      <div class="drawer-body">${body || ''}</div>
      ${foot ? `<div class="drawer-foot">${foot}</div>` : ''}`;
    drawerEl.querySelector('[data-close]').addEventListener('click', closeDrawer);
    requestAnimationFrame(() => { backEl.classList.add('open'); drawerEl.classList.add('open'); });
    if (onMount) onMount(drawerEl);
    return drawerEl;
  }
  function closeDrawer() {
    if (!drawerEl) return;
    drawerEl.classList.remove('open');
    backEl.classList.remove('open');
    if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
  }

  /* ---------- Formulários ---------- */
  function field(label, inner, hint) {
    return `<div class="field"><label>${esc(label)}</label>${inner}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  }
  function input(name, value, attrs) {
    return `<input name="${name}" value="${esc(value == null ? '' : value)}" ${attrs || ''}>`;
  }
  function textarea(name, value, attrs) {
    return `<textarea name="${name}" ${attrs || ''}>${esc(value || '')}</textarea>`;
  }
  function select(name, options, value, attrs) {
    return `<select name="${name}" ${attrs || ''}>${options
      .map((o) => `<option value="${esc(o.key)}" ${String(o.key) === String(value) ? 'selected' : ''}>${esc(o.nome)}</option>`)
      .join('')}</select>`;
  }
  function checkbox(name, checked, label) {
    return `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${esc(label)}</label>`;
  }

  // Lê os campos com name="a.b" para um objeto aninhado.
  function readForm(root) {
    const out = {};
    root.querySelectorAll('[name]').forEach((el) => {
      if (el.closest('[data-skip]')) return;
      const path = el.name.split('.');
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'number') v = el.value === '' ? '' : Number(el.value);
      else v = el.value;
      let o = out;
      path.slice(0, -1).forEach((p) => { o[p] = o[p] || {}; o = o[p]; });
      o[path[path.length - 1]] = v;
    });
    return out;
  }

  /* Editor de listas: linhas repetidas com campos, botão de adicionar e remover. */
  function listEditor(rootEl, { key, rows, template, empty }) {
    const wrap = rootEl.querySelector(`[data-list="${key}"]`);
    if (!wrap) return { read: () => rows };
    let data = (rows || []).map((r) => Object.assign({}, r));
    function render() {
      wrap.innerHTML = data.length
        ? data.map((r, i) => `<div class="li" data-i="${i}">${template(r, i)}<div style="text-align:right"><button type="button" class="btn danger plain" data-rm="${i}">Remover</button></div></div>`).join('')
        : `<div class="muted italic serif" style="font-size:18px">${esc(empty || 'Nada ainda.')}</div>`;
      wrap.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { sync(); data.splice(+b.dataset.rm, 1); render(); }));
    }
    function sync() {
      wrap.querySelectorAll('.li').forEach((li) => {
        const i = +li.dataset.i;
        li.querySelectorAll('[data-f]').forEach((el) => {
          const f = el.dataset.f;
          data[i][f] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.type === 'checkbox' ? el.checked : el.value;
        });
      });
    }
    render();
    const addBtn = rootEl.querySelector(`[data-add="${key}"]`);
    if (addBtn) addBtn.addEventListener('click', () => { sync(); data.push({}); render(); });
    return { read: () => { sync(); return data; } };
  }
  const lf = (f, value, attrs) => `<input data-f="${f}" value="${esc(value == null ? '' : value)}" ${attrs || ''}>`;
  const lsel = (f, options, value) => `<select data-f="${f}">${options.map((o) => `<option value="${esc(o.key)}" ${String(o.key) === String(value) ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select>`;

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function confirmar(msg) { return window.confirm(msg); }

  function baixar(nome, texto) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  LD.ui = {
    esc, fmt, fmtMult, toast, elemTag, viaTag, pips, lumiaBar, resp, seq, custoTag,
    openDrawer, closeDrawer, field, input, textarea, select, checkbox, readForm, listEditor, lf, lsel,
    debounce, confirmar, baixar
  };
})();
