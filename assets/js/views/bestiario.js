(function () {
  const LD = window.LD;
  const { esc, fmt, elemTag, resp, seq, field, input, textarea, select, checkbox, lf, lsel } = LD.ui;
  const R = LD.rules;

  const estado = { q: '', cat: 'todas', grupo: 4 };
  const DIRECOES = ['Esquerda', 'Direita', 'Alto', 'Baixo'].map((d) => ({ key: d, nome: d }));

  function visiveis() {
    const mestre = LD.store.isMaster();
    return LD.store.list('monstros').filter((m) => mestre || m.revelado);
  }

  function cardMonstro(m) {
    const cat = LD.byKey(LD.CATEGORIAS_MONSTRO, m.categoria);
    const fracos = Object.entries(m.resistencias || {}).filter(([, r]) => r === 'fraco').map(([e]) => e);
    return `
      <article class="card" data-mon="${esc(m.id)}">
        <div class="card-meta"><span class="tag ${m.categoria === 'boss' || m.categoria === 'colosso' ? 'red' : 'gold'}">${esc(cat ? cat.nome : '')}</span><span class="tag">Nível ${esc(m.nivel)}</span>${m.voa ? '<span class="tag lumia">Voa</span>' : ''}${!m.revelado ? '<span class="tag">Oculto</span>' : ''}</div>
        <div class="card-title">${esc(m.nome)}</div>
        <div class="card-desc">${esc(m.descricao || '')}</div>
        <div class="card-foot">
          <span class="num" style="font-size:20px">${fmt(Number(m.pv))} <span class="caps">PV</span></span>
          <span>${fracos.length ? '<span class="caps">Fraco a</span> ' + fracos.map(elemTag).join(' ') : ''}</span>
        </div>
      </article>`;
  }

  function renderLista(main) {
    const mestre = LD.store.isMaster();
    const lista = visiveis().slice().sort((a, b) => (Number(a.nivel) - Number(b.nivel)) || a.nome.localeCompare(b.nome))
      .filter((m) => estado.cat === 'todas' || m.categoria === estado.cat)
      .filter((m) => !estado.q || (m.nome + ' ' + (m.habitat || '') + ' ' + (m.descricao || '')).toLowerCase().includes(estado.q.toLowerCase()));
    main.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Biblioteca · Bestiário</div>
          <h1>O que mora na névoa</h1>
          <p class="lead">${mestre ? 'Cada ficha calcula sozinha os Pontos de Quebra, o PV sugerido para o tamanho do grupo e quanto cada golpe tira de um Ascensor do mesmo nível.' : 'Os inimigos que a expedição já conhece. Os Sinais de cada um ensinam a ler os golpes.'}</p>
        </div>
        ${mestre ? '<button class="btn-primary" data-new>Novo monstro</button>' : ''}
      </header>
      <div class="toolbar">
        <label class="search"><span class="muted">⌕</span><input data-q placeholder="Procurar no bestiário…" value="${esc(estado.q)}"></label>
        <div class="chips">${[{ key: 'todas', nome: 'Todos' }].concat(LD.CATEGORIAS_MONSTRO).map((c) => `<button class="chip ${estado.cat === c.key ? 'on' : ''}" data-cat="${c.key}">${esc(c.nome)}</button>`).join('')}</div>
      </div>
      ${lista.length ? `<div class="grid cards">${lista.map(cardMonstro).join('')}</div>` : '<div class="empty">Nenhuma criatura registrada.</div>'}`;
    main.querySelectorAll('[data-mon]').forEach((c) => c.addEventListener('click', () => { location.hash = '#/monstro/' + c.dataset.mon; }));
    main.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { estado.cat = b.dataset.cat; renderLista(main); }));
    main.querySelector('[data-q]').addEventListener('input', LD.ui.debounce((e) => { estado.q = e.target.value; renderLista(main); main.querySelector('[data-q]').focus(); }, 250));
    const nb = main.querySelector('[data-new]');
    if (nb) nb.addEventListener('click', () => editar(null));
  }

  function classe(pct, boss) {
    const [a, b] = boss ? [32, 45] : [22, 32];
    return pct <= a ? 'ok' : pct <= b ? 'warn' : 'bad';
  }

  function renderDetalhe(main, id) {
    const m = LD.store.get('monstros', id);
    const mestre = LD.store.isMaster();
    if (!m || (!mestre && !m.revelado)) { main.innerHTML = '<div class="empty">Criatura não encontrada.</div>'; return; }
    const an = R.analiseMonstro(m, estado.grupo);
    const cat = LD.byKey(LD.CATEGORIAS_MONSTRO, m.categoria) || LD.CATEGORIAS_MONSTRO[0];
    const sug = an.sugestao[m.categoria] || an.sugestao.comum;
    const pv = Number(m.pv) || 0;
    const pvClasse = pv < sug[0] * 0.8 ? 'warn' : pv > sug[1] * 1.25 ? 'warn' : 'ok';
    const boss = m.categoria === 'boss' || m.categoria === 'colosso';
    const clareza = LD.byKey(LD.CLAREZAS, m.clareza);

    main.innerHTML = `
      <a href="#/bestiario" class="btn plain" style="margin-bottom:22px">← Bestiário</a>
      <section class="mon-hero">
        <div>
          <div class="eyebrow">${esc(cat.nome)} · Nível ${esc(m.nivel)}${m.voa ? ' · Voa' : ''}</div>
          <h1 style="margin:10px 0 8px">${esc(m.nome)}</h1>
          <div class="caps" style="margin-bottom:14px">${esc(m.habitat || '')}</div>
          ${m.imagem ? `<div class="portrait" style="aspect-ratio:16/9;max-width:620px;margin-bottom:18px"><img src="${esc(m.imagem)}" alt=""></div>` : ''}
          <p class="serif" style="font-size:20px;line-height:1.45;max-width:720px">${esc(m.descricao || '')}</p>
          <div class="vitals" style="margin-top:20px">
            <div class="vital"><div class="caps">PV</div><div class="v">${fmt(pv)}</div></div>
            <div class="vital"><div class="caps">Velocidade</div><div class="v">${esc(m.velocidade)}</div></div>
            <div class="vital"><div class="caps">Quebra</div><div class="v">${an.etapas}<small> × ${an.pq}</small></div><div class="muted" style="font-size:12px">${an.etapas} etapa(s) de ${an.pq} pontos</div></div>
            <div class="vital"><div class="caps">Ações</div><div class="v">${esc(m.acoesPorTurno || 1)}<small>/turno</small></div></div>
            <div class="vital"><div class="caps">Clareza</div><div class="v" style="font-size:26px">${esc(clareza ? clareza.nome : '—')}</div></div>
          </div>
          ${mestre ? `<div style="display:flex;gap:22px;margin-top:20px"><button class="btn" data-edit>Editar</button><button class="btn" data-dup>Duplicar</button><button class="btn" data-calc>Abrir na calculadora</button></div>` : ''}
        </div>
        ${mestre ? `<aside class="panel framed">
          <div class="panel-title"><h3>Análise</h3>
            <select data-grupo style="background:none;border:0;border-bottom:1px solid var(--line-2);color:var(--paper);font-family:var(--ui)">${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${n === estado.grupo ? 'selected' : ''}>${n} jogador${n > 1 ? 'es' : ''}</option>`).join('')}</select></div>
          <div class="caps">Ascensor de referência, nível ${esc(m.nivel)}</div>
          <table class="tbl" style="margin:6px 0 16px"><tr><td>PV</td><td class="r num">${fmt(an.ref.pv)}</td></tr><tr><td>Base da Via principal</td><td class="r num">${fmt(an.ref.base)}</td></tr></table>
          <div class="caps">PV sugerido para ${esc(cat.nome.toLowerCase())}</div>
          <div class="num" style="font-size:28px">${fmt(sug[0])} – ${fmt(sug[1])}</div>
          <div class="${pvClasse}" style="font-size:13px;margin-bottom:14px">◆ ${pvClasse === 'ok' ? 'O PV atual está na faixa.' : pv < sug[0] ? 'PV abaixo da faixa: luta curta.' : 'PV acima da faixa: luta longa.'}</div>
          <div class="caps">Rodadas para derrubar</div>
          <div class="num" style="font-size:28px">≈ ${an.rodadas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
          <div class="muted" style="font-size:12px;margin-bottom:14px">Grupo de ${an.grupo}, cada um causando em média 1,75 × a Base por turno.</div>
          <div class="caps">Pontos de Quebra para todas as etapas</div>
          <div class="num" style="font-size:28px">${an.quebraTotal}</div>
          <div class="muted" style="font-size:12px">Defesa ${esc(m.defesa)} ÷ 20, mínimo 3, por etapa.</div>
        </aside>` : '<div></div>'}
      </section>

      <div class="subsect"><span>Resistências</span></div>
      <div class="res-grid">${LD.ELEMENTOS.map((e) => {
        const r = (m.resistencias || {})[e.key] || 'normal';
        const def = LD.byKey(LD.RESISTENCIAS, r);
        return `<div>${elemTag(e.key)}<span class="${r}">${esc(def ? def.nome : r)}</span></div>`;
      }).join('')}</div>
      ${m.imunidades ? `<p class="muted" style="margin-top:10px">Imune a: ${esc(m.imunidades)}</p>` : ''}

      <div class="grid two" style="gap:34px;margin-top:10px">
        <div>
          <div class="subsect"><span>Sinais</span></div>
          <p class="muted" style="font-size:13px;margin-top:-4px">Como ${esc(m.nome)} avisa cada golpe. ${esc(clareza ? clareza.desc : '')}</p>
          ${(m.sinais || []).length ? m.sinais.map((s) => `<div class="sig-row"><span class="s">“${esc(s.sinal)}”</span><span style="text-align:right">${resp(s.resposta)}</span></div>`).join('') : '<div class="empty" style="padding:22px">Sem sinais registrados.</div>'}
        </div>
        <div>
          ${m.voa ? `<div class="subsect"><span>Leitura de Voo</span></div>
          ${(m.sinaisVoo || []).map((s) => `<div class="sig-row"><span class="s">“${esc(s.sinal)}”</span><span class="tag box lumia" style="justify-self:end">${esc(s.direcao)}</span></div>`).join('') || '<div class="muted">Sem sinais de voo.</div>'}` : ''}
          <div class="subsect"><span>Pontos fracos</span></div>
          ${(m.pontosFracos || []).length ? m.pontosFracos.map((p) => {
            const t = LD.byKey(LD.TAMANHOS, p.tamanho);
            return `<div class="sig-row" style="grid-template-columns:1fr auto"><div><div class="serif" style="font-size:19px">${esc(p.nome)}</div><div class="muted" style="font-size:13px">${esc(p.efeito)}</div></div><span class="tag box gold">${esc(t ? t.nome : '')} · ${t ? t.simbolos : '?'} símb.</span></div>`;
          }).join('') : '<div class="muted">Nenhum ponto fraco conhecido.</div>'}
        </div>
      </div>

      <div class="subsect"><span>Ataques</span></div>
      <div style="overflow-x:auto"><table class="tbl">
        <tr><th>Golpe</th><th>Elemento</th><th>Golpes</th><th>Sequência</th><th>Velocidade</th><th>Condição</th>${mestre ? '<th class="r">% do PV ref.</th>' : ''}</tr>
        ${(m.ataques || []).map((a, i) => {
          const at = an.ataques[i];
          const vel = LD.byKey(LD.VELOCIDADES, a.velocidade);
          const alvo = LD.byKey(LD.ALVOS, a.alvo);
          return `<tr>
            <td><div class="serif" style="font-size:19px">${esc(a.nome)}</div><div class="muted" style="font-size:12.5px">${esc(alvo ? alvo.nome : '')}${a.descricao ? ' · ' + esc(a.descricao) : ''}</div></td>
            <td>${elemTag(a.elemento)}</td>
            <td class="num">${esc(a.golpes)} × ${esc(a.dano)}</td>
            <td>${seq(a.sequencia)}</td>
            <td class="caps">${esc(vel ? vel.nome : '')}${vel ? ` · ${vel.batidas + Math.max(0, (Number(a.golpes) || 1) - 1)} bat.` : ''}</td>
            <td>${esc(a.condicao || '—')}</td>
            ${mestre ? `<td class="r"><span class="${classe(at.porGolpePct, boss)}">${at.porGolpePct.toFixed(0)}%</span> <span class="muted">/ golpe</span><br><span class="muted">${at.totalPct.toFixed(0)}% se errar tudo</span></td>` : ''}
          </tr>`;
        }).join('')}
      </table></div>

      ${m.fases ? `<div class="subsect"><span>Fases</span></div><p class="paper-2">${esc(m.fases)}</p>` : ''}
      ${m.despojos ? `<div class="subsect"><span>Despojos</span></div><p class="paper-2">${esc(m.despojos)}</p>` : ''}
      ${mestre && m.notas ? `<div class="subsect"><span>Notas do mestre</span></div><p class="paper-2">${esc(m.notas)}</p>` : ''}`;

    const g = main.querySelector('[data-grupo]');
    if (g) g.addEventListener('change', () => { estado.grupo = Number(g.value); renderDetalhe(main, id); });
    const ed = main.querySelector('[data-edit]');
    if (ed) ed.addEventListener('click', () => editar(m));
    const dup = main.querySelector('[data-dup]');
    if (dup) dup.addEventListener('click', () => {
      const copia = JSON.parse(JSON.stringify(m));
      delete copia.id; delete copia.ownerId;
      copia.nome = m.nome + ' (cópia)';
      LD.store.save('monstros', copia).then((s) => { location.hash = '#/monstro/' + s.id; });
    });
    const calc = main.querySelector('[data-calc]');
    if (calc) calc.addEventListener('click', () => { LD.mestre && LD.mestre.alvo(m.id); location.hash = '#/mestre'; });
  }

  function editar(m) {
    const novo = !m;
    m = Object.assign({
      nome: '', nivel: 1, categoria: 'comum', habitat: '', descricao: '', imagem: '', pv: 300, velocidade: 25, defesa: 40,
      quebraEtapas: 1, acoesPorTurno: 1, resistencias: {}, imunidades: '', voa: false, sinaisVoo: [], clareza: 'normal',
      sinais: [], ataques: [], pontosFracos: [], fases: '', despojos: '', revelado: false, notas: ''
    }, m ? JSON.parse(JSON.stringify(m)) : {});

    const body = `
      <form data-form>
        ${field('Nome', input('nome', m.nome, 'class="big"'))}
        <div class="row">
          ${field('Nível', input('nivel', m.nivel, 'type="number" min="1"'))}
          ${field('Categoria', select('categoria', LD.CATEGORIAS_MONSTRO, m.categoria))}
          ${field('Clareza dos sinais', select('clareza', LD.CLAREZAS, m.clareza))}
          ${field('Ações por turno', input('acoesPorTurno', m.acoesPorTurno, 'type="number" min="1" max="4"'))}
        </div>
        <div class="row">
          ${field('PV', input('pv', m.pv, 'type="number" min="1"'), '<span data-sug></span>')}
          ${field('Velocidade', input('velocidade', m.velocidade, 'type="number"'))}
          ${field('Defesa', input('defesa', m.defesa, 'type="number" min="0"'), '<span data-pq></span>')}
          ${field('Etapas de Quebra', input('quebraEtapas', m.quebraEtapas, 'type="number" min="0" max="5"'))}
        </div>
        ${field('Habitat', input('habitat', m.habitat))}
        ${field('Descrição', textarea('descricao', m.descricao))}
        ${field('Imagem (endereço)', input('imagem', m.imagem, 'placeholder="https://…"'))}
        <div class="row">${field('', checkbox('voa', m.voa, 'Voa (exceção ao dano inteiro)'))}${field('', checkbox('revelado', m.revelado, 'Revelado aos jogadores'))}</div>

        <div class="subsect"><span>Resistências</span></div>
        <div class="row">${LD.ELEMENTOS.map((e) => field(e.nome, select('resistencias.' + e.key, LD.RESISTENCIAS, (m.resistencias || {})[e.key] || 'normal'))).join('')}</div>
        ${field('Imune a condições', input('imunidades', m.imunidades, 'placeholder="Queimadura, Congelado"'))}

        <div class="subsect"><span>Sinais</span></div>
        <p class="muted" style="font-size:13px">Cada sinal é um aviso que o narrador encaixa na descrição do golpe. A resposta é o que o jogador precisa escrever.</p>
        <div class="list-edit" data-list="sinais"></div>
        <button type="button" class="btn" data-add="sinais" style="margin:10px 0">Adicionar sinal</button>

        <div data-voo style="${m.voa ? '' : 'display:none'}">
          <div class="subsect"><span>Sinais de voo</span></div>
          <div class="list-edit" data-list="sinaisVoo"></div>
          <button type="button" class="btn" data-add="sinaisVoo" style="margin:10px 0">Adicionar sinal de voo</button>
        </div>

        <div class="subsect"><span>Ataques</span></div>
        <p class="muted" style="font-size:13px">Sequência: uma letra por golpe, na ordem (E, S, A1, A2, A3, F, G). Ex.: <span class="kbd">S E A2</span></p>
        <div class="list-edit" data-list="ataques"></div>
        <button type="button" class="btn" data-add="ataques" style="margin:10px 0">Adicionar ataque</button>

        <div class="subsect"><span>Pontos fracos</span></div>
        <div class="list-edit" data-list="pontosFracos"></div>
        <button type="button" class="btn" data-add="pontosFracos" style="margin:10px 0">Adicionar ponto fraco</button>

        <div class="subsect"><span>O resto</span></div>
        ${field('Fases', textarea('fases', m.fases))}
        ${field('Despojos', textarea('despojos', m.despojos))}
        ${field('Notas do mestre (só o mestre vê)', textarea('notas', m.notas))}
      </form>`;

    LD.ui.openDrawer({
      eyebrow: novo ? 'Novo monstro' : 'Editar monstro', title: novo ? 'Uma nova criatura' : m.nome, body,
      foot: `${!novo ? '<button class="btn danger" data-del>Excluir</button>' : ''}<span style="flex:1"></span><button class="btn plain" data-cancel>Cancelar</button><button class="btn-primary" data-save>Gravar</button>`,
      onMount: (el) => {
        const form = el.querySelector('[data-form]');
        const respostas = LD.RESPOSTAS.map((r) => ({ key: r.key, nome: `${r.key} · ${r.nome}` }));
        const ed = {
          sinais: LD.ui.listEditor(el, { key: 'sinais', rows: m.sinais, empty: 'Sem sinais.', template: (r) => `<div style="display:grid;grid-template-columns:1fr 200px;gap:12px"><div class="field" style="margin:0"><label>Sinal</label>${lf('sinal', r.sinal, 'placeholder="O Anel gira mais rápido."')}</div><div class="field" style="margin:0"><label>Resposta</label>${lsel('resposta', respostas, r.resposta || 'E')}</div></div>` }),
          sinaisVoo: LD.ui.listEditor(el, { key: 'sinaisVoo', rows: m.sinaisVoo, empty: 'Sem sinais de voo.', template: (r) => `<div style="display:grid;grid-template-columns:1fr 160px;gap:12px"><div class="field" style="margin:0"><label>Movimento</label>${lf('sinal', r.sinal)}</div><div class="field" style="margin:0"><label>Atirar em</label>${lsel('direcao', DIRECOES, r.direcao || 'Esquerda')}</div></div>` }),
          ataques: LD.ui.listEditor(el, { key: 'ataques', rows: m.ataques, empty: 'Sem ataques.', template: (r) => `
            <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px">
              <div class="field" style="margin:0"><label>Nome</label>${lf('nome', r.nome)}</div>
              <div class="field" style="margin:0"><label>Elemento</label>${lsel('elemento', LD.ELEMENTOS, r.elemento || 'fisico')}</div>
              <div class="field" style="margin:0"><label>Alvo</label>${lsel('alvo', LD.ALVOS, r.alvo || 'unico')}</div>
            </div>
            <div style="display:grid;grid-template-columns:80px 100px 1fr 1fr;gap:12px;margin-top:8px">
              <div class="field" style="margin:0"><label>Golpes</label>${lf('golpes', r.golpes || 1, 'type="number" min="1"')}</div>
              <div class="field" style="margin:0"><label>Dano/golpe</label>${lf('dano', r.dano || 0, 'type="number" min="0"')}</div>
              <div class="field" style="margin:0"><label>Velocidade</label>${lsel('velocidade', LD.VELOCIDADES, r.velocidade || 'normal')}</div>
              <div class="field" style="margin:0"><label>Sequência</label>${lf('sequencia', r.sequencia, 'placeholder="S E A2"')}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px;margin-top:8px">
              <div class="field" style="margin:0"><label>Condição</label>${lf('condicao', r.condicao)}</div>
              <div class="field" style="margin:0"><label>Descrição</label>${lf('descricao', r.descricao)}</div>
            </div>` }),
          pontosFracos: LD.ui.listEditor(el, { key: 'pontosFracos', rows: m.pontosFracos, empty: 'Sem pontos fracos.', template: (r) => `<div style="display:grid;grid-template-columns:1fr 150px;gap:12px"><div class="field" style="margin:0"><label>Nome</label>${lf('nome', r.nome)}</div><div class="field" style="margin:0"><label>Tamanho</label>${lsel('tamanho', LD.TAMANHOS, r.tamanho || 'medio')}</div></div><div class="field" style="margin:8px 0 0"><label>Efeito ao acertar</label>${lf('efeito', r.efeito)}</div>` })
        };
        const dica = () => {
          const d = LD.ui.readForm(form);
          const an = R.analiseMonstro(d, estado.grupo);
          const s = an.sugestao[d.categoria] || an.sugestao.comum;
          el.querySelector('[data-sug]').textContent = `Sugerido para ${d.categoria} nível ${d.nivel}, grupo de ${estado.grupo}: ${fmt(s[0])} a ${fmt(s[1])}.`;
          el.querySelector('[data-pq]').textContent = `${R.pontosQuebra(d.defesa)} Pontos de Quebra por etapa.`;
          el.querySelector('[data-voo]').style.display = d.voa ? '' : 'none';
        };
        form.addEventListener('input', dica);
        form.addEventListener('change', dica);
        dica();
        el.querySelector('[data-cancel]').addEventListener('click', LD.ui.closeDrawer);
        const del = el.querySelector('[data-del]');
        if (del) del.addEventListener('click', () => {
          if (!LD.ui.confirmar(`Excluir ${m.nome}?`)) return;
          LD.store.remove('monstros', m.id).then(() => { LD.ui.closeDrawer(); location.hash = '#/bestiario'; });
        });
        el.querySelector('[data-save]').addEventListener('click', () => {
          const out = Object.assign(m, LD.ui.readForm(form));
          if (!String(out.nome || '').trim()) { LD.ui.toast('Dê um nome à criatura.', 'erro'); return; }
          ['nivel', 'pv', 'velocidade', 'defesa', 'quebraEtapas', 'acoesPorTurno'].forEach((k) => { out[k] = Number(out[k]) || 0; });
          out.nivel = Math.max(1, out.nivel);
          Object.keys(out.resistencias).forEach((k) => { if (out.resistencias[k] === 'normal') delete out.resistencias[k]; });
          out.sinais = ed.sinais.read().filter((s) => s.sinal);
          out.sinaisVoo = ed.sinaisVoo.read().filter((s) => s.sinal);
          out.ataques = ed.ataques.read().filter((a) => a.nome).map((a) => Object.assign(a, { golpes: Number(a.golpes) || 1, dano: Number(a.dano) || 0, sequencia: String(a.sequencia || '').toUpperCase() }));
          out.pontosFracos = ed.pontosFracos.read().filter((p) => p.nome);
          LD.store.save('monstros', out).then((s) => { LD.ui.closeDrawer(); LD.ui.toast('Criatura gravada.'); location.hash = '#/monstro/' + s.id; });
        });
      }
    });
  }

  LD.views = LD.views || {};
  LD.views.bestiario = { titulo: 'Bestiário', numeral: 'V', render: renderLista };
  LD.views.monstro = { titulo: 'Criatura', numeral: 'V', render: renderDetalhe };
})();
