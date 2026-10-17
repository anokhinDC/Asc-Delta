(function () {
  const LD = window.LD;
  const { esc, elemTag, viaTag, field, input, textarea, select, checkbox } = LD.ui;

  const CATEGORIAS_ITEM = [
    { key: 'ampola', nome: 'Ampola' },
    { key: 'consumivel', nome: 'Consumível' },
    { key: 'material', nome: 'Material' },
    { key: 'chave', nome: 'Item-chave' }
  ];

  function bonusTexto(b) {
    if (!b) return '';
    return LD.PICTO_BONUS.filter((k) => Number(b[k.key])).map((k) => `<span class="tag ice">+${esc(b[k.key])} ${esc(k.nome)}</span>`).join(' ');
  }

  /* ---------------- Pictos ---------------- */
  const pictoCfg = {
    col: 'pictos', singular: 'Picto',
    card: (p) => `
      <article class="card" data-open="${esc(p.id)}">
        <div class="card-meta">${bonusTexto(p.bonus)}</div>
        <div class="card-title">${esc(p.nome)}</div>
        <div class="card-desc">${esc(p.efeito || '')}</div>
        <div class="card-foot"><span class="caps">${esc(p.origem || '')}</span><span class="tag lumia">Eco ${esc(p.custoEco || 0)} ◆</span></div>
      </article>`,
    leitura: (p) => `
      <div class="card-meta" style="margin-bottom:16px">${bonusTexto(p.bonus) || '<span class="muted">Sem bônus de Status.</span>'}</div>
      <div class="quote">${esc(p.efeito || '')}</div>
      ${p.descricao ? `<p class="paper-2">${esc(p.descricao)}</p>` : ''}
      <table class="tbl" style="margin-top:14px"><tr><td class="caps">Custo como Eco</td><td class="r num">${esc(p.custoEco || 0)}</td></tr>
      <tr><td class="caps">Origem</td><td class="r">${esc(p.origem || '—')}</td></tr></table>`,
    vazio: () => ({ nome: '', bonus: {}, efeito: '', custoEco: 2, descricao: '', origem: '' }),
    form: (p) => `
      ${field('Nome', input('nome', p.nome, 'class="big" placeholder="Nome do picto"'))}
      <div class="subsect"><span>Bônus de Status</span></div>
      <div class="row">${LD.PICTO_BONUS.map((k) => field(k.nome, input('bonus.' + k.key, (p.bonus || {})[k.key] || '', 'type="number"'))).join('')}</div>
      <div class="subsect"><span>Efeito</span></div>
      ${field('Efeito passivo', textarea('efeito', p.efeito))}
      ${field('Custo como Eco', input('custoEco', p.custoEco, 'type="number" min="0" max="20"'), 'Pontos de Eco para usar o efeito sem equipar o picto, depois de dominado.')}
      ${field('Descrição', textarea('descricao', p.descricao))}
      ${field('Origem', input('origem', p.origem))}`,
    ajustar: (p) => { Object.keys(p.bonus || {}).forEach((k) => { p.bonus[k] = Number(p.bonus[k]) || 0; if (!p.bonus[k]) delete p.bonus[k]; }); p.custoEco = Number(p.custoEco) || 0; }
  };

  /* ---------------- Armas ---------------- */
  const armaCfg = {
    col: 'armas', singular: 'Arma',
    card: (a) => `
      <article class="card" data-open="${esc(a.id)}">
        <div class="card-meta">${viaTag(a.via)} ${elemTag(a.elemento)}</div>
        <div class="card-title">${esc(a.nome)}</div>
        <div class="card-desc">${esc(a.descricao || '')}</div>
        <div class="card-foot"><span class="caps">${esc(a.origem || '')}</span><span class="tag ice">Poder +${esc(a.poder || 0)}</span></div>
      </article>`,
    leitura: (a) => `
      <div class="card-meta" style="margin-bottom:16px">${viaTag(a.via)} ${elemTag(a.elemento)}</div>
      ${a.descricao ? `<p class="serif" style="font-size:19px">${esc(a.descricao)}</p>` : ''}
      <table class="tbl"><tr><td class="caps">Poder</td><td class="r num">+${esc(a.poder || 0)} na Base da Via</td></tr>
      <tr><td class="caps">Quebra extra</td><td class="r num">+${esc(a.quebra || 0)}</td></tr>
      ${(a.passivas || []).map((p) => `<tr><td class="caps">Nível ${esc(p.nivel)}</td><td>${esc(p.texto)}</td></tr>`).join('')}
      <tr><td class="caps">Origem</td><td class="r">${esc(a.origem || '—')}</td></tr></table>`,
    vazio: () => ({ nome: '', via: 'gol', elemento: 'fisico', poder: 5, quebra: 0, passivas: [], descricao: '', origem: '' }),
    form: (a) => `
      ${field('Nome', input('nome', a.nome, 'class="big"'))}
      <div class="row">
        ${field('Via', select('via', LD.VIAS.map((v) => ({ key: v.key, nome: v.nome })), a.via))}
        ${field('Elemento do Ataque Comum', select('elemento', LD.ELEMENTOS, a.elemento))}
        ${field('Poder', input('poder', a.poder, 'type="number"'), 'Somado à Base da Via de quem empunha.')}
        ${field('Quebra extra', input('quebra', a.quebra, 'type="number" min="0"'))}
      </div>
      <div class="subsect"><span>Passivas por nível</span></div>
      <div class="list-edit" data-list="passivas"></div>
      <button type="button" class="btn" data-add="passivas" style="margin:10px 0 18px">Adicionar passiva</button>
      ${field('Descrição', textarea('descricao', a.descricao))}
      ${field('Origem', input('origem', a.origem))}`,
    listas: { passivas: (r) => `<div style="display:grid;grid-template-columns:110px 1fr;gap:12px"><div class="field" style="margin:0"><label>Nível</label>${LD.ui.lf('nivel', r.nivel || 1, 'type="number" min="1"')}</div><div class="field" style="margin:0"><label>Efeito</label>${LD.ui.lf('texto', r.texto)}</div></div>` },
    ajustar: (a) => { a.poder = Number(a.poder) || 0; a.quebra = Number(a.quebra) || 0; a.passivas = (a.passivas || []).filter((p) => p.texto); }
  };

  /* ---------------- Itens ---------------- */
  const itemCfg = {
    col: 'itens', singular: 'Item',
    card: (i) => {
      const c = LD.byKey(CATEGORIAS_ITEM, i.categoria);
      return `
      <article class="card" data-open="${esc(i.id)}" style="min-height:120px">
        <div class="card-meta"><span class="tag ice">${esc(c ? c.nome : '')}</span> ${i.rapido ? '<span class="tag lumia">Rápido</span>' : ''}</div>
        <div class="card-title">${esc(i.nome)}</div>
        <div class="card-desc">${esc(i.efeito || '')}</div>
        <div class="card-foot"><span class="caps">${esc(i.origem || '')}</span></div>
      </article>`;
    },
    leitura: (i) => `
      <div class="quote">${esc(i.efeito || '')}</div>
      ${i.descricao ? `<p class="paper-2">${esc(i.descricao)}</p>` : ''}
      <table class="tbl"><tr><td class="caps">Uso</td><td class="r">${i.rapido ? 'Rápido, sem gastar a ação' : 'Gasta a ação principal'}</td></tr>
      <tr><td class="caps">Origem</td><td class="r">${esc(i.origem || '—')}</td></tr></table>`,
    vazio: () => ({ nome: '', categoria: 'consumivel', rapido: false, efeito: '', descricao: '', origem: '' }),
    form: (i) => `
      ${field('Nome', input('nome', i.nome, 'class="big"'))}
      <div class="row">${field('Categoria', select('categoria', CATEGORIAS_ITEM, i.categoria))}<div class="field" style="justify-content:end">${checkbox('rapido', i.rapido, 'Rápido (não gasta a ação)')}</div></div>
      ${field('Efeito', textarea('efeito', i.efeito))}
      ${field('Descrição', textarea('descricao', i.descricao))}
      ${field('Origem', input('origem', i.origem, 'placeholder="Mercador, lugar, inimigo"'))}`,
    ajustar: () => {}
  };

  function abrir(cfg, id, onSaved) {
    const item = id ? LD.store.get(cfg.col, id) : null;
    const podeEditar = LD.store.canEdit(cfg.col, item);
    if (item && !podeEditar) {
      LD.ui.openDrawer({ eyebrow: cfg.singular, title: item.nome, body: cfg.leitura(item) });
      return;
    }
    if (!item && !podeEditar) return;
    const novo = !item;
    const d = Object.assign(cfg.vazio(), item ? JSON.parse(JSON.stringify(item)) : {});
    const foot = `${!novo ? '<button class="btn danger" data-del>Excluir</button>' : ''}<span style="flex:1"></span><button class="btn plain" data-cancel>Cancelar</button><button class="btn-primary" data-save>Gravar</button>`;
    LD.ui.openDrawer({
      eyebrow: (novo ? 'Novo · ' : 'Editar · ') + cfg.singular, title: novo ? cfg.singular : d.nome,
      body: `<form data-form>${cfg.form(d)}</form>${!novo ? `<div class="subsect"><span>Como aparece</span></div>${cfg.leitura(d)}` : ''}`,
      foot,
      onMount: (el) => {
        const form = el.querySelector('[data-form]');
        const editores = {};
        Object.entries(cfg.listas || {}).forEach(([k, tpl]) => { editores[k] = LD.ui.listEditor(el, { key: k, rows: d[k], template: tpl }); });
        el.querySelector('[data-cancel]').addEventListener('click', LD.ui.closeDrawer);
        const del = el.querySelector('[data-del]');
        if (del) del.addEventListener('click', () => {
          if (!LD.ui.confirmar(`Excluir "${d.nome}"?`)) return;
          LD.store.remove(cfg.col, d.id).then(() => { LD.ui.closeDrawer(); LD.ui.toast('Excluído.'); });
        });
        el.querySelector('[data-save]').addEventListener('click', () => {
          const out = Object.assign(d, LD.ui.readForm(form));
          if (!String(out.nome || '').trim()) { LD.ui.toast('Dê um nome.', 'erro'); return; }
          Object.entries(editores).forEach(([k, ed]) => { out[k] = ed.read(); });
          cfg.ajustar(out);
          LD.store.save(cfg.col, out).then((s) => { LD.ui.closeDrawer(); LD.ui.toast(cfg.singular + ' gravado.'); if (onSaved) onSaved(s); });
        });
      }
    });
  }

  const filtros = { pictos: '', arsenal: '', aba: 'armas' };

  function grade(cfg, q) {
    const lista = LD.store.list(cfg.col).slice().sort((a, b) => a.nome.localeCompare(b.nome))
      .filter((x) => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
    return lista.length ? `<div class="grid cards">${lista.map(cfg.card).join('')}</div>` : '<div class="empty">Nada por aqui ainda.</div>';
  }

  function ligar(main, cfg) {
    main.querySelectorAll('[data-open]').forEach((c) => c.addEventListener('click', () => abrir(cfg, c.dataset.open)));
  }

  function renderPictos(main) {
    const pode = LD.store.canEdit('pictos', null);
    main.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Biblioteca · Pictos</div>
          <h1>Pictos e Ecos</h1>
          <p class="lead">Um Ascensor equipa até três Pictos: cada um dá bônus de Status e um efeito. Depois de usar um Picto em ${LD.DOMINIO_COMBATES} combates, ele é dominado, e o efeito pode ser levado como Eco, sem o bônus, pagando Pontos de Eco.</p>
        </div>
        ${pode ? '<button class="btn-primary" data-new>Novo picto</button>' : ''}
      </header>
      <div class="toolbar"><label class="search"><span class="muted">⌕</span><input data-q placeholder="Procurar um picto…" value="${esc(filtros.pictos)}"></label></div>
      ${grade(pictoCfg, filtros.pictos)}`;
    ligar(main, pictoCfg);
    main.querySelector('[data-q]').addEventListener('input', LD.ui.debounce((e) => { filtros.pictos = e.target.value; renderPictos(main); main.querySelector('[data-q]').focus(); }, 250));
    const nb = main.querySelector('[data-new]');
    if (nb) nb.addEventListener('click', () => abrir(pictoCfg, null));
  }

  function renderArsenal(main) {
    const cfg = filtros.aba === 'armas' ? armaCfg : itemCfg;
    const pode = LD.store.canEdit(cfg.col, null);
    main.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Biblioteca · Arsenal</div>
          <h1>Armas e itens</h1>
          <p class="lead">A arma define a Via e o elemento do Ataque Comum, e soma o seu Poder à Base daquela Via. Os itens vão para o inventário das fichas.</p>
        </div>
        ${pode ? `<button class="btn-primary" data-new>${filtros.aba === 'armas' ? 'Nova arma' : 'Novo item'}</button>` : ''}
      </header>
      <div class="tabs"><button class="${filtros.aba === 'armas' ? 'on' : ''}" data-aba="armas">Armas</button><button class="${filtros.aba === 'itens' ? 'on' : ''}" data-aba="itens">Itens</button></div>
      <div class="toolbar"><label class="search"><span class="muted">⌕</span><input data-q placeholder="Procurar…" value="${esc(filtros.arsenal)}"></label></div>
      ${grade(cfg, filtros.arsenal)}`;
    ligar(main, cfg);
    main.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { filtros.aba = b.dataset.aba; renderArsenal(main); }));
    main.querySelector('[data-q]').addEventListener('input', LD.ui.debounce((e) => { filtros.arsenal = e.target.value; renderArsenal(main); main.querySelector('[data-q]').focus(); }, 250));
    const nb = main.querySelector('[data-new]');
    if (nb) nb.addEventListener('click', () => abrir(cfg, null));
  }

  LD.views = LD.views || {};
  LD.views.pictos = { titulo: 'Pictos', numeral: 'III', render: renderPictos };
  LD.views.arsenal = { titulo: 'Arsenal', numeral: 'IV', render: renderArsenal };
  LD.biblioteca = {
    abrirPicto: (id, cb) => abrir(pictoCfg, id, cb),
    abrirArma: (id, cb) => abrir(armaCfg, id, cb),
    abrirItem: (id, cb) => abrir(itemCfg, id, cb),
    bonusTexto, CATEGORIAS_ITEM
  };
})();
