# Beyond Depths · Biblioteca de Lúmia

Biblioteca do sistema da Expedição Delta: fichas, habilidades, pictos, arsenal e bestiário. Não há mesa de combate. O site faz as contas (PV, Bases de cada Via, custo e dano das habilidades, Pontos de Quebra, PV sugerido para cada criatura, quanto cada golpe tira) e o combate acontece na narração.

## Páginas

| | Página | Quem usa |
|---|---|---|
| I | Fichas | Jogadores criam e mantêm a sua. Status, habilidades equipadas, arma, pictos e ecos, ampolas, mochila e diário. |
| II | Habilidades | Biblioteca de técnicas. Jogadores podem criar as suas. Via, elemento, perfeições (1 a 6), forma do Compasso, quebra, efeito perfeito. |
| III | Pictos | Bônus de Status e efeito passivo. Domínio em 4 combates, depois vira Eco. |
| IV | Arsenal | Armas (Via, elemento, Poder e efeitos por nível) e itens. |
| V | Bestiário | Criaturas com resistências por elemento, Sinais, Leitura de Voo, pontos fracos, ataques em sequência, fases e despojos. O mestre vê a análise de equilíbrio. Jogadores só veem o que foi revelado. |
| VI | Oficina | Calculadora de dano (Ascensor → Inimigo e Inimigo → Ascensor), carregar a biblioteca inicial, exportar e importar. |
| VII | Códice | Todas as regras numa página. Aberta sem login. |

## Acesso

- Entre com usuário e senha. O usuário vira `usuario@beyonddepths.com`, e a conta é criada no primeiro acesso.
- Usuários que começam com `mestre` ou `admin` são mestre: editam pictos, armas, itens, criaturas e qualquer ficha.
- `?local=1` no endereço abre em modo local, sem Firebase, salvando só no navegador. Útil para testar.

## Firebase

Os dados novos ficam em coleções próprias, para não misturar com o painel antigo:

`lumia_personagens`, `lumia_habilidades`, `lumia_pictos`, `lumia_armas`, `lumia_itens`, `lumia_monstros`

Cole o conteúdo de `firestore.rules` em Firestore → Regras. Depois, entre como mestre e, na Oficina, use **Carregar biblioteca inicial** para gravar as habilidades, armas, pictos, itens e criaturas do Ato I.

## Estrutura

```
index.html
assets/css/lumia.css        visual
assets/js/rules.js          regras e fórmulas
assets/js/seed.js           biblioteca inicial
assets/js/store.js          Firebase e modo local
assets/js/ui.js             componentes
assets/js/views/*.js        uma página por arquivo
assets/js/app.js            menu e rotas
legacy/                     painel antigo, ainda acessível em /legacy/
```

Sem build. Basta servir a pasta (GitHub Pages ou `python3 -m http.server`).
