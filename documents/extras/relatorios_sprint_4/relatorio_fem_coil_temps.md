# Relatório — Modelo térmico reduzido na área Coil Temps

**Sprint 4 · Cards 0 a 4 (#243, #245, #246, #247, #248) · branch `feat/femCoilTemps` · 18 de setembro de 2026**

Este relatório registra o que foi tentado com o modelo de elementos finitos reduzido (FEM) na área Coil Temps, o que foi medido e por que o desempenho do modelo preditivo não melhorou. O registro formal do método e do resultado está no item d da Seção 4.3 da documentação; o código e as saídas estão em `notebooks/colabs_S4/testes_extras/fem_coil_temps/fem_coil_temps.ipynb`. Este documento reúne a trajetória completa, inclusive as decisões intermediárias e as medições exploratórias que não entraram na documentação principal.

---

## 1. Resumo

O desempenho da área Coil Temps **não mudou**. O modelo de produção continua com **65,41% das previsões dentro da margem de 10%** e **erro absoluto médio de 11,71 °C**, em validação cruzada sobre 344 leituras.

O FEM foi construído, verificado contra solução analítica e calibrado sobre os ensaios de treino. Usado como atributo de entrada do Random Forest, **piorou as três grandezas medidas**: a margem caiu para 60,47%, o erro subiu para 15,23 °C e a aprovação indevida subiu de 19 para 24. Usado como gerador de dados sintéticos, **não passou no critério de confiabilidade**: seu erro fora da amostra é maior que o do modelo de produção em 7 dos 8 componentes. Por isso nenhuma das duas aplicações foi adotada.

A razão central é que, com as variáveis que a base oferece, a temperatura calculada pelo FEM é função das mesmas informações que o modelo já recebia: o material do suporte, o tipo de ensaio e a posição do componente. O FEM não trouxe informação nova; reescreveu a informação existente em outra forma, e o modelo passou a depender dessa nova forma do mesmo jeito que dependia dos rótulos.

Houve um resultado favorável, que não foi explorado: usado sozinho, o FEM produz **2 aprovações indevidas contra 13** do Random Forest nas mesmas leituras, porque subestima menos perto do limite.

---

## 2. Ponto de partida e objetivo

### 2.1 Por que Coil Temps

A área reúne oito componentes com dois limites de segurança distintos: as quatro resistências (Coil FL, FR, RL e RR), com limite ativo de 220 °C, e as quatro placas de suporte (Aluminium Plate FL, FR, RL e RR), com limite de 150 °C. É a área de pior desempenho no indicador acordado com a parceira e a que concentra o risco R06 da Seção 4.1.5 da documentação: uma subestimação ainda dentro dos 10% contratados consome a folga de segurança da regra de projeto e aprova uma arquitetura que, na prática, ultrapassa o limite.

### 2.2 Linha de base (Card 0)

O indicador do parceiro não era calculado para o modelo de produção por componente. O Card 0 aplicou a função canônica de avaliação, sem alterar o modelo, e registrou a linha de base em `notebooks/colabs_S3/linha_base_kpi.ipynb`.

| Grandeza | Coil Temps | Todas as áreas |
|---|---:|---:|
| Dentro da margem de 10% | 65,41% | 73,8% |
| Erro absoluto médio | 11,71 °C | 6,57 °C |
| Aprovações indevidas (limite absoluto) | 19 | 74 |

As quatro placas respondiam por 15 das 19 aprovações indevidas da área, e duas delas, FL e RL, com 45% das previsões dentro da margem, eram os únicos componentes do projeto abaixo de 50%.

O mesmo card mostrou que o valor de 8,09% reportado como "erro sobre o limite" no notebook de Gradient Boosting não é o indicador contratado: ele fica abaixo de 10% em todas as áreas, inclusive naquelas em que até 35% das previsões ficam fora da margem.

### 2.3 O diagnóstico que motivou o FEM

O modelo concentrava 87,4% da importância das variáveis de projeto em dois rótulos categóricos, o tipo de ensaio (`run_case`) e as perdas (`losses`), sobre apenas 17 configurações de treino. A leitura foi de sobreajuste: o modelo montava uma tabela de consulta por configuração, em vez de aprender o efeito físico das variáveis de projeto.

A hipótese testada foi a seguinte: um modelo físico reduzido, calibrado sobre os ensaios de treino, forneceria ao modelo de aprendizado uma descrição com estrutura térmica no lugar dos rótulos, reduziria a dependência deles e melhoraria o desempenho nas previsões de configurações não vistas.

---

## 3. O que foi feito

### 3.1 Card 1 — Construção e verificação do modelo físico (#245)

- **Física.** Condução de calor em regime permanente, em duas dimensões, com geração de calor na resistência e troca convectiva com o ar pela condição de contorno de Robin, resolvida por elementos finitos em `scikit-fem`.
- **Dois objetos térmicos.** A resistência e a placa foram modeladas como domínios separados, acoplados por contato térmico. A decisão ficou registrada porque, na preparação dos dados, as placas herdam o rótulo Coil Temps por preenchimento de célula vazia na planilha. Herdar o rótulo não implica herdar a física: o limite é 70 °C menor, o material varia entre alumínio e plástico e a placa não tem fonte de calor própria. Constatou-se ainda que o nome do termopar, "Aluminium Plate", indica a posição da medição, e não o material, pois a leitura existe também nos ensaios com suporte plástico.
- **Propriedades.** Condutividades de alumínio, nicromo e polímeros, e faixas de coeficiente de convecção para o ar, todas com unidade e fonte (BERGMAN et al., 2014).
- **Verificação.** Confronto com a solução fechada da parede plana, *q* = (*T*₁ − *T*∞)/(*L*/*k* + 1/*h*), em quatro combinações de material e convecção e três malhas. Maior erro relativo: 8 × 10⁻¹¹%, contra o critério de 1%. O modelo acoplado fecha o balanço de energia e respeita o princípio do máximo.
- **Correção feita durante o card.** A primeira versão violava o princípio do máximo com a placa plástica: a placa ficava mais quente que a resistência que a aquece. A causa era a matriz do contorno convectivo com número de Biot elevado. A matriz foi agrupada na diagonal, e a violação desapareceu.
- **Fora de escopo, declarado.** Radiação, que é não linear em T⁴ e, a 220 °C, equivale a cerca de 15 W/(m²·K), a mesma ordem da convecção livre.

### 3.2 Card 2 — Calibração contra os ensaios de treino (#246)

O coeficiente de convecção não existe na base; ele só passa a existir por calibração. A calibração usou exclusivamente os 46 ensaios de treino da partição registrada. Uma asserção recusa qualquer ensaio de teste e foi verificada injetando, um a um, os 10 ensaios reservados.

A unidade de calibração foi a família de configuração: material do suporte combinado com tipo de ensaio. Cada família recebeu um coeficiente de convecção e uma potência por posição, esta última como parâmetro auxiliar, porque a base não informa a potência das resistências.

| Família | Ensaios de treino | Situação | Coeficiente, W/(m²·K) | Faixa física |
|---|---:|---|---:|---|
| alumínio, broil c2 | 13 | calibrada | 735,7 | **acima da faixa** |
| alumínio, broil qualitative | 17 | calibrada | 910,3 | **acima da faixa** |
| plástico, broil c2 | 4 | calibrada, coeficiente não identificável | 2,0 | convecção livre |
| plástico, broil qualitative | 3 | calibrada | 165,7 | convecção forçada |
| alumínio, broil c1 | 1 | não calibrada: dados insuficientes | — | — |
| plástico, broil c1 | 1 | não calibrada: dados insuficientes | — | — |
| alumínio, pyro | 7 | não calibrada: o modelo não se aplica | — | — |

- **Pyro.** Foi recusado por critério físico, e não por falta de dados. Nesse modo, a placa é mais quente que a resistência em três das quatro posições, e as resistências ficam em torno de 50 °C: o calor vem do forno, e não do elemento que o modelo representa.
- **Escolha pelo R06.** Entre os coeficientes que ajustam o resíduo de forma equivalente, foi escolhido o que menos subestima a temperatura, e os dois valores ficaram registrados.
- **Coeficientes fora da faixa física.** A causa foi identificada por análise de sensibilidade. Com a condutância de contato de partida, que supõe contato metálico pleno, placa e resistência ficam praticamente na mesma temperatura. O único modo de reproduzir a placa medida, cerca de 30% menos aquecida que a resistência, é inflar a perda para o ar. Reduzindo a condutância de contato a um centésimo, o coeficiente cai para 8,4 e 11,2 W/(m²·K), dentro da convecção livre, com o mesmo erro. **Os dados determinam a combinação do coeficiente de convecção com a condutância de contato, e não cada um deles separadamente.**
- **Portão para dados sintéticos.** A calibração foi refeita dentro de cada uma das 17 dobras e comparada ao Random Forest de produção nas mesmas 224 leituras. O FEM erra 10,21 °C, contra 9,06 °C do Random Forest. O critério proposto, redução de pelo menos 20% no erro, foi atendido em apenas 1 dos 8 componentes. Nas mesmas leituras, porém, o FEM produziu **2 aprovações indevidas contra 13**.

### 3.3 Card 3 — O FEM como atributo do modelo de produção (#247)

- **Função canônica.** Passou a medir também a aprovação indevida contra a regra de projeto de 0,9 vez o limite. A mudança foi feita em `colabs_S3/preparacao_testes/metricas.ipynb`, com caso de teste próprio, e propagada sem alteração às cópias.
- **Atributos acrescentados.** As temperaturas calibradas do FEM, o coeficiente da família e um indicador de família calibrada. Foram comparadas três configurações sobre as mesmas 344 leituras, sem alteração de algoritmo, hiperparâmetro ou partição.

| Configuração | Dentro de 10% | Erro médio | Viés | Aprovação indevida | Idem, regra 0,9 |
|---|---:|---:|---:|---:|---:|
| A. Sem FEM (produção) | **65,41%** | **11,71 °C** | +0,53 °C | **19** | **22** |
| B. FEM somado aos rótulos | 60,47% | 15,23 °C | −2,57 °C | 24 | 27 |
| C. FEM no lugar dos rótulos | 54,36% | 25,43 °C | +4,06 °C | 23 | 27 |
| B sem validação cruzada interna (diagnóstico) | 67,44% | 14,07 °C | −2,23 °C | 22 | 32 |

**Correção metodológica feita durante o card.** Na primeira versão, o atributo de cada linha de treino vinha de uma calibração que usava o próprio valor medido daquela linha. Como o atributo deriva do alvo, isso é vazamento. A versão final exclui, para cada linha de treino, a configuração dessa linha: foram 17 calibrações externas e 272 internas. A linha de diagnóstico da tabela é a versão com o vazamento. Ela exibe a melhor margem da tabela e, ao mesmo tempo, a pior aprovação indevida contra a regra, 32 contra 22. É o exemplo mais direto de por que a margem contratada não pode ser lida sozinha.

**Verificação de mecanismo.** Participação na importância das variáveis de projeto:

| Configuração | run_case + losses | FEM | Soma |
|---|---:|---:|---:|
| A | 87,4% | 0,0% | 87,4% |
| B | 58,9% | 36,1% | 95,0% |
| C | 0,0% | 67,0% | 67,0% |

### 3.4 Card 4 — Registro na documentação (#248)

Foi criado o item d da Seção 4.3, com método, resultado e limitações. O risco R06 recebeu a evidência medida, sem reclassificação de probabilidade ou impacto, que é decisão do grupo. Foram acrescentadas duas referências à Seção 6, conferidas na fonte: o livro-texto (BERGMAN et al., 2014) e o `scikit-fem` (GUSTAFSSON; MCBAIN, 2020).

---

## 4. Por que o FEM não melhorou o modelo

### 4.1 O atributo físico repete os rótulos que já existiam

A calibração só consegue distinguir famílias por material do suporte e tipo de ensaio, e a potência é ajustada por posição. A temperatura produzida pelo FEM é, portanto, uma função de três variáveis que o modelo de produção já recebia: material, tipo de ensaio e posição do componente. Não entra nenhuma variável de projeto nova.

A verificação de mecanismo confirma isso. A importância dos rótulos caiu, mas foi transferida para o atributo físico, e a soma subiu para 95% na configuração B. O modelo trocou uma tabela de consulta por outra. A queda da importância dos rótulos, que era o sinal procurado, ocorreu por construção, e não porque o modelo passou a descrever o fenômeno físico.

### 4.2 A informação que faltava não está na base

Dentro de uma família, o FEM calibrado prevê um único valor por posição. Toda a variação entre ensaios da mesma família fica no resíduo: direção do soprador, vazão, abertura do defletor, tipo de gabinete. No gráfico de resíduo do Card 2, isso aparece como faixas diagonais: o resíduo cai 1 °C para cada 1 °C a mais na medição.

Essas são exatamente as variáveis que poderiam trazer informação nova. Para que o coeficiente de convecção dependesse delas, seria preciso calibrar famílias mais finas, e a base não tem ensaios suficientes: 9 das 17 configurações de treino têm um ou dois ensaios, e 6 delas têm um só.

### 4.3 O modelo físico tem mais parâmetros livres do que os dados fecham

- A geometria do produto e a potência das resistências não foram fornecidas; as dimensões são hipóteses e a potência é ajustada aos dados.
- O coeficiente de convecção e a condutância de contato não são separáveis com estes dados.
- Na família de plástico com broil c2, o coeficiente é indeterminado em quase três décadas, de 1 a 685 W/(m²·K).

Um modelo com parâmetros livres ajustados aos mesmos dados que deveria explicar absorve a variação em vez de explicá-la. Foi o que ocorreu.

### 4.4 A cobertura é parcial

Três das sete famílias não foram calibradas, e 120 das 344 leituras de validação ficaram sem atributo físico. As duas famílias de suporte plástico têm uma única configuração de treino cada. Quando essa configuração sai para validação, não sobra ensaio para calibrar, e o desempenho delas fora da amostra não pode ser medido com a partição atual. O FEM só pôde ser avaliado nas famílias de alumínio em broil c2 e broil qualitative.

### 4.5 O erro principal da área não é o que o FEM ataca

A decomposição do erro, na Seção 5, mostra que a maior perda está em leituras que exigem **extrapolação**: temperaturas acima ou abaixo de tudo o que o treino viu para aquele componente. Nesses casos, nenhum atributo derivado dos mesmos ensaios resolve. O que falta é ensaio no regime não coberto.

### 4.6 A validação é entre simulações

Os ensaios da base vêm de simulação, e não de bancada física. Calibrar e conferir um modelo físico contra eles mede a consistência entre simulações, e não o realismo do modelo físico.

---

## 5. Onde a área perde a margem hoje

As medições desta seção foram feitas em 17 de setembro de 2026, com as mesmas funções do notebook do FEM, sobre as previsões de validação do modelo de produção. **São medições exploratórias, feitas fora do repositório, e precisam ser reproduzidas em notebook versionado antes de orientar decisão.**

**Resistências e placas**

| Objeto | Leituras | Dentro de 10% |
|---|---:|---:|
| Resistências (limite 220 °C) | 184 | 74,5% |
| Placas (limite 150 °C) | 160 | 55,0% |

Se as placas chegassem ao nível das resistências, a área iria a 74,5%.

**Extrapolação**

| Leituras | Quantidade | Dentro de 10% | Erro relativo médio |
|---|---:|---:|---:|
| Dentro da faixa vista no treino | 298 | 71,8% | 7,8% |
| Fora da faixa vista no treino | 46 | 23,9% | 26,2% |

As placas concentram 29 das 46 leituras que exigem extrapolação. Se todas elas entrassem na margem, a área iria a 75,6%.

**Por componente**

| Componente | Temperatura média | Até 10% | Até 15% | Até 20% |
|---|---:|---:|---:|---:|
| Coil FL | 157 °C | 85% | 91% | 98% |
| Coil RL | 160 °C | 83% | 85% | 98% |
| Aluminium Plate RR | 99 °C | 75% | 88% | 88% |
| Coil RR | 112 °C | 74% | 93% | 93% |
| Coil FR | 120 °C | 57% | 70% | 91% |
| Aluminium Plate FR | 100 °C | 55% | 78% | 80% |
| Aluminium Plate FL | 125 °C | 45% | 55% | 68% |
| Aluminium Plate RL | 127 °C | 45% | 60% | 70% |

---

## 6. O que foi aproveitável

- **Linha de base do indicador** por componente e por área, com a função canônica (Card 0).
- **Métrica de aprovação indevida contra a regra de 0,9 vez o limite** na função canônica, que passa a servir a todas as áreas e a todos os modelos (Card 3).
- **Asserção de não contaminação** pelo conjunto de teste, com prova de que falha quando deve (Card 2).
- **Evidência sobre a montagem:** os dados indicam que a resistência não está em contato pleno com o suporte, pois o contato pleno exigiria um coeficiente de convecção fisicamente impossível (Card 2).
- **Evidência sobre decisão:** o FEM, sozinho, aprova indevidamente menos que o modelo de produção, 2 contra 13 nas mesmas leituras (Card 2).
- **Lição de método:** atributos derivados do alvo precisam de validação cruzada interna; sem ela, a margem parece melhorar enquanto a decisão de segurança piora (Card 3).

---

## 7. Recomendações

Em ordem de retorno esperado.

1. **Treinar o modelo sobre o logaritmo da temperatura.** O indicador é de erro relativo, mas o modelo minimiza erro absoluto. Em medição exploratória na área Coil Temps, a transformação levou a margem de 65,41% para **71,80%** e o erro de 11,71 °C para **10,41 °C**, sem dado novo. A aprovação indevida ficou em 19, e a contra a regra passou de 22 para 23. A mudança altera o alvo do modelo de produção e precisa de acordo do grupo, de medição nas sete áreas e de avaliação pelo critério de decisão do Card 3.
2. **Pedir à parceira ensaios nos regimes que hoje exigem extrapolação**, em especial suporte plástico em broil c2 e temperaturas acima de 175 °C. O teto de ganho é de cerca de 10 pontos percentuais, e não há como obtê-lo por modelagem ou por dado sintético.
3. **Pedir a intensidade do soprador como variável de projeto.** Ela aparece apenas no texto do motivo de cada ensaio, e 78 das 92 leituras extremas da base ocorrem em ensaios que a declaram. É a variável que faltou ao FEM para distinguir ensaios dentro de uma família.
4. **Tratar as placas separadamente**, com modelo próprio ou com previsão em duas etapas a partir da resistência. As placas estão 20 pontos abaixo das resistências e são outro objeto térmico. Não foi medido.
5. **Avaliar o FEM como segunda opinião na decisão de aprovação**, e não como atributo, combinado com o plano do R06 de aplicar a regra sobre o limite superior do intervalo de previsão. É o único ponto em que o FEM se mostrou melhor. Não foi medido como decisão final.
6. **Definir com a parceira** a proporção de previsões dentro da margem que conta como indicador atendido. O TAPI fixa a margem de 10%, mas não essa proporção.

Três caminhos ficam descartados por medição: novo ajuste de hiperparâmetros (seis configurações testadas na Seção 15 do notebook de modelagem, sem ganho além do ruído), geração de dados sintéticos a partir do FEM (critério não atendido) e uso do FEM como atributo de entrada (piora das três grandezas).

---

## 8. Limitações deste trabalho

- Cobre uma área entre as sete; nada aqui autoriza conclusão sobre as demais.
- As avaliações são de validação cruzada. O conjunto de teste reservado não foi usado em nenhuma etapa.
- A importância por redução de impureza favorece variáveis contínuas; os valores devem ser lidos pela direção.
- A geometria, a temperatura ambiente de 25 °C e a correspondência entre termopar e ponto do modelo são hipóteses, não informações da parceira.
- As medições da Seção 5 e a primeira recomendação são exploratórias e não estão versionadas.

---

## 9. Rastreabilidade

| Card | Issue | Artefato | Commits |
|---|---|---|---|
| 0 | #243 | `notebooks/colabs_S3/linha_base_kpi.ipynb` | `7648b2a`, `6617a90`, `3952b4b`, `b71b233` |
| 1 | #245 | `notebooks/colabs_S4/testes_extras/fem_coil_temps/fem_coil_temps.ipynb`, Seções 1 a 7 | `490fb8d` a `a86abc4` |
| 2 | #246 | idem, Seções 8 a 13 | `46bba4e` a `b1babec` |
| 3 | #247 | idem, Seções 14 a 18; `colabs_S3/preparacao_testes/metricas.ipynb` e cópias | `d47ede4` a `cc62b7d` |
| 4 | #248 | `documents/documentacao.md`, item d da Seção 4.3, R06 e Seção 6 | `ff34799` a `d41d014` |

**Referências**

BERGMAN, Theodore L.; LAVINE, Adrienne S.; INCROPERA, Frank P.; DEWITT, David P. Fundamentos de transferência de calor e de massa. 7. ed. Rio de Janeiro: LTC, 2014.

GUSTAFSSON, Tom; MCBAIN, G. D. scikit-fem: a Python package for finite element assembly. Journal of Open Source Software, v. 5, n. 52, p. 2369, 2020. Disponível em: <https://doi.org/10.21105/joss.02369>. Acesso em: 17 set. 2026.
