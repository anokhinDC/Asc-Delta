const CONDITIONS_DB = {
    "quebra_guarda": { name: "Guarda Quebrada (Stagger)", desc: "Postura esgotada. Recebe +50% de dano e não pode esquivar ou aparar.", mods: { esq: -10, df: -5 } },
    "corrupcao_tinta": { name: "Corrupção de Tinta", desc: "Manchas de tinta da Pintora corrompem o corpo. Drena 5 de Postura e 2 de Chroma por turno.", mods: { df: -2 } },
    "sangrando": { name: "Hemorragia", desc: "Perde 5 HP por turno. -2 na Defesa Física.", mods: { df: -2 } },
    "exausto": { name: "Exausto", desc: "Max Stamina/PA reduzida em 50%.", mods: { st_mult: 0.5 } },
    "lento": { name: "Lento", desc: "Movimentos atrasados. Esquiva final sofre -5.", mods: { esq: -5 } },
    "foco_ponto_fraco": { name: "Ponto Fraco Marcado", desc: "O próximo ataque contra este alvo causa dano crítico de Ruptura.", mods: { df: -3 } },
    "fragil_fisico": { name: "Frágil", desc: "Max HP reduzido em 20%.", mods: { hp_mult: 0.8 } }
};
