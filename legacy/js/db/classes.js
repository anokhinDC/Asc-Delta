const CLASS_TEMPLATES = {
    "Engenheiro da Expedição": {
        baseStats: { hp: 120, st: 120, lust: 120, en: 30 },
        attrMods: { for: 3, vit: 2 },
        skills: [
            {
                name: "Impacto de Sobrecarga (Overcharge)",
                type: "Ativa",
                cost: "1 PA + 2 Chroma",
                test: "Força vs Defesa",
                desc: "Libera a pressão mecânica de seu braço/arma. Causa 2d8 + Força de dano físico e aplica 8 de dano direto na Postura do alvo (Ruptura rápida de Guarda)."
            },
            {
                name: "Manutenção Tática",
                type: "Ativa",
                cost: "1 PA",
                test: "-",
                desc: "Restaura 20 de Postura de si mesmo ou de um aliado adjacente, reforçando as placas de proteção contra golpes iminentes."
            }
        ],
        weaknesses: [
            {
                name: "Superaquecimento Mecânico",
                desc: "Se usar Overcharge 2 turnos seguidos, seu braço mecânico trava por 1 turno, impedindo reações de Aparar."
            },
            {
                name: "Mobilidade Comprometida",
                desc: "Equipamentos pesados causam -2 em jogadas de Esquiva pura."
            }
        ]
    },

    "Esgrimista de Lumière": {
        baseStats: { hp: 100, st: 140, lust: 100, en: 40 },
        attrMods: { agi: 3, per: 2 },
        skills: [
            {
                name: "Aparo Perfeito (Riposte)",
                type: "Reativa",
                cost: "1 PA",
                test: "Percepção / Agilidade vs Ataque",
                desc: "Ao sofrer um ataque corpo-a-corpo ou projétil, tenta aparar no instante exato. Em caso de sucesso, anula o dano, não acumula dano de Postura e contra-ataca imediatamente com 1d10 + Agilidade de dano."
            },
            {
                name: "Estocada de Chroma",
                type: "Ativa",
                cost: "1 PA + 3 Chroma",
                test: "Agilidade vs Defesa",
                desc: "Avança com a ponta da lâmina tingida em Chroma. Ignora a Armadura Física do alvo e causa dano direto de Tinta."
            }
        ],
        weaknesses: [
            {
                name: "Corpo Leve",
                desc: "Não suporta impactos esmagadores. Ataques de dano contundente bruto causam +3 de dano na Postura da Esgrimista."
            },
            {
                name: "Dependência de Ritmo",
                desc: "Se errar uma tentativa de Aparar, fica Vulnerável até o próximo turno."
            }
        ]
    },

    "Pintor Místico": {
        baseStats: { hp: 90, st: 100, lust: 90, en: 70 },
        attrMods: { chr: 3, per: 2 },
        skills: [
            {
                name: "Mancha Elemental de Chroma",
                type: "Ativa",
                cost: "1 PA + 4 Chroma",
                test: "Chroma vs Defesa",
                desc: "Pinta o ar com pigmentos de fogo ou gelo. Causa 3d6 + Chroma de dano elemental e mancha o alvo com Corrupção de Tinta por 2 turnos."
            },
            {
                name: "Pintura Restauradora",
                type: "Ativa",
                cost: "1 PA + 5 Chroma",
                test: "Chroma",
                desc: "Restaura 2d8 + Chroma de HP de um aliado e limpa todas as condições de dano contínuo da tela de vida dele."
            }
        ],
        weaknesses: [
            {
                name: "Foco Frágil",
                desc: "Ao ser atingido enquanto conjura, deve passar em teste de Vitalidade ou o Picto é cancelado e o Chroma é perdido."
            },
            {
                name: "Consumo Voraz de Tinta",
                desc: "Se ficar com 0 de Chroma, sofre -2 em todas as suas jogadas até recarregar."
            }
        ]
    },

    "Atirador da Névoa": {
        baseStats: { hp: 100, st: 120, lust: 100, en: 45 },
        attrMods: { per: 3, agi: 2 },
        skills: [
            {
                name: "Tiro no Ponto Fraco",
                type: "Ativa",
                cost: "1 PA + 2 Chroma",
                test: "Percepção vs Esquiva",
                desc: "Dispara com mira telescópica em uma fenda de tinta do inimigo. Causa 2d10 + Percepção de dano e dobra o dano de Postura se o alvo estiver com Guarda Quebrada."
            },
            {
                name: "Disparo de Cobertura",
                type: "Reativa",
                cost: "1 PA",
                test: "Percepção",
                desc: "Interrompe um ataque inimigo direcionado a um aliado à distância, reduzindo o acerto do agressor em -4."
            }
        ],
        weaknesses: [
            {
                name: "Desvantagem Corpo-a-Corpo",
                desc: "Inimigos engajados em alcance corpo-a-corpo impõem -3 nas rolagens de ataque do atirador."
            },
            {
                name: "Munição de Precisão",
                desc: "Errar dois tiros seguidos obriga a gastar 1 turno inteiro de recarga e ajuste de mira."
            }
        ]
    },

    "Guardião do Monólito": {
        baseStats: { hp: 140, st: 110, lust: 150, en: 25 },
        attrMods: { vit: 3, for: 2 },
        skills: [
            {
                name: "Muralha de Lumière",
                type: "Reativa",
                cost: "1 PA",
                test: "Vitalidade vs Dano",
                desc: "Ergue um escudo pesado. Reduz todo dano recebido em 50% e absorve até 20 de dano na Postura sem sofrer Stagger."
            },
            {
                name: "Golpe de Escudo Esmagador",
                type: "Ativa",
                cost: "1 PA",
                test: "Força vs Defesa",
                desc: "Golpeia com o escudo. Causa 1d8 + Força e empurra o alvo, adicionando 10 de dano de Postura."
            }
        ],
        weaknesses: [
            {
                name: "Lentidão",
                desc: "O mais lento da expedição. -3 em Iniciativa e Esquiva."
            },
            {
                name: "Fardo do Protetor",
                desc: "Sempre que um aliado adjacente sofrer dano letal, o Guardião recebe metade desse dano automaticamente."
            }
        ]
    },

    "Vanguarda Berserk": {
        baseStats: { hp: 130, st: 130, lust: 110, en: 30 },
        attrMods: { for: 3, agi: 2 },
        skills: [
            {
                name: "Frenesi da Expedição",
                type: "Ativa",
                cost: "1 PA",
                test: "-",
                desc: "Ao perder 30% do HP ou da Postura, entra em Frenesi por 3 turnos: recebe +4 de dano físico e causa +5 de dano de Postura em cada golpe."
            },
            {
                name: "Golpe Destruidor de Guarda",
                type: "Ativa",
                cost: "2 PA",
                test: "Força vs Defesa",
                desc: "Um golpe violento com as duas mãos. Se o alvo tentar bloquear, sofre o dobro de dano de Postura."
            }
        ],
        weaknesses: [
            {
                name: "Defesa Aberta",
                desc: "Enquanto em Frenesi, sofre -2 de Defesa Física e não pode usar manobras de bloqueio cuidadoso."
            },
            {
                name: "Desgaste Acelerado",
                desc: "Se o combate durar mais de 4 turnos, o cansaço acumula, perdendo 1 PA por turno."
            }
        ]
    },

    "Franco Golpeador": {
        baseStats: { hp: 120, st: 150, lust: 100, en: 45 },
        attrMods: { for: 2, agi: 3 },
        skills: [
            {
                name: "Aparar em Cadeia",
                type: "Ativa",
                cost: "3 turnos",
                test: "Agilidade vs Ataque",
                desc: "Especialista em quebrar o ritmo adversário. Recebe +3 em testes de Parry. A cada contra-ataque bem sucedido, prepara o próximo aparo com facilidade."
            },
            {
                name: "Arma Assinatura",
                type: "Passiva",
                cost: "-",
                test: "-",
                desc: "Ao empunhar sua arma favorita da Expedição, ganha +1 em Força, +1 em Agilidade e seus golpes se tornam imprevisíveis para os Nevii."
            }
        ],
        weaknesses: [
            {
                name: "Fragilidade a Impacto Pesado",
                desc: "Inimigos com força bruta superior quebram facilmente sua sequência de golpes. -3 de resistência contra dano contundente."
            },
            {
                name: "Impulsividade",
                desc: "Incapaz de recuar ou hesitar diante de ameaças. Não pode realizar ações de fuga voluntária."
            }
        ]
    }
};
