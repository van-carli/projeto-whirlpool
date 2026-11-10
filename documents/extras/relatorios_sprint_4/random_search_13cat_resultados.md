# Random search 13cat — resultados e comparação

MAE em °C. R² da área, sobre as previsões acumuladas das 17 dobras (mesma definição da Seção 4.3). Δ negativo de MAE e Δ positivo de R² indicam melhora.

## Atualização de 24 de setembro de 2026

As seções 1 a 4 deste relatório descrevem uma execução do caderno random_search_13cat que descartava as seis colunas do motivo do ensaio, por um prefixo não declarado entre as entradas, conforme a revisão em revisao_random_search_13cat.md. O caderno foi corrigido e reexecutado do início, sem reaproveitar resultados gravados, e os números abaixo substituem os das seções seguintes para qualquer citação.

| Área | Melhor na execução anterior, sem motivo | Melhor na execução atual, com motivo |
|---|---|---|
| Oven HMI | Random Forest, 2,62 | Gradient Boosting, 2,39 |
| CT Knobs | Gradient Boosting, 2,95 | Gradient Boosting, 2,77 |
| IPC Cooling | Gradient Boosting, 4,20 | Gradient Boosting, 3,71 |
| Main Vent Sys | Extra Trees, 3,77 | Gradient Boosting, 3,87; Extra Trees, 3,89 |
| Mainback | Gradient Boosting, 5,72 | Gradient Boosting, 4,23 |
| IPC Comp | Gradient Boosting, 8,14 | Gradient Boosting, 6,75 |
| Coil Temps | Gradient Boosting, 10,37 | Gradient Boosting, 10,20 |

Somadas as sete áreas, o melhor candidato de cada algoritmo mede 5,87 no gradiente, 6,33 no Extra Trees, 6,69 no Random Forest e 9,07 no Ridge, com 31, 42, 42 e 78 aprovações indevidas na margem de oito graus, respectivamente.

Duas leituras mudam em relação às seções seguintes. O gradiente passa a vencer nas sete áreas, e não em cinco, e o Extra Trees deixa de vencer em Main Vent Sys. A ressalva de otimismo permanece: cada número é o melhor de quarenta candidatos, avaliado nas mesmas dobras em que foi escolhido. Colocado dentro da formulação entregue e medido pelo aninhamento estrito, o gradiente buscado piorou o erro, conforme a Seção 4.4 da documentação.

## 1. Random search novo × antes do random search

Mesma base (13cat) nos dois lados; o antes é a configuração da Sprint 3. Empate: variação de MAE inferior a 1%.

**Tabela 1 — Por área e algoritmo**

