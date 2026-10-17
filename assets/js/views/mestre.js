(function () {
  const LD = window.LD;
  const { esc, fmt, elemTag, seq } = LD.ui;
  const R = LD.rules;

  const st = {
    atacante: '', baseManual: 100, acao: 'comum', habId: '', perf: 99, fraco: 1, elemManual: 'fisico',
    alvo: '', mods: { marcado: false, vulneravel: false, quebrado: false, fortalecido: false }, critico: false,
    mId: '', ataqueIdx: 0, defensor: '', reducaoManual: 0,
    xpMonstro: '', xpNivel: 1, xpPapel: 'comum', xpGrupo: 3, xpQtd: 1
  };

  function opt(list, val, rotulo, vazio) {
    return (vazio ? `<option value="">${esc(vazio)}</option>` : '') +
      list.map((x) => `<option value="${esc(x.id)}" ${x.id === val ? 'selected' : ''}>${esc(rotulo(x))}</option>`).join('');
  }

  function calcAtaque() {
    const chars = LD.store.list('personagens');
    const lib = { pictos: LD.store.list('pictos'), armas: LD.store.list('armas') };
    const c = chars.find((x) => x.id === st.atacante);
    const d = c ? R.derivados(LD.fichas.normalizar(JSON.parse(JSON.stringify(c))), lib) : null;
    const habs = c ? (c.habilidades || []).map((id) => LD.store.get('habilidades', id)).filter(Boolean) : LD.store.list('habilidades');
    const h = habs.find((x) => x.id === st.habId) || habs[0];
    const m = LD.store.get('monstros', st.alvo);

    let base, mult = 1, elemento, quebra = 0, rotulo;
    if (st.acao === 'habilidade' && h) {
      base = d ? d.bases[h.via] : LD.clamp(Number(st.baseManual) || 0, 0, 700);
      const n = R.perfeicoesDe(h);
      const k = Math.min(st.perf, n);
      mult = R.multiplicador(h, k);
      elemento = h.elemento;
      quebra = R.quebraDe(h);
      rotulo = `${h.nome} · ${k}/${n} perfeições`;
    } else if (st.acao === 'disparo') {
      base = d ? d.bases.mir : LD.clamp(Number(st.baseManual) || 0, 0, 700);
      elemento = st.elemManual;
      quebra = st.fraco > 1 ? 1 : 0;
      rotulo = 'Disparo (Mira Livre)';
    } else {
      const arma = d && d.arma;
      base = d ? d.bases[arma ? arma.via : 'gol'] : LD.clamp(Number(st.baseManual) || 0, 0, 700);
      elemento = arma ? arma.elemento : st.elemManual;
      quebra = 1 + (arma ? LD.clamp(Number(arma.quebra) || 0, 0, R.LIMITE_QUEBRA_ARMA) : 0);
      rotulo = 'Ataque Comum' + (arma ? ' · ' + arma.nome : '');
    }
    if (st.fraco > 1 && st.acao !== 'disparo') quebra += 1;
    const mods = [];
    if (st.mods.marcado) mods.push(0.25);
    if (st.mods.vulneravel) mods.push(0.5);
    if (st.mods.quebrado) mods.push(0.25);
    if (st.mods.fortalecido) mods.push(0.25);
    const em = R.multResistencia(m, elemento);
    const res = R.calcularDano({ base, mult, elementoMult: em, mods, pontoFraco: st.fraco, critico: st.critico });
    return { res, c, d, habs, h, m, base, mult, elemento, quebra, rotulo, cura: h && st.acao === 'habilidade' && (h.tipo === 'cura' || h.tipo === 'escudo') };
  }

  function calcDefesa() {
    const m = LD.store.get('monstros', st.mId);
    const a = m && (m.ataques || [])[st.ataqueIdx];
    const c = LD.store.get('personagens', st.defensor);
    const lib = { pictos: LD.store.list('pictos'), armas: LD.store.list('armas') };
    const d = c ? R.derivados(LD.fichas.normalizar(JSON.parse(JSON.stringify(c))), lib) : null;
    const red = d ? d.reducao : Number(st.reducaoManual) || 0;
    return { m, a, c, d, red };
  }

  function render(main) {
    const chars = LD.store.list('personagens').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const mons = LD.store.list('monstros').slice().sort((a, b) => a.nome.localeCompare(b.nome));
    const mestre = LD.store.isMaster();
    const A = calcAtaque();
    const D = calcDefesa();
    if (A.h && !st.habId) st.habId = A.h.id;

    const nPerf = A.h ? R.perfeicoesDe(A.h) : 0;

    main.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Oficina</div>
          <h1>A mesa do mestre</h1>
          <p class="lead">Não há mesa de combate aqui. Há a conta: quanto um golpe tira, quanto um golpe recebe, quanto uma habilidade rende com as perfeições que o jogador acertou.</p>
        </div>
      </header>

      <div class="grid two" style="gap:28px;align-items:start">
        <section class="panel framed">
          <div class="panel-title"><h3>Ascensor → Inimigo</h3><span class="caps">dano causado</span></div>
          <div class="row">
            <div class="field"><label>Atacante</label><select data-k="atacante">${opt(chars, st.atacante, (x) => x.nome, 'Manual (Base digitada)')}</select></div>
            ${!A.c ? `<div class="field"><label>Base</label><input type="number" data-k="baseManual" min="0" max="700" value="${esc(st.baseManual)}"></div>` : ''}
          </div>
          <div class="chips" style="margin-bottom:14px">${[['comum', 'Ataque Comum'], ['habilidade', 'Habilidade'], ['disparo', 'Disparo']]
            .map(([k, n]) => `<button class="chip ${st.acao === k ? 'on' : ''}" data-acao="${k}">${n}</button>`).join('')}</div>
          ${st.acao === 'habilidade' ? `
            <div class="field"><label>Habilidade</label><select data-k="habId">${opt(A.habs, A.h ? A.h.id : '', (x) => `${x.nome} · ${R.perfeicoesDe(x)}◆`)}</select></div>
            ${A.h ? `<div class="field"><label>Perfeições alcançadas no Compasso</label>
              <div class="chips">${Array.from({ length: nPerf + 1 }, (_, k) => `<button class="chip ${Math.min(st.perf, nPerf) === k ? 'on' : ''}" data-perf="${k}">${k === nPerf ? 'Perfeita' : k}</button>`).join('')}</div></div>` : '<div class="muted">Este atacante não tem habilidades.</div>'}` : ''}
          ${st.acao !== 'habilidade' && (!A.d || !A.d.arma || st.acao === 'disparo') ? `<div class="field"><label>Elemento</label><select data-k="elemManual">${LD.ELEMENTOS.map((e) => `<option value="${e.key}" ${e.key === st.elemManual ? 'selected' : ''}>${e.nome}</option>`).join('')}</select></div>` : ''}
          <div class="row">
            <div class="field"><label>Alvo</label><select data-k="alvo">${opt(mons, st.alvo, (x) => `${x.nome} · nível ${x.nivel}`, 'Nenhum (sem resistência)')}</select></div>
            <div class="field"><label>Ponto fraco</label><select data-k="fraco">${[1, 2, 3].map((v) => `<option value="${v}" ${Number(st.fraco) === v ? 'selected' : ''}>${v === 1 ? 'Não' : '× ' + v}</option>`).join('')}</select></div>
          </div>
          <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:6px">
            ${[['marcado', 'Marcado +25%'], ['vulneravel', 'Vulnerável +50%'], ['quebrado', 'Quebrado +25%'], ['fortalecido', 'Fortalecido +25%']]
              .map(([k, n]) => `<label class="check"><input type="checkbox" data-mod="${k}" ${st.mods[k] ? 'checked' : ''}>${n}</label>`).join('')}
            <label class="check"><input type="checkbox" data-crit ${st.critico ? 'checked' : ''}>Crítico +50%</label>
          </div>
          ${A.d ? `<div class="muted" style="font-size:12.5px">Crítico de ${esc(A.c.nome)}: d100 ≤ ${A.d.critico}.</div>` : ''}
          <div class="calc-out">
            <div class="caps">${esc(A.rotulo || '')} ${A.elemento ? '· ' + elemTag(A.elemento) : ''}</div>
            <div class="big ${A.cura ? 'heal' : ''}">${fmt(A.res.valor)}</div>
            <div class="caps">${A.cura ? 'de cura ou escudo' : A.res.valor < 0 ? 'o alvo absorve e se cura' : 'de dano'} · Quebra +${A.quebra}</div>
            ${A.m ? `<div class="muted" style="font-size:13px;margin-top:6px">${((Math.abs(A.res.valor) / (Number(A.m.pv) || 1)) * 100).toFixed(1)}% do PV de ${esc(A.m.nome)} · etapa de Quebra de ${R.pontosQuebra(A.m.defesa)} pontos</div>` : ''}
            <ul class="steps">${A.res.passos.map((p) => `<li><span>${esc(p.t)}</span><span>${fmt(p.v)}</span></li>`).join('')}</ul>
          </div>
        </section>

        <section class="panel framed">
          <div class="panel-title"><h3>Inimigo → Ascensor</h3><span class="caps">dano recebido</span></div>
          <div class="row">
            <div class="field"><label>Inimigo</label><select data-k="mId">${opt(mons, st.mId, (x) => x.nome, 'Escolher…')}</select></div>
            ${D.m ? `<div class="field"><label>Ataque</label><select data-k="ataqueIdx">${(D.m.ataques || []).map((a, i) => `<option value="${i}" ${i === Number(st.ataqueIdx) ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></div>` : ''}
          </div>
          <div class="row">
            <div class="field"><label>Alvo</label><select data-k="defensor">${opt(chars, st.defensor, (x) => x.nome, 'Manual (Redução digitada)')}</select></div>
            ${!D.c ? `<div class="field"><label>Redução %</label><input type="number" data-k="reducaoManual" value="${esc(st.reducaoManual)}"></div>` : ''}
          </div>
          ${D.a ? (() => {
            const g = Number(D.a.golpes) || 1, dn = Number(D.a.dano) || 0;
            const um = R.danoRecebido(dn, D.red, false), ag = R.danoRecebido(dn, D.red, true);
            const pvMax = D.d ? D.d.pvMax : null;
            return `
            <div class="card-meta" style="margin:6px 0 10px">${elemTag(D.a.elemento)} <span class="tag">${g} × ${dn}</span> ${seq(D.a.sequencia)}</div>
            <table class="tbl">
              <tr><th></th><th class="r">Por golpe</th><th class="r">Sequência inteira</th></tr>
              <tr><td>Leitura errada (Redução ${D.red}%)</td><td class="r num" style="font-size:22px">${fmt(um)}</td><td class="r num" style="font-size:22px">${fmt(um * g)}</td></tr>
              <tr><td>Aguentar (Redução ${Math.min(60, D.red * 2)}%, sem condição)</td><td class="r num" style="font-size:22px">${fmt(ag)}</td><td class="r num" style="font-size:22px">${fmt(ag * g)}</td></tr>
              <tr><td>Leitura certa</td><td class="r num">0</td><td class="r num">0</td></tr>
              ${pvMax ? `<tr class="hi"><td>Se errar tudo, contra ${esc(D.c.nome)}</td><td></td><td class="r">${((um * g) / pvMax * 100).toFixed(0)}% do PV máximo</td></tr>` : ''}
            </table>
            ${D.a.condicao ? `<p class="muted" style="font-size:13px">Condição ao acertar: ${esc(D.a.condicao)}</p>` : ''}`;
          })() : '<div class="empty" style="padding:26px">Escolha um inimigo e um ataque.</div>'}
        </section>
      </div>

      ${(() => {
        const m = mons.find((x) => x.id === st.xpMonstro);
        const nivel = m ? Number(m.nivel) || 1 : Number(st.xpNivel) || 1;
        const cada = R.xpDeInimigo(nivel, st.xpPapel, st.xpGrupo);
        const total = cada * Math.max(1, Number(st.xpQtd) || 1);
        return `<section class="panel framed" style="margin-top:28px">
          <div class="panel-title"><h3>XP do encontro</h3><span class="caps">por jogador</span></div>
          <div class="row">
            <div class="field"><label>Inimigo</label><select data-k="xpMonstro">${opt(mons, st.xpMonstro, (x) => `${x.nome} · nível ${x.nivel}`, 'Manual (nível digitado)')}</select></div>
            ${m ? '' : `<div class="field"><label>Nível do inimigo</label><input type="number" min="1" data-k="xpNivel" value="${esc(st.xpNivel)}"></div>`}
            <div class="field"><label>Papel</label><select data-k="xpPapel">${LD.PAPEIS_XP.map((p) => `<option value="${p.key}" ${p.key === st.xpPapel ? 'selected' : ''}>${p.nome}</option>`).join('')}</select></div>
          </div>
          <div class="row">
            <div class="field"><label>Nível médio do grupo</label><input type="number" min="1" data-k="xpGrupo" value="${esc(st.xpGrupo)}"></div>
            <div class="field"><label>Quantidade</label><input type="number" min="1" data-k="xpQtd" value="${esc(st.xpQtd)}"></div>
          </div>
          <table class="tbl">
            <tr><td>XP de cada inimigo</td><td class="r num" style="font-size:22px">${fmt(cada)}</td></tr>
            <tr class="hi"><td>Total para cada jogador</td><td class="r num" style="font-size:22px">${fmt(total)}</td></tr>
          </table>
          <p class="muted" style="font-size:13px">20 × nível × papel (Comum 1, Elite 2, Chefe 3), ajustado em 10% por nível de diferença entre o inimigo e o grupo, entre 0,5 e 1,5. Superar vale o mesmo que derrotar. Para dar o XP, abra a ficha do personagem.</p>
        </section>`;
      })()}

      ${mestre ? `
      <div class="subsect" style="margin-top:44px"><span>Biblioteca</span></div>
      <div class="grid three">
        <div class="panel"><h3>Biblioteca inicial</h3><p class="muted" style="font-size:13.5px">Grava as habilidades, armas, pictos, itens e criaturas do Ato I. Carregar de novo atualiza, não duplica.</p><button class="btn" data-semear>Carregar biblioteca inicial</button></div>
        <div class="panel"><h3>Exportar</h3><p class="muted" style="font-size:13.5px">Baixa tudo num arquivo .json: fichas, biblioteca e bestiário.</p><button class="btn" data-exportar>Exportar tudo</button></div>
        <div class="panel"><h3>Importar</h3><p class="muted" style="font-size:13.5px">Lê um arquivo exportado e grava o que estiver nele.</p><button class="btn" data-importar>Escolher arquivo</button><input type="file" accept=".json" data-file hidden></div>
      </div>` : ''}`;

    const rer = () => render(main);
    main.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('change', () => {
      const k = el.dataset.k;
      st[k] = el.type === 'number' ? Number(el.value) : el.value;
      if (k === 'atacante') st.habId = '';
      if (k === 'mId') st.ataqueIdx = 0;
      if (k === 'habId') st.perf = 99;
      rer();
    }));
    main.querySelectorAll('[data-acao]').forEach((b) => b.addEventListener('click', () => { st.acao = b.dataset.acao; rer(); }));
    main.querySelectorAll('[data-perf]').forEach((b) => b.addEventListener('click', () => { st.perf = Number(b.dataset.perf); rer(); }));
    main.querySelectorAll('[data-mod]').forEach((b) => b.addEventListener('change', () => { st.mods[b.dataset.mod] = b.checked; rer(); }));
    const cr = main.querySelector('[data-crit]');
    cr.addEventListener('change', () => { st.critico = cr.checked; rer(); });

    if (!mestre) return;
    main.querySelector('[data-semear]').addEventListener('click', () => {
      LD.store.semear().then((n) => LD.ui.toast(`${n} registros gravados na biblioteca.`));
    });
    main.querySelector('[data-exportar]').addEventListener('click', () => LD.ui.baixar('ascensao-delta-lumia.json', LD.store.exportar()));
    const file = main.querySelector('[data-file]');
    main.querySelector('[data-importar]').addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files[0];
      if (!f) return;
      f.text().then((t) => LD.store.importar(t)).then((r) => LD.ui.toast(`${r.filter((x) => x.status === 'fulfilled').length} registros importados.`)).catch((e) => LD.ui.toast('Arquivo inválido: ' + e.message, 'erro'));
    });
  }

  LD.views = LD.views || {};
  LD.views.mestre = { titulo: 'Oficina', numeral: 'VI', render };
  LD.mestre = { alvo: (id) => { st.alvo = id; st.mId = id; st.ataqueIdx = 0; } };
})();
