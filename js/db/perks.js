const PERK_COSTS = [0, 1, 2, 3, 5, 9, 14, 20];

const PERKS_DB = {
    "for": {
        "name": "Força",
        "icon": "fa-fist-raised",
        "perks": {
            "Ruptura de Postura": [
                "1: Ataques pesados causam +1 de dano de Postura.",
                "2: O impacto racha a guarda inimiga. Dano de Postura +1d2.",
                "3: Seus golpes forçam recuo. Dano de Postura +1d3.",
                "4: Golpe Esmagador: Ao acertar um inimigo em bloqueio, causa 1d4 de dano de Postura extra.",
                "5: Força bruta imparável. Dano de Postura +2d2, Dano Físico +2.",
                "6: Quebrador de Escudos: Ignora 2 pontos de armadura na Postura. Dano +2d3.",
                "7: Ruptura Titânica: Golpes críticos quebram instantaneamente 50% da postura restante do alvo."
            ],
            "Maestria em Armas Pesadas": [
                "1: Empunhadura firme. Dano físico +1.",
                "2: Peso bem equilibrado. Dano físico +1d2.",
                "3: Movimento de corte amplo. Dano físico +1d3.",
                "4: Tensão de Mola: O primeiro ataque do combate tem +1d4 de dano.",
                "5: Precisão demolidora. Dano físico +2d2, Testes de FOR +2.",
                "6: Golpe Colossal. Dano físico +2d3 e atordoa oponentes menores.",
                "7: Lenda de Lumière: Dano físico +3d4, testes de FOR +3."
            ],
            "Empurrão Tático": [
                "1: Pode empurrar alvos após acertar um ataque.",
                "2: Empurrão desequilibra o adversário (+1d2 dano de Postura).",
                "3: Desestabiliza defensores com facilidade (+1d3 dano de Postura).",
                "4: Colisão de Parede: Se empurrar contra uma parede, causa 1d4 extra.",
                "5: Controle do campo de batalha. Testes de Força resistidos ganham +2.",
                "6: Arremesso Violento: Derruba alvos médios ou pequenos no chão.",
                "7: Força Sísmica: Empurra todos os inimigos à sua frente em cone."
            ]
        }
    },
    "agi": {
        "name": "Agilidade",
        "icon": "fa-person-running",
        "perks": {
            "Esquiva Fluida": [
                "1: Janela de esquiva aumentada. Esquiva +1.",
                "2: Movimentação leve sobre cinzas. Esquiva +1d2.",
                "3: Desvio no último milissegundo. Esquiva +1d3.",
                "4: Passo Sombra: Esquivar com sucesso reduz o custo do próximo Picto em 1 PA.",
                "5: Fluidez perfeita. Esquiva +2d2, iniciativa +2.",
                "6: Esquiva Fantasma: Deixa uma ilusão de tinta que distrai o atacante.",
                "7: Bailarino da Morte: Esquiva quase infalível, Esquiva +3d4."
            ],
            "Cadência de Ataque": [
                "1: Golpes ágeis em rápida sucessão. Dano físico leve +1.",
                "2: Transição veloz entre armas e golpes (+1d2).",
                "3: Ritmo de esgrima constante (+1d3).",
                "4: Golpe Duplo: Pode desferir dois ataques rápidos pelo custo de 1 PA.",
                "5: Furacão de Aço: Bônus de +2d2 em sequências de golpes.",
                "6: Dança das Lâminas: Cada acerto consecutivo adiciona +1d3 de dano.",
                "7: Tempestade de Lumière: Desfere até 4 ataques em um único turno."
            ],
            "Iniciativa da Expedição": [
                "1: Reage rapidamente à aparição de Nevii. Iniciativa +2.",
                "2: Posição de guarda imediata. Iniciativa +3.",
                "3: Sempre pronto para o confronto (+4 Iniciativa).",
                "4: Primeiro a Golpear: No primeiro turno, age duas vezes antes do inimigo.",
                "5: Alerta Máximo: Nunca é pego de surpresa.",
                "6: Velocidade da Luz: Bônus de +6 em iniciativa e +2 em esquiva no turno 1.",
                "7: Reflexo Supremo: Sempre tem o primeiro turno garantido em qualquer combate."
            ]
        }
    },
    "vit": {
        "name": "Vitalidade",
        "icon": "fa-heart",
        "perks": {
            "Couraça de Lumière": [
                "1: Resistência a impactos aumentada. Defesa Física +1.",
                "2: Pele calejada pela caminhada da expedição (+1d2 DF).",
                "3: Armadura natural aprimorada (+1d3 DF).",
                "4: Muralha Humana: Reduz todo dano físico sofrido em 2 pontos fixos.",
                "5: Tenacidade de Aço: Defesa Física +2d2, HP máximo +15.",
                "6: Indestrutível: Dano físico sofrido reduzido em 25%.",
                "7: Bastião Inviolável: Defesa Física +3d4, imune a sangramento e cortes leves."
            ],
            "Resistência de Postura": [
                "1: Guarda firme contra desestabilização. Postura Máxima +10.",
                "2: Fôlego para absorver impactos sem quebrar guarda (+15 Postura).",
                "3: Postura resiliente contra golpes pesados (+20 Postura).",
                "4: Recuperação Rápida: Recupera 10 de Postura ao defender com sucesso.",
                "5: Equilíbrio Perfeito: Postura Máxima +35, tempo de Stagger reduzido pela metade.",
                "6: Guarda Inabalável: Recebe -3 de dano de Postura de qualquer golpe.",
                "7: Pilar do Monólito: Praticamente impossível de ser quebrado em Stagger."
            ],
            "Vigor da Sobrevivência": [
                "1: Fôlego inesgotável. Pontos de Ação / Stamina +10.",
                "2: Recuperação de fôlego entre turnos (+15 Stamina).",
                "3: Pulmões treinados para a névoa da Pintora (+20 Stamina).",
                "4: Segundo Fôlego: Uma vez por combate, ao cair a 0 HP, resiste com 1 HP.",
                "5: Resistência Heroica: Max Stamina +30, cura acelerada fora de combate.",
                "6: Imunidade a Fadiga: Custo de PA de corrida e esquiva reduzido.",
                "7: Imortalidade dos 33: Ressurge com 50% do HP ao ser abatido pela primeira vez."
            ]
        }
    },
    "chr": {
        "name": "Chroma",
        "icon": "fa-palette",
        "perks": {
            "Pincelada Mágica": [
                "1: Dano de Pictos aumentado em +1.",
                "2: Traço de tinta mais espesso e cortante (+1d2 Dano Chroma).",
                "3: Pigmento condensado que incendeia os Nevii (+1d3 Dano Chroma).",
                "4: Tinta Cortante: Pictos de ataque têm 20% de chance de causar Corrupção.",
                "5: Mestre da Tinta: Dano Chroma +2d2, reserva máxima de Chroma +15.",
                "6: Resplendor de Tinta: Seus Pictos atingem alvos adjacentes com metade do dano.",
                "7: Obra-Prima da Pintura: Dano Chroma +3d4, todos os Pictos custam -2 de Chroma."
            ],
            "Ressonância de Tinta": [
                "1: Reserva de Chroma aumentada em +10.",
                "2: Absorve gotas de tinta dos monstros derrotados (+15 Chroma).",
                "3: Eficiência na canalização (+20 Chroma).",
                "4: Sifão de Tinta: Golpear um alvo em Stagger restaura 3 de Chroma.",
                "5: Torrente Cromática: Reserva máxima de Chroma +35.",
                "6: Ciclo Infinito: Recupera 2 de Chroma passivamente a cada rodada.",
                "7: Oceano de Chroma: Chroma infinito por 2 rodadas uma vez por combate."
            ],
            "Alquimia de Pigmentos": [
                "1: Conhecimento de misturas. Pictos de cura curam +1d4 de HP.",
                "2: Tinta protetora: Pictos de escudo concedem +5 de Postura.",
                "3: Mistura elemental: Altera o elemento do Picto livremente (Fogo, Gelo, Luz).",
                "4: Catalisador Rápido: Pode conjurar um Picto de suporte como ação rápida.",
                "5: Pigmentos Divinos: Efeitos de Pictos duram +1 turno adicional.",
                "6: Purificação: Pictos removem todas as condições negativas de aliados.",
                "7: Criação da Pintora: Capaz de manifestar barreiras impenetráveis de Chroma."
            ]
        }
    },
    "per": {
        "name": "Percepção",
        "icon": "fa-eye",
        "perks": {
            "Aparo de Precisão (Parry)": [
                "1: Janela de reação ampliada. Bônus de +1 em testes de Aparar.",
                "2: Leitura do movimento do atacante (+1d2 em Aparar).",
                "3: Momento exato do impacto (+1d3 em Aparar).",
                "4: Riposte Fatal: Aparar com sucesso garante um Contra-Ataque com dano crítico.",
                "5: Mestre do Aparo: Testes de Aparar ganham +2d2, anula 100% do impacto.",
                "6: Aparo de Projétil: Capaz de aparar e refletir tiros e magias de volta ao atacante.",
                "7: Aparo Perfeito Divino: Contra-ataque de Aparar quebra imediatamente a guarda do inimigo."
            ],
            "Visão de Pontos Fracos": [
                "1: Identifica fendas na couraça dos Nevii (+1 de acerto).",
                "2: Mira em juntas e núcleos de tinta (+1d2 de dano).",
                "3: Percepção analítica aguçada (+1d3 de dano).",
                "4: Tiro no Núcleo: Acertos em pontos fracos causam o dobro de dano de Postura.",
                "5: Olho Clínico: Chance de acerto crítico aumentada em +15%.",
                "6: Exposição Total: Ao acertar o ponto fraco, o alvo fica Vulnerável por 2 turnos.",
                "7: Golpe Decisivo: Acerto crítico em ponto fraco executa alvos não-chefes com menos de 20% de HP."
            ],
            "Sentido de Perigo": [
                "1: Pressentimento de emboscadas dos Nevii (+2 em percepção passiva).",
                "2: Evita armadilhas e terrenos contaminados por tinta.",
                "3: Alerta sonoro de ataques pelas costas (+1d3 em defesa surpresa).",
                "4: Esquiva Instintiva: Pode esquivar de ataques que não viu diretamente.",
                "5: Sexto Sentido: Inimigos nunca obtêm vantagem ou ataques furtivos contra você.",
                "6: Previsão de Golpe: Prevê o alvo do próximo ataque do chefe no início da rodada.",
                "7: Clarividência do Monólito: Enxerga 1 rodada no futuro do combate."
            ]
        }
    }
};