| Área | Algoritmo | MAE antes | MAE RS | Δ MAE | R² antes | R² RS | Δ R² | Veredito |
|---|---|---|---|---|---|---|---|---|
| Oven HMI | Random Forest | 2,76 | 2,62 | −0,14 | −0,190 | 0,117 | +0,307 | Melhorou |
| Oven HMI | Extra Trees | 2,69 | 2,63 | −0,07 | −0,216 | 0,021 | +0,237 | Melhorou |
| Oven HMI | Gradient Boosting | 2,91 | 2,62 | −0,29 | −0,433 | −0,032 | +0,401 | Melhorou |
| Oven HMI | Ridge | 3,53 | 2,88 | −0,65 | −1,016 | −0,077 | +0,938 | Melhorou |
| CT Knobs | Random Forest | 3,01 | 3,16 | +0,15 | 0,589 | 0,581 | −0,008 | Piorou |
| CT Knobs | Extra Trees | 3,09 | 3,01 | −0,08 | 0,544 | 0,575 | +0,031 | Melhorou |
| CT Knobs | Gradient Boosting | 3,33 | 2,95 | −0,38 | 0,497 | 0,651 | +0,154 | Melhorou |
| CT Knobs | Ridge | 3,71 | 3,70 | −0,01 | 0,430 | 0,435 | +0,005 | Empate |
| IPC Cooling | Random Forest | 4,86 | 4,50 | −0,37 | 0,788 | 0,837 | +0,049 | Melhorou |
| IPC Cooling | Extra Trees | 5,69 | 4,70 | −1,00 | 0,730 | 0,819 | +0,089 | Melhorou |
| IPC Cooling | Gradient Boosting | 5,38 | 4,20 | −1,18 | 0,732 | 0,847 | +0,115 | Melhorou |
| IPC Cooling | Ridge | 6,83 | 6,44 | −0,39 | 0,685 | 0,729 | +0,044 | Melhorou |
| Main Vent Sys | Random Forest | 4,25 | 4,22 | −0,03 | 0,901 | 0,904 | +0,003 | Empate |
| Main Vent Sys | Extra Trees | 3,85 | 3,77 | −0,08 | 0,907 | 0,906 | −0,002 | Melhorou |
| Main Vent Sys | Gradient Boosting | 4,25 | 3,85 | −0,39 | 0,903 | 0,909 | +0,006 | Melhorou |
| Main Vent Sys | Ridge | 5,85 | 5,50 | −0,35 | 0,847 | 0,853 | +0,006 | Melhorou |
| Mainback | Random Forest | 5,99 | 5,97 | −0,02 | 0,838 | 0,841 | +0,003 | Empate |
| Mainback | Extra Trees | 6,05 | 5,85 | −0,20 | 0,827 | 0,845 | +0,018 | Melhorou |
| Mainback | Gradient Boosting | 6,79 | 5,72 | −1,08 | 0,845 | 0,853 | +0,007 | Melhorou |
| Mainback | Ridge | 8,72 | 8,20 | −0,51 | 0,758 | 0,780 | +0,022 | Melhorou |
| IPC Comp | Random Forest | 8,77 | 8,77 | 0,00 | 0,440 | 0,460 | +0,020 | Empate |
| IPC Comp | Extra Trees | 8,92 | 8,76 | −0,16 | 0,399 | 0,451 | +0,052 | Melhorou |
| IPC Comp | Gradient Boosting | 10,08 | 8,14 | −1,94 | 0,343 | 0,528 | +0,185 | Melhorou |
| IPC Comp | Ridge | 10,27 | 10,27 | 0,00 | 0,311 | 0,310 | −0,001 | Empate |
| Coil Temps | Random Forest | 11,50 | 11,61 | +0,11 | 0,856 | 0,863 | +0,006 | Empate |
| Coil Temps | Extra Trees | 13,61 | 11,20 | −2,41 | 0,755 | 0,859 | +0,104 | Melhorou |
| Coil Temps | Gradient Boosting | 12,39 | 10,37 | −2,03 | 0,846 | 0,894 | +0,048 | Melhorou |
| Coil Temps | Ridge | 19,89 | 19,84 | −0,05 | 0,685 | 0,684 | −0,001 | Empate |

**Tabela 2 — Por algoritmo, nas sete áreas**

| Algoritmo | Áreas com melhora | Empates | Pioras | Ganho médio de MAE | Δ R² médio | MAE agregado antes | MAE agregado RS |
|---|---|---|---|---|---|---|---|
| Random Forest | 2 | 4 | 1 | +1,1% | +0,054 | 7,40 | 7,39 |
| Extra Trees | 7 | 0 | 0 | +6,8% | +0,076 | 7,72 | 7,29 |
| Gradient Boosting | 7 | 0 | 0 | +14,9% | +0,131 | 8,32 | 6,85 |
| Ridge | 4 | 3 | 0 | +5,2% | +0,145 | 9,74 | 9,59 |

Veredito: 26 de 28 pares tiveram MAE menor após a busca; 20 com ganho acima de 1%, 7 empates e 1 piora (Random Forest no CT Knobs). O Gradient Boosting foi o mais beneficiado; o Random Forest quase não mudou. Pelo piso de ruído usado como critério no random search anterior, só um ganho o alcança (Ridge no Oven HMI, 0,65 °C contra 0,58 °C).

## 2. Melhor algoritmo por região (random search novo)

| Área | 1º | MAE | R² | FA@8 | 2º | MAE | R² | Diferença de MAE | Veredito |
|---|---|---|---|---|---|---|---|---|---|
| Oven HMI | RF | 2,62 | 0,117 | 0 | GB | 2,62 | −0,032 | 0,003 | Empate técnico entre RF, ET e GB; RF pelo R² |
| CT Knobs | GB | 2,95 | 0,651 | 0 | ET | 3,01 | 0,575 | 0,061 | Gradient Boosting |
| IPC Cooling | GB | 4,20 | 0,847 | 0 | RF | 4,50 | 0,837 | 0,298 | Gradient Boosting |
| Main Vent Sys | ET | 3,77 | 0,906 | 0 | GB | 3,85 | 0,909 | 0,085 | Extra Trees pelo MAE; GB tem R² marginalmente maior |
| Mainback | GB | 5,72 | 0,853 | 8 | ET | 5,85 | 0,845 | 0,134 | Gradient Boosting |
| IPC Comp | GB | 8,14 | 0,528 | 17 | ET | 8,76 | 0,451 | 0,617 | Gradient Boosting |
| Coil Temps | GB | 10,37 | 0,894 | 5 | ET | 11,20 | 0,859 | 0,837 | Gradient Boosting |

