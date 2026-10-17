(function () {
  const LD = window.LD;
  const { esc, fmt, elemTag, viaTag, pips, lumiaBar, custoTag, field, input, textarea, select } = LD.ui;
  const R = LD.rules;

  const abaPorFicha = {};

  function lib() {
    return { pictos: LD.store.list('pictos'), armas: LD.store.list('armas') };
  }

  function novaFicha() {
    const s = R.novoStatus();
    return {
      nome: 'Novo Ascensor', jogador: '', conceito: '', lumiaTipo: 'Barreira', nivel: 1, xp: 0, retrato: '',
      status: s, pvAtual: null, lumiaAtual: 2,
      armaId: '', habilidades: [], habilidadesEquipadas: [],
      pictosPossuidos: [], pictosEquipados: [], dominio: {}, ecos: [], cristaisEco: 0,
      ampolas: { cura: { atual: 3, max: 3 }, lumia: { atual: 2, max: 2 }, retorno: { atual: 1, max: 1 } }, fragmentos: 0,
      inventario: [], notas: '', lacunas: '', historia: ''
    };
  }

  function normalizar(c) {
    const base = novaFicha();
    Object.keys(base).forEach((k) => { if (c[k] === undefined || c[k] === null) c[k] = base[k]; });
    c.status = Object.assign(R.novoStatus(), c.status || {});
    c.ampolas = Object.assign(base.ampolas, c.ampolas || {});
    return c;
  }

  /* ---------------- Lista ---------------- */
  function cardFicha(c) {
    const d = R.derivados(c, lib());
    const pv = c.pvAtual == null ? d.pvMax : c.pvAtual;
    const ini = (c.nome || '?').trim().charAt(0).toUpperCase();
    return `
      <article class="card" data-ficha="${esc(c.id)}" style="flex-direction:row;gap:18px;min-height:170px">
        <div class="portrait" style="width:96px;flex:none;aspect-ratio:3/4;outline-offset:3px">
          ${c.retrato ? `<img src="${esc(c.retrato)}" alt="">` : `<span class="initial" style="font-size:54px">${esc(ini)}</span>`}
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:7px;min-width:0">
          <div class="card-meta"><span class="tag ice">Nível ${esc(d.nivel)}</span><span class="tag">${esc(c.lumiaTipo || '')}</span></div>
          <div class="card-title">${esc(c.nome)}</div>
          <div class="muted" style="font-size:13px">${esc(c.conceito || '')}</div>
          <div class="meter" style="margin-top:auto"><span class="caps">PV</span><div class="bar"><i style="width:${Math.max(0, Math.min(100, (pv / d.pvMax) * 100))}%"></i></div><span class="num">${fmt(pv)}</span></div>
          <div class="meter"><span class="caps">Lúmia</span>${lumiaBar(c.lumiaAtual || 0, d.lumiaMax)}</div>
          ${c.ownerName ? `<div class="caps" style="font-size:10px">de ${esc(c.ownerName)}</div>` : ''}
        </div>
      </article>`;
  }

  function renderLista(main) {
    const meu = LD.store.state.user ? LD.store.state.user.uid : null;
    const todas = LD.store.list('personagens').slice().sort((a, b) => {
      const ma = a.ownerId === meu ? 0 : 1, mb = b.ownerId === meu ? 0 : 1;
      return ma - mb || a.nome.localeCompare(b.nome);
    });
    const pode = LD.store.canEdit('personagens', null);
    main.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Expedição Delta · Fichas</div>
          <h1>Os que sobem</h1>
          <p class="lead">Cada ficha calcula sozinha o PV, as Bases de cada Via, a Velocidade, a Redução, o Crítico e a Lúmia. O jogador escolhe onde pôr os pontos, as habilidades, a arma e os pictos.</p>
        </div>
        ${pode ? '<button class="btn-primary" data-new>Nova ficha</button>' : ''}
      </header>
      ${todas.length ? `<div class="grid cards" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">${todas.map(cardFicha).join('')}</div>` : '<div class="empty">Ninguém se voluntariou ainda.</div>'}`;
    main.querySelectorAll('[data-ficha]').forEach((c) => c.addEventListener('click', () => { location.hash = '#/ficha/' + c.dataset.ficha; }));
    const nb = main.querySelector('[data-new]');
    if (nb) nb.addEventListener('click', () => {
      LD.store.save('personagens', novaFicha()).then((c) => { location.hash = '#/ficha/' + c.id; });
    });
  }

  /* ---------------- Ficha ---------------- */
  function renderFicha(main, id) {
    const raw = LD.store.get('personagens', id);
    if (!raw) { main.innerHTML = '<div class="empty">Ficha não encontrada.</div>'; return; }
    const c = normalizar(JSON.parse(JSON.stringify(raw)));
    const pode = LD.store.canEdit('personagens', raw);
    const d = R.derivados(c, lib());
    if (c.pvAtual == null) c.pvAtual = d.pvMax;
    const aba = abaPorFicha[id] || 'status';

    const salvar = () => LD.store.save('personagens', c);
    const salvarDepois = LD.ui.debounce(salvar, 400);
    const redesenhar = () => { salvar(); renderFicha(main, id); };

    const ini = (c.nome || '?').trim().charAt(0).toUpperCase();
    main.innerHTML = `
      <a href="#/fichas" class="btn plain" style="margin-bottom:22px">← Fichas</a>
      <section class="char-hero">
        <div class="portrait">
          ${c.retrato ? `<img src="${esc(c.retrato)}" alt="">` : `<span class="initial">${esc(ini)}</span>`}
          <div class="lvl"><span class="caps">Nível</span><b>${esc(d.nivel)}</b></div>
        </div>
        <div>
          <div class="eyebrow">${esc(c.lumiaTipo || 'Ascensor')}${c.jogador ? ' · ' + esc(c.jogador) : ''}</div>
          <h1 style="margin:10px 0 6px">${esc(c.nome)}</h1>
          <p class="serif italic paper-2" style="font-size:20px;margin:0 0 20px">${esc(c.conceito || '')}</p>
          ${pode ? '<button class="btn" data-ident style="margin-bottom:20px">Identidade e nível</button>' : ''}
          <div class="vitals">
            <div class="vital">
              <div class="caps">PV</div>
              <div class="v">${fmt(c.pvAtual)}<small> / ${fmt(d.pvMax)}</small></div>
              <div class="bar" style="margin:8px 0"><i style="width:${Math.max(0, Math.min(100, (c.pvAtual / d.pvMax) * 100))}%"></i></div>
              ${pode ? `<div class="vital-ctrl"><input type="number" data-pvd placeholder="valor"><button class="btn plain" data-pv="-" title="Aplica a Redução da ficha">Dano</button><button class="btn plain" data-pv="agu" title="Aguentar: Redução em dobro (máx. 60%)">Aguentar</button><button class="btn plain" data-pv="dir" title="Ignora a Redução (queda, veneno, perda direta)">Direto</button><button class="btn plain" data-pv="+">Cura</button><button class="btn plain" data-pv="max">Cheio</button></div>` : ''}
            </div>
            <div class="vital">
              <div class="caps">Lúmia</div>
              <div class="v">${esc(c.lumiaAtual)}<small> / ${d.lumiaMax}</small></div>
              <div style="margin-top:10px">${lumiaBar(c.lumiaAtual, d.lumiaMax, pode)}</div>
              ${pode ? `<div class="vital-ctrl"><button class="btn plain" data-lu="-1">− 1</button><button class="btn plain" data-lu="1">+ 1</button><button class="btn plain" data-lu="max">Cheia</button></div>` : ''}
            </div>
            <div class="vital"><div class="caps">Velocidade</div><div class="v">${d.velocidade}</div><div class="muted" style="font-size:12px">Compasso: ${LD.num(c.status && c.status.agi, 1) + 5} s</div></div>
            <div class="vital"><div class="caps">Redução</div><div class="v">${d.reducao}<small>%</small></div><div class="muted" style="font-size:12px">Aguentar: ${Math.min(60, d.reducao * 2)}%</div></div>
            <div class="vital"><div class="caps">Crítico</div><div class="v">${d.critico}<small>%</small></div><div class="muted" style="font-size:12px">d100 ≤ ${d.critico}</div></div>
            <div class="vital"><div class="caps">Instinto</div><div class="v">${d.instinto}</div><div class="muted" style="font-size:12px">+${d.batidas} batida${d.batidas === 1 ? '' : 's'} na Janela</div></div>
          </div>
        </div>
      </section>

      ${blocoXp(c, pode)}
      <nav class="tabs">${[['status', 'Status'], ['habilidades', 'Habilidades'], ['equipamento', 'Arma e Pictos'], ['inventario', 'Inventário'], ['diario', 'Diário']]
        .map(([k, n]) => `<button class="${aba === k ? 'on' : ''}" data-aba="${k}">${n}</button>`).join('')}</nav>
      <section data-tab></section>`;

    main.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { abaPorFicha[id] = b.dataset.aba; renderFicha(main, id); }));
    const ident = main.querySelector('[data-ident]');
    if (ident) ident.addEventListener('click', () => identidade(c, () => renderFicha(main, id)));

    main.querySelectorAll('[data-xp]').forEach((b) => b.addEventListener('click', () => {
      const v = Math.floor(Number(main.querySelector('[data-xpd]').value) || 0);
      if (!v) return;
      const antes = c.nivel;
      c.xp = Math.max(0, R.xpDaFicha(c) + (b.dataset.xp === '+' ? v : -v));
      c.nivel = Math.max(antes, R.nivelPorXp(c.xp));
      if (c.nivel > antes) LD.ui.toast(`${c.nome} subiu para o nível ${c.nivel}: +${3 * (c.nivel - antes)} pontos de Status para distribuir.`);
      redesenhar();
    }));
    main.querySelectorAll('[data-pv]').forEach((b) => b.addEventListener('click', () => {
      const v = Number(main.querySelector('[data-pvd]').value) || 0;
      if (b.dataset.pv === 'max') c.pvAtual = d.pvMax;
      else {
        const k = b.dataset.pv;
        let delta = v;
        if (k === '-') delta = -R.danoRecebido(v, d.reducao, false);
        else if (k === 'agu') delta = -R.danoRecebido(v, d.reducao, true);
        else if (k === 'dir') delta = -v;
        c.pvAtual = LD.clamp(c.pvAtual + delta, 0, d.pvMax);
        if (k === '-' || k === 'agu') LD.ui.toast(`${v} de dano, Redução ${k === 'agu' ? Math.min(60, d.reducao * 2) : d.reducao}%: perdeu ${-delta} PV.`);
      }
      redesenhar();
    }));
    main.querySelectorAll('[data-lu]').forEach((b) => b.addEventListener('click', () => {
      const atual = Number(c.lumiaAtual) || 0;
      c.lumiaAtual = b.dataset.lu === 'max' ? d.lumiaMax : LD.clamp(atual + Number(b.dataset.lu), 0, d.lumiaMax);
      redesenhar();
    }));
    main.querySelectorAll('[data-lumia]').forEach((el) => el.addEventListener('click', () => {
      const v = Number(el.dataset.lumia);
      c.lumiaAtual = Number(c.lumiaAtual) === v ? v - 1 : v;
      redesenhar();
    }));

    const tab = main.querySelector('[data-tab]');
    ({ status: abaStatus, habilidades: abaHabilidades, equipamento: abaEquipamento, inventario: abaInventario, diario: abaDiario })[aba](tab, c, d, pode, { salvar, salvarDepois, redesenhar });
  }

  function blocoXp(c, pode) {
    const p = R.progressoXp(c);
    const mestre = LD.store.isMaster();
    return `<section class="panel" style="margin:0 0 26px;padding:18px 22px">
      <div class="panel-title" style="margin-bottom:10px"><h3>Experiência</h3><span class="caps">nível ${p.nivel}${p.nivel >= 99 ? '' : ' · faltam ' + fmt(p.falta) + ' para o ' + (p.nivel + 1)}</span></div>
      <div class="num" style="font-size:22px">${fmt(p.xp)}<small class="muted"> / ${fmt(p.proximo)} XP</small></div>
      <div class="bar ice" style="margin:8px 0"><i style="width:${Math.round(p.fracao * 100)}%"></i></div>
      ${mestre ? `<div class="vital-ctrl"><input type="number" data-xpd placeholder="XP"><button class="btn plain" data-xp="+">Dar XP</button><button class="btn plain" data-xp="-">Tirar XP</button></div>` : ''}
    </section>`;
  }

  function identidade(c, done) {
    LD.ui.openDrawer({
      eyebrow: 'Ficha', title: 'Identidade e nível',
      body: `<form data-form>
        ${field('Nome', input('nome', c.nome, 'class="big"'))}
        <div class="row">${field('Jogador', input('jogador', c.jogador))}${field('Nível', input('nivel', c.nivel, 'type="number" min="1" max="99"'), 'Cada nível depois do primeiro dá 3 pontos de Status.')}</div>
        ${field('Conceito', input('conceito', c.conceito, 'placeholder="Ex.: ferreira das estufas que perdeu a irmã em 1886"'))}
        ${field('Lúmia de...', select('lumiaTipo', LD.LUMIA_TIPOS.map((t) => ({ key: t, nome: t })), c.lumiaTipo), 'O jeito como o personagem manipula a Lúmia. Guia as habilidades que vai aprender.')}
        ${field('Retrato (endereço de imagem)', input('retrato', c.retrato, 'placeholder="https://…"'))}
      </form>`,
      foot: `<button class="btn danger" data-del>Excluir ficha</button><span style="flex:1"></span><button class="btn plain" data-cancel>Cancelar</button><button class="btn-primary" data-save>Gravar</button>`,
      onMount: (el) => {
        el.querySelector('[data-cancel]').addEventListener('click', LD.ui.closeDrawer);
        el.querySelector('[data-save]').addEventListener('click', () => {
          const nivelAntes = c.nivel;
          Object.assign(c, LD.ui.readForm(el.querySelector('[data-form]')));
          c.nivel = LD.clamp(Number(c.nivel) || 1, 1, 99);
          if (c.nivel !== nivelAntes) c.xp = R.xpParaNivel(c.nivel);
          LD.store.save('personagens', c).then(() => { LD.ui.closeDrawer(); done(); });
        });
        el.querySelector('[data-del]').addEventListener('click', () => {
          if (!LD.ui.confirmar(`Excluir a ficha de ${c.nome}? Não dá para desfazer.`)) return;
          LD.store.remove('personagens', c.id).then(() => { LD.ui.closeDrawer(); location.hash = '#/fichas'; });
        });
      }
    });
  }

  /* ---------------- Aba: Status ---------------- */
  function abaStatus(tab, c, d, pode, io) {
    const livres = d.pontosTotais - d.pontosGastos;
    const avisos = R.validarStatus(c);
    const linha = (st) => `
      <div class="attr">
        <i class="dia"></i>
        <div><div class="name">${esc(st.nome)}<small>${st.sigla}</small></div><div class="desc">${esc(st.desc)}</div></div>
        <div class="val">${esc(c.status[st.key])}</div>
        ${pode ? `<div class="ctrl"><button class="icon-btn" data-st="${st.key}" data-dv="-1" ${c.status[st.key] <= 1 ? 'disabled' : ''}><span>−</span></button><button class="icon-btn" data-st="${st.key}" data-dv="1" ${livres <= 0 || c.status[st.key] >= 99 || (d.nivel === 1 && c.status[st.key] >= 6) ? 'disabled' : ''}><span>+</span></button></div>` : '<div></div>'}
      </div>`;
    tab.innerHTML = `
      <div class="grid two" style="gap:34px;align-items:start">
        <div>
          <div class="panel-title"><h3>Status de base</h3></div>
          <div class="attr-list">${LD.STATUS.filter((s) => s.grupo === 'base').map(linha).join('')}</div>
          <div class="panel-title" style="margin-top:30px"><h3>Vias</h3><span class="caps">no lugar da Força</span></div>
          <div class="attr-list">${LD.VIAS.map(linha).join('')}</div>
        </div>
        <div>
          <div class="panel framed" style="margin-bottom:20px">
            <div class="caps">Pontos livres</div>
            <div class="points"><b>${livres}</b><span class="muted">de ${d.pontosTotais} no nível ${d.nivel}</span></div>
            <p class="muted" style="font-size:13px;margin:10px 0 0">10 na criação, nenhum Status acima de 6 no nível 1. Depois, 3 pontos por nível, até 99. Clique com Shift para mudar de 5 em 5.</p>
            ${avisos.length ? `<div style="margin-top:12px">${avisos.map((a) => `<div class="warn" style="font-size:13px">◆ ${esc(a)}</div>`).join('')}</div>` : ''}
            ${pode ? '<button class="btn danger" data-reset style="margin-top:14px">Redistribuir tudo</button>' : ''}
          </div>
          <div class="caps" style="margin-bottom:8px">Base de cada Via (o dano que as habilidades multiplicam)</div>
          <div class="base-grid">${LD.VIAS.map((v) => `<div><div class="caps">${v.sigla}</div><div class="v">${d.bases[v.key]}</div><div class="muted" style="font-size:11px">${v.nome}</div></div>`).join('')}</div>
          <table class="tbl" style="margin-top:22px">
            <tr><th>Valor</th><th class="r">Atual</th><th>Fórmula</th></tr>
            <tr><td>PV máximo</td><td class="r num">${fmt(d.pvMax)}</td><td class="muted">150 + 25 × Nível + 20 × VIG</td></tr>
            <tr><td>Velocidade</td><td class="r num">${d.velocidade}</td><td class="muted">20 + AGI + Nível ÷ 2</td></tr>
            <tr><td>Redução</td><td class="r num">${d.reducao}%</td><td class="muted">DEF ÷ 2 (máx. 50%)</td></tr>
            <tr><td>Crítico</td><td class="r num">${d.critico}%</td><td class="muted">5 + SOR ÷ 2 (máx. 50%)</td></tr>
            <tr><td>Lúmia máxima</td><td class="r num">${d.lumiaMax}</td><td class="muted">6, +1 nos níveis 10, 20, 30, 40</td></tr>
            <tr><td>Instinto</td><td class="r num">${d.instinto}</td><td class="muted">1 + AGI ÷ 25</td></tr>
            <tr><td>Ampola de Cura</td><td class="r num">${d.curaAmpola}%</td><td class="muted">50%, +10% a cada 25 de ENG</td></tr>
            <tr><td>Pontos de Eco</td><td class="r num">${d.pontosEco}</td><td class="muted">2 + Nível ÷ 2 + Cristais de Eco</td></tr>
          </table>
          <div class="caps" style="margin:22px 0 8px">Bônus nos testes (d20 + Status ÷ 5)</div>
          <div class="chips">${LD.STATUS.map((s) => `<span class="tag box">${s.sigla} +${d.bonusTeste(s.key)}</span>`).join('')}</div>
        </div>
      </div>`;
    tab.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', (e) => {
      const k = b.dataset.st;
      let dv = Number(b.dataset.dv) * (e.shiftKey ? 5 : 1);
      const livresAgora = d.pontosTotais - d.pontosGastos;
      if (dv > 0) dv = Math.min(dv, livresAgora, (d.nivel === 1 ? 6 : 99) - c.status[k]);
      c.status[k] = LD.clamp(c.status[k] + dv, 1, 99);
      const nd = R.derivados(c, lib());
      c.pvAtual = Math.min(c.pvAtual, nd.pvMax);
      c.lumiaAtual = Math.min(c.lumiaAtual, nd.lumiaMax);
      io.redesenhar();
    }));
    const rs = tab.querySelector('[data-reset]');
    if (rs) rs.addEventListener('click', () => { if (LD.ui.confirmar('Voltar todos os Status para 1?')) { c.status = R.novoStatus(); io.redesenhar(); } });
  }

  /* ---------------- Aba: Habilidades ---------------- */
  function abaHabilidades(tab, c, d, pode, io) {
    const todas = LD.store.list('habilidades');
    const minhas = c.habilidades.map((hid) => todas.find((h) => h.id === hid)).filter(Boolean);
    const disponiveis = todas.filter((h) => !c.habilidades.includes(h.id)).sort((a, b) => a.nome.localeCompare(b.nome));
    const linha = (h) => {
      const n = R.perfeicoesDe(h);
      const base = d.bases[h.via] || 0;
      const eq = c.habilidadesEquipadas.includes(h.id);
      const min = Math.round(base * R.multiplicador(h, 0));
      const max = Math.round(base * R.multiplicador(h, n));
      const bloqueada = R.nivelMinimo(h) > d.nivel;
      return `
        <div class="attr" style="grid-template-columns:30px 1fr auto auto">
          ${pode ? `<button class="icon-btn" data-eq="${esc(h.id)}" title="${eq ? 'Desequipar' : 'Equipar'}" style="${eq ? 'background:var(--accent);border-color:var(--accent)' : ''}"><span>${eq ? '◆' : ''}</span></button>` : `<i class="dia" style="${eq ? 'background:var(--accent)' : ''}"></i>`}
          <div>
            <div class="name" style="cursor:pointer" data-ver="${esc(h.id)}">${esc(h.nome)} ${bloqueada ? `<small class="bad">nível ${R.nivelMinimo(h)}</small>` : ''}</div>
            <div class="card-meta">${viaTag(h.via)} ${elemTag(h.elemento)} ${pips(n, n)}</div>
          </div>
          <div style="text-align:right">
            <div class="num" style="font-size:22px">${fmt(min)} <span class="muted">→</span> <span style="color:var(--ice-2)">${fmt(max)}</span></div>
            <div class="caps" style="font-size:9.5px">${h.tipo === 'cura' ? 'cura' : h.tipo === 'escudo' ? 'escudo' : 'dano'} · Base ${base}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">${custoTag(h)} ${pode ? `<button class="btn danger plain" data-rm="${esc(h.id)}">×</button>` : ''}</div>
        </div>`;
    };
    tab.innerHTML = `
      <div class="toolbar" style="justify-content:space-between">
        <div style="display:flex;gap:28px">
          <div><div class="caps">Aprendidas</div><div class="points"><b>${minhas.length}</b><span class="muted">de ${d.aprendizados} aprendizados</span></div></div>
          <div><div class="caps">Equipadas</div><div class="points"><b>${c.habilidadesEquipadas.length}</b><span class="muted">de ${LD.MAX_HABILIDADES_EQUIPADAS}</span></div></div>
        </div>
        ${pode ? `<div style="display:flex;gap:16px;align-items:end;flex-wrap:wrap">
          <div class="field" style="margin:0;min-width:240px"><label>Da biblioteca</label><select data-addsel><option value="">Escolher…</option>${disponiveis.map((h) => `<option value="${esc(h.id)}">${esc(h.nome)} · ${R.perfeicoesDe(h)}◆</option>`).join('')}</select></div>
          <button class="btn" data-add>Aprender</button>
          <button class="btn-primary" data-criar>Criar habilidade</button></div>` : ''}
      </div>
      <p class="muted" style="font-size:13px;margin-top:-10px">A faixa mostra o dano (ou cura) do Compasso todo errado até a habilidade Perfeita, com a Base atual desta ficha. Aprendizados: 3 na criação e 1 por nível, que pode virar uma habilidade nova ou uma perfeição a mais.</p>
      <div class="attr-list">${minhas.length ? minhas.map(linha).join('') : '<div class="empty">Nenhuma habilidade aprendida.</div>'}</div>`;

    tab.querySelectorAll('[data-ver]').forEach((el) => el.addEventListener('click', () => {
      const h = LD.store.get('habilidades', el.dataset.ver);
      LD.ui.openDrawer({ eyebrow: 'Habilidade de ' + c.nome, title: h.nome, body: LD.habilidades.leitura(h, d.bases[h.via]) + (LD.store.canEdit('habilidades', h) ? '<div style="margin-top:22px"><button class="btn" data-ed>Editar na biblioteca</button></div>' : ''),
        onMount: (el2) => { const ed = el2.querySelector('[data-ed]'); if (ed) ed.addEventListener('click', () => { LD.ui.closeDrawer(); setTimeout(() => LD.habilidades.abrir(h.id, { base: d.bases[h.via] }), 330); }); } });
    }));
    if (!pode) return;
    tab.querySelectorAll('[data-eq]').forEach((b) => b.addEventListener('click', () => {
      const hid = b.dataset.eq;
      if (c.habilidadesEquipadas.includes(hid)) c.habilidadesEquipadas = c.habilidadesEquipadas.filter((x) => x !== hid);
      else if (c.habilidadesEquipadas.length >= LD.MAX_HABILIDADES_EQUIPADAS) { LD.ui.toast(`No máximo ${LD.MAX_HABILIDADES_EQUIPADAS} equipadas.`, 'erro'); return; }
      else c.habilidadesEquipadas.push(hid);
      io.redesenhar();
    }));
    tab.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
      c.habilidades = c.habilidades.filter((x) => x !== b.dataset.rm);
      c.habilidadesEquipadas = c.habilidadesEquipadas.filter((x) => x !== b.dataset.rm);
      io.redesenhar();
    }));
    tab.querySelector('[data-add]').addEventListener('click', () => {
      const v = tab.querySelector('[data-addsel]').value;
      if (!v) return;
      c.habilidades.push(v);
      io.redesenhar();
    });
    tab.querySelector('[data-criar]').addEventListener('click', () => {
      LD.habilidades.abrir(null, {
        base: d.bases.gol,
        onSaved: (h) => {
          const atual = normalizar(JSON.parse(JSON.stringify(LD.store.get('personagens', c.id) || c)));
          if (!atual.habilidades.includes(h.id)) atual.habilidades.push(h.id);
          LD.store.save('personagens', atual);
        }
      });
    });
  }

  /* ---------------- Aba: Arma e Pictos ---------------- */
  function abaEquipamento(tab, c, d, pode, io) {
    const armas = LD.store.list('armas').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const pictos = LD.store.list('pictos');
    const arma = d.arma;
    const possuidos = c.pictosPossuidos.map((pid) => pictos.find((p) => p.id === pid)).filter(Boolean);
    const ecoUsado = c.ecos.reduce((s, pid) => { const p = pictos.find((x) => x.id === pid); return s + (p ? Number(p.custoEco) || 0 : 0); }, 0);
    const naoPossuidos = pictos.filter((p) => !c.pictosPossuidos.includes(p.id)).sort((a, b) => a.nome.localeCompare(b.nome));

    const slots = [0, 1, 2].map((i) => {
      const p = pictos.find((x) => x.id === c.pictosEquipados[i]);
      return p
        ? `<div class="slot filled"><span class="caps">Picto ${i + 1}</span><div class="slot-title">${esc(p.nome)}</div><div>${LD.biblioteca.bonusTexto(p.bonus)}</div><div class="muted" style="font-size:13px">${esc(p.efeito)}</div></div>`
        : `<div class="slot"><span class="caps">Picto ${i + 1}</span><div class="muted italic serif" style="font-size:18px">Vazio</div></div>`;
    }).join('');

    const linhaPicto = (p) => {
      const dom = Number(c.dominio[p.id]) || 0;
      const dominado = dom >= LD.DOMINIO_COMBATES;
      const eq = c.pictosEquipados.includes(p.id);
      const eco = c.ecos.includes(p.id);
      return `
        <div class="attr" style="grid-template-columns:1fr auto auto auto">
          <div><div class="name">${esc(p.nome)} ${dominado ? '<small class="ok">dominado</small>' : ''}</div><div class="desc">${esc(p.efeito)}</div><div style="margin-top:4px">${LD.biblioteca.bonusTexto(p.bonus)}</div></div>
          <div style="text-align:center"><div class="caps">Domínio</div><div class="pips">${[1, 2, 3, 4].map((k) => `<i class="pip ${dom >= k ? 'on' : ''}"></i>`).join('')}</div>${pode && !dominado ? `<button class="btn plain" data-dom="${esc(p.id)}" style="font-size:10px">+1 combate</button>` : ''}</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${pode ? `<button class="btn ${eq ? '' : 'plain'}" data-pe="${esc(p.id)}">${eq ? 'Equipado' : 'Equipar'}</button>` : eq ? '<span class="tag accent">Equipado</span>' : ''}
            ${pode && dominado && !eq ? `<button class="btn ${eco ? '' : 'plain'}" data-eco="${esc(p.id)}">${eco ? 'Eco ativo' : 'Usar como Eco'} · ${esc(p.custoEco)}</button>` : eco ? '<span class="tag lumia">Eco</span>' : ''}
          </div>
          ${pode ? `<button class="btn danger plain" data-prm="${esc(p.id)}">×</button>` : '<span></span>'}
        </div>`;
    };

    tab.innerHTML = `
      <div class="grid two" style="gap:34px;align-items:start">
        <div>
          <div class="panel-title"><h3>Arma</h3></div>
          ${pode ? `<div class="field"><label>Empunhando</label><select data-arma><option value="">Desarmado</option>${armas.map((a) => `<option value="${esc(a.id)}" ${a.id === c.armaId ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></div>` : ''}
          ${arma ? `<div class="panel framed">
            <div class="card-meta">${viaTag(arma.via)} ${elemTag(arma.elemento)}</div>
            <h3 style="margin:8px 0">${esc(arma.nome)}</h3>
            <p class="paper-2" style="margin:0 0 12px">${esc(arma.descricao || '')}</p>
            <table class="tbl">
              <tr><td class="caps">Ataque Comum</td><td class="r num" style="font-size:22px">${fmt(d.bases[arma.via])}</td></tr>
              <tr><td class="caps">Poder</td><td class="r">+${esc(arma.poder || 0)} na Base de ${esc((LD.byKey(LD.VIAS, arma.via) || {}).nome)}</td></tr>
              ${(arma.passivas || []).map((p) => `<tr class="${d.nivel >= p.nivel ? 'hi' : ''}"><td class="caps">Nível ${esc(p.nivel)}</td><td>${esc(p.texto)} ${d.nivel >= p.nivel ? '' : '<span class="muted">(ainda não)</span>'}</td></tr>`).join('')}
            </table></div>` : '<div class="empty" style="padding:26px">Desarmado. O Ataque Comum usa a Base de Golpe.</div>'}

          <div class="panel-title" style="margin-top:30px"><h3>Pictos equipados</h3><span class="caps">${c.pictosEquipados.length} / ${LD.MAX_PICTOS_EQUIPADOS}</span></div>
          <div class="slot-row">${slots}</div>
        </div>
        <div>
          <div class="panel-title"><h3>Ecos</h3><span class="caps">pontos ${ecoUsado} / ${d.pontosEco}</span></div>
          <div class="bar ice" style="margin-bottom:10px"><i style="width:${Math.min(100, (ecoUsado / Math.max(1, d.pontosEco)) * 100)}%"></i></div>
          ${pode ? `<div class="field" style="max-width:220px"><label>Cristais de Eco</label><input type="number" min="0" data-cristais value="${esc(c.cristaisEco || 0)}"></div>` : ''}
          <p class="muted" style="font-size:13px">Um picto usado em ${LD.DOMINIO_COMBATES} combates fica dominado. Dominado, o efeito dele pode ser levado como Eco, sem o bônus de Status, pagando o custo em Pontos de Eco.</p>
        </div>
      </div>

      <div class="panel-title" style="margin-top:34px"><h3>Pictos da ficha</h3>
        ${pode ? `<div style="display:flex;gap:14px;align-items:end"><div class="field" style="margin:0;min-width:240px"><label>Adicionar da biblioteca</label><select data-psel><option value="">Escolher…</option>${naoPossuidos.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}</select></div><button class="btn" data-padd>Adicionar</button></div>` : ''}
      </div>
      <div class="attr-list">${possuidos.length ? possuidos.map(linhaPicto).join('') : '<div class="empty">Nenhum picto ainda.</div>'}</div>`;

    if (!pode) return;
    tab.querySelector('[data-arma]').addEventListener('change', (e) => { c.armaId = e.target.value; io.redesenhar(); });
    tab.querySelector('[data-cristais]').addEventListener('change', (e) => { c.cristaisEco = Math.max(0, Number(e.target.value) || 0); io.redesenhar(); });
    tab.querySelector('[data-padd]').addEventListener('click', () => {
      const v = tab.querySelector('[data-psel]').value;
      if (v) { c.pictosPossuidos.push(v); io.redesenhar(); }
    });
    tab.querySelectorAll('[data-prm]').forEach((b) => b.addEventListener('click', () => {
      const pid = b.dataset.prm;
      c.pictosPossuidos = c.pictosPossuidos.filter((x) => x !== pid);
      c.pictosEquipados = c.pictosEquipados.filter((x) => x !== pid);
      c.ecos = c.ecos.filter((x) => x !== pid);
      io.redesenhar();
    }));
    tab.querySelectorAll('[data-dom]').forEach((b) => b.addEventListener('click', () => {
      const pid = b.dataset.dom;
      c.dominio[pid] = Math.min(LD.DOMINIO_COMBATES, (Number(c.dominio[pid]) || 0) + 1);
      io.redesenhar();
    }));
    tab.querySelectorAll('[data-pe]').forEach((b) => b.addEventListener('click', () => {
      const pid = b.dataset.pe;
      if (c.pictosEquipados.includes(pid)) c.pictosEquipados = c.pictosEquipados.filter((x) => x !== pid);
      else {
        if (c.pictosEquipados.length >= LD.MAX_PICTOS_EQUIPADOS) { LD.ui.toast(`No máximo ${LD.MAX_PICTOS_EQUIPADOS} pictos equipados.`, 'erro'); return; }
        c.pictosEquipados.push(pid);
        c.ecos = c.ecos.filter((x) => x !== pid);
      }
      io.redesenhar();
    }));
    tab.querySelectorAll('[data-eco]').forEach((b) => b.addEventListener('click', () => {
      const pid = b.dataset.eco;
      if (c.ecos.includes(pid)) { c.ecos = c.ecos.filter((x) => x !== pid); io.redesenhar(); return; }
      const p = pictos.find((x) => x.id === pid);
      if (ecoUsado + (Number(p.custoEco) || 0) > d.pontosEco) { LD.ui.toast('Pontos de Eco insuficientes.', 'erro'); return; }
      c.ecos.push(pid);
      io.redesenhar();
    }));
  }

  /* ---------------- Aba: Inventário ---------------- */
  function abaInventario(tab, c, d, pode, io) {
    const itens = LD.store.list('itens').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const AMP = [['cura', 'Ampola de Cura', `Recupera ${d.curaAmpola}% do PV`], ['lumia', 'Ampola de Lúmia', '+3 Lúmia'], ['retorno', 'Ampola de Retorno', 'Levanta um Caído com 50% do PV']];
    tab.innerHTML = `
      <div class="grid two" style="gap:34px;align-items:start">
        <div>
          <div class="panel-title"><h3>Ampolas</h3><span class="caps">enchem nas bandeiras da Alpha</span></div>
          ${AMP.map(([k, n, e]) => {
            const a = c.ampolas[k];
            return `<div class="attr" style="grid-template-columns:1fr auto auto">
              <div><div class="name">${n}</div><div class="desc">${e}</div></div>
              <div class="pips">${Array.from({ length: a.max }, (_, i) => `<i class="pip ${i < a.atual ? 'on' : ''}"></i>`).join('')}</div>
              ${pode ? `<div class="ctrl" style="display:flex;gap:8px;align-items:center"><button class="icon-btn" data-amp="${k}" data-dv="-1"><span>−</span></button><span class="num" style="font-size:20px;min-width:44px;text-align:center">${a.atual}/${a.max}</span><button class="icon-btn" data-amp="${k}" data-dv="1"><span>+</span></button><button class="btn plain" data-ampmax="${k}" title="Carga máxima">máx ${a.max}</button></div>` : `<span class="num">${a.atual}/${a.max}</span>`}
            </div>`;
          }).join('')}
          ${pode ? '<button class="btn" data-encher style="margin-top:14px">Descansar numa bandeira (encher tudo)</button>' : ''}
          <div class="attr" style="grid-template-columns:1fr auto">
            <div><div class="name">Fragmentos de Ampola</div><div class="desc">Três fragmentos aumentam em 1 a carga máxima de uma Ampola.</div></div>
            ${pode ? `<input type="number" min="0" data-frag value="${esc(c.fragmentos || 0)}" style="width:80px;background:none;border:0;border-bottom:1px solid var(--line-2);color:var(--paper);font-family:var(--display);font-size:24px;text-align:center">` : `<span class="num">${esc(c.fragmentos || 0)}</span>`}
          </div>
        </div>
        <div>
          <div class="panel-title"><h3>Mochila</h3></div>
          ${pode ? `<div style="display:flex;gap:14px;align-items:end;flex-wrap:wrap;margin-bottom:12px">
            <div class="field" style="margin:0;min-width:200px"><label>Da biblioteca</label><select data-isel><option value="">Escolher…</option>${itens.map((i) => `<option value="${esc(i.id)}">${esc(i.nome)}</option>`).join('')}</select></div>
            <div class="field" style="margin:0;min-width:160px"><label>Ou escrever</label><input data-ilivre placeholder="Item livre"></div>
            <button class="btn" data-iadd>Guardar</button></div>` : ''}
          ${c.inventario.length ? c.inventario.map((it, i) => {
            const ref = it.itemId ? itens.find((x) => x.id === it.itemId) : null;
            return `<div class="inv-row">
              <div><div class="serif" style="font-size:19px;${ref ? 'cursor:pointer' : ''}" ${ref ? `data-iver="${esc(ref.id)}"` : ''}>${esc(ref ? ref.nome : it.nome)}</div>${ref ? `<div class="muted" style="font-size:12.5px">${esc(ref.efeito)}</div>` : ''}</div>
              ${pode ? `<div style="display:flex;gap:8px;align-items:center"><button class="icon-btn" data-iq="${i}" data-dv="-1"><span>−</span></button><span class="num" style="font-size:20px;min-width:30px;text-align:center">${esc(it.qtd)}</span><button class="icon-btn" data-iq="${i}" data-dv="1"><span>+</span></button></div><button class="btn danger plain" data-irm="${i}">×</button>` : `<span class="num">×${esc(it.qtd)}</span><span></span>`}
            </div>`;
          }).join('') : '<div class="empty">Mochila vazia.</div>'}
        </div>
      </div>`;

    tab.querySelectorAll('[data-iver]').forEach((el) => el.addEventListener('click', () => LD.biblioteca.abrirItem(el.dataset.iver)));
    if (!pode) return;
    tab.querySelectorAll('[data-amp]').forEach((b) => b.addEventListener('click', () => {
      const a = c.ampolas[b.dataset.amp];
      a.atual = LD.clamp(a.atual + Number(b.dataset.dv), 0, a.max);
      io.redesenhar();
    }));
    tab.querySelectorAll('[data-ampmax]').forEach((b) => b.addEventListener('click', () => {
      const a = c.ampolas[b.dataset.ampmax];
      const v = Number(window.prompt('Carga máxima desta Ampola:', a.max));
      if (Number.isFinite(v) && v >= 0) { a.max = Math.min(20, v); a.atual = Math.min(a.atual, a.max); io.redesenhar(); }
    }));
    tab.querySelector('[data-encher]').addEventListener('click', () => {
      Object.values(c.ampolas).forEach((a) => (a.atual = a.max));
      c.pvAtual = d.pvMax;
      c.lumiaAtual = d.lumiaMax;
      LD.ui.toast('Descanso completo: PV, Lúmia e Ampolas cheios.');
      io.redesenhar();
    });
    tab.querySelector('[data-frag]').addEventListener('change', (e) => { c.fragmentos = Math.max(0, Number(e.target.value) || 0); io.redesenhar(); });
    tab.querySelector('[data-iadd]').addEventListener('click', () => {
      const id = tab.querySelector('[data-isel]').value;
      const livre = tab.querySelector('[data-ilivre]').value.trim();
      if (id) {
        const ex = c.inventario.find((x) => x.itemId === id);
        if (ex) ex.qtd++; else c.inventario.push({ itemId: id, qtd: 1 });
      } else if (livre) c.inventario.push({ nome: livre, qtd: 1 });
      else return;
      io.redesenhar();
    });
    tab.querySelectorAll('[data-iq]').forEach((b) => b.addEventListener('click', () => {
      const it = c.inventario[+b.dataset.iq];
      it.qtd = Math.max(0, it.qtd + Number(b.dataset.dv));
      if (it.qtd === 0) c.inventario.splice(+b.dataset.iq, 1);
      io.redesenhar();
    }));
    tab.querySelectorAll('[data-irm]').forEach((b) => b.addEventListener('click', () => { c.inventario.splice(+b.dataset.irm, 1); io.redesenhar(); }));
  }

  /* ---------------- Aba: Diário ---------------- */
  function abaDiario(tab, c, d, pode, io) {
    const ro = pode ? '' : 'readonly';
    tab.innerHTML = `
      <div class="grid two" style="gap:34px;align-items:start">
        <div>
          ${field('História', textarea('historia', c.historia, `${ro} style="min-height:220px" placeholder="Quem você perdeu na Nevada? Por que subiu?"`))}
          ${field('Notas de sessão', textarea('notas', c.notas, `${ro} style="min-height:160px"`))}
        </div>
        <div>
          ${field('Lacunas', textarea('lacunas', c.lacunas, `${ro} style="min-height:220px" placeholder="Uma por linha: o que você deixou em cada desenho de giz."`), 'Cada vez que usa Criar, o personagem perde uma lembrança pequena. Anote aqui.')}
          <div class="quote">"Não estamos subindo uma montanha. Estamos entrando no sonho de alguém."</div>
        </div>
      </div>`;
    if (!pode) return;
    tab.querySelectorAll('textarea').forEach((t) => t.addEventListener('input', () => { c[t.name] = t.value; io.salvarDepois(); }));
  }

  LD.views = LD.views || {};
  LD.views.fichas = { titulo: 'Fichas', numeral: 'I', render: renderLista };
  LD.views.ficha = { titulo: 'Ficha', numeral: 'I', render: renderFicha };
  LD.fichas = { normalizar };
})();
