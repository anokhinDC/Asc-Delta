const RACE_TEMPLATES = {
    "Cidadão de Lumière": {
        skills: [
            {
                name: "Determinação dos 33",
                type: "Passiva",
                desc: "Ciente de que seu tempo está acabando perante o Monólito, sua vontade de viver se intensifica. Quando seu HP ou Postura cai abaixo de 50%, ganha +3 na Resistência de Postura e +2 em testes de Esquiva por 3 turnos."
            }
        ],
        weaknesses: [
            {
                name: "Terror do Monólito",
                desc: "A sombra da contagem da Pintora pesa na mente. Ataques de terror ou golpes críticos inimigos aumentam o acúmulo de dano de Postura em +2."
            }
        ]
    },
    "Veterano de Expedição": {
        skills: [
            {
                name: "Reflexos de Sobrevivência",
                type: "Passiva",
                desc: "Sobreviveu a confrontos anteriores com os Nevii. Recebe +3 de bônus em qualquer ação de Aparar (Parry) e reduz em 1 o custo de PA de esquivas bem-sucedidas."
            }
        ],
        weaknesses: [
            {
                name: "Trauma das Cinzas",
                desc: "Cicatrizes físicas e mentais das perdas anteriores. Ao presenciar um aliado entrar em Guarda Quebrada (Stagger), sua própria Postura sofre 5 de desgaste imediato."
            }
        ]
    },
    "Marcado pelo Chroma": {
        skills: [
            {
                name: "Ressonância Pictórica",
                type: "Passiva",
                desc: "Veias impregnadas com pigmento místico. Seus Pictos custam -1 de Chroma (mínimo 1) e acertos críticos recuperam 2 de Chroma de Tinta instantaneamente."
            }
        ],
        weaknesses: [
            {
                name: "Instabilidade de Tinta",
                desc: "Vulnerável à contaminação de Chroma. Sofre +20% de dano contra ataques baseados em Tinta e efeitos de Corrupção."
            }
        ]
    },
    "Mecatrônico de Lumière": {
        skills: [
            {
                name: "Prótese de Engrenagem",
                type: "Passiva",
                desc: "Membros reforçados com tecnologia a vapor e aço de Gustave. Recebe +5 de Defesa Física permanente e seus ataques corpo-a-corpo causam +3 de dano direto na Postura do alvo."
            }
        ],
        weaknesses: [
            {
                name: "Peso de Metal",
                desc: "A engrenagem mecânica é pesada e ruidosa. Sofre -2 em testes de Esquiva e furtividade."
            }
        ]
    },
    "Desperto do Monólito": {
        skills: [
            {
                name: "Visão do Pincel",
                type: "Passiva",
                desc: "Consegue enxergar as linhas e intenções de ataque da Pintora antes que aconteçam. Revela automaticamente o ponto fraco de qualquer Nevi e recebe +2 em jogadas de ataque."
            }
        ],
        weaknesses: [
            {
                name: "Fragilidade Corpórea",
                desc: "Seu corpo foi desgastado pela proximidade do Monólito. Possui -15% de HP máximo base."
            }
        ]
    }
};
