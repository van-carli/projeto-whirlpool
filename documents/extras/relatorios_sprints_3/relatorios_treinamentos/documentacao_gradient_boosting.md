# Documentação dos Experimentos de Treino - Gradient Boosting

## 1. Organização do trabalho

O treino foi feito em um notebook jupyter único presente na pasta `testes_treinamento`, dividido em duas partes. A Parte I monta a infraestrutura e roda uma vez a leitura da partição, tratamento de ausências, treino, avaliação e relatórios. Já a Parte II treina uma área por seção, em três células, treino das duas versões de `losses`, relatório de cada uma e comparação com síntese.

A configuração do experimento é definida em duas variáveis no topo (`TRATAMENTO` e a versão passada a cada chamada), e os resultados ficam registrados em memória indexados por área e versão, de modo que uma execução nova não apaga a anterior. Ao final, os experimentos são comparados para decidir a melhor configuração.

**Regra de método:** todos os resultados registrados vêm da validação (leave-one-group-out sobre o treino). O conjunto de teste permanece intocado e só será usado uma vez, ao final, para reportar o desempenho da configuração escolhida. Nenhuma decisão entre experimentos usa o conjunto de teste.

**Partição fixa:** a divisão entre treino e teste é lida de arquivo e nunca sorteada de novo. A variação entre sorteios foi medida em 2,25 °C, magnitude superior às diferenças que os experimentos pretendem detectar, de modo que um novo sorteio confundiria o efeito estudado com o acaso da divisão.

## 2. Glossário das configurações

Cada experimento é definido por duas escolhas independentes:
**como a coluna `losses` é tratada** e **como os valores nulos são tratados**.

### 2.1. Versões de `losses`

`losses` é o perfil de perda térmica (em Watts) de cada ensaio.
São 13 categorias distintas para 56 ensaios, o que motivou testar uma forma agrupada.

| Versão | O que é | Nº de colunas de losses |
|---|---|---|
| 13cat | As 13 categorias originais, preservadas como estão, mantendo toda a granularidade, mas gerando muitas colunas esparsas (risco de overfitting numa base pequena) | 13 |
| perfil | As categorias agrupadas por perfil de perda: `no losses`, `simone`, `miro`. A ordem de montagem (front/back) foi descartada por não ter efeito consistente na temperatura, levando ao menor risco de overfitting, mas descartando parte da granularidade | 3 |

### 2.2. Tratamentos de valores nulos

Os nulos restantes estão nas colunas-alvo (temperaturas). Há três formas de tratá-los:

| Tratamento | O que é | Vazamento? |
|---|---|---|
| mascara | Cada componente é treinado só com as linhas em que foi medido, não preenchendo nada | Não |
| imputado_treino | Os nulos são preenchidos com a média (ou mediana, se houver valores extremos), calculada apenas sobre o conjunto de treino | Não |
| imputado_base | Usa os arquivos `_snull` já preenchidos, cuja estatística foi calculada sobre a base completa (incluindo o teste) | Sim |

**Observação:** `imputado_base` só existe para a versão `13cat` (é a única para a qual os arquivos `_snull` foram gerados). Para imputar na versão `perfil`, usa-se `imputado_treino`.

**Observação sobre a avaliação:** em qualquer dos três tratamentos, a avaliação usa apenas valores medidos. 
Pontuar contra um rótulo imputado mediria a capacidade de reproduzir a imputação, e não a de prever a temperatura.

### 2.3. Configuração do algoritmo

O Gradient Boosting constrói árvores em sequência, cada uma ajustada aos resíduos das anteriores. Os hiperparâmetros de partida foram fixados para o tamanho da base (cerca de quarenta ensaios de treino) e são os mesmos em todas as áreas, de modo que as diferenças entre elas reflitam os dados e não a configuração.

| Parâmetro | Valor | Razão |
|---|---|---|
| `n_estimators` | 300 | muitas árvores rasas, compensando a taxa de aprendizado baixa |
| `learning_rate` | 0,05 | passo pequeno reduz a variância do conjunto |
| `max_depth` | 2 | profundidade limitada é o indicado para bases pequenas |
| `min_samples_leaf` | 2 | evita folhas com um único ensaio |
| `subsample` | 0,8 | amostragem por árvore, regularização adicional |
| `random_state` | 42 | reprodutibilidade |

Cada componente recebe um regressor independente, e não um `MultiOutputRegressor` sobre a matriz de alvos, em que as colunas-alvo têm coberturas diferentes, e o regressor multissaída exigiria descartar ensaios ou imputar valores na própria variável que se quer prever.

### 2.4. O que se mede (métricas)