FA@8: falsos aprovados com margem de segurança de 8 °C.

Veredito: Gradient Boosting vence em cinco das sete áreas (CT Knobs, IPC Cooling, Mainback, IPC Comp e Coil Temps), com o maior R² e o menor número de falsos aprovados nas áreas com excesso de limite. Extra Trees vence no Main Vent Sys. No Oven HMI, os três modelos de árvore empatam.

## 3. Random search anterior × random search novo

As bases diferem (anterior: perfil, 3.277 leituras; novo: 13cat, 3.232 leituras), então o erro absoluto não isola o efeito da busca. A comparação da eficácia do tuning usa o ganho de cada busca sobre a sua própria configuração de partida.

**Tabela 3 — Ganho de MAE sobre a configuração de partida**

| Área | Algoritmo | MAE RS anterior | Ganho RS anterior | MAE RS novo | Ganho RS novo | Busca mais eficaz |
|---|---|---|---|---|---|---|
| Oven HMI | Random Forest | 2,43 | −0,4% | 2,62 | +5,1% | Novo |
| Oven HMI | Extra Trees | 2,33 | +16,9% | 2,63 | +2,6% | Anterior |
| Oven HMI | Gradient Boosting | 2,32 | +12,9% | 2,62 | +9,9% | Anterior |
| Oven HMI | Ridge | 2,76 | +13,2% | 2,88 | +18,5% | Novo |
| CT Knobs | Random Forest | 3,35 | −6,1% | 3,16 | −5,1% | Novo |
| CT Knobs | Extra Trees | 3,32 | +2,3% | 3,01 | +2,7% | Empate |
| CT Knobs | Gradient Boosting | 3,07 | +15,8% | 2,95 | +11,5% | Anterior |
| CT Knobs | Ridge | 4,23 | +10,1% | 3,70 | +0,4% | Anterior |
| IPC Cooling | Random Forest | 4,18 | −3,7% | 4,50 | +7,5% | Novo |
| IPC Cooling | Extra Trees | 4,14 | +3,3% | 4,70 | +17,5% | Novo |
| IPC Cooling | Gradient Boosting | 4,28 | +15,3% | 4,20 | +21,9% | Novo |
| IPC Cooling | Ridge | 6,45 | +4,3% | 6,44 | +5,7% | Novo |
| Main Vent Sys | Random Forest | 4,82 | −3,3% | 4,22 | +0,7% | Novo |
| Main Vent Sys | Extra Trees | 4,80 | +4,5% | 3,77 | +2,2% | Anterior |
| Main Vent Sys | Gradient Boosting | 4,73 | +6,9% | 3,85 | +9,3% | Novo |
| Main Vent Sys | Ridge | 6,56 | +5,1% | 5,50 | +5,9% | Empate |
| Mainback | Random Forest | 5,97 | −5,2% | 5,97 | +0,3% | Novo |
| Mainback | Extra Trees | 6,05 | −3,7% | 5,85 | +3,3% | Novo |
| Mainback | Gradient Boosting | 5,44 | +18,8% | 5,72 | +15,9% | Anterior |
| Mainback | Ridge | 8,33 | +0,6% | 8,20 | +5,9% | Novo |
| IPC Comp | Random Forest | 7,52 | −2,9% | 8,77 | +0,0% | Novo |
| IPC Comp | Extra Trees | 7,41 | −2,4% | 8,76 | +1,8% | Novo |
| IPC Comp | Gradient Boosting | 7,20 | +16,7% | 8,14 | +19,2% | Novo |
| IPC Comp | Ridge | 10,44 | +3,9% | 10,27 | +0,0% | Anterior |
| Coil Temps | Random Forest | 12,37 | −6,4% | 11,61 | −0,9% | Novo |
| Coil Temps | Extra Trees | 11,83 | +13,1% | 11,20 | +17,7% | Novo |
| Coil Temps | Gradient Boosting | 10,42 | +18,3% | 10,37 | +16,4% | Anterior |
| Coil Temps | Ridge | 19,64 | +0,8% | 19,84 | +0,3% | Empate |

Contagem: novo mais eficaz em 17 pares, anterior em 8, empate em 3.

**Tabela 4 — R² antes e depois de cada busca (Gradient Boosting e Random Forest)**

