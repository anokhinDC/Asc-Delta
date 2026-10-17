/*
 * Ascensão Delta · Lúmia
 * Motor de regras: todas as fórmulas do sistema ficam aqui.
 * As telas só leem destas funções, para que uma mudança de regra
 * aconteça num lugar só.
 */
(function () {
  const LD = (window.LD = window.LD || {});

  const STATUS = [
    { key: 'vig', sigla: 'VIG', nome: 'Vigor', grupo: 'base', desc: 'PV máximo. Resiste a Queimadura, Sangramento, frio e venenos.' },
    { key: 'agi', sigla: 'AGI', nome: 'Agilidade', grupo: 'base', desc: 'Velocidade. Instinto e batidas extras na defesa.' },
    { key: 'def', sigla: 'DEF', nome: 'Defesa', grupo: 'base', desc: 'Reduz o dano de todo golpe que acerta.' },
    { key: 'sor', sigla: 'SOR', nome: 'Sorte', grupo: 'base', desc: 'Chance de crítico. Achados e despojos raros.' },
    { key: 'von', sigla: 'VON', nome: 'Vontade', grupo: 'base', desc: 'Resiste a Medo, Sono, Encanto, Sonolência e Rachadura. Conversas e Vínculos.' },
    { key: 'gol', sigla: 'GOL', nome: 'Golpe', grupo: 'via', desc: 'Armas de perto. Dano Físico de corte e de impacto.' },
    { key: 'mir', sigla: 'MIR', nome: 'Mira', grupo: 'via', desc: 'Armas de longe e disparos. Pontos fracos e voadores.' },
    { key: 'ele', sigla: 'ELE', nome: 'Elemento', grupo: 'via', desc: 'Lúmia de Fogo, Gelo, Raio, Terra, Luz e Escuridão.' },
    { key: 'res', sigla: 'RES', nome: 'Ressonância', grupo: 'via', desc: 'Lúmia de som, palavra e canto. Curas e proteções.' },
    { key: 'eng', sigla: 'ENG', nome: 'Engenho', grupo: 'via', desc: 'Construtos, armadilhas, o giz, itens e Ampolas.' }
  ];
  const VIAS = STATUS.filter((s) => s.grupo === 'via');

  const ELEMENTOS = [
    { key: 'fisico', nome: 'Físico', cor: '#d8cfbd' },
    { key: 'fogo', nome: 'Fogo', cor: '#e2643a' },
    { key: 'gelo', nome: 'Gelo', cor: '#9fd4ee' },
    { key: 'raio', nome: 'Raio', cor: '#f2d45c' },
    { key: 'terra', nome: 'Terra', cor: '#b08a5a' },
    { key: 'agua', nome: 'Água', cor: '#5c93c9' },
    { key: 'luz', nome: 'Luz', cor: '#f5ecd2' },
    { key: 'escuridao', nome: 'Escuridão', cor: '#8a6fb0' },
    { key: 'som', nome: 'Som', cor: '#c98fb5' }
  ];

  const RESISTENCIAS = [
    { key: 'fraco', nome: 'Fraco', mult: 1.5 },
    { key: 'normal', nome: 'Normal', mult: 1 },
    { key: 'resiste25', nome: 'Resiste −25%', mult: 0.75 },
    { key: 'resiste30', nome: 'Resiste −30%', mult: 0.7 },
    { key: 'resiste50', nome: 'Resiste −50%', mult: 0.5 },
    { key: 'imune', nome: 'Imune', mult: 0 },
    { key: 'absorve', nome: 'Absorve', mult: -0.25 }
  ];

  const FORMAS = [
    { key: 'direto', nome: 'Direto', regra: 'Repetir na ordem.', ex: '3 1 4 → 3 1 4' },
    { key: 'invertido', nome: 'Invertido', regra: 'Ordem contrária.', ex: '3 1 4 → 4 1 3' },
    { key: 'espelhado', nome: 'Espelhado', regra: 'Trocar 1↔4 e 2↔3.', ex: '3 1 4 → 2 4 1' },
    { key: 'somado', nome: 'Somado', regra: 'Somar 1, o 4 vira 1.', ex: '3 1 4 → 4 2 1' }
  ];

  const ALVOS = [
    { key: 'unico', nome: 'Alvo único', area: false },
    { key: 'area', nome: 'Todos os inimigos', area: true },
    { key: 'areaPequena', nome: 'Área pequena', area: true },
    { key: 'aliado', nome: 'Um aliado', area: false },
    { key: 'aliados', nome: 'Todos os aliados', area: true },
    { key: 'si', nome: 'Si mesmo', area: false },
    { key: 'invoca', nome: 'Invocação', area: false }
  ];

  const TIPOS_HAB = [
    { key: 'dano', nome: 'Dano' },
    { key: 'cura', nome: 'Cura' },
    { key: 'escudo', nome: 'Escudo' },
    { key: 'suporte', nome: 'Suporte' },
    { key: 'controle', nome: 'Controle' }
  ];

  const LUMIA_TIPOS = ['Barreira', 'Fio', 'Canto', 'Palavra', 'Construto', 'Silêncio', 'Calor', 'Peso', 'Faísca'];

  const RESPOSTAS = [
    { key: 'E', nome: 'Esquivar', desc: 'Funciona contra golpes E e A.' },
    { key: 'S', nome: 'Saltar', desc: 'Só contra golpes rasteiros.' },
    { key: 'A1', nome: 'Aparar · tempo 1', desc: 'Só contra golpes A, no tempo 1.' },
    { key: 'A2', nome: 'Aparar · tempo 2', desc: 'Só contra golpes A, no tempo 2.' },
    { key: 'A3', nome: 'Aparar · tempo 3', desc: 'Só contra golpes A, no tempo 3.' },
    { key: 'F', nome: 'Finta (esperar)', desc: 'Nenhum golpe. A resposta certa é esperar.' },
    { key: 'G', nome: 'Gradiente', desc: 'Só se apara gastando 1 Gradiente.' }
  ];

  const VELOCIDADES = [
    { key: 'lento', nome: 'Lento', batidas: 4 },
    { key: 'normal', nome: 'Normal', batidas: 3 },
    { key: 'rapido', nome: 'Rápido', batidas: 2 },
    { key: 'muitoRapido', nome: 'Muito rápido', batidas: 1 }
  ];

  const CLAREZAS = [
    { key: 'clara', nome: 'Clara', desc: 'O sinal vem quase com as palavras da tabela.' },
    { key: 'normal', nome: 'Normal', desc: 'O sinal vem descrito com outras palavras.' },
    { key: 'sutil', nome: 'Sutil', desc: 'O sinal vem escondido na descrição, às vezes por som ou cheiro.' }
  ];

  const CATEGORIAS_MONSTRO = [
    { key: 'comum', nome: 'Comum' },
    { key: 'elite', nome: 'Elite' },
    { key: 'boss', nome: 'Boss' },
    { key: 'colosso', nome: 'Colosso' }
  ];

  const TAMANHOS = [
    { key: 'grande', nome: 'Grande', simbolos: 1 },
    { key: 'medio', nome: 'Médio', simbolos: 2 },
    { key: 'pequeno', nome: 'Pequeno', simbolos: 3 },
    { key: 'minusculo', nome: 'Minúsculo', simbolos: 4 }
  ];

  const CONDICOES = [
    { nome: 'Queimadura', tipo: 'neg', efeito: 'Perde PV no início de cada turno, por 3 turnos.' },
    { nome: 'Sangramento', tipo: 'neg', efeito: 'Perde 5% do PV máximo sempre que age.' },
    { nome: 'Congelado', tipo: 'neg', efeito: 'Perde o turno. +50% de dano Físico recebido.' },
    { nome: 'Atordoado', tipo: 'neg', efeito: 'Perde a próxima ação e não lê golpes (só Aguentar).' },
    { nome: 'Lento', tipo: 'neg', efeito: 'Fim da ordem. Janela −1 batida. Sem Instinto.' },
    { nome: 'Agarrado', tipo: 'neg', efeito: 'Não age e não reage.' },
    { nome: 'Derrubado', tipo: 'neg', efeito: 'A próxima leitura falha.' },
    { nome: 'Desequilibrado', tipo: 'neg', efeito: 'O próximo golpe da sequência acerta.' },
    { nome: 'Vulnerável', tipo: 'neg', efeito: '+50% de dano recebido.' },
    { nome: 'Marcado', tipo: 'neg', efeito: '+25% de dano recebido (ou o valor da ficha). Alvo preferido.' },
    { nome: 'Cego', tipo: 'neg', efeito: 'Não vê sinais de imagem. Sem Mira Livre.' },
    { nome: 'Silenciado', tipo: 'neg', efeito: 'Sem habilidades de Ressonância.' },
    { nome: 'Choque', tipo: 'neg', efeito: 'A próxima habilidade custa +1 Lúmia.' },
    { nome: 'Amaldiçoado', tipo: 'neg', efeito: 'Não pode ser curado.' },
    { nome: 'Medo', tipo: 'neg', efeito: 'Não ataca quem causou o Medo.' },
    { nome: 'Distraído', tipo: 'neg', efeito: 'Perde o próximo turno sem um teste de VON.' },
    { nome: 'Sono', tipo: 'neg', efeito: 'Fora do combate até ser acordado.' },
    { nome: 'Fortalecido', tipo: 'pos', efeito: '+25% de dano causado.' },
    { nome: 'Protegido', tipo: 'pos', efeito: '−25% de dano recebido.' },
    { nome: 'Acelerado', tipo: 'pos', efeito: 'Começo da ordem. Janela +1 batida.' },
    { nome: 'Regeneração', tipo: 'pos', efeito: 'Recupera 5% do PV no início do turno.' },
    { nome: 'Imbuído', tipo: 'pos', efeito: 'O Ataque Comum causa o elemento indicado.' },
    { nome: 'Focado', tipo: 'pos', efeito: 'O próximo Compasso perdoa o primeiro erro.' }
  ];

  const PICTO_BONUS = [
    { key: 'pv', nome: 'PV' },
    { key: 'velocidade', nome: 'Velocidade' },
    { key: 'reducao', nome: 'Redução %' },
    { key: 'critico', nome: 'Crítico %' },
    { key: 'gol', nome: 'Base de Golpe' },
    { key: 'mir', nome: 'Base de Mira' },
    { key: 'ele', nome: 'Base de Elemento' },
    { key: 'res', nome: 'Base de Ressonância' },
    { key: 'eng', nome: 'Base de Engenho' }
  ];

  const MAX_PICTOS_EQUIPADOS = 3;
  const MAX_HABILIDADES_EQUIPADAS = 6;
  const DOMINIO_COMBATES = 4;

  const byKey = (list, key) => list.find((x) => x.key === key);
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- Personagem ---------------- */

  function pontosTotais(nivel) {
    // 10 Status em 1 + 10 da criação + 3 por nível depois do primeiro
    return 10 + 10 + 3 * (Math.max(1, nivel) - 1);
  }

  function pontosGastos(status) {
    return STATUS.reduce((s, st) => s + num(status[st.key], 1), 0);
  }

  function novoStatus() {
    const s = {};
    STATUS.forEach((st) => (s[st.key] = 1));
    return s;
  }

  function lumiaMaxima(nivel) {
    let m = 6;
    [10, 20, 30, 40].forEach((n) => { if (nivel >= n) m++; });
    return Math.min(10, m);
  }

  function pontosDeEco(nivel, cristais) {
    return 2 + Math.floor(Math.max(1, nivel) / 2) + num(cristais);
  }

  function aprendizados(nivel) {
    // 3 na criação, +1 por nível (habilidade nova ou perfeição a mais)
    return 3 + (Math.max(1, nivel) - 1);
  }

  /* Soma os bônus de pictos equipados e da arma. */
  function bonusEquipamento(char, lib) {
    const b = { pv: 0, velocidade: 0, reducao: 0, critico: 0, gol: 0, mir: 0, ele: 0, res: 0, eng: 0 };
    (char.pictosEquipados || []).forEach((id) => {
      const p = lib.pictos.find((x) => x.id === id);
      if (!p || !p.bonus) return;
      Object.keys(b).forEach((k) => (b[k] += num(p.bonus[k])));
    });
    const arma = lib.armas.find((a) => a.id === char.armaId);
    return { bonus: b, arma };
  }

  function derivados(char, lib) {
    lib = lib || { pictos: [], armas: [] };
    const N = Math.max(1, num(char.nivel, 1));
    const s = Object.assign(novoStatus(), char.status || {});
    const { bonus, arma } = bonusEquipamento(char, lib);

    const bases = {};
    VIAS.forEach((v) => {
      let b = 4 * N + 6 * num(s[v.key], 1) + num(bonus[v.key]);
      if (arma && arma.via === v.key) b += num(arma.poder);
      bases[v.key] = b;
    });

    const pvMax = 150 + 25 * N + 20 * num(s.vig, 1) + num(bonus.pv);
    const eng = num(s.eng, 1);
    const curaAmpola = 50 + 10 * Math.floor(Math.min(eng, 75) / 25);

    return {
      nivel: N,
      pvMax,
      bases,
      velocidade: 20 + num(s.agi, 1) + Math.floor(N / 2) + num(bonus.velocidade),
      reducao: clamp(Math.floor(num(s.def, 1) / 2) + num(bonus.reducao), 0, 50),
      critico: clamp(5 + Math.floor(num(s.sor, 1) / 2) + num(bonus.critico), 0, 50),
      lumiaMax: lumiaMaxima(N),
      instinto: 1 + Math.floor(num(s.agi, 1) / 25),
      batidas: Math.min(3, Math.floor(num(s.agi, 1) / 25)),
      curaAmpola,
      pontosTotais: pontosTotais(N),
      pontosGastos: pontosGastos(s),
      pontosEco: pontosDeEco(N, char.cristaisEco),
      aprendizados: aprendizados(N),
      bonusTeste: (key) => Math.floor(num(s[key], 1) / 5),
      arma
    };
  }

  function validarStatus(char) {
    const avisos = [];
    const N = Math.max(1, num(char.nivel, 1));
    const s = Object.assign(novoStatus(), char.status || {});
    const tot = pontosTotais(N);
    const gasto = pontosGastos(s);
    if (gasto > tot) avisos.push(`${gasto - tot} ponto(s) acima do permitido para o nível ${N}.`);
    if (N === 1) {
      STATUS.forEach((st) => {
        if (num(s[st.key], 1) > 6) avisos.push(`${st.nome} passa de 6 na criação.`);
      });
    }
    STATUS.forEach((st) => {
      if (num(s[st.key], 1) > 99) avisos.push(`${st.nome} passa de 99.`);
    });
    return avisos;
  }

  /* ---------------- Habilidades ---------------- */

  function custoHabilidade(h) {
    if (h.suprema) return clamp(num(h.custoSuprema, 7), 7, 9);
    return clamp(num(h.perfeicoes, 1), 1, 6);
  }

  function ehArea(h) {
    const a = byKey(ALVOS, h.alvo);
    return !!(a && a.area);
  }

  function multiplicador(h, alcancadas) {
    const k = clamp(num(alcancadas), 0, h.suprema ? 6 : num(h.perfeicoes, 1));
    return ehArea(h) ? 0.5 + 0.25 * k : 1 + 0.5 * k;
  }

  function nivelMinimo(h) {
    if (h.suprema) return 25;
    if (num(h.perfeicoes, 1) >= 5) return 10;
    return 1;
  }

  function perfeicoesDe(h) {
    return h.suprema ? 6 : clamp(num(h.perfeicoes, 1), 1, 6);
  }

  function tabelaHabilidade(h, base) {
    const n = perfeicoesDe(h);
    const linhas = [];
    for (let k = 0; k <= n; k++) {
      const m = multiplicador(h, k);
      linhas.push({ perfeicoes: k, mult: m, valor: base != null ? Math.round(base * m) : null, perfeita: k === n });
    }
    return linhas;
  }

  /* ---------------- Monstros ---------------- */

  function pontosQuebra(defesa) {
    return Math.max(3, Math.ceil(num(defesa) / 20));
  }

  // Experiência: subir do nível N para N+1 custa 75 × N de XP (Mecânicas/Leis/Experiência).
  const XP_CUSTO = 75;
  const PAPEIS_XP = [
    { key: 'comum', nome: 'Comum', mult: 1 },
    { key: 'elite', nome: 'Elite', mult: 2 },
    { key: 'chefe', nome: 'Chefe', mult: 3 }
  ];
  function xpParaNivel(n) {
    const N = Math.max(1, Math.floor(num(n, 1)));
    return (XP_CUSTO * N * (N - 1)) / 2;
  }
  function nivelPorXp(xp) {
    const x = Math.max(0, num(xp));
    let n = 1;
    while (n < 99 && xpParaNivel(n + 1) <= x) n++;
    return n;
  }
  // XP guardado na ficha, nunca abaixo do mínimo do nível atual.
  function xpDaFicha(char) {
    return Math.max(num(char && char.xp), xpParaNivel(num(char && char.nivel, 1)));
  }
  function progressoXp(char) {
    const xp = xpDaFicha(char);
    const nivel = nivelPorXp(xp);
    const base = xpParaNivel(nivel);
    const proximo = nivel >= 99 ? base : xpParaNivel(nivel + 1);
    return { xp, nivel, base, proximo, falta: Math.max(0, proximo - xp), fracao: proximo > base ? (xp - base) / (proximo - base) : 1 };
  }
  function xpDeInimigo(nivelInimigo, papel, nivelGrupo) {
    const n = Math.max(1, num(nivelInimigo, 1));
    const g = Math.max(1, num(nivelGrupo, 1));
    const mult = (PAPEIS_XP.find((p) => p.key === papel) || PAPEIS_XP[0]).mult;
    const ajuste = clamp(1 + 0.1 * (n - g), 0.5, 1.5);
    return Math.floor(20 * n * mult * ajuste + 0.5);
  }

  // Ascensor de referência do mesmo nível: investe 1 ponto por nível
  // numa Via, em Vigor e em Agilidade (como a tabela de crescimento).
  function referencia(nivel) {
    const N = Math.max(1, num(nivel, 1));
    const vig = 4 + (N - 1);
    const via = 5 + (N - 1);
    return {
      pv: 150 + 25 * N + 20 * vig,
      base: 4 * N + 6 * via
    };
  }

  function analiseMonstro(m, tamanhoGrupo) {
    const n = Math.max(1, num(tamanhoGrupo, 4));
    const ref = referencia(m.nivel);
    const pq = pontosQuebra(m.defesa);
    const etapas = clamp(num(m.quebraEtapas, 1), 0, 5);
    const pv = num(m.pv);
    // Dano médio do grupo por rodada: cada um ~1,75× a Base (mistura de Ataque Comum e habilidades)
    const danoGrupo = n * ref.base * 1.75;
    const ataques = (m.ataques || []).map((a) => {
      const golpes = Math.max(1, num(a.golpes, 1));
      const dano = num(a.dano);
      const total = golpes * dano;
      return {
        nome: a.nome,
        porGolpePct: ref.pv ? (dano / ref.pv) * 100 : 0,
        totalPct: ref.pv ? (total / ref.pv) * 100 : 0,
        total
      };
    });
    const sugestao = {
      comum: [Math.round(ref.pv * 0.6), Math.round(ref.pv * 1.2)],
      elite: [Math.round(ref.pv * 3), Math.round(ref.pv * 5)],
      boss: [Math.round(ref.pv * n * 2), Math.round(ref.pv * n * 2.6)],
      colosso: [Math.round(ref.pv * n * 4), Math.round(ref.pv * n * 8)]
    };
    return {
      ref,
      pq,
      etapas,
      quebraTotal: pq * etapas,
      rodadas: danoGrupo ? pv / danoGrupo : 0,
      ataques,
      sugestao,
      grupo: n
    };
  }

  /* ---------------- Calculadora de dano ---------------- */

  function multResistencia(monstro, elemento) {
    if (!monstro || !elemento) return 1;
    const r = (monstro.resistencias || {})[elemento] || 'normal';
    const def = byKey(RESISTENCIAS, r);
    return def ? def.mult : 1;
  }

  function calcularDano(o) {
    // o: base, mult, elementoMult, mods[], pontoFraco, critico
    let d = num(o.base) * num(o.mult, 1);
    const passos = [{ t: 'Base × multiplicador', v: Math.round(d) }];
    let modTotal = 0;
    (o.mods || []).forEach((m) => (modTotal += m));
    if (modTotal) {
      d *= 1 + modTotal;
      passos.push({ t: `Modificadores (+${Math.round(modTotal * 100)}%)`, v: Math.round(d) });
    }
    if (num(o.pontoFraco, 1) !== 1) {
      d *= num(o.pontoFraco, 1);
      passos.push({ t: `Ponto fraco ×${o.pontoFraco}`, v: Math.round(d) });
    }
    if (o.critico) {
      d *= 1.5;
      passos.push({ t: 'Crítico ×1,5', v: Math.round(d) });
    }
    const em = num(o.elementoMult, 1);
    d *= em;
    if (em !== 1) passos.push({ t: em < 0 ? 'Absorvido (cura o alvo)' : `Elemento ×${em}`, v: Math.round(d) });
    return { valor: Math.round(d), passos };
  }

  function danoRecebido(dano, reducaoPct, aguentar) {
    const red = clamp(aguentar ? reducaoPct * 2 : reducaoPct, 0, aguentar ? 60 : 50);
    return Math.round(num(dano) * (1 - red / 100));
  }

  Object.assign(LD, {
    STATUS, VIAS, ELEMENTOS, RESISTENCIAS, FORMAS, ALVOS, TIPOS_HAB, LUMIA_TIPOS,
    RESPOSTAS, VELOCIDADES, CLAREZAS, CATEGORIAS_MONSTRO, TAMANHOS, CONDICOES, PICTO_BONUS,
    MAX_PICTOS_EQUIPADOS, MAX_HABILIDADES_EQUIPADAS, DOMINIO_COMBATES,
    byKey, num, clamp, PAPEIS_XP,
    rules: {
      pontosTotais, pontosGastos, novoStatus, lumiaMaxima, pontosDeEco, aprendizados,
      derivados, validarStatus,
      custoHabilidade, multiplicador, nivelMinimo, perfeicoesDe, tabelaHabilidade, ehArea,
      pontosQuebra, referencia, analiseMonstro,
      multResistencia, calcularDano, danoRecebido,
      xpParaNivel, nivelPorXp, xpDaFicha, progressoXp, xpDeInimigo
    }
  });
})();