| Métrica | O que mede | Como ler |
|---|---|---|
| MAE | Erro absoluto médio, em °C. | Quanto menor, melhor |
| RMSE | Como o MAE, mas pune erros grandes mais pesado | Se for bem maior que o MAE, há previsões muito erradas em alguns ensaios |
| R² | Quanto da variação da temperatura o modelo explica | 1 é perfeito, 0 = igual a chutar a média e negativo = pior que chutar a média |

Duas referências auxiliares acompanham as três métricas, sendo elas o **regressor trivial**, que prevê sempre a média do treino da dobra, é o que dá sentido ao R² negativo, um componente cujo erro não supera o do trivial não está sendo explicado pelas variáveis disponíveis. Alé,m disso, têm-se o **piso de erro** de cada área, medido pela dispersão dos alvos entre repetições da mesma configuração, Oven HMI 1,64 °C, CT Knobs 2,44 °C, Main Vent Sys 2,71 °C, IPC Cooling 3,62 °C, Mainback 4,00 °C, IPC Comp 4,61 °C, Coil Temps 5,50 °C. Dessa forma, um MAE próximo do piso indica que o modelo está no limite do que os dados permitem.

### 2.5. Indicadores do parceiro

Além das três métricas, o notebook apura os indicadores do Project Charter. A acuracidade é reportada em três denominadores que são sobre a temperatura medida, sobre o limite ativo do componente e sobre a faixa observada do alvo. As tabelas abaixo trazem a leitura sobre o limite ativo, que é a de engenharia. A leitura sobre a elevação acima do ambiente, fisicamente a mais correta, não é apurável porque a temperatura ambiente dos ensaios não está registrada na base.

Ademais, o acerto do lado do limite não consta do requisito contratual, mas decide a utilidade da ferramenta em projeto, mede quantas vezes o modelo acerta se o componente ultrapassa ou não seu limite de segurança.

Por fim, o KPI de eficiência de tempo fica registrado como não apurado, onde a predição de uma área inteira leva dezenas de milissegundos, mas falta o tempo de referência de uma rodada de CFD, que precisa vir da Whirlpool.


## 3. Experimentos

Os experimentos são rodados em ordem, variando uma configuração por vez para isolar o efeito de cada mudança.

### Experimento 1 - 13cat + mascara (linha de base)

- **Configuração:** `VERSAO = "13cat"`, `TRATAMENTO = "mascara"`
- **Objetivo:** estabelecer o desempenho de referência com todas as categorias de losses e sem imputação, tratamento que não fabrica nenhum valor.

- **Resultados:**

| área | componentes | pulados | MAE | RMSE | R² | % sobre limite | acerto do limite |
|---|---|---|---|---|---|---|---|
| coil_temps | 8 | 0 | 13,67 | 19,15 | 0,64 | 8,03 | 95,1 |
| ct_knobs | 6 | 0 | 2,92 | 4,82 | 0,01 | 2,78 | 100,0 |
| ipc_comp | 37 | 0 | 8,94 | 12,47 | −0,26 | 8,44 | 94,7 |
| ipc_cooling | 4 | 0 | 5,03 | 7,75 | −0,27 | 4,11 | 100,0 |
| main_vent_sys | 5 | 0 | 4,12 | 6,41 | 0,35 | 3,15 | 100,0 |
| mainback | 10 | 0 | 6,08 | 9,50 | 0,15 | 6,33 | 93,9 |
| oven_hmi | 4 | 0 | 3,28 | 4,84 | −0,98 | 3,86 | 100,0 |

- **MAE médio geral:** 6,29 °C

- **Observações:** nenhuma área atinge o piso de ruído, e a razão entre erro e piso varia de 1,20 (CT Knobs) a 2,48 (Coil Temps). Todos os 74 componentes foram avaliados, a máscara não exclui nenhum, pois os componentes esparsos passam a treinar só com as linhas medidas. As áreas de faixa estreita (oven_hmi, ct_knobs) têm MAE baixo apesar de R² negativo ou próximo de zero, situação em que o MAE é a métrica que importa. Contudo, Coil Temps é o caso oposto, R² de 0,64, o melhor das sete áreas, com MAE de 13,67 °C, o pior, a faixa térmica ampla da área (bobinas indo de 40 a 235 °C) permite que o modelo explique muita variação e ainda assim erre muito em graus. Nas três áreas com estouro de limite registrado, o acerto do lado do limite ficou entre 93,9% e 95,1%.

### Experimento 2 - perfil + mascara

- **Configuração:** `VERSAO = "perfil"`, `TRATAMENTO = "mascara"`
- **Objetivo:** medir o efeito de agrupar `losses`, mantendo o tratamento de nulos igual ao Experimento 1 (para isolar o efeito das losses).

- **Resultados:**

