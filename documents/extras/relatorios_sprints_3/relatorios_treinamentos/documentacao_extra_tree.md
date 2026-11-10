# Documentação dos Experimentos de Treino — Extra Trees

**Projeto:** Whirlpool Thermal Predictor
**Algoritmo desta fase:** Extra Trees Regressor (primeiro modelo candidato)
**Como usar este documento:** cada experimento tem um bloco próprio, com o link do Colab, a configuração testada e a tabela de resultados. Preencha os campos marcados com `[preencher]` conforme roda cada teste.

---

## 1. Organização do trabalho

O treino é feito em notebooks Colab, um por configuração testada. Cada notebook é idêntico no código — muda apenas a configuração do experimento (definida em duas variáveis no topo). Os notebooks ficam versionados no repositório do projeto, e o link público do Colab de cada um é registrado na tabela de experimentos abaixo.

O fluxo é: (1) rodar o notebook com uma configuração, (2) registrar a tabela de resultados aqui, (3) trocar a configuração, (4) repetir. Ao final, os experimentos são comparados para decidir a melhor configuração.

**Regra de método:** todos os resultados registrados vêm da **validação** (leave-one-group-out sobre o treino). O conjunto de teste permanece intocado e só será usado uma vez, ao final, para reportar o desempenho da configuração escolhida. Nenhuma decisão entre experimentos usa o conjunto de teste.

---

## 2. Glossário das configurações

Cada experimento é definido por duas escolhas independentes: **como a coluna `losses` é tratada** e **como os valores nulos são tratados**.

### 2.1. Versões de `losses`

`losses` é o perfil de perda térmica (em Watts) de cada ensaio. Tinha 13 categorias distintas para 56 ensaios, o que motivou testar uma forma agrupada.

| Versão | O que é | Nº de colunas de losses |
|---|---|---|
| **13cat** | As 13 categorias originais, preservadas como estão. Mantém toda a granularidade, mas gera muitas colunas esparsas (risco de overfitting numa base pequena). | 13 |
| **perfil** | As categorias agrupadas por perfil de perda: `no losses`, `simone`, `miro`. A ordem de montagem (front/back) foi descartada por não ter efeito consistente na temperatura. Menos colunas, menos risco de overfitting, mas descarta parte da granularidade. | 3 |

### 2.2. Tratamentos de valores nulos

Os nulos restantes estão nas colunas-alvo (temperaturas). Há três formas de tratá-los:

| Tratamento | O que é | Vazamento? |
|---|---|---|
| **mascara** | Cada componente é treinado só com as linhas em que foi medido. Não preenche nada. | Não |
| **imputado_treino** | Os nulos são preenchidos com a média (ou mediana, se houver valores extremos), calculada **apenas sobre o conjunto de treino**. | Não |
| **imputado_base** | Usa os arquivos `_snull` já preenchidos, cuja estatística foi calculada sobre a base completa (incluindo o teste). | Sim — a estatística "vê" o teste |

> **Nota:** `imputado_base` só existe para a versão `13cat` (é a única para a qual os arquivos `_snull` foram gerados). Para imputar na versão `perfil`, usa-se `imputado_treino`.

### 2.3. O que se mede (métricas)

| Métrica | O que mede | Como ler |
|---|---|---|
| **MAE** | Erro absoluto médio, em °C. | Quanto menor, melhor. É a métrica mais interpretável (está em graus). |
| **RMSE** | Como o MAE, mas pune erros grandes mais pesado. | Se for bem maior que o MAE, há previsões muito erradas em alguns ensaios. |
| **R²** | Quanto da variação da temperatura o modelo explica. | 1 é perfeito; 0 = igual a chutar a média; negativo = pior que chutar a média. **Cuidado:** em áreas de faixa térmica estreita, R² negativo pode coexistir com MAE baixo — nesses casos o MAE é mais informativo. |