| Área | GB antes (anterior) | GB depois (anterior) | GB antes (novo) | GB depois (novo) | RF antes (anterior) | RF antes (novo) | RF depois (novo) |
|---|---|---|---|---|---|---|---|
| Oven HMI | −0,478 | 0,108 | −0,433 | −0,032 | −0,163 | −0,190 | 0,117 |
| CT Knobs | 0,427 | 0,506 | 0,497 | 0,651 | 0,561 | 0,589 | 0,581 |
| IPC Cooling | 0,761 | 0,857 | 0,732 | 0,847 | 0,85 | 0,788 | 0,837 |
| Main Vent Sys | 0,843 | 0,870 | 0,903 | 0,909 | 0,886 | 0,901 | 0,904 |
| Mainback | 0,856 | 0,835 | 0,845 | 0,853 | 0,84 | 0,838 | 0,841 |
| IPC Comp | 0,549 | 0,631 | 0,343 | 0,528 | 0,62 | 0,440 | 0,460 |
| Coil Temps | 0,847 | 0,878 | 0,846 | 0,894 | 0,85 | 0,856 | 0,863 |

R² do Random Forest depois da busca anterior e R² do Extra Trees e do Ridge na busca anterior não constam na consolidação disponível; por isso a tabela traz apenas GB e RF. RF antes (anterior) em IPC Cooling, Mainback, IPC Comp e Coil Temps vem da Seção 4.3, com duas casas.

**Tabela 5 — Melhor modelo por área em cada busca**

| Área | RS anterior | MAE | R² | RS novo | MAE | R² | Menor MAE |
|---|---|---|---|---|---|---|---|
| Oven HMI | GB | 2,32 | 0,108 | RF | 2,62 | 0,117 | Anterior |
| CT Knobs | GB | 3,07 | 0,506 | GB | 2,95 | 0,651 | Novo |
| IPC Cooling | ET | 4,14 | n/d | GB | 4,20 | 0,847 | Empate |
| Main Vent Sys | GB | 4,73 | 0,870 | ET | 3,77 | 0,906 | Novo |
| Mainback | GB | 5,44 | 0,835 | GB | 5,72 | 0,853 | Anterior |
| IPC Comp | GB | 7,20 | 0,631 | GB | 8,14 | 0,528 | Anterior |
| Coil Temps | GB | 10,42 | 0,878 | GB | 10,37 | 0,894 | Empate |

**Tabela 6 — Resumo geral**

| Indicador | RS anterior | RS novo | Melhor |
|---|---|---|---|
| Pares com MAE menor que a partida | 19 de 28 | 26 de 28 | Novo |
| Pares em que a busca foi mais eficaz (Tabela 3) | 8 | 17 (3 empates) | Novo |
| Ganho médio de MAE nos 28 pares | +5,3% | +7,0% | Novo |
| Random Forest: áreas com MAE menor que a partida | 0 de 7 | 5 de 7 | Novo |
| Gradient Boosting: ganho médio de MAE | +14,9% | +14,9% | Empate |
| MAE agregado do melhor modelo por área | 6,34 °C | 6,84 °C | Anterior |
| Referência: solução entregue (RF, Sprint 3) | 6,57 °C | 6,57 °C | — |

## 4. Vereditos

| Pergunta | Veredito |
|---|---|
| O random search novo melhorou o modelo em relação a antes? | Sim: MAE menor em 26 de 28 pares (20 acima de 1%), mas só um ganho alcança o piso de ruído. |
| Qual algoritmo mais se beneficiou do tuning? | Gradient Boosting: +14,9% de MAE e +0,13 de R² em média. |
| Qual algoritmo menos se beneficiou? | Random Forest: +1,1%; a configuração padrão já estava próxima do ótimo. |
| Melhor algoritmo por região | GB em CT Knobs, IPC Cooling, Mainback, IPC Comp e Coil Temps; ET em Main Vent Sys; empate RF/ET/GB em Oven HMI. |
| Qual random search deu mais certo como busca? | O novo: melhorou mais pares (26 contra 19), teve ganho médio maior (7,0% contra 5,3%) e o Random Forest deixou de piorar (MAE menor em 5 de 7 áreas, contra 0 de 7). |
| Qual deu o menor erro absoluto? | O anterior (6,34 contra 6,84 °C), por efeito da base, e não da busca. A diferença concentra-se no IPC Comp (7,20 contra 8,14 °C), que reúne metade das leituras. |
| Qual conjunto de hiperparâmetros entregar? | Os do RS novo para a base 13cat; os do RS anterior para a base perfil da solução entregue. |

Ressalva: o MAE do vencedor de cada busca é otimista, pois a mesma validação escolhe e avalia o candidato. O viés afeta as duas buscas igualmente.