| área | componentes | pulados | MAE | RMSE | R² | % sobre limite | acerto do limite |
|---|---|---|---|---|---|---|---|
| coil_temps | 8 | 0 | 13,84 | 19,18 | 0,65 | 8,09 | 94,2 |
| ct_knobs | 6 | 0 | 3,11 | 4,80 | 0,02 | 2,97 | 100,0 |
| ipc_comp | 37 | 0 | 9,16 | 12,88 | −0,39 | 8,70 | 95,3 |
| ipc_cooling | 4 | 0 | 4,88 | 7,69 | −0,26 | 3,46 | 100,0 |
| main_vent_sys | 5 | 0 | 4,54 | 6,92 | 0,26 | 3,51 | 100,0 |
| mainback | 10 | 0 | 6,39 | 10,00 | 0,07 | 6,72 | 92,4 |
| oven_hmi | 4 | 0 | 2,86 | 4,53 | −0,74 | 3,37 | 100,0 |

- **MAE médio geral:** 6,40 °C

- **Observações:** o agrupamento de losses praticamente não alterou o desempenho, MAE médio de 6,40 contra 6,29 do Experimento 1, diferença de 0,10 °C, dentro da faixa de ruído. Por área, todas as diferenças ficam abaixo do limiar de 0,5 °C adotado, a maior a favor do 13cat é main_vent_sys (+0,41) e a maior a favor do perfil é oven_hmi (−0,42). Nenhuma das sete áreas apresentou diferença acima do limiar. Como no Experimento 1, o erro alto de Coil Temps e IPC Comp permaneceu, o que indica que a causa desse erro não está no tratamento de losses.

### Experimento 3 - 13cat + imputado_treino (parcial: Coil Temps)

- **Configuração:** `VERSAO = "13cat"`, `TRATAMENTO = "imputado_treino"`
- **Objetivo:** medir o efeito de imputar os nulos das placas de alumínio do Coil Temps, mantendo losses igual ao Experimento 1 (para isolar o efeito do tratamento de nulos), rodado apenas nessa área, onde a questão dos nulos foi levantada.

- **Resultados:**

| área | componentes | pulados | MAE | RMSE | R² | % sobre limite | acerto do limite |
|---|---|---|---|---|---|---|---|
| coil_temps | 8 | 0 | 13,68 | 19,07 | 0,65 | 8,04 | 94,8 |

- **Delta em relação ao Experimento 1 (mesma área):** +0,01 °C de MAE, +0,008 de R²

- **Observações:** a imputação não mudou nada no Coil Temps, diferença de 0,01 °C, muito abaixo do limiar de ruído. Componente a componente, seis dos oito ficam no ruído, um favorece a imputação (Aluminium Plate RR, −0,69 °C) e um favorece a máscara (Aluminium Plate FR, +0,96 °C), ou seja, os dois casos com diferença real estão no mesmo grupo de componentes e apontam em sentidos opostos, o que é o padrão de ruído e não de efeito. Os falsos negativos na classificação de estouro subiram de 12 para 14 com a imputação, sinal leve mas desfavorável. Como conclusão, para esta área, imputar ou mascarar é indiferente e a máscara é preferível por não fabricar valor algum.

## 4. Quadro comparativo

Resumo do MAE médio geral de cada experimento, para decisão:

| Experimento | losses | nulos | MAE médio geral | Cobertura |
|---|---|---|---|---|
| 1 | 13cat | mascara | 6,29 | 7 áreas |
| 2 | perfil | mascara | 6,40 | 7 áreas |
| 3 | 13cat | imputado_treino | 13,68 (só Coil Temps) | 1 área |

Comparação por área entre os Experimentos 1 e 2, com o limiar de ruído de 0,5 °C:

| área | 13cat | perfil | delta | piso | razão erro/piso (13cat) | veredito |
|---|---|---|---|---|---|---|
| oven_hmi | 3,28 | 2,86 | −0,42 | 1,64 | 2,00 | ruído |
| ipc_cooling | 5,03 | 4,88 | −0,16 | 3,62 | 1,39 | ruído |
| coil_temps | 13,67 | 13,84 | +0,18 | 5,50 | 2,48 | ruído |
| ct_knobs | 2,92 | 3,11 | +0,19 | 2,44 | 1,20 | ruído |
| ipc_comp | 8,94 | 9,16 | +0,22 | 4,61 | 1,94 | ruído |
| mainback | 6,08 | 6,39 | +0,30 | 4,00 | 1,52 | ruído |
| main_vent_sys | 4,12 | 4,54 | +0,41 | 2,71 | 1,52 | ruído |

Contagem por componente, nas sete áreas (74 componentes):

| veredito | componentes |
|---|---|
| ruído | 47 |
| 13cat melhor | 21 |
| perfil melhor | 6 |

