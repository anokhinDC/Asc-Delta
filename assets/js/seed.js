/*
 * Beyond Depths · Lúmia
 * Biblioteca inicial, tirada do Roteiro (Ato I).
 * O mestre grava isto no banco pelo botão "Carregar biblioteca inicial".
 * Os ids são fixos, então carregar de novo atualiza em vez de duplicar.
 */
(function () {
  const LD = (window.LD = window.LD || {});

  const habilidades = [
    {
      id: 'seed_hab_lamina_fio', nome: 'Lâmina de Fio', via: 'gol', elemento: 'luz', tipo: 'dano', alvo: 'unico',
      perfeicoes: 2, forma: 'direto', quebra: 1,
      porPerfeicao: [],
      perfeita: 'O alvo fica Marcado.',
      tags: ['Ignora Resistência a Físico'],
      descricao: 'Um corte de luz tão fino que não faz barulho. A técnica de Nikolai Sázonov. Vera reconhece o corte.',
      origem: 'Lúmia de Fio'
    },
    {
      id: 'seed_hab_martelo', nome: 'Martelo de Trilho', via: 'gol', elemento: 'fisico', tipo: 'dano', alvo: 'unico',
      perfeicoes: 3, forma: 'direto', quebra: 2,
      porPerfeicao: [{ n: 2, texto: 'Quebra +1.' }],
      perfeita: 'Quebra +2 e o alvo fica Derrubado.',
      tags: [],
      descricao: 'Um golpe de cima para baixo, com o peso inteiro do corpo, como os Tuskar batem os pregos da linha.',
      origem: 'Lúmia de Peso'
    },
    {
      id: 'seed_hab_bastiao', nome: 'Bastião', via: 'res', elemento: 'luz', tipo: 'escudo', alvo: 'aliados',
      perfeicoes: 4, forma: 'espelhado', quebra: 0,
      porPerfeicao: [],
      perfeita: 'Protegido por 2 turnos em todos os aliados.',
      tags: [],
      descricao: 'Uma muralha de luz cristalizada que cobre o grupo inteiro. A barreira de Irina Volkova.',
      origem: 'Lúmia de Barreira'
    },
    {
      id: 'seed_hab_vigilia', nome: 'Vigília', via: 'res', elemento: 'som', tipo: 'suporte', alvo: 'aliados',
      perfeicoes: 2, forma: 'direto', quebra: 0,
      porPerfeicao: [{ n: 1, texto: '−1 de Sonolência ou de Rachadura em todos.' }, { n: 2, texto: '−1 a mais.' }],
      perfeita: 'Remove Sono e Medo.',
      tags: ['Atrai a Marca do Líkho'],
      descricao: 'Um canto contínuo de três notas que mantém o grupo desperto. O canto de Tíkon.',
      origem: 'Lúmia de Canto'
    },
    {
      id: 'seed_hab_chuva_faiscas', nome: 'Chuva de Faíscas', via: 'mir', elemento: 'raio', tipo: 'dano', alvo: 'area',
      perfeicoes: 5, forma: 'invertido', quebra: 1,
      porPerfeicao: [{ n: 3, texto: 'Choque em todos.' }],
      perfeita: 'Choque e Lento em todos os inimigos.',
      tags: ['Acerta voadores sem leitura'],
      descricao: 'Uma rajada de disparos de Lúmia que se abre como um leque.',
      origem: 'Lúmia de Faísca'
    },
    {
      id: 'seed_hab_ajudante', nome: 'Pequeno Ajudante', via: 'eng', elemento: 'fisico', tipo: 'controle', alvo: 'invoca',
      perfeicoes: 3, forma: 'somado', quebra: 0,
      porPerfeicao: [{ n: 1, texto: 'O construto serve de Isca por 1 turno a cada perfeição.' }],
      perfeita: 'O construto explode ao sumir: 2 × Base de Engenho em área pequena.',
      tags: [],
      descricao: 'Um construto de latão do tamanho de um gato, na linha do Kotik da Mila.',
      origem: 'Lúmia de Construto'
    },
    {
      id: 'seed_hab_criar', nome: 'Criar', via: 'eng', elemento: 'luz', tipo: 'suporte', alvo: 'si',
      perfeicoes: 1, forma: 'direto', quebra: 0,
      porPerfeicao: [],
      perfeita: 'A criação dura 1 turno a mais, ou o Abrigo absorve o dobro.',
      tags: ['Exige o giz', 'Custa uma Lacuna'],
      descricao: 'Lúmia escrita com o giz do Vagão 4. Formas: Abrigo (absorve 2 × Base de Engenho), Degrau, Luz, Isca. A cada uso, o jogador anota o que deixou no desenho.',
      origem: 'Vagão 4'
    },
    {
      id: 'seed_hab_nucleo_calor', nome: 'Brasa de Bairro', via: 'ele', elemento: 'fogo', tipo: 'dano', alvo: 'unico',
      perfeicoes: 4, forma: 'somado', quebra: 2,
      porPerfeicao: [{ n: 2, texto: 'Queimadura.' }],
      perfeita: 'Queimadura e o alvo fica Vulnerável a Gelo até o fim da rodada.',
      tags: [],
      descricao: 'A técnica dos caldeireiros de Belogrado: concentrar o calor de um aquecedor inteiro na palma da mão.',
      origem: 'Lúmia de Calor'
    },
    {
      id: 'seed_hab_verso', nome: 'Verso que Desvia', via: 'res', elemento: 'som', tipo: 'controle', alvo: 'unico',
      perfeicoes: 3, forma: 'invertido', quebra: 0,
      porPerfeicao: [{ n: 2, texto: 'O alvo fica Distraído.' }],
      perfeita: 'O alvo gasta a próxima ação atacando uma ilusão.',
      tags: [],
      descricao: 'Versos recitados que mudam o que o inimigo vê. A Lúmia de Vera Tsvetova.',
      origem: 'Lúmia de Palavra'
    }
  ];

  const armas = [
    { id: 'seed_arma_sabre_trilho', nome: 'Sabre de Trilho', via: 'gol', elemento: 'fisico', poder: 10, quebra: 1,
      passivas: [{ nivel: 4, texto: 'Ataque Comum causa Quebra +1 extra em inimigos Derrubados.' }],
      descricao: 'Forjado por Klaus Klykov com um pedaço da linha da montanha. Pesado, lento, honesto.', origem: 'Klaus · Teplovo' },
    { id: 'seed_arma_lamina_cabo', nome: 'Lâmina de Cabo Vivo', via: 'gol', elemento: 'raio', poder: 6, quebra: 0,
      passivas: [{ nivel: 1, texto: 'Críticos aplicam Choque.' }],
      descricao: 'Uma lâmina fina enrolada num cabo de Lúmia que ainda pulsa.', origem: 'Klaus · Teplovo' },
    { id: 'seed_arma_rifle_guarda', nome: 'Rifle da Guarda', via: 'mir', elemento: 'fisico', poder: 8, quebra: 0,
      passivas: [{ nivel: 1, texto: 'O primeiro disparo de cada combate não custa Lúmia.' }],
      descricao: 'O modelo padrão da Guarda de Belogrado. Lyova Krainov tinha um igual.', origem: 'Belogrado' },
    { id: 'seed_arma_sabre_nikolai', nome: 'Sabre de Oficial (de Nikolai)', via: 'gol', elemento: 'luz', poder: 14, quebra: 0,
      passivas: [{ nivel: 1, texto: 'Lâmina de Fio custa 1 Lúmia a menos (mínimo 1).' }, { nivel: 10, texto: 'Aparar todos os golpes de uma sequência marca o atacante.' }],
      descricao: 'A lâmina perfeita que Klaus guardava porque "o dono ainda vem buscar". Três passos e um arrastado.', origem: 'Klaus · Teplovo (Vera)' },
    { id: 'seed_arma_diapasao', nome: 'Diapasão do Cantor', via: 'res', elemento: 'som', poder: 8, quebra: 0,
      passivas: [{ nivel: 1, texto: 'Uma vez por combate, interrompe um efeito sonoro em andamento.' }],
      descricao: 'Prêmio de Hans Gólos na Arena Kruglá.', origem: 'Arena Kruglá' },
    { id: 'seed_arma_arco_betula', nome: 'Arco de Bétula', via: 'res', elemento: 'som', poder: 10, quebra: 0,
      passivas: [{ nivel: 1, texto: 'Uma vez por combate, uma nota faz um inimigo comum adormecer por 1 turno.' }],
      descricao: 'O arco com que Dryóma tocava a Xiǎo Xián. Mila sabe usar sem nunca ter tocado violino.', origem: 'Salão de Chá' }
  ];

  const pictos = [
    { id: 'seed_picto_frasco_calor', nome: 'Frasco de Calor', bonus: { pv: 40, reducao: 2 }, custoEco: 2,
      efeito: 'O frio dos postes e das regiões geladas tira metade do PV.', descricao: 'Uma brasa de Tolstik presa num vidro.', origem: 'Tolstik' },
    { id: 'seed_picto_placa_gruzdev', nome: 'Placa Extra do Gruzdev', bonus: { pv: 80, reducao: 4 }, custoEco: 4,
      efeito: 'Uma vez por combate, absorve um golpe dirigido a um aliado ("Segura!").', descricao: 'Uma placa soldada por cima de outra placa.', origem: 'Arena Kruglá' },
    { id: 'seed_picto_luneta', nome: 'Luneta de Strélkov', bonus: { critico: 4, mir: 6 }, custoEco: 3,
      efeito: 'O primeiro disparo em ponto fraco de cada combate pede 1 símbolo a menos no Compasso.', descricao: 'A lente comprida de Otto Strélkov.', origem: 'Arena Kruglá' },
    { id: 'seed_picto_presa_rei', nome: 'Presa do Rei', bonus: { pv: 120, velocidade: 2 }, custoEco: 5,
      efeito: 'Imune a Congelado. Resistência extrema ao frio.', descricao: 'Ninguém empurra o Rei. Quase ninguém.', origem: 'Bolshói' },
    { id: 'seed_picto_engrenagem', nome: 'Engrenagem de Passagem', bonus: { velocidade: 3 }, custoEco: 2,
      efeito: 'Ganho de Sonolência pela metade.', descricao: 'Bronze, do tamanho de uma palma, com um dente curvo.', origem: 'Bolshói' },
    { id: 'seed_picto_xicara', nome: 'Xícara da Anfitriã', bonus: { res: 6 }, custoEco: 4,
      efeito: 'Imune a Sonolência. Quem a carrega ouve uma canção baixa quando está sozinho.', descricao: 'Porcelana trincada, sempre morna.', origem: 'Salão de Chá' },
    { id: 'seed_picto_grampo', nome: 'Grampo de Borboleta', bonus: { critico: 3 }, custoEco: 1,
      efeito: 'As borboletas dos Tuskar pousam em quem o carrega. +1 ponto de Vínculo na primeira cena com cada Tuskar.', descricao: 'O grampo de Sônia, filha de Gleb.', origem: 'Gleb Morózov' },
    { id: 'seed_picto_pena_rubra', nome: 'Pena Rubra', bonus: { velocidade: 2, ele: 4 }, custoEco: 2,
      efeito: 'Esquenta quando aponta para o que está procurando. Os Smychki hesitam diante dela.', descricao: 'Um presente de Pésnia.', origem: 'Pésnia' },
    { id: 'seed_picto_lanterna', nome: 'Lanterna de Arkádi', bonus: { mir: 4 }, custoEco: 2,
      efeito: 'Revela marcas escondidas da Alpha. Anula a escuridão comum.', descricao: 'Latão, com o símbolo da Alpha no vidro.', origem: 'Antiga Estação Nízhnaya' },
    { id: 'seed_picto_nota_guardada', nome: 'Nota Guardada', bonus: { pv: 30 }, custoEco: 3,
      efeito: 'Uma vez por campanha: refazer um teste de Vontade ou cancelar Medo, Sono ou Encanto.', descricao: 'Uma frase de alguém que se foi, dentro da música de Pésnia.', origem: 'Lar de Pésnia' },
    { id: 'seed_picto_caco', nome: 'Caco de Samovar', bonus: { reducao: 3 }, custoEco: 2,
      efeito: 'Uma vez por cena, zera 2 de Sonolência de quem o segura.', descricao: 'Cobre que continua quente por um dia inteiro.', origem: 'Portão dos Anjos' },
    { id: 'seed_picto_avental', nome: 'Avental Manchado', bonus: { pv: 20 }, custoEco: 2,
      efeito: 'As Kukly não atacam quem o veste enquanto ele não atacar primeiro.', descricao: 'Branco, manchado de chá.', origem: 'Krasnolés' }
  ];

  const itens = [
    { id: 'seed_item_ampola_cura', nome: 'Ampola de Cura', categoria: 'ampola', rapido: false, efeito: 'Recupera 50% do PV de um aliado (mais com Engenho).', descricao: 'Carga limitada. Enche nas bandeiras da Alpha.', origem: 'Expedição' },
    { id: 'seed_item_ampola_lumia', nome: 'Ampola de Lúmia', categoria: 'ampola', rapido: false, efeito: '+3 Lúmia num aliado.', descricao: 'Carga limitada. Enche nas bandeiras da Alpha.', origem: 'Expedição' },
    { id: 'seed_item_ampola_retorno', nome: 'Ampola de Retorno', categoria: 'ampola', rapido: false, efeito: 'Levanta um aliado Caído com 50% do PV.', descricao: 'Carga limitada. Enche nas bandeiras da Alpha.', origem: 'Expedição' },
    { id: 'seed_item_fragmento', nome: 'Fragmento de Ampola', categoria: 'material', rapido: false, efeito: 'Três fragmentos aumentam em 1 a carga máxima de uma Ampola.', descricao: '', origem: 'Pelo caminho' },
    { id: 'seed_item_cristal_eco', nome: 'Cristal de Eco', categoria: 'material', rapido: false, efeito: '+1 Ponto de Eco permanente.', descricao: 'Um pedaço de neve da Nevada que não se desfaz.', origem: 'Raro' },
    { id: 'seed_item_cha_tolstik', nome: 'Chá de Tolstik', categoria: 'consumivel', rapido: true, efeito: 'Cura 10% do PV. Queima a língua de verdade.', descricao: '', origem: 'Tolstik' },
    { id: 'seed_item_tonico', nome: 'Tônico de Óleo Doce', categoria: 'consumivel', rapido: false, efeito: 'Cura 30% do PV de um aliado.', descricao: 'Gosto de parafuso.', origem: 'Tolstik' },
    { id: 'seed_item_bocejo', nome: 'Bocejo em Frasco', categoria: 'consumivel', rapido: false, efeito: 'Arremessável. Sonolência +3 num inimigo.', descricao: 'Um bocejo de verdade, engarrafado.', origem: 'Tolstik' },
    { id: 'seed_item_sopa', nome: 'Sopa de Parafuso', categoria: 'consumivel', rapido: false, efeito: 'Cura 20% do PV e imunidade à Sonolência por um trecho.', descricao: '', origem: 'Glukhói' },
    { id: 'seed_item_tampoes', nome: 'Tampões de Cera', categoria: 'consumivel', rapido: true, efeito: 'Efeitos de canto dão metade da Sonolência por um combate.', descricao: '', origem: 'Glukhói' },
    { id: 'seed_item_gelo_azul', nome: 'Gelo Azul Antigo', categoria: 'consumivel', rapido: false, efeito: 'Enche a barra de Lúmia de um aliado.', descricao: 'Muito caro.', origem: 'Babka Ulla' },
    { id: 'seed_item_giz', nome: 'Giz de Lúmia', categoria: 'chave', rapido: false, efeito: 'Permite usar Criar.', descricao: 'Um para cada membro do grupo, da gaveta do Quarto Pequeno Demais.', origem: 'Vagão 4' }
  ];

  const sinaisNachalnik = [
    { sinal: 'O Anel gira mais rápido.', resposta: 'E' },
    { sinal: 'Os cabos tocam a plataforma.', resposta: 'S' },
    { sinal: 'O bico recua e as penas se fecham (uma, duas ou três vezes).', resposta: 'A2' },
    { sinal: 'O Anel para e brilha, e nada vem.', resposta: 'F' },
    { sinal: 'O Núcleo ruge e o Anel desce até o chão.', resposta: 'G' }
  ];

  const monstros = [
    {
      id: 'seed_mon_kamenets_rastejador', nome: 'Kámenets Rastejador', nivel: 2, categoria: 'comum',
      habitat: 'Túneis da Antiga Estação, minas e cavernas da base do Monte Versina',
      descricao: 'Anda curvado sob uma carapaça de pedra clara, rachada como laje de calçada. Dorme preso ao teto e caça pelo som.',
      imagem: '', pv: 220, velocidade: 30, defesa: 20, quebraEtapas: 1, acoesPorTurno: 1,
      resistencias: { fisico: 'resiste30' }, imunidades: '',
      voa: false, sinaisVoo: [], clareza: 'clara',
      sinais: [
        { sinal: 'As garras raspam a pedra, de lado.', resposta: 'S' },
        { sinal: 'A boca se abre e ele se agacha.', resposta: 'E' },
        { sinal: 'Enrola-se e a carapaça estala.', resposta: 'S' }
      ],
      ataques: [
        { nome: 'Mordida', elemento: 'fisico', alvo: 'unico', golpes: 1, dano: 45, velocidade: 'normal', sequencia: 'E', condicao: 'Sangramento', descricao: 'Salta e morde.' },
        { nome: 'Garras Rubras', elemento: 'fisico', alvo: 'unico', golpes: 2, dano: 35, velocidade: 'normal', sequencia: 'S E', condicao: '', descricao: 'Varrem o chão e depois cortam no alto.' },
        { nome: 'Investida Rolante', elemento: 'fisico', alvo: 'unico', golpes: 1, dano: 60, velocidade: 'lento', sequencia: 'S', condicao: 'Lento', descricao: 'Rola contra o alvo. Durante a investida, o Ventre fica exposto.' }
      ],
      pontosFracos: [{ nome: 'Ventre', tamanho: 'medio', efeito: 'Dano × 2 e Quebra +1. Só exposto durante a Investida Rolante.' }],
      fases: '', despojos: 'Placa de carapaça (material).', revelado: true, notas: 'Bando: cada outro Rastejador vivo dá +10% de dano (até +30%).'
    },
    {
      id: 'seed_mon_nachalnik', nome: 'Nachálnik, o Chefe da Estação', nivel: 8, categoria: 'boss',
      habitat: 'Salão central da Antiga Estação Nízhnaya',
      descricao: 'Uma figura encapuzada de cinco metros, suspensa sobre uma plataforma laranja. Máscara de bico negro, manto de penas e cabos, um coração incandescente numa gaiola de costelas.',
      imagem: '', pv: 4200, velocidade: 34, defesa: 90, quebraEtapas: 3, acoesPorTurno: 1,
      resistencias: { fogo: 'absorve', gelo: 'fraco', luz: 'resiste25' }, imunidades: 'Queimadura, Congelado',
      voa: false, sinaisVoo: [], clareza: 'normal',
      sinais: sinaisNachalnik,
      ataques: [
        { nome: 'Garras de Cabo', elemento: 'fisico', alvo: 'unico', golpes: 3, dano: 90, velocidade: 'normal', sequencia: 'S E A2', condicao: 'Vulnerável (último golpe)', descricao: 'Os cabos do manto se erguem, varrem o chão e descem em dois cortes.' },
        { nome: 'Chuva de Penas', elemento: 'fisico', alvo: 'area', golpes: 4, dano: 40, velocidade: 'rapido', sequencia: 'E E S F', condicao: '', descricao: 'Penas negras disparam do manto como agulhas.' },
        { nome: 'Apito de Partida', elemento: 'fisico', alvo: 'area', golpes: 1, dano: 50, velocidade: 'muitoRapido', sequencia: 'A1', condicao: 'Atordoado', descricao: 'Um apito agudo. Aumenta o Contador do Anel em 2.' },
        { nome: 'Despacho', elemento: 'fogo', alvo: 'unico', golpes: 2, dano: 60, velocidade: 'normal', sequencia: 'S A3', condicao: 'Queimadura, Agarrado', descricao: 'Um cabo puxa o alvo para o centro em brasa.' },
        { nome: 'Última Chamada', elemento: 'fogo', alvo: 'area', golpes: 7, dano: 55, velocidade: 'rapido', sequencia: 'E E S A2 E S G', condicao: '', descricao: 'Quando o Contador chega a 5. O Anel desce e gira.' }
      ],
      pontosFracos: [
        { nome: 'Núcleo Incandescente', tamanho: 'medio', efeito: 'Dano × 3. Só exposto no Núcleo Incandescente ou depois de uma Quebra.' },
        { nome: 'Anel', tamanho: 'grande', efeito: 'Três acertos: reduz o Contador em 1. Destruído, começa a Fase II.' },
        { nome: 'Estalactite (6)', tamanho: 'grande', efeito: '220 de Gelo no Chefe (330 com a fraqueza).' }
      ],
      fases: 'Fase I (100–70%): 1 ação. Fase II (70–40%): o Anel cai, 2 ações. Fase III (<40%): +25% de dano, Última Chamada a cada 3 turnos.',
      despojos: 'Núcleo Incandescente (se derrubado). Pena de Cabo.', revelado: true,
      notas: 'Final alternativo: abaixo de 10%, se ninguém atacar, ele se desativa e a estação continua quente.'
    },
    {
      id: 'seed_mon_kukla', nome: 'Kukla', nivel: 4, categoria: 'comum',
      habitat: 'Mesas e Salão de Chá de Krasnolés',
      descricao: 'Bonecas de pano e porcelana que servem chá e só atacam quem recusa.',
      imagem: '', pv: 220, velocidade: 26, defesa: 30, quebraEtapas: 1, acoesPorTurno: 1,
      resistencias: { fogo: 'resiste50', raio: 'fraco' }, imunidades: '',
      voa: false, sinaisVoo: [], clareza: 'clara',
      sinais: [
        { sinal: 'Ergue o bule acima da cabeça.', resposta: 'E' },
        { sinal: 'Faz uma reverência com o bule para a frente.', resposta: 'A1' }
      ],
      ataques: [
        { nome: 'Chá Fervente', elemento: 'fogo', alvo: 'areaPequena', golpes: 1, dano: 40, velocidade: 'normal', sequencia: 'E', condicao: 'Queimadura', descricao: '' }
      ],
      pontosFracos: [], fases: '', despojos: 'Avental Manchado.', revelado: true,
      notas: 'Cura aliados próximos em 10% do PV por turno se alguém do grupo comeu da mesa.'
    },
    {
      id: 'seed_mon_smychok', nome: 'Smychók', nivel: 6, categoria: 'comum',
      habitat: 'Copas das bétulas no oeste de Krasnolés',
      descricao: 'Arcos de violino de bétula, com crina branca, que voam como andorinhas. São as notas roubadas da Xiǎo Xián.',
      imagem: '', pv: 280, velocidade: 38, defesa: 40, quebraEtapas: 1, acoesPorTurno: 1,
      resistencias: { fogo: 'fraco', som: 'absorve' }, imunidades: 'Lento',
      voa: true,
      sinaisVoo: [
        { sinal: 'A crina vibra mais grave e ele cai de um lado.', direcao: 'Esquerda' },
        { sinal: 'Ele sobe em espiral e para.', direcao: 'Alto' },
        { sinal: 'Passa rente às flores.', direcao: 'Baixo' }
      ],
      clareza: 'normal',
      sinais: [
        { sinal: 'A crina solta uma nota aguda.', resposta: 'E' },
        { sinal: 'Para no ar e treme, duas vezes.', resposta: 'A2' },
        { sinal: 'Mergulha em fileira com os outros.', resposta: 'S' }
      ],
      ataques: [
        { nome: 'Corte de Crina', elemento: 'fisico', alvo: 'unico', golpes: 2, dano: 55, velocidade: 'rapido', sequencia: 'E E', condicao: '', descricao: '' },
        { nome: 'Nota Presa', elemento: 'som', alvo: 'unico', golpes: 1, dano: 40, velocidade: 'normal', sequencia: 'A2', condicao: 'Silenciado', descricao: '' },
        { nome: 'Mergulho em Fileira', elemento: 'fisico', alvo: 'area', golpes: 1, dano: 90, velocidade: 'normal', sequencia: 'S', condicao: '', descricao: 'Só em grupos de 3 ou mais. Depois do mergulho, fica Pousado.' }
      ],
      pontosFracos: [], fases: '', despojos: 'Crina Branca.', revelado: true, notas: 'Revoada: com 3 ou mais vivos, +20% de Velocidade.'
    },
    {
      id: 'seed_mon_dryoma', nome: 'Dryóma, a Anfitriã', nivel: 10, categoria: 'boss',
      habitat: 'Salão de Chá, oeste de Krasnolés',
      descricao: 'Uma menina de porcelana alta demais, de vestido cor de mostarda, com o rosto liso e rachado. Toca o violino roubado de Pésnia com um arco de bétula.',
      imagem: '', pv: 6000, velocidade: 30, defesa: 90, quebraEtapas: 2, acoesPorTurno: 1,
      resistencias: { fogo: 'fraco', gelo: 'resiste25', raio: 'fraco', escuridao: 'resiste50' }, imunidades: 'Sono, Medo',
      voa: false, sinaisVoo: [], clareza: 'sutil',
      sinais: [
        { sinal: 'Ela inclina a xícara na sua direção.', resposta: 'A1' },
        { sinal: 'A toalha se estica sob os pratos.', resposta: 'S' },
        { sinal: 'Uma cadeira range do outro lado do salão.', resposta: 'A2' },
        { sinal: 'O violino belisca, e o som corta.', resposta: 'E' },
        { sinal: 'Ela sorri e serve chá para o vazio.', resposta: 'F' }
      ],
      ataques: [
        { nome: 'Xícara para Você', elemento: 'fisico', alvo: 'unico', golpes: 2, dano: 80, velocidade: 'normal', sequencia: 'E A1', condicao: 'Sonolência +2', descricao: '' },
        { nome: 'Toalha de Mesa', elemento: 'fisico', alvo: 'area', golpes: 1, dano: 110, velocidade: 'lento', sequencia: 'S', condicao: 'Derrubado', descricao: '' },
        { nome: 'Cadeira Puxada', elemento: 'fisico', alvo: 'unico', golpes: 1, dano: 0, velocidade: 'normal', sequencia: 'A2', condicao: 'Agarrado, Sonolência +3', descricao: '' },
        { nome: 'Pizzicato', elemento: 'som', alvo: 'area', golpes: 5, dano: 45, velocidade: 'rapido', sequencia: 'E E S E F', condicao: 'Sonolência +1 por golpe', descricao: '' },
        { nome: 'Ninguém Acorda Ninguém', elemento: 'som', alvo: 'area', golpes: 4, dano: 90, velocidade: 'muitoRapido', sequencia: 'E S A3 E', condicao: 'Sono em quem tem Sonolência 7+', descricao: 'Fase III.' }
      ],
      pontosFracos: [
        { nome: 'Arco de Bétula', tamanho: 'pequeno', efeito: 'Três acertos o partem: ela para de tocar por 2 turnos.' },
        { nome: 'A Rachadura', tamanho: 'medio', efeito: 'Dano × 2. Exposta só quando ela canta.' }
      ],
      fases: 'Fase I (100–65%): o Convite. Fase II (65–30%): a Canção, 2 ações, +2 de Sonolência por turno. Fase III (<30%): Só Mais um Pouquinho.',
      despojos: 'Xiǎo Xián. Xícara da Anfitriã. Arco de Bétula (final alternativo). Fita Azul.', revelado: false,
      notas: 'Acertar o violino afrouxa uma corda e baixa o Humor de Pésnia.'
    },
    {
      id: 'seed_mon_samovarnik', nome: 'Samovárnik', nivel: 7, categoria: 'elite',
      habitat: 'Portão dos Anjos, Krasnolés',
      descricao: 'Um samovar gigante de cobre, com bules no lugar das mãos e um espelho no lugar do rosto.',
      imagem: '', pv: 1400, velocidade: 12, defesa: 110, quebraEtapas: 2, acoesPorTurno: 1,
      resistencias: { fisico: 'resiste30', fogo: 'absorve', gelo: 'fraco' }, imunidades: '',
      voa: false, sinaisVoo: [], clareza: 'clara',
      sinais: [
        { sinal: 'A torneira pinga mais rápido.', resposta: 'E' },
        { sinal: 'O bule recua, devagar, três tempos.', resposta: 'A3' },
        { sinal: 'O chá escorre pelo chão.', resposta: 'S' }
      ],
      ataques: [
        { nome: 'Bule Pesado', elemento: 'fisico', alvo: 'unico', golpes: 1, dano: 140, velocidade: 'lento', sequencia: 'A3', condicao: '', descricao: '' },
        { nome: 'Despejar', elemento: 'agua', alvo: 'areaPequena', golpes: 3, dano: 50, velocidade: 'normal', sequencia: 'E E S', condicao: 'Sonolência +1 por golpe', descricao: '' }
      ],
      pontosFracos: [], fases: 'Rachado (Quebra ou <50%): ferve de verdade, perde a absorção de Fogo.', despojos: 'Caco de Samovar.', revelado: true,
      notas: 'Encostar no metal rachado: −60 PV e zera 3 de Sonolência.'
    }
  ];

  LD.seed = { habilidades, armas, pictos, itens, monstros };
})();
