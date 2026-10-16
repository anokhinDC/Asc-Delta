(function () {
  const LD = window.LD;
  const { esc, resp, pips, lumiaBar, elemTag } = LD.ui;

  const secoes = [
    ['status', 'Status e Vias'],
    ['crescer', 'Crescer'],
    ['lumia', 'Lúmia'],
    ['perfeicoes', 'Perfeições e Compasso'],
    ['leitura', 'Leitura do Golpe'],
    ['mira', 'Mira Livre e voadores'],
    ['elementos', 'Elementos'],
    ['quebra', 'Quebra e Gradiente'],
    ['pictos', 'Pictos e Ecos'],
    ['ampolas', 'Ampolas'],
    ['condicoes', 'Condições'],
    ['testes', 'Testes fora de combate']
  ];

  function render(main) {
    main.innerHTML = `
      <header class="page-head">
        <div>
          <div class="eyebrow">Códice</div>
          <h1>As leis da subida</h1>
          <p class="lead">O sistema inteiro, numa página. O que a ficha e a Oficina calculam sozinhas está aqui explicado.</p>
        </div>
      </header>
      <div class="codex">
        <nav class="codex-toc">${secoes.map(([k, n], i) => `<a href="#/codex" data-go="${k}"><span class="caps" style="margin-right:8px">${String(i + 1).padStart(2, '0')}</span>${n}</a>`).join('')}</nav>
        <div>
          <section id="cx-status">
            <div class="eyebrow">I</div><h2>Status e Vias</h2>
            <p>Dez Status, de 1 a 99. Cinco de base e cinco Vias. As Vias ocupam o lugar que a Força tem em Expedition 33: cada uma é um tipo de dano e de habilidade, com a sua própria Base.</p>
            <table class="tbl">${LD.STATUS.map((s) => `<tr><td class="serif" style="font-size:18px">${s.nome}</td><td class="caps">${s.sigla}</td><td>${esc(s.desc)}</td></tr>`).join('')}</table>
            <p>A <b>Base</b> de uma Via é o dano que as habilidades dela multiplicam: <span class="kbd">4 × Nível + 6 × pontos na Via</span>, mais o Poder da arma (se for da mesma Via) e os bônus de pictos.</p>
          </section>

          <section id="cx-crescer">
            <div class="eyebrow">II</div><h2>Crescer</h2>
            <p>Todos os Status começam em 1. Na criação, 10 pontos (nenhum Status acima de 6). Depois, 3 pontos por nível, até 99.</p>
            <table class="tbl">
              <tr><th>Valor</th><th>Fórmula</th></tr>
              <tr><td>PV máximo</td><td>150 + 25 × Nível + 20 × VIG</td></tr>
              <tr><td>Velocidade</td><td>20 + AGI + Nível ÷ 2</td></tr>
              <tr><td>Redução</td><td>DEF ÷ 2 % (máx. 50%)</td></tr>
              <tr><td>Crítico</td><td>5% + SOR ÷ 2 % (máx. 50%)</td></tr>
              <tr><td>Lúmia máxima</td><td>6, +1 nos níveis 10, 20, 30 e 40</td></tr>
              <tr><td>Instinto</td><td>1 + AGI ÷ 25 por combate</td></tr>
              <tr><td>Batidas extras</td><td>+1 com AGI 25, 50 e 75</td></tr>
            </table>
            <div class="quote">Do nível 1 ao 40, um personagem focado em Golpe vai de 34 a 424 de Base, e de 255 a 2.010 de PV.</div>
          </section>

          <section id="cx-lumia">
            <div class="eyebrow">III</div><h2>Lúmia</h2>
            <p>A moeda das ações especiais, como os Pontos de Ação de Expedition 33. ${lumiaBar(3, 6)}</p>
            <ul>
              <li>Não zera entre combates. Quem começa uma luta com menos de 2 sobe para 2.</li>
              <li>Ganha-se: Ataque Comum +1 · aparar ao menos um golpe da sequência +1 · habilidade Perfeita devolve 1 · Quebrar um inimigo +1 · Ampola de Lúmia +3 · descanso seguro enche.</li>
              <li>Gasta-se: habilidades (custo = perfeições), disparos (1 cada), Criar (1).</li>
            </ul>
          </section>

          <section id="cx-perfeicoes">
            <div class="eyebrow">IV</div><h2>Perfeições e Compasso</h2>
            <p>Toda habilidade tem de 1 a 6 perfeições ${pips(6, 4)}. O custo em Lúmia é igual ao número de perfeições. Supremas custam 7 a 9 e têm 6.</p>
            <p><span class="kbd">Dano = Base × (1 + 0,5 × perfeições alcançadas)</span>. Em área, metade: <span class="kbd">0,5 + 0,25 por perfeição</span>. Errar tudo ainda acerta, com o dano de um Ataque Comum.</p>
            <p>O Compasso: o narrador rola <span class="kbd">Nd4</span> e posta os números. O jogador responde na forma da habilidade. Conta da esquerda até o primeiro erro.</p>
            <table class="tbl">${LD.FORMAS.map((f) => `<tr><td class="serif" style="font-size:18px">${f.nome}</td><td>${f.regra}</td><td class="muted">${f.ex}</td></tr>`).join('')}</table>
            <p>Ao vivo, o narrador conta batidas, uma mensagem curta (<span class="kbd">·</span>) por batida: perfeições + 1, mais as batidas extras da Agilidade. A resposta precisa aparecer antes da última. Sem jogo ao vivo, o Compasso vira Pulso: um d6 por perfeição, cada 3+ conta, até o primeiro 1 ou 2.</p>
            <p>Todas as perfeições: acontece o Efeito Perfeito e 1 Lúmia volta.</p>
          </section>

          <section id="cx-leitura">
            <div class="eyebrow">V</div><h2>Leitura do Golpe</h2>
            <p>Cada inimigo tem os seus Sinais. O narrador descreve a sequência, com um sinal por golpe, e o jogador responde uma letra por golpe.</p>
            <table class="tbl">${LD.RESPOSTAS.map((r) => `<tr><td>${resp(r.key)}</td><td class="serif" style="font-size:18px">${r.nome}</td><td>${esc(r.desc)}</td></tr>`).join('')}<tr><td><span class="resp">X</span></td><td class="serif" style="font-size:18px">Aguentar</td><td>Sem ler: dano com o dobro da Redução (máx. 60%), sem condição.</td></tr></table>
            <ul>
              <li>Leu certo: 0 de dano. Leu errado: dano − Redução, e a condição do golpe.</li>
              <li>Aparar ao menos um golpe: +1 Lúmia. Aparar todos os que miravam você: contra-ataque e +1 Gradiente. Saltar todos os S: Golpe Saltado.</li>
              <li>Responder a uma finta deixa Desequilibrado: o próximo golpe acerta.</li>
              <li>Ao vivo, a Janela tem batidas pela velocidade do golpe (Lento 4, Normal 3, Rápido 2, Muito rápido 1), +1 por golpe extra. Para Aparar, é preciso uma batida de folga.</li>
              <li>Instinto: pergunte ao narrador a letra de um golpe (não o tempo do Aparo).</li>
            </ul>
          </section>

          <section id="cx-mira">
            <div class="eyebrow">VI</div><h2>Mira Livre e voadores</h2>
            <p>Disparo: 1 Lúmia, 1 × Base de Mira, até 3 por ação. No corpo, acerta sempre. Em ponto fraco, pede um Compasso Direto de 1 a 4 símbolos, pelo tamanho:</p>
            <table class="tbl">${LD.TAMANHOS.map((t) => `<tr><td class="serif" style="font-size:18px">${t.nome}</td><td class="r num">${t.simbolos} símbolo${t.simbolos > 1 ? 's' : ''}</td></tr>`).join('')}</table>
            <p>Voadores são a exceção ao dano inteiro. Ataques de perto não os alcançam. Ataques de longe pedem uma Leitura de Voo: o narrador descreve o movimento e o jogador diz para onde atira (Esquerda, Direita, Alto, Baixo). Habilidades de área acertam sem leitura.</p>
          </section>

          <section id="cx-elementos">
            <div class="eyebrow">VII</div><h2>Elementos</h2>
            <p>${LD.ELEMENTOS.map((e) => elemTag(e.key)).join(' ')}</p>
            <table class="tbl">${LD.RESISTENCIAS.map((r) => `<tr><td>${r.nome}</td><td class="r num">${r.mult < 0 ? 'cura 25%' : '× ' + r.mult.toLocaleString('pt-BR')}</td></tr>`).join('')}</table>
            <p>Inimigos não esquivam: todo ataque no corpo causa o dano inteiro, ajustado só pelo elemento.</p>
          </section>

          <section id="cx-quebra">
            <div class="eyebrow">VIII</div><h2>Quebra e Gradiente</h2>
            <p>Cada etapa de Quebra pede <span class="kbd">Defesa ÷ 20</span> pontos (mínimo 3). Ataque Comum +1, contra-ataque +1, disparo em ponto fraco +1, habilidades o valor escrito. Quebrado: perde a ação em andamento e o próximo turno, e recebe +25% de dano até o fim da próxima rodada.</p>
            <p>Gradiente: barra do grupo, de 0 a 3. +1 ao aparar uma sequência inteira, +1 a cada Quebra. 1 para aparar um golpe G. 3 para um Ataque em Dupla (cada um 3 × a Base, Quebra +3).</p>
          </section>

          <section id="cx-pictos">
            <div class="eyebrow">IX</div><h2>Pictos e Ecos</h2>
            <p>Pictos são objetos que dão bônus de Status e um efeito passivo. Cada Ascensor equipa até ${LD.MAX_PICTOS_EQUIPADOS}.</p>
            <ul>
              <li>Usar um Picto equipado em ${LD.DOMINIO_COMBATES} combates o deixa dominado.</li>
              <li>O efeito de um Picto dominado pode ser levado como Eco: sem o bônus de Status, pagando o custo em Pontos de Eco.</li>
              <li>Pontos de Eco: <span class="kbd">2 + Nível ÷ 2 + Cristais de Eco</span>.</li>
              <li>Um Picto não pode estar equipado e como Eco ao mesmo tempo.</li>
            </ul>
          </section>

          <section id="cx-ampolas">
            <div class="eyebrow">X</div><h2>Ampolas</h2>
            <p>As tintas de Expedition 33. Enchem nas bandeiras da Alpha e em todo descanso seguro. Usar gasta a ação.</p>
            <table class="tbl"><tr><td>Cura</td><td>50% do PV (+10% a cada 25 de ENG, até 80%)</td><td class="r">3 cargas</td></tr><tr><td>Lúmia</td><td>+3 Lúmia</td><td class="r">2 cargas</td></tr><tr><td>Retorno</td><td>Levanta um Caído com 50%</td><td class="r">1 carga</td></tr></table>
            <p>Três Fragmentos de Ampola: +1 carga máxima numa Ampola.</p>
          </section>

          <section id="cx-condicoes">
            <div class="eyebrow">XI</div><h2>Condições</h2>
            <table class="tbl">${LD.CONDICOES.map((c) => `<tr><td class="serif" style="font-size:18px;color:${c.tipo === 'pos' ? 'var(--lumia)' : 'var(--paper)'}">${c.nome}</td><td>${esc(c.efeito)}</td></tr>`).join('')}</table>
          </section>

          <section id="cx-testes">
            <div class="eyebrow">XII</div><h2>Testes fora de combate</h2>
            <p><span class="kbd">1d20 + Status ÷ 5</span> contra a Dificuldade: Fácil 10, Médio 15, Difícil 20, Heroico 25, Lendário 30. Vantagem e Desvantagem: 2d20, o maior ou o menor. 20 natural sempre funciona, 1 natural sempre falha.</p>
          </section>
        </div>
      </div>`;
    main.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const s = main.querySelector('#cx-' + a.dataset.go);
      if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  LD.views = LD.views || {};
  LD.views.codex = { titulo: 'Códice', numeral: 'VII', render };
})();