**Decisão sobre losses:** nenhuma das sete áreas apresentou diferença acima do limiar de 0,5 °C, e o delta médio é de +0,10 °C por área. No nível da área, portanto, as duas versões são **equivalentes**. A contagem por componente adiciona uma nuance que a média esconde, em que entre os 27 componentes com diferença acima do limiar, 21 favorecem o 13cat e 6 favorecem o perfil, e o delta mediano por componente é de +0,11 °C, também a favor do 13cat. O sinal é fraco mas consistente em direção. Como a diferença não se traduz em ganho prático, a escolha se decide por parcimônia, e aqui as duas leituras divergem, o perfil usa 3 colunas contra 13, o que reduz o risco de memorização, já o 13cat foi levemente melhor na maioria dos componentes em que houve diferença. Recomenda-se **perfil**, registrando que a vantagem marginal do 13cat por componente está dentro do que a base consegue distinguir.

**Decisão sobre nulos:** testada apenas no Coil Temps, a imputação foi indiferente (+0,01 °C) e piorou levemente a classificação de estouro. Recomenda-se **mascara**, por não fabricar valor na variável-alvo. Registra-se a divergência com o bloco Extra Trees, que recomendou `imputado_treino`, lá a máscara penalizou o IPC Comp, porque a regra de nulos do Extra Trees excluía dois componentes esparsos na imputação, enquanto no Gradient Boosting os 37 componentes foram avaliados nas duas condições.

**Configuração escolhida para o modelo candidato:** **perfil + mascara** (Experimento 2). O erro médio é 0,10 °C superior ao do 13cat, diferença que a base não distingue, e a configuração é a mais enxuta e a que menos pressupõe.

## 5. Conclusão da fase

Os experimentos cobriram as duas versões de losses nas sete áreas e o tratamento de nulos na área em que ele estava em aberto. As conclusões:

**1. As decisões de pré-processamento não movem o resultado.**                                                                                               
As duas versões de losses ficaram em 6,29 e 6,40 °C de MAE médio, e a imputação no Coil Temps mudou 0,01 °C. Nenhuma das sete áreas apresentou diferença acima do limiar de ruído. Isso significa que a discussão sobre como codificar losses e como tratar nulos, embora importante para a corretude, não é o que limita o desempenho. É possível fixar a configuração mais simples e defensável e parar de iterar sobre pré-processamento.

**2. O desempenho é desigual entre áreas**                                                                                            
Dos 74 componentes avaliados, 34 têm desempenho adequado e 40 apresentam desempenho fraco. O diagnóstico automático os classifica em três grupos, sendo 19 componentes em que as features disponíveis não explicam o alvo, isto é, o erro do modelo iguala ou supera o do regressor trivial, 18 componentes com sobreajuste, em que o erro de treino é muito inferior ao de validação e 3 componentes cujo alvo varia menos que o piso de ruído da área, casos em que o modelo é dispensável e não falho. A razão média entre erro de treino e de validação é de 0,47, o que confirma que o modelo ajusta o treino com folga e não transfere o desempenho para configurações não vistas.

**3. A causa do erro alto NÃO está no pré-processamento.**                                                                                              
Como Coil Temps e IPC Comp mantiveram erro alto nas duas versões de losses e, no Coil Temps, também sob imputação, já se pode descartar que o problema seja losses ou nulos. No IPC Comp, 13 dos 37 componentes caem na categoria "features não explicam", concentrados nos capacitores ressonantes e nos capacitores de barramento, que perdem para o regressor trivial. A causa está na informação disponível, não no pré-processamento nem, provavelmente, no algoritmo.

**4. A importância das variáveis aponta na mesma direção.**                                                                                              
Nas três áreas com mais componentes problemáticos, o modelo se apoia quase inteiramente em duas variáveis, no IPC Comp, `run_case` (40,8%) e `losses` (30,9%) somam 71,7% da importância, no Coil Temps (85,8%) e no Oven HMI (54,7%). As demais características de projeto (direção do soprador, alojamento, posição da placa, furo do defletor, material do suporte) recebem pouco peso. Isso significa que o modelo está prevendo, em boa medida, o modo de operação do forno, e não o efeito das decisões de projeto, que é justamente o que a ferramenta precisa responder.

**5. Os indicadores do parceiro estão parcialmente atendidos.**                                                                                               
Na leitura sobre o limite ativo do componente, o erro relativo ficou entre 2,78% e 8,44% nas sete áreas, dentro da margem contratual de 10%. O acerto do lado do limite ficou entre 92,4% e 100%, mas as áreas com estouros reais concentram falsos negativos, que são os casos em que o modelo não sinaliza um componente que de fato ultrapassou o limite. Esse é o indicador que precisa melhorar antes de a ferramenta ser utilizável em projeto, e ele não está coberto pelos KPIs do Project Charter.

Em suma, o Gradient Boosting entrega um primeiro modelo candidato razoável na maioria das áreas, com erro entre 1,2 e 2,5 vezes o piso de ruído, e duas áreas que precisam de mais investigação, investigação que deve focar em variáveis de projeto adicionais.