(function () {
  const LD = window.LD;
  const { esc, fmt, fmtMult, elemTag, viaTag, pips, custoTag, field, input, textarea, select, checkbox } = LD.ui;
  const R = LD.rules;

  const filtros = { q: '', via: 'todas', perf: 'todas' };

  function nomeVia(k) { const v = LD.byKey(LD.VIAS, k); return v ? v.nome : '—'; }

  function card(h) {
    const n = R.perfeicoesDe(h);
    const alvo = LD.byKey(LD.ALVOS, h.alvo);
    const tipo = LD.byKey(LD.TIPOS_HAB, h.tipo);
    return `
      <article class="card" data-open="${esc(h.id)}">
        <div class="card-meta">${viaTag(h.via)} ${elemTag(h.elemento)} ${h.suprema ? '<span class="tag accent">Suprema</span>' : ''}</div>
        <div class="card-title">${esc(h.nome)}</div>
        <div class="card-meta">${pips(n, n)} <span class="caps">${n} perfeiç${n > 1 ? 'ões' : 'ão'}</span></div>
        <div class="card-desc">${esc(h.perfeita ? 'Perfeita: ' + h.perfeita : h.descricao || '')}</div>
        <div class="card-foot">
          <span class="caps">${esc(tipo ? tipo.nome : '')} · ${esc(alvo ? alvo.nome : '')}</span>
          ${custoTag(h)}
        </div>
      </article>`;
  }

  function escala(h, base) {
    const linhas = R.tabelaHabilidade(h, base);
    return `<div class="skill-scale">${linhas
      .map((l) => `<div><div class="caps">${l.perfeita ? 'Perfeita' : l.perfeicoes + ' perf.'}</div><div class="m">${fmtMult(l.mult)}</div>${base != null ? `<div class="d">${fmt(l.valor)}</div>` : ''}</div>`)
      .join('')}</div>`;
  }

  // Bloco de leitura de uma habilidade (usado no detalhe e na ficha).
  function leitura(h, base) {
    const n = R.perfeicoesDe(h);
    const forma = LD.byKey(LD.FORMAS, h.forma) || LD.FORMAS[0];
    const alvo = LD.byKey(LD.ALVOS, h.alvo);
    const tipo = LD.byKey(LD.TIPOS_HAB, h.tipo);
    const minimo = R.nivelMinimo(h);
    return `
      <div class="card-meta" style="margin-bottom:14px">${viaTag(h.via)} ${elemTag(h.elemento)} <span class="tag">${esc(tipo ? tipo.nome : '')}</span> <span class="tag">${esc(alvo ? alvo.nome : '')}</span> ${h.suprema ? '<span class="tag accent">Suprema</span>' : ''}</div>
      ${h.descricao ? `<p class="serif" style="font-size:19px;line-height:1.45;margin:0 0 18px">${esc(h.descricao)}</p>` : ''}
      <div class="grid three" style="margin-bottom:18px">
        <div class="vital" style="border:1px solid var(--line)"><div class="caps">Custo</div><div class="v">${R.custoHabilidade(h)}</div>${LD.ui.lumiaBar(R.custoHabilidade(h), R.custoHabilidade(h))}</div>
        <div class="vital" style="border:1px solid var(--line)"><div class="caps">Perfeições</div><div class="v">${n}</div>${pips(n, n)}</div>
        <div class="vital" style="border:1px solid var(--line)"><div class="caps">Compasso</div><div class="v" style="font-size:26px">${esc(forma.nome)}</div><div class="muted" style="font-size:12px">${esc(forma.ex)}</div></div>
      </div>
      <div class="caps" style="margin-bottom:4px">Multiplicador da Base de ${esc(nomeVia(h.via))} por perfeições certas (piso do custo, +25% a cada 2)${R.ehArea(h) ? ' (área: metade)' : ''}</div>
      ${escala(h, base)}
      <div style="margin-top:18px">
        ${(h.porPerfeicao || []).filter((p) => p && p.texto).map((p) => `<div class="sig-row" style="grid-template-columns:110px 1fr"><span class="caps">Na ${esc(p.n)}ª</span><span>${esc(p.texto)}</span></div>`).join('')}
        ${h.perfeita ? `<div class="sig-row" style="grid-template-columns:110px 1fr"><span class="caps" style="color:var(--accent-2)">Perfeita</span><span>${esc(h.perfeita)} <span class="muted">· devolve 1 Lúmia</span></span></div>` : ''}
        ${h.quebra ? `<div class="sig-row" style="grid-template-columns:110px 1fr"><span class="caps">Quebra</span><span>+${esc(h.quebra)}</span></div>` : ''}
        ${(h.tags || []).length ? `<div class="sig-row" style="grid-template-columns:110px 1fr"><span class="caps">Notas</span><span>${(h.tags || []).map(esc).join(' · ')}</span></div>` : ''}
        ${minimo > 1 ? `<div class="sig-row" style="grid-template-columns:110px 1fr"><span class="caps">Requisito</span><span>Nível ${minimo} ou mais</span></div>` : ''}
        ${h.origem ? `<div class="sig-row" style="grid-template-columns:110px 1fr"><span class="caps">Origem</span><span>${esc(h.origem)}</span></div>` : ''}
      </div>`;
  }

  function abrir(id, opts) {
    opts = opts || {};
    const h = id ? LD.store.get('habilidades', id) : null;
    const podeEditar = LD.store.canEdit('habilidades', h);
    if (h && !podeEditar) {
      LD.ui.openDrawer({
        eyebrow: 'Habilidade', title: h.nome,
        body: `<div class="field"><label>Prévia com a Base</label><input type="number" data-base value="74"></div><div data-leitura>${leitura(h, 74)}</div>`,
        onMount: (el) => {
          const b = el.querySelector('[data-base]');
          b.addEventListener('input', () => { el.querySelector('[data-leitura]').innerHTML = leitura(h, Number(b.value) || 0); });
        }
      });
      return;
    }
    editar(h, opts);
  }

  function editar(h, opts) {
    const novo = !h;
    h = Object.assign({ nome: '', via: 'gol', elemento: 'fisico', tipo: 'dano', alvo: 'unico', perfeicoes: 2, custo: 2, suprema: false, custoSuprema: 7, forma: 'direto', quebra: 1, porPerfeicao: [], perfeita: '', tags: [], descricao: '', origem: '' }, h ? JSON.parse(JSON.stringify(h)) : {});
    if (h.custo == null || h.custo === '') h.custo = Math.max(2, Math.min(6, h.perfeicoes || 2));
    h.custo = Math.max(2, Number(h.custo) || 2);
    h.perfeicoes = Math.max(2, Math.min(h.custo, h.perfeicoes || 2));
    const body = `
      <form data-form>
        ${field('Nome', input('nome', h.nome, 'class="big" required placeholder="Nome da habilidade"'))}
        <div class="row">
          ${field('Via', select('via', LD.VIAS.map((v) => ({ key: v.key, nome: v.nome })), h.via))}
          ${field('Elemento', select('elemento', LD.ELEMENTOS, h.elemento))}
          ${field('Tipo', select('tipo', LD.TIPOS_HAB, h.tipo))}
          ${field('Alvo', select('alvo', LD.ALVOS, h.alvo))}
        </div>
        <div class="row">
          ${field('Custo em Lúmia (2 a 6)', input('custo', h.custo, 'type="number" min="2" max="6"'), 'Quanto mais Lúmia, maior a zona de dano: piso de 100% + 10% por ponto acima de 2.')}
          ${field('Perfeições (2 até o custo)', input('perfeicoes', h.perfeicoes, 'type="number" min="2" max="6"'), 'Cada ponto de Lúmia permite +1 perfeição. O Compasso tem 2 números por perfeição, e cada 2 perfeições certas dão +25%.')}
          ${field('Forma do Compasso', select('forma', LD.FORMAS.map((f) => ({ key: f.key, nome: `${f.nome} · ${f.ex}` })), h.forma))}
          ${field('Quebra', input('quebra', h.quebra, 'type="number" min="0" max="6"'))}
        </div>
        <div class="row" style="align-items:end">
          <div class="field">${checkbox('suprema', h.suprema, 'Suprema (6 perfeições, efeito único)')}</div>
          ${field('Custo da Suprema (7 a 9)', input('custoSuprema', h.custoSuprema, 'type="number" min="7" max="9"'))}
        </div>

        <div class="subsect"><span>Efeitos</span></div>
        <div class="caps" style="margin-bottom:8px">Efeitos no meio do caminho (acontecem se o jogador acertar até aquela perfeição)</div>
        <div class="list-edit" data-list="porPerfeicao"></div>
        <button type="button" class="btn" data-add="porPerfeicao" style="margin:10px 0 18px">Adicionar efeito por perfeição</button>
        ${field('Efeito Perfeito', textarea('perfeita', h.perfeita, 'placeholder="O que acontece quando todas as perfeições saem"'))}
        ${field('Notas curtas (separadas por vírgula)', input('tagsTxt', (h.tags || []).join(', '), 'placeholder="Ignora Resistência a Físico, Acerta voadores"'))}

        <div class="subsect"><span>História</span></div>
        ${field('Descrição', textarea('descricao', h.descricao))}
        ${field('Origem', input('origem', h.origem, 'placeholder="Quem ensinou, de onde veio"'))}
      </form>
      <div class="subsect"><span>Prévia</span></div>
      <div class="field"><label>Base da Via para a prévia</label><input type="number" data-base value="${opts.base || 74}" data-skip></div>
      <div data-preview></div>`;

    const foot = `
      ${!novo ? '<button class="btn danger" data-del>Excluir</button>' : ''}
      <span style="flex:1"></span>
      <button class="btn plain" data-cancel>Cancelar</button>
      <button class="btn-primary" data-save>Gravar</button>`;

    LD.ui.openDrawer({
      eyebrow: novo ? 'Nova habilidade' : 'Editar habilidade', title: novo ? 'Forjar uma técnica' : h.nome, body, foot,
      onMount: (el) => {
        const form = el.querySelector('[data-form]');
        const pp = LD.ui.listEditor(el, {
          key: 'porPerfeicao', rows: h.porPerfeicao, empty: 'Nenhum efeito intermediário.',
          template: (r) => `<div style="display:grid;grid-template-columns:120px 1fr;gap:12px">
              <div class="field" style="margin:0"><label>Na perfeição nº</label>${LD.ui.lf('n', r.n || 1, 'type="number" min="1" max="6"')}</div>
              <div class="field" style="margin:0"><label>Efeito</label>${LD.ui.lf('texto', r.texto)}</div></div>`
        });
        const preview = () => {
          const d = LD.ui.readForm(form);
          const tmp = Object.assign({}, h, d);
          el.querySelector('[data-preview]').innerHTML = leitura(tmp, Number(el.querySelector('[data-base]').value) || 0);
        };
        form.addEventListener('input', preview);
        el.querySelector('[data-base]').addEventListener('input', preview);
        preview();
        el.querySelector('[data-cancel]').addEventListener('click', LD.ui.closeDrawer);
        const del = el.querySelector('[data-del]');
        if (del) del.addEventListener('click', () => {
          if (!LD.ui.confirmar(`Excluir "${h.nome}"?`)) return;
          LD.store.remove('habilidades', h.id).then(() => { LD.ui.closeDrawer(); LD.ui.toast('Habilidade excluída.'); });
        });
        el.querySelector('[data-save]').addEventListener('click', () => {
          const d = LD.ui.readForm(form);
          if (!String(d.nome || '').trim()) { LD.ui.toast('Dê um nome à habilidade.', 'erro'); return; }
          const out = Object.assign(h, d);
          out.custo = LD.clamp(Number(out.custo) || 2, 2, 6);
          out.perfeicoes = LD.clamp(Number(out.perfeicoes) || 2, 2, out.custo);
          if (out.suprema) out.perfeicoes = 6;
          out.custoSuprema = LD.clamp(Number(out.custoSuprema) || 7, 7, 9);
          out.tags = String(d.tagsTxt || '').split(',').map((s) => s.trim()).filter(Boolean);
          delete out.tagsTxt;
          out.porPerfeicao = pp.read().filter((p) => p.texto).map((p) => ({ n: LD.clamp(Number(p.n) || 1, 1, 6), texto: p.texto }));
          LD.store.save('habilidades', out).then((saved) => {
            LD.ui.closeDrawer();
            LD.ui.toast('Habilidade gravada.');
            if (opts.onSaved) opts.onSaved(saved);
          });
        });
      }
    });
  }

  function render(main) {
    const todas = LD.store.list('habilidades').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const vis = todas.filter((h) => {
      if (filtros.via !== 'todas' && h.via !== filtros.via) return false;
      if (filtros.perf !== 'todas' && String(R.perfeicoesDe(h)) !== filtros.perf) return false;
      if (filtros.q && !(h.nome + ' ' + (h.descricao || '') + ' ' + (h.origem || '')).toLowerCase().includes(filtros.q.toLowerCase())) return false;
      return true;
    });
    const podeCriar = LD.store.canEdit('habilidades', null);
    main.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Biblioteca · Habilidades</div>
          <h1>As técnicas da Lúmia</h1>
          <p class="lead">Cada habilidade tem de uma a seis perfeições. Cada perfeição custa uma Lúmia e é um símbolo do Compasso. Quanto mais perfeições, mais forte, e mais difícil de executar por inteiro.</p>
        </div>
        ${podeCriar ? '<button class="btn-primary" data-new>Nova habilidade</button>' : ''}
      </header>
      <div class="toolbar">
        <label class="search"><span class="muted">⌕</span><input data-q placeholder="Procurar uma técnica…" value="${esc(filtros.q)}"></label>
        <div class="chips">${[{ key: 'todas', nome: 'Todas' }].concat(LD.VIAS.map((v) => ({ key: v.key, nome: v.nome })))
          .map((v) => `<button class="chip ${filtros.via === v.key ? 'on' : ''}" data-via="${v.key}">${esc(v.nome)}</button>`).join('')}</div>
        <div class="chips">${['todas', '1', '2', '3', '4', '5', '6']
          .map((p) => `<button class="chip ${filtros.perf === p ? 'on' : ''}" data-perf="${p}">${p === 'todas' ? 'Qualquer' : p + ' ◆'}</button>`).join('')}</div>
      </div>
      ${vis.length ? `<div class="grid cards">${vis.map(card).join('')}</div>` : '<div class="empty">Nenhuma técnica com esse nome.</div>'}`;

    main.querySelector('[data-q]').addEventListener('input', LD.ui.debounce((e) => { filtros.q = e.target.value; render(main); main.querySelector('[data-q]').focus(); }, 250));
    main.querySelectorAll('[data-via]').forEach((b) => b.addEventListener('click', () => { filtros.via = b.dataset.via; render(main); }));
    main.querySelectorAll('[data-perf]').forEach((b) => b.addEventListener('click', () => { filtros.perf = b.dataset.perf; render(main); }));
    main.querySelectorAll('[data-open]').forEach((c) => c.addEventListener('click', () => abrir(c.dataset.open)));
    const nb = main.querySelector('[data-new]');
    if (nb) nb.addEventListener('click', () => abrir(null));
  }

  LD.views = LD.views || {};
  LD.views.habilidades = { titulo: 'Habilidades', numeral: 'II', render };
  LD.habilidades = { abrir, leitura, escala };
})();