Referência de comparação: o **piso de erro** de cada área (erro mínimo teórico, limitado pelo ruído experimental): Oven HMI ~1,4 °C, CT Knobs ~2,4 °C, Main Vent Sys ~3,0 °C, IPC Cooling ~3,8 °C, Coil Temps ~4,4 °C, Mainback ~4,8 °C, IPC Comp ~5,2 °C. Um MAE próximo do piso indica que o modelo está no limite do que os dados permitem.

---

## 3. Experimentos

Os experimentos são rodados em ordem, variando **uma** configuração por vez para isolar o efeito de cada mudança.

### Experimento 1 — 13cat + imputado_treino (linha de base)

- **Configuração:** `VERSAO = "13cat"`, `TRATAMENTO = "imputado_treino"`
- **Objetivo:** estabelecer o desempenho de referência com todas as categorias de losses e imputação sem vazamento.
- **Link do Colab:** [`Link do primeiro experimento`](https://colab.research.google.com/drive/1ccTGpMU15MIllcH86JO51O4n3e2FCxOR?usp=sharing)
- **Resultados:**

| área | componentes | pulados | MAE | RMSE | R² |
|---|---|---|---|---|---|
| coil_temps | 8 | 0 | 12,89 | 18,76 | 0,62 |
| ct_knobs | 6 | 0 | 3,10 | 5,11 | −0,12 |
| ipc_comp | 35 | 2 | 8,72 | 12,21 | −0,27 |
| ipc_cooling | 4 | 0 | 5,17 | 8,11 | −0,40 |
| main_vent_sys | 5 | 0 | 3,91 | 6,51 | 0,33 |
| mainback | 10 | 0 | 6,09 | 10,05 | 0,04 |
| oven_hmi | 4 | 0 | 2,64 | 4,22 | −0,50 |

- **MAE médio geral:** 6,07 °C
- **Observações:** as áreas de faixa térmica estreita (oven_hmi, ct_knobs) têm MAE baixo (2,64 e 3,10 °C) apesar de R² negativo — nelas a temperatura quase não varia, então a média já é um bom chute e o R² fica negativo mesmo com erro prático pequeno; o MAE é a métrica que importa aí. Já Coil Temps (12,89) e IPC Comp (8,72) têm erro alto real, acima do piso estimado (4,4 e 5,2 °C). O IPC Comp mostra 2 componentes pulados: são colunas que a regra de nulos manda excluir na imputação.

---

### Experimento 2 — perfil + imputado_treino

- **Configuração:** `VERSAO = "perfil"`, `TRATAMENTO = "imputado_treino"`
- **Objetivo:** medir o efeito de agrupar `losses`, mantendo o tratamento de nulos igual ao Experimento 1 (para isolar o efeito das losses).
- **Link do Colab:** [`Link do segundo experimento`](https://colab.research.google.com/drive/1lQiO3XSZuSQSanwv11rUiPqiOxLJiF6D?usp=sharing)
- **Resultados:**

| área | componentes | pulados | MAE | RMSE | R² |
|---|---|---|---|---|---|
| coil_temps | 8 | 0 | 13,66 | 19,32 | 0,61 |
| ct_knobs | 6 | 0 | 3,10 | 5,14 | −0,14 |
| ipc_comp | 35 | 2 | 8,37 | 11,92 | −0,25 |
| ipc_cooling | 4 | 0 | 4,49 | 7,36 | −0,15 |
| main_vent_sys | 5 | 0 | 4,58 | 7,24 | 0,20 |
| mainback | 10 | 0 | 6,00 | 9,96 | 0,06 |
| oven_hmi | 4 | 0 | 2,67 | 4,10 | −0,42 |

- **MAE médio geral:** 6,13 °C
- **Observações:** o agrupamento de losses praticamente não alterou o desempenho — MAE médio de 6,13 contra 6,07 do Experimento 1 (diferença de 0,06 °C, dentro da faixa de ruído). Por área, todas as diferenças são pequenas (maior: coil_temps +0,77, ipc_cooling −0,68), sem nenhuma grande e consistente. Conclusão: perfil é **equivalente** a 13cat em desempenho, sendo preferível por ter menos colunas (3 contra 13) — menos risco de overfitting e mais simples. Importante: o erro alto de Coil Temps e IPC Comp permaneceu nas duas versões, o que indica que a causa desse erro **não** está no tratamento de losses.

---

### Experimento 3 — 13cat + mascara

- **Configuração:** `VERSAO = "13cat"`, `TRATAMENTO = "mascara"`
- **Objetivo:** medir o efeito de não imputar os nulos, mantendo losses igual ao Experimento 1 (para isolar o efeito do tratamento de nulos).
- **Link do Colab:** [`Link do terceiro experimento`](https://colab.research.google.com/drive/1nN4iMWVuj50sJH_JEzEY8rVpENGeANk5?usp=sharing)
- **Resultados:**

| área | componentes | pulados | MAE | RMSE | R² |
|---|---|---|---|---|---|
| coil_temps | 8 | 0 | 12,95 | 18,30 | 0,64 |
| ct_knobs | 6 | 0 | 3,16 | 5,15 | −0,15 |
| ipc_comp | 37 | 0 | 9,31 | 13,32 | −0,64 |
| ipc_cooling | 4 | 0 | 5,26 | 8,17 | −0,41 |
| main_vent_sys | 5 | 0 | 3,91 | 6,51 | 0,33 |
| mainback | 10 | 0 | 6,07 | 10,10 | 0,02 |
| oven_hmi | 4 | 0 | 2,64 | 4,23 | −0,51 |

- **MAE médio geral:** 6,19 °C
- **Observações:** com máscara, o MAE médio (6,19) ficou levemente acima da imputação do Experimento 1 (6,07) — diferença de 0,12 °C, pequena mas consistente com o esperado: a imputação dá mais linhas de treino aos componentes com nulos, e isso ajuda numa base pequena. Note que o IPC Comp agora tem **37 componentes e 0 pulados** (contra 35 e 2 na imputação): com máscara, nenhum componente é excluído — os que a regra de nulos excluía passam a ser treinados só com as linhas medidas. O IPC Comp com máscara é o pior resultado da área em todos os experimentos (9,31), o que sugere que, para os componentes muito esparsos, ter poucas linhas reais é pior que imputar.

---

### Experimento 4 — perfil + mascara

- **Configuração:** `VERSAO = "perfil"`, `TRATAMENTO = "mascara"`
- **Objetivo:** a combinação mais enxuta (menos colunas, sem imputação). Fecha o quadrado de comparações 2×2 (losses × nulos).
- **Link do Colab:** [`Link do quarto experimento`](https://colab.research.google.com/drive/1GNJoqxnayTqPQWelITBayWVNHS29yl3m?usp=sharing)
- **Resultados:**

| área | componentes | pulados | MAE | RMSE | R² |
|---|---|---|---|---|---|
| coil_temps | 8 | 0 | 13,23 | 18,63 | 0,63 |
| ct_knobs | 6 | 0 | 3,12 | 5,13 | −0,14 |
| ipc_comp | 37 | 0 | 9,01 | 13,12 | −0,63 |
| ipc_cooling | 4 | 0 | 4,49 | 7,39 | −0,16 |
| main_vent_sys | 5 | 0 | 4,58 | 7,24 | 0,20 |
| mainback | 10 | 0 | 5,98 | 10,03 | 0,05 |
| oven_hmi | 4 | 0 | 2,46 | 3,97 | −0,34 |

- **MAE médio geral:** 6,12 °C
- **Observações:** combinação mais enxuta (perfil + sem imputação). MAE médio de 6,12 — praticamente igual às outras três combinações. Assim como no Experimento 3, o IPC Comp tem 37 componentes e 0 pulados (a máscara não exclui nenhum). O padrão geral se confirma: nem a versão de losses nem o tratamento de nulos movem o resultado de forma relevante.

## 4. Quadro comparativo

Resumo do MAE médio geral de cada experimento, para decisão:

| Experimento | losses | nulos | MAE médio geral |
|---|---|---|---|
| 1 | 13cat | imputado_treino | 6,07 |
| 2 | perfil | imputado_treino | 6,13 |
| 3 | 13cat | mascara | 6,19 |
| 4 | perfil | mascara | 6,12 |

Organizado como quadro 2×2 (o número é o MAE médio geral):

| | imputado_treino | mascara |
|---|---|---|
| **13cat** | 6,07 | 6,19 |
| **perfil** | 6,13 | 6,12 |

**Decisão sobre losses:** as quatro combinações ficam entre 6,07 e 6,19 °C — uma variação total de 0,12 °C, dentro da faixa de ruído da base pequena. Isso significa que **agrupar em perfil é equivalente a manter as 13 categorias** em termos de desempenho. Recomenda-se **perfil**, não por prever melhor, mas por ser mais simples (3 colunas contra 13), o que reduz o risco de overfitting e facilita a interpretação — o princípio de escolher o modelo mais simples entre desempenhos iguais.

**Decisão sobre nulos:** a imputação sobre o treino teve leve vantagem no 13cat (6,07 vs 6,19) e empate no perfil (6,13 vs 6,12). A diferença é pequena, mas a imputação nunca foi pior e ajudou os componentes mais esparsos (o IPC Comp com máscara foi o pior resultado individual). Recomenda-se **imputado_treino**, por dar mais dados de treino sem introduzir vazamento.

**Configuração escolhida para o modelo candidato:** a rigor, as quatro são equivalentes. A escolha mais defensável combina simplicidade e aproveitamento dos dados: **perfil + imputado_treino** (Experimento 2). Alternativamente, **perfil + mascara** (Experimento 4) é a mais enxuta e teve MAE praticamente idêntico — qualquer uma das duas é justificável.

---

## 5. Conclusão da fase (o que temos até aqui)

Quatro experimentos cobriram todas as combinações de losses (13cat/perfil) e nulos (imputação/máscara) com o Extra Trees. As conclusões:

**1. As decisões de pré-processamento não movem o resultado.** As quatro combinações ficaram entre 6,07 e 6,19 °C de MAE médio — variação de apenas 0,12 °C. Isso é uma descoberta valiosa: significa que a discussão sobre como codificar losses e como tratar nulos, embora importante para a corretude, não é o que limita o desempenho do modelo. Podemos fixar a configuração mais simples e defensável (perfil + imputado_treino) e parar de iterar sobre pré-processamento.

**2. O desempenho é desigual entre áreas, e isso é esperado.** Quatro áreas têm erro prático baixo (Oven HMI 2,6 °C, CT Knobs 3,1 °C, Main Vent Sys 3,9 °C, IPC Cooling ~4,5-5,3 °C) — são áreas de faixa térmica estreita, onde o R² negativo não indica problema, apenas que a temperatura varia pouco. Duas áreas têm erro alto real: Coil Temps (~13 °C) e IPC Comp (~8-9 °C), ambas acima do piso de erro estimado.

**3. A causa do erro alto NÃO está no pré-processamento.** Como Coil Temps e IPC Comp mantiveram erro alto nas quatro combinações, já podemos descartar que o problema seja losses ou nulos. A causa está em outro lugar — provavelmente a quantidade de dados (essas são as áreas com mais componentes para poucas configurações distintas), a escolha do algoritmo, ou seus parâmetros. Isso direciona a investigação futura e evita perder tempo mexendo no que não é o gargalo.

**4. Sobre a imputação vs máscara:** a imputação ajuda os componentes muito esparsos. Com máscara, o IPC Comp não exclui nenhum componente (37 contra 35), mas seu erro é o pior de todos (9,31), porque os componentes esparsos treinam com pouquíssimas linhas. A imputação sobre o treino resolve isso sem vazamento.

Em resumo: o Extra Trees entrega um primeiro modelo candidato razoável na maioria das áreas, com duas áreas que precisam de mais investigação — e essa investigação deve focar em dados/algoritmo, não em pré-processamento.