# Comparação dos melhores modelos e escolha do modelo final

**Whirlpool Thermal Predictor — consolidação de todos os experimentos de modelagem (Sprints 3 e 4)**

Data de consolidação: 20 de setembro de 2026.
Fonte: leitura integral dos 35 notebooks do repositório, da `documentacao.md` e dos relatórios em `documents/extras/relatorios_sprints_3/relatorios_treinamentos/`. Nenhum experimento foi reexecutado para este documento; todos os números vêm das saídas gravadas nos notebooks e dos registros escritos.

---

## Como ler este documento

Cada seção tem duas camadas:

- **Técnica** — o que foi feito, com os números e as referências ao notebook de origem.
- **Em palavras simples** (caixas `💡`) — a mesma ideia explicada sem jargão, para quem não é da área.

A Parte 1 explica os **processos** que tornam a comparação entre modelos válida. A Parte 2 reúne os **resultados** dos experimentos, do pior ao melhor. A Parte 3 faz a **escolha** e diz o que ainda falta para confirmá-la.

---

# Parte 1 — Os processos que sustentam qualquer comparação

Nenhum número de erro tem valor sozinho. O que dá valor a ele é o protocolo sob o qual foi medido. Os doze processos abaixo são os que o projeto adotou e os que precisam continuar valendo em qualquer comparação futura. Se um deles for violado, dois modelos deixam de ser comparáveis, por mais parecidas que as tabelas pareçam.

## 1.1. Partição fixa, agrupada por configuração, lida de arquivo

**Técnica.** A base tem 56 ensaios, mas eles não são independentes: várias linhas repetem a mesma configuração do fogão (25 configurações distintas na chave de perfil; 13 delas repetidas, cobrindo 44 ensaios). A partição foi sorteada **por configuração**, não por ensaio, e estratificada pelo tipo de ensaio (`run_case`): 46 ensaios (17 configurações) para treino e 10 ensaios (8 configurações) para o teste reservado. Ela foi gravada em `particao_treino_teste.csv/.json` e todos os notebooks a **leem** em vez de sortear. A razão é medida: o desvio entre sorteios diferentes chega a 2,25 °C, maior do que a diferença esperada entre os modelos que se quer comparar. (`colabs_S3/preparacao_testes/split_treino_teste.ipynb`)

A partição foi construída sobre a chave de perfil de perdas, que é um agrupamento mais grosso da chave de 13 categorias, e por isso vale para as duas versões da base — a relação foi verificada, não assumida.

> 💡 **Em palavras simples.** Imagine que você quer saber se um aluno aprendeu ou só decorou. Se as questões da prova forem iguais às da lista de exercícios, a nota não diz nada. Aqui, o "aluno" é o modelo e as "questões repetidas" são ensaios da mesma configuração de fogão. Por isso, uma configuração inteira vai para o treino **ou** para a prova, nunca para os dois. E todo mundo usa a **mesma** prova: se cada pessoa sorteasse a sua, a diferença entre os modelos poderia ser só diferença de sorte.

## 1.2. Validação cruzada *leave-one-group-out* com 17 dobras

**Técnica.** Dentro do treino, cada uma das 17 configurações sai uma vez e serve de validação enquanto as outras 16 treinam. Todas as previsões fora da dobra são acumuladas e a métrica é calculada **uma vez** sobre o conjunto acumulado, não como média entre dobras (o que estabilizaria mal o R² em dobras com 1 ou 2 ensaios). Todas as dobras treinam com todos os tipos de ensaio representados, o que foi conferido. O conjunto de teste reservado não participa de nada.

> 💡 **Em palavras simples.** Em vez de uma prova só, o modelo faz 17 provas pequenas, cada vez escondendo uma configuração diferente. No fim, juntam-se todas as respostas e corrige-se tudo de uma vez. Assim mede-se o que interessa de verdade: **quanto o modelo erra numa configuração que nunca viu**.

## 1.3. Nenhuma estatística vaza: tudo que aprende com o alvo é ajustado dentro da dobra

**Técnica.** Este é o ponto de maior risco do projeto, porque a formulação adotada usa o **patamar** (média) e a **escala** (desvio-padrão) de cada componente como entradas — e as duas carregam o alvo. Calculá-las sobre a base inteira contaminaria a validação de forma grave. Elas são estimadas apenas sobre as linhas de treino de cada dobra (no `pipeline_custo_shap.ipynb`, dentro de um transformador `fit/transform` do scikit-learn). O mesmo vale para o escalonamento do Ridge e para qualquer imputação. O notebook `colabs_S3/preparacao_testes/verificacao_vazamento.ipynb` executa 9 verificações sobre os artefatos reais **e** sobre cópias corrompidas de propósito, para provar que cada verificação detecta o problema que diz proteger.

> 💡 **Em palavras simples.** Se o modelo "espiar" a resposta enquanto estuda, a nota fica falsa. O patamar e a escala do componente são um resumo das temperaturas reais, então eles só podem ser calculados com os ensaios que estão no treino daquela rodada. E, para ter certeza de que o detector de "cola" funciona, o projeto criou provas com cola de propósito e conferiu que o detector apita.

## 1.4. Avaliar apenas sobre valores medidos (nunca sobre valores imputados)

**Técnica.** O protocolo declara: *"avaliação restrita a valores medidos, qualquer que seja o tratamento de ausências"*. As colunas-alvo com medição ausente são tratadas por **máscara**: cada componente treina só com as linhas em que foi medido. Dois resultados sustentam a regra:

- `testes_variados/random_search.ipynb`: *"no formato longo, preencher o ausente contamina o patamar e a escala do componente e piora o resultado, sobretudo no Coil Temps"*.
- `colabs_S3/analise_dataset/modelo_melhorado.ipynb`: treinar sobre alvos imputados **perde 0,397 °C**.
- `documentacao_extra_tree.md` classifica os arquivos `_snull` (imputação calculada sobre a base completa, incluindo o teste) como **`imputado_base` — vazamento: sim**.

Consequência direta para a Sprint 4: os notebooks `testes_S4/teste_mesclagem_*.ipynb` foram reexecutados em 18/09 sobre `_13cat_snull` e `_perfil_snull`. A comparação **entre** as duas codificações continua válida (as duas recebem a mesma imputação nas mesmas linhas), mas o **nível** de erro ali (por exemplo 14,57 °C no Coil Temps contra 11,71 °C da entrega) não é comparável com o restante do projeto e **não deve ser citado como erro do modelo**. As 24 linhas imputadas respondem sozinhas por quase 3 °C no Coil Temps.

> 💡 **Em palavras simples.** Quando um sensor não mediu, alguém preencheu o buraco com uma média. Se o modelo for corrigido contra esse número inventado, ele está sendo cobrado por adivinhar um chute, não uma medição. Isso infla o erro e não diz nada sobre a realidade. Regra do projeto: **o modelo só é corrigido contra o que foi medido de verdade**. Os arquivos `_snull` servem para outros usos, não para medir desempenho.

## 1.5. As métricas: três famílias, lidas em conjunto

**Técnica.** (`colabs_S3/preparacao_testes/metricas.ipynb`, função canônica com 16 casos de teste; a identidade entre a cópia da modelagem e a original é conferida automaticamente.)

| Família | Métrica | O que responde | Cuidado |
|---|---|---|---|
| Erro | **MAE** (°C) — principal | Quanto o modelo erra numa leitura típica | Simétrico: trata erro para cima e para baixo igual |
| Erro | RMSE e razão RMSE/MAE | Se o erro está concentrado em poucas leituras | Razão ~1 = erro homogêneo; alta = falhas pontuais grandes |
| Erro | R² | Se o modelo aprendeu algo além da média do componente | Não comparável entre áreas; negativo = pior que a média |
| Erro | Viés (erro com sinal) | Se o modelo tende a subestimar | O que importa é o viés **onde o componente atinge o limite** |
| Percentual | MAPE, WAPE, **dentro de 10%** | Leitura direta do indicador acordado (TAPI) | Penaliza menos quem subestima — assimetria oposta à do problema |
| Decisão | **Falsos aprovados**, falsos reprovados, detecção | Se o modelo acerta a decisão de engenharia (aprovar/reprovar) | Reportada como **curva por margem**, não como valor único |
| Decisão | Custo de negócio (peso 5,57 na subestimação) | MAE assimétrico, com a taxa que o próprio projeto revelou | Limite superior, não medida contábil (`pipeline_custo_shap.ipynb`) |

> 💡 **Em palavras simples.** Um modelo pode "errar pouco em média" e mesmo assim aprovar um componente que vai superaquecer — e esse é o erro que a ferramenta existe para evitar. Por isso não basta olhar o erro médio: olha-se também **quantos componentes perigosos passaram** (falsos aprovados) e **quantos seguros foram barrados à toa** (falsos reprovados). Uma reprovação indevida custa uma simulação; uma aprovação indevida custa um fogão superaquecendo. O projeto mediu que já aceitou pagar ~5,6 reprovações desnecessárias para evitar 1 aprovação indevida.

## 1.6. Duas referências obrigatórias: média histórica e piso de ruído

**Técnica.** Nenhum erro é lido isolado. A **média histórica** do componente (calculada no treino da dobra) diz o que se obtém sem modelo algum. O **piso de ruído** é a dispersão entre ensaios com configuração idêntica — nenhum modelo pode errar menos que isso. Piso por área (chave de 12 variáveis, `modelagem.ipynb` §7): Coil Temps 6,36 · CT Knobs 0,92 · IPC Comp 3,30 · IPC Cooling 2,15 · Main Vent Sys 1,16 · Mainback 1,33 · Oven HMI 0,58 °C. A revisão em `analise_completa.ipynb` §2.5 corrigiu o Coil Temps para ~5,0 °C (um par tomado como replicata não era) e o IPC Comp para 4,27.

> 💡 **Em palavras simples.** Dois termômetros no mesmo fogão, na mesma configuração, não dão o mesmo número — há um ruído natural. Esse ruído é o "chão": ninguém consegue errar menos que ele. E a média histórica é o "teto do chute": se o modelo não errar menos que simplesmente repetir a temperatura média daquele componente, ele não aprendeu nada. A distância entre o erro do modelo e o chão diz **onde ainda há o que ganhar**.

## 1.7. Agregação: macro por componente, micro por leitura — e não misturar

**Técnica.** A macro-média dá o mesmo peso a cada um dos 74 componentes; a micro-média pondera pelo número de leituras e fica dominada pelo IPC Comp (37 dos 74 componentes, 1.616 das 3.277 leituras). O projeto reporta o **MAE macro por componente** como número-resumo (6,57 °C na entrega). Cuidado ao comparar com notebooks que reportam a **média das 7 áreas**: para a entrega, essa média é 5,57 °C — outro número para o mesmo modelo. O `treino_extratrees_7areas.ipynb` reporta 6,13 °C como "MAE médio geral", que é média de áreas, e por isso **não** é comparável com os 6,57 °C.

> 💡 **Em palavras simples.** "Nota média da turma" muda conforme você calcula por aluno ou por sala. Nenhuma está errada, mas comparar uma com a outra é comparar coisas diferentes. Antes de dizer "modelo A é melhor que B", confira se os dois números foram calculados do mesmo jeito.

## 1.8. Comparação pareada, várias sementes e limiar de relevância

**Técnica.** Como todos os modelos são avaliados sobre as mesmas dobras e os mesmos componentes, a comparação é **pareada** (teste t pareado, Wilcoxon, intervalo de confiança por bootstrap), o que elimina a variação entre componentes da incerteza. Algoritmos estocásticos (Random Forest, Extra Trees) são rodados com **3 a 10 sementes**, e o ganho só é declarado se for positivo na maioria delas e superior ao ruído entre sementes. Limiar prático de relevância: **0,10 °C** (`teste_mesclagem_*`), ou o **piso da área** (`random_search.ipynb`). Com várias comparações contra a mesma referência, aplica-se Bonferroni (`analise_completa.ipynb` §3.2: limiar 0,00625 para 8 comparações).

> 💡 **Em palavras simples.** Se você pesa duas pessoas na mesma balança, a diferença de peso é confiável mesmo que a balança seja meio imprecisa — porque o erro da balança se cancela. É isso que a comparação pareada faz. E, como o Random Forest "sorteia" um pouco a cada treino, repete-se o treino com sementes diferentes: um ganho de 0,05 °C que some quando muda a semente não é ganho, é acaso.

## 1.9. Seleção aninhada: escolher dentro da dobra, nunca depois de ver o resultado

**Técnica.** Quando se escolhe "a melhor codificação por região" ou "o melhor algoritmo por região", a escolha precisa ser refeita **dentro de cada dobra**, olhando só as outras dobras. Senão o número mede a própria escolha, não o desempenho. Evidência de que isso importa: a seleção de algoritmo por **componente** parecia boa e, sob medição aninhada, entregou 6,96 °C contra 6,88 °C do melhor algoritmo único — pior que não escolher — porque com 45 linhas de validação a decisão oscila e o algoritmo mais escolhido respondia por só 31,6% das escolhas (`registroModelagemSprint3.md`). Já no `modelo_melhorado.ipynb`, a escolha por **região** é quase unânime entre as 17 dobras (ex.: Coil Temps `B|RF+GB` em 17/17), o que distingue seleção legítima de ajuste ao ruído.

> 💡 **Em palavras simples.** Se você testa 16 combinações e escolhe a melhor, uma delas vai parecer boa por acaso — quanto mais candidatos, maior a chance. Para medir o ganho honesto, a escolha é feita "às cegas" em cada rodada, sem olhar a prova daquela rodada. E um sinal de que a escolha é real, e não sorte: ela **repete** a mesma decisão em quase todas as rodadas.

## 1.10. Hipóteses confirmatórias pré-registradas

**Técnica.** Pistas que surgem depois de olhar tabelas são exploratórias. Para convertê-las em evidência, o projeto declara **hipótese e critério antes de rodar** (IC 95% acima de zero **e** ganho positivo em ≥ 8 de 10 sementes) e roda sobre sementes novas. Exemplo: "alvo em log reduz o erro no Coil Temps" foi **CONFIRMADO** (+0,90 °C, 10/10 sementes); "log + média RF/GB soma os dois ganhos" **NÃO foi confirmado** (6/10 sementes). (`analise_completa.ipynb` §3.6)

> 💡 **Em palavras simples.** Depois que você viu o resultado, é fácil inventar uma explicação que "bate". Para não se enganar, escreve-se a aposta antes de rodar o teste, com a regra de vitória já definida. Se passar, é evidência; se não passar, foi só uma impressão.

## 1.11. O teste reservado é usado uma vez — e já foi usado

**Técnica.** O conjunto de 10 ensaios reservados foi consultado em **11/09/2026** (formulação por componente × híbrido; o híbrido parecia bom em validação e ficou 0,94 °C pior no teste — exatamente por isso o teste existia) e, pela segunda vez, em `pipeline_custo_shap.ipynb` §5. Ele **não é mais árbitro imparcial**. Além disso, ele contém apenas ensaios com suporte de bobina em alumínio e nenhum do modo *broil c1*, o regime de maior temperatura. Por isso a **leitura conservadora do desempenho é a da validação cruzada** (6,57 °C), e não a do teste (4,37 °C).

> 💡 **Em palavras simples.** O teste reservado é a "prova final lacrada". Cada vez que alguém abre o envelope para decidir algo, a prova perde um pouco de valor, porque a decisão seguinte já foi influenciada por ela. O projeto abriu o envelope duas vezes. E a prova, por azar do sorteio, não tem as questões mais difíceis (broil c1, placa de plástico). Então os números melhores do teste **não** significam que o modelo melhorou — significam que a prova era mais fácil.

## 1.12. Auditoria de plausibilidade física (SHAP) e a unidade de decisão

**Técnica.** A pergunta do SHAP não é "qual variável melhora a predição", e sim "o modelo se apoia em algo que faz sentido físico?" — um modelo que acerta por variáveis sem sentido falhará fora da faixa ensaiada (38 configurações distintas no espaço de entrada, conforme a revisão em `analise_completa.ipynb` §1.1). Resultado (`pipeline_custo_shap.ipynb` §6): patamar e escala do componente respondem por 52,7% da atribuição média; tipo de ensaio 12,3%; perdas declaradas 11,3%; nenhuma variável implausível entre as de maior peso. Nas bobinas o tipo de ensaio sobe para 33,4% (pontos governados pela potência dissipada); na tampa traseira o patamar concentra 69,8% (o modelo ali quase só reproduz a média — converge com o FEM, que mostrou que o calor chega ao painel pelo ar de exaustão e pelos motores, não por condução).

Sobre a **unidade de decisão** (`modelagem.ipynb` §14): contada por componente, a detecção de estouros é de 57–81%; contada **por ensaio** (um fogão reprova se qualquer componente estoura), a detecção é de 94,9% sem margem e 100% com margem de 8 °C, sem custo adicional em fogões barrados. Como quase todo design da base reprova em pelo menos um componente, o veredito binário "este fogão passa?" é quase degenerado; **o valor da ferramenta está na lista ordenada de componentes em risco** (verifica-se ~6 de 68 componentes e encontram-se ~3/4 dos superaquecimentos reais).

> 💡 **Em palavras simples.** SHAP é perguntar ao modelo "por que você deu essa temperatura?" e conferir se a resposta faz sentido para um engenheiro térmico. Fez: o que mais pesa é o lugar onde o sensor está, depois o tipo de ensaio e as perdas — exatamente o que a física diz. E, sobre a decisão: o que a engenharia usa não é um "sim/não" para o fogão inteiro (quase todo fogão da base tem algum componente estourando), e sim **a lista curta de quais componentes olhar primeiro** — e essa lista o modelo acerta bem.

---

# Parte 2 — O que foi testado, e quem chegou aos melhores resultados

Todos os números abaixo são de **validação cruzada** sob o protocolo da Parte 1, salvo indicação. Quando o notebook usa base ou agregação diferente, isso está marcado, porque muda a comparabilidade.

## 2.1. A evolução das formulações (Sprint 3) — o que decidiu o desempenho

(`colabs_S3/modelagem.ipynb`, `registroModelagemSprint3.md`)

| Estrutura | Modelos | MAE macro | Falsos aprovados (margem 8 °C) |
|---|---:|---:|---:|
| Modelo único, identidade por indicadores | 1 | 14,02 °C | 176 |
| Modelo único, patamar como entrada | 1 | 9,22 °C | 123 |
| Um por área, identidade por indicadores | 7 | 8,46 °C | 103 |
| Um por componente, Gradient Boosting | 74 | 6,92 °C | 37 |
| **Um por área, Random Forest — entregue** | **7** | **6,57 °C** | **36** |
| Um por área, Gradient Boosting 300/0,05 | 7 | 7,06 °C | **26** |

O que decidiu: **a codificação do componente pesa mais que o número de modelos**. Fornecer o patamar e a escala como entradas (em vez de colunas indicadoras) levou o erro de 14,02 para 6,57 °C. A comparação pareada entre a entrega e a formulação por componente dá −0,379 °C em favor da entrega (p = 0,0097; IC 95% [−0,664; −0,095]).

Outros achados com medição:
- **Extração de atributos físicos do texto do motivo do ensaio** (`cfg_*`): 7,560 → 6,991 °C (p < 0,0001), falsos aprovados 44 → 31. Maior ganho isolado da Sprint 3, vindo de dados que já estavam na planilha.
- **`max_features="sqrt"`** no Random Forest (padrão de classificação usado por inércia) custa **1,55 °C** no agregado; Coil Temps vai de 12,49 para 22,18 °C. Mantido o padrão de regressão (todas as colunas).
- **Modelos lineares** (Ridge 9,99; Lasso 9,82 °C) ficam muito atrás das árvores nesta formulação.
- **Modelo compartilhado por área** (empilhar componentes com indicador, ou alvo centrado): detecção de estouros colapsa para 8,3% e 2,1%. Conclusão substantiva: componentes da mesma área **não** respondem à configuração da mesma forma.
- **Regressão quantílica** (q 0,75–0,95) percorre a mesma curva da margem fixa (q 0,95: 32 FA / 287 FR; margem 10 °C: 33 / 285). Margem fixa mantida por simplicidade.
- **13 categorias × perfil de perdas** (74 modelos GB por componente): 7,543 × 7,560 °C, p = 0,848, IC [−0,162; +0,197] — **indistinguíveis**. Perfil adotado por parcimônia.
- **Ensemble GB + ExtraTrees + Bagging** por componente: 7,500 × 7,543 °C — diferença de 0,043 °C, dez vezes menor que o desvio da estimativa (0,35 °C).
- **Varredura lazypredict** (~40 regressores, 1 divisão, 19 componentes críticos): AdaBoost 11,47 · GB 11,88 · LassoLarsCV 11,95 · ExtraTrees 12,18 · RF 12,68. Indicativa apenas; sob o protocolo completo, a ordenação não se confirmou (AdaBoost caiu para 4º).

> 💡 **Em palavras simples.** O grande salto não veio de trocar de algoritmo, e sim de **como o modelo recebe a informação de "qual componente é este"**. Dizer ao modelo "este componente costuma ficar em torno de X °C e varia ± Y" (patamar e escala) funcionou muito melhor do que dar 74 "etiquetas" e deixar o modelo decorar. Depois disso, Random Forest e Gradient Boosting empataram em qualidade, cada um ganhando num critério: o RF erra menos em média; o GB deixa passar menos componentes perigosos.

## 2.2. O modelo entregue (Sprint 3): Random Forest por área

**Configuração.** 7 Random Forest (300 árvores, demais parâmetros no padrão de regressão), um por área, formato longo (uma linha por par ensaio × componente), entradas = vetor de configuração + patamar + escala do componente (calculados no treino de cada dobra), base com perfil de perdas, máscara para ausentes.

**Validação cruzada** (3.277 previsões, 74 componentes):

| Área | MAE | RMSE | R² | Viés | Dentro de 10% | Média histórica | Piso | Erro/piso |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Oven HMI | 2,42 | 4,14 | −0,16 | +0,20 | 90,0% | 2,55 | 0,58 | 4,17 |
| CT Knobs | 3,16 | 5,14 | +0,56 | +0,56 | 84,4% | 4,07 | 0,92 | 3,44 |
| IPC Cooling | 4,04 | 7,10 | +0,85 | +1,06 | 82,1% | 4,52 | 2,15 | 1,88 |
| Main Vent Sys | 4,68 | 7,34 | +0,89 | +0,31 | 79,6% | 5,79 | 1,16 | 4,03 |
| Mainback | 5,68 | 10,10 | +0,84 | +0,54 | 71,8% | 8,15 | 1,33 | 4,27 |
| IPC Comp | 7,30 | 10,66 | +0,62 | +0,90 | 70,7% | 10,23 | 3,30 | 2,21 |
| Coil Temps | 11,71 | 17,56 | +0,85 | +0,53 | 65,4% | 31,05 | 6,36 | 1,84 |
| **Agregado** | **6,57** | 10,60 | R² médio/comp. +0,164 | +0,71 | **73,8%** | — | — | — |

Decisão contra o limite (3.037 leituras com limite, 193 atingem): viés de +1,55 °C onde não atinge e **−11,48 °C onde atinge** — o modelo subestima justamente onde é caro. Curva de margem: 0 °C → 74 FA / 44 FR / 61,7% detecção; **8 °C → 36 / 194 / 81,3%**; 12 °C → 25 / 317 / 87,0%.

**Teste reservado** (727 previsões, 1ª leitura oficial): MAE 4,37 °C, MAPE 5,11%, dentro de 10% 85,7%, R² positivo nas 7 áreas; margem 8 °C → 6 FA / 46 FR / 90,5%. Não deve ser lido como ganho: o conjunto não tem broil c1 nem placa de plástico.

**Ponto fraco conhecido.** As 4 placas de alumínio do Coil Temps (limite 150 °C, área herdada por preenchimento): MAE 17,41 °C, 13 dos 37 falsos aprovados (35%) com 4,9% das previsões; erro médio de 57 °C quando o valor real supera o máximo visto no treino (extrapolação, não predição). Reportadas em separado.

> 💡 **Em palavras simples.** O modelo entregue erra em média 6,6 °C numa configuração nova, acerta dentro de 10% em 3 de cada 4 leituras, e ganha da "média histórica" em todas as 7 áreas — no Coil Temps, corta 62% do erro. Seu ponto cego são as 4 placas de alumínio, que às vezes chegam a temperaturas que o modelo nunca viu no treino; ninguém adivinha 220 °C tendo visto só até 150 °C.

## 2.3. Sprint 4 — hiperparâmetros: a busca não encontra nada melhor que o padrão

(`testes_variados/random_search.ipynb`; 7 áreas × 4 algoritmos × 30 sorteios = 28 pares, 14.756 ajustes)

Critério de troca: Wilcoxon p < 0,05 **e** ganho maior que o piso da área. Resultado: **28 empates, 0 trocas**. O melhor algoritmo por área após a busca é o Random Forest em 6 áreas e o Extra Trees no IPC Comp (7,241 × 7,300 °C — dentro do ruído). Para o RF, o melhor sorteio foi **pior** que a configuração atual em todas as áreas (Δ +0,008 a +0,790 °C). Para GB e ET a busca melhorou o próprio algoritmo (GB: −1,03 °C em média), mas não o suficiente para bater o RF. 10 dos 28 vencedores caíram no extremo do suporte (quase sempre `max_depth` no máximo para o GB), e a mediana do sorteio vencedor foi 14 de 30 — orçamento saturou.

A **grade exaustiva** de `pipeline_custo_shap.ipynb` §8 (48 combinações fechadas) superou a busca aleatória (40 sorteios em 1.728) em 5 de 7 regiões pelo custo de negócio — o espaço pequeno e fechado funciona como restrição protetora contra ajuste às particularidades das 17 dobras. Dispersão dentro da grade: poucas unidades de custo em seis regiões, 14,9 no Coil Temps — **a única região em que a escolha de formulação tem consequência apreciável**.

> 💡 **Em palavras simples.** "Girar os botões" do Random Forest (número de árvores, profundidade etc.) foi testado 30 vezes por área e nenhuma combinação ficou melhor que a configuração padrão. Com uma base de 46 ensaios, o modelo já está no limite do que os dados permitem; ajustar botões finos só ajusta ruído. Onde os botões importam mesmo é no Coil Temps, a região mais difícil.

## 2.4. Sprint 4 — mesclagem de algoritmos (média ponderada)

(`testes_S4/teste_mesclagem_algoritmos.ipynb` e `teste_mesclagem_extratrees.ipynb`)

**Execução de referência de 17/09** (base `_13cat` com máscara, comparável ao restante do projeto):
- Ridge + RF + GB: o Ridge zerou nas 7 áreas (9,65 °C agregado × 6,65 do RF). A mescla venceu em **1 de 7** áreas: Coil Temps, `rf 0,5 | gb 0,5`, 10,64 × 11,37 °C (−0,73 °C). Aumentar o peso do GB **piora** em todas as 7 áreas.
- ExtraTrees + RF + GB: agregado RF 6,65 · ET 6,98 · GB 7,31 °C. O ET só é o melhor puro no Main Vent Sys (4,09 × 4,22). A mescla venceu em 4 de 7 áreas, mas só o Coil Temps passa do limiar de 0,10 °C (−0,73 °C). ET acrescenta em 1 área (Main Vent Sys, +0,169), não muda em 5, atrapalha no Coil Temps (−0,221). **Mecanismo:** ET e RF discordam entre si só 1,77 °C, contra 3,35 e 4,14 °C do GB — são quase o mesmo modelo, e promediar cancela pouca coisa.

**Reexecução de 18/09** sobre `_13cat_snull` × `_perfil_snull` (com imputação — ver ressalva 1.4): a comparação entre codificações dá empate global (perfil melhor em IPC Comp, IPC Cooling e Oven HMI; pior em Coil Temps e Main Vent Sys; média +0,025 °C), mas os níveis de erro dessa rodada não são comparáveis com o restante deste documento.

> 💡 **Em palavras simples.** Misturar as previsões de dois ou três modelos só ajuda quando eles erram de jeitos diferentes. Random Forest e Extra Trees erram quase do mesmo jeito, então misturá-los não adianta. Random Forest com Gradient Boosting ajuda um pouco — mas só no Coil Temps, e o ganho foi escolhido olhando o próprio resultado, então é uma estimativa otimista.

## 2.5. Sprint 4 — `analise_dataset`: os melhores resultados do projeto

Esta pasta (`testes_variados/analise_dataset/`) contém os experimentos mais rigorosos e os de melhor resultado. Três notebooks:

### 2.5.1. `analise_completa.ipynb` — revisão crítica + 8 variantes + reprodução aninhada

Referência M0 = entrega (RF, codificação A = perfil): **6,549 °C**. Cada variante muda uma coisa só; comparação pareada por leitura, IC 95% bootstrap, Bonferroni (limiar 0,00625).

| Variante | MAE | Ganho | IC 95% | Veredito |
|---|---:|---:|---|---|
| V1 alvo em log | 6,431 | +0,118 | [+0,05; +0,19] | MELHOROU |
| V2 sem os ensaios sem rótulo | 6,778 | −0,085 | [−0,16; −0,02] | PIOROU |
| V3 replicatas em média | 6,760 | −0,018 | [−0,07; +0,03] | ineficaz |
| V4b ordem apenas | 7,005 | −0,456 | [−0,59; −0,33] | PIOROU |
| **V4c família + ordem** | **6,431** | **+0,118** | [+0,05; +0,19] | MELHOROU |
| V4d família + ordem + modificado (cod. C) | 6,468 | +0,081 | [+0,01; +0,15] | MELHOROU |
| V5 + indicadores dos cabeçalhos | 6,796 | −0,247 | [−0,34; −0,16] | PIOROU |
| V6 + new duct | 6,569 | −0,020 | [−0,03; −0,01] | PIOROU |
| **M3 codificação + estimador por região (aninhado)** | **6,246** | **+0,303** | 3 de 3 sementes | **MELHOROU** |
| Margem calibrada por região a 95% | — | 23 → 12 falsos aprovados no extremo de segurança | | MELHOROU |

Testes confirmatórios pré-registrados (10 sementes, Coil Temps): **alvo em log CONFIRMADO** (12,207 → 11,310 °C, +0,90, 10/10 sementes); log + RF/GB **não** acumula (6/10). Para situar, no Coil Temps com 13 categorias: linear + RF 12,145 · log + RF 11,148 · log + RF/GB 10,934 °C. O log ajuda pouco ou nada nas demais regiões (−0,41 no IPC Comp).

Correções relevantes encontradas na revisão: não existe `run_idx` nos arquivos (índice = posição); "ordem" no rótulo de perdas refere-se à ordem de chaveamento dos IGBTs; os 6 ensaios sem rótulo de perda são a série *New Baseline* com variantes de bandeja (V de Cramer 0,904 entre perdas e bandeja — são os mesmos ensaios); o par (16, 17) não é replicata e inflava o piso do Coil Temps.

### 2.5.2. `modelo_melhorado.ipynb` — o candidato M3, fechado

Implementa as **duas únicas alterações com ganho reprodutível** entre 22 estratégias avaliadas (16 de aumento sintético — SMOTE, mixup, ruído, réplicas etc. — nenhuma com ganho; LightGBM perde > 1 °C; dois estágios perde 0,495; alvos imputados perde 0,397; busca de hiperparâmetros do RF perde 0,103 por custo de seleção):

1. **Codificação da coluna de perdas escolhida por região** entre A (perfil), B (13 categorias) e C (família + ordem de chaveamento + modificado).
2. **Estimador escolhido por região** entre RF e média simples RF + GB.

Escolhas refeitas dentro de cada dobra (aninhadas), 3 sementes:

| Semente | M0 (entrega) | M1 (cod. C fixa) | M2 (cod. por região) | **M3 (cod. + estimador por região)** |
|---:|---:|---:|---:|---:|
| 42 | 6,549 | 6,473 | 6,313 | **6,243** |
| 1 | 6,532 | 6,420 | 6,271 | **6,200** |
| 2 | 6,538 | 6,429 | 6,271 | **6,216** |

M3 sobre M0: **+0,320 °C** (IC 95% [+0,271; +0,369], Wilcoxon p = 4·10⁻⁵⁹, positivo em 3/3 sementes). M3 sobre M2: +0,065 (IC [+0,030; +0,101]).

Escolha por região (semente 42, 17 dobras) e erro por região:

| Região | Escolha do M3 | M0 | M3 | Ganho |
|---|---|---:|---:|---:|
| Coil Temps | B \| RF+GB (17/17) | 11,598 | **10,330** | +1,269 |
| IPC Comp | C \| RF (17/17) | 7,276 | **6,901** | +0,375 |
| CT Knobs | C \| RF+GB (17/17) | 3,157 | **2,997** | +0,160 |
| Main Vent Sys | B \| RF (14/17) | 4,660 | **4,529** | +0,131 |
| Mainback | C \| RF (15/17) | 5,683 | 5,733 | −0,050 |
| Oven HMI | A \| RF+GB (12/17) | 2,420 | 2,540 | −0,121 |
| IPC Cooling | C \| RF+GB (13/17) | 4,018 | 4,145 | −0,127 |

O ganho concentra-se no Coil Temps, que é ao mesmo tempo a região de maior erro e uma das três que concentram as leituras que atingem o limite (com IPC Comp e Mainback). As três regiões com ganho negativo não são inconsistência: a escolha de cada dobra é decidida sem consultá-la, e em algumas ela erra — o agregado é o número honesto.

### 2.5.3. `pipeline_custo_shap.ipynb` — pipeline sem vazamento, custo de negócio, SHAP, cronologia

- Métrica de seleção = **custo de negócio** (subestimar custa 5,57× mais que superestimar). Busca aleatória (40 candidatos) sobre codificação, estimador, árvores, profundidade, folha, `max_features` e escala do alvo, com `PredefinedSplit` das 17 dobras. Contra a entrega sobre 13 categorias: custo melhorou em **7/7** regiões, MAE em 5/7. O otimizador, livre, reproduz a divisão que o M3 encontrou (perfil no Oven HMI e IPC Comp; perfil + ordem no CT Knobs e IPC Cooling; 13 categorias no Main Vent Sys, Mainback e Coil Temps) e escolhe RF+GB em 5 regiões.
- **Teste reservado, 2ª leitura** (saídas gravadas): busca MAE 4,473 / custo 14,512 / dentro de 10% 87,3% contra entrega 5,153 / 16,385 / 83,9%. Margem 8 °C: busca **6 FA / 42 FR / 90,5%** contra entrega 10 / 68 / 84,1%. *Atenção:* o texto da §7 desse notebook descreve outra execução (4,616 × 4,765 °C, "empate"); as saídas gravadas e a prosa divergem, e o número deve ser lido como comparação em terreno igual, não como estimativa isenta.
- Viés onde atinge o limite: −5,91 °C (busca) × −5,01 °C (entrega). A ponderação atuou sobre o erro médio, não sobre o regime perto do limite — refinamento pendente.
- **Validação cronológica** (janela expansiva, 5 cortes, contra controle de mesmo tamanho): diferença média −0,96 °C, dentro do ruído. **Não há deriva temporal**: prever ensaios futuros não é mais difícil que prever configuração nova.

> 💡 **Em palavras simples.** Depois de testar 22 ideias diferentes para melhorar o modelo (a maioria não funcionou — inclusive as "modernas", como dados sintéticos e LightGBM), duas funcionaram de verdade: (1) reorganizar a informação de perdas de um jeito diferente em cada região do fogão e (2) em algumas regiões, usar a média de dois modelos em vez de um. Juntas, elas tiram 0,32 °C do erro, e quase todo esse ganho vem do Coil Temps, que é justamente a região mais perigosa. Para o Coil Temps, prever o **logaritmo** da temperatura (em vez da temperatura direta) também ajuda, e isso foi confirmado num teste "com a aposta feita antes".

## 2.6. Caminhos fechados com medição (para não repetir)

| Caminho | Resultado | Notebook |
|---|---|---|
| FEM no Mainback | Base do FEM explica 44,3% da variância nos pontos passivos, contra 95,1% da base dos dados. Calor chega pelo ar de exaustão e motores, não por condução. **Não recomendado** sem geometria da parceira. | `colabs_FEM/fem_mainback.ipynb` |
| FEM no CT Knobs | 21% × 96%. Geometria suposta não descreve a peça (sondas não podem estar à mesma distância da fonte). Em 6 de 7 regiões o erro não vem da estrutura espacial, e sim de não prever o **nível** a partir das variáveis disponíveis. | `colabs_FEM/piloto_knobs.ipynb` |
| Remover `material_coil_support` do Oven HMI e CT Knobs | **Piora** consistente: +0,023 e +0,047 °C, 5/5 sementes. Manter. | `testesCoilEOven/teste_remocao_material_coil_support.ipynb` |
| Híbrido (modelo por área só no Coil Temps) | Bom em validação, **0,94 °C pior no teste**. | registro Sprint 3 |
| Escolher algoritmo por componente | 6,96 × 6,88 °C do melhor algoritmo único — pior que não escolher. | registro Sprint 3 |
| Escolher algoritmo por área (sem codificação) | Rende 0,05 °C; não compensa 7 configurações. | registro Sprint 3 |
| Extra Trees por componente (4 combinações losses × nulos) | Média das 7 áreas 6,13 °C (perfil + imputado_treino) — pior que os 5,57 °C equivalentes da entrega. | `treino_extratrees_7areas.ipynb`, `documentacao_extra_tree.md` |
| GB por componente, 13cat × perfil | 7 áreas no ruído (< 0,5 °C); 47 de 74 componentes no ruído. | `treino_gradient_boosting.ipynb` |
| `pct_limite` como indicador do TAPI | Não é leitura do indicador: divide pelo limite (maior que a temperatura), ignora componentes sem limite. O indicador é **dentro de 10%**. | `linha_base_kpi.ipynb` |

> 💡 **Em palavras simples.** Muita coisa foi testada e não funcionou — e isso é valioso, porque fecha caminhos que alguém tentaria de novo. Física (FEM) não ajuda com a geometria que temos. Tirar variáveis "que parecem inúteis" piorou. Escolher modelo componente a componente é pior que não escolher. E vários "ganhos" que apareceram na validação sumiram quando testados de verdade.

---

# Parte 3 — A escolha do melhor modelo

## 3.1. Quadro comparativo dos candidatos

Só entram candidatos medidos sob o protocolo completo (partição fixa, 17 dobras, máscara, patamar/escala dentro da dobra, MAE macro por componente). Ordenados pelo MAE de validação cruzada.

| # | Candidato | Base de perdas | MAE CV | FA (margem 8 °C) | Confirmação independente | Custo operacional |
|---|---|---|---:|---:|---|---|
| 1 | **M3 — codificação + estimador por região** (`modelo_melhorado`) | por região (A/B/C) | **6,22** (3 sementes) | não medido nesse notebook | Nenhuma; mesmas dobras da exploração, hipótese e critério declarados antes | 7 modelos; 3 codificações a manter; RF+GB em 4 regiões |
| 2 | M2 — codificação por região, RF | por região | 6,28 | — | idem | 7 modelos; 3 codificações |
| 3 | M1 — codificação C fixa, RF | família + ordem | 6,44 | — | idem | 7 modelos; 1 codificação nova |
| 4 | Busca com custo de negócio (`pipeline_custo_shap`) | por região | ~5/7 regiões melhor que a entrega em MAE; 7/7 em custo | **6** (teste, 2ª leitura) | Teste reservado, 2ª leitura (menos protegida) | 7 pipelines com hiperparâmetros próprios |
| 5 | **Entrega Sprint 3 — RF por área** (`modelagem` §19) | perfil | **6,57** | **36** (CV) / 6 (teste) | Teste reservado, 1ª leitura: 4,37 °C | 7 modelos iguais; mais simples |
| 6 | GB por área 300/0,05 | perfil | 7,06 | **26** (CV) | — | 7 modelos |
| 7 | HistGB por área | perfil | 7,01 | 38 | — | 7 modelos |
| 8 | GB por componente | 13cat | 6,92 | 37 | — | 74 modelos |
| 9 | Mescla RF+GB por área (Sprint 4, só Coil Temps > limiar) | 13cat | 6,65 → ganho só no Coil Temps (−0,73) | — | Peso escolhido na mesma validação | 14 modelos |
| 10 | Lasso / Ridge por área | perfil | 9,82 / 9,99 | 73 / 70 | — | — |

Complemento confirmado para o Coil Temps: **alvo em log** (+0,90 °C, 10/10 sementes), que não se soma ao ganho do RF+GB — escolher um dos dois.

## 3.2. Como decidir: três critérios, nesta ordem

**Técnica.**

1. **Erro em validação cruzada, sob o mesmo protocolo** (MAE macro por componente, com IC pareado e várias sementes). Decide entre candidatos que passaram pelo mesmo crivo. Aqui, M3 vence a entrega por +0,32 °C com IC inteiro acima de zero.
2. **Decisão contra o limite** (falsos aprovados na margem operacional, viés onde atinge o limite). Decide quando dois candidatos empatam em erro, ou quando o de menor erro é o de pior segurança. O GB por área ilustra: erra mais (7,06) e deixa passar menos (26 × 36). O M3 ainda **não teve os falsos aprovados medidos** — é a lacuna a fechar antes de trocar o modelo de produção.
3. **Parcimônia e custo de manutenção.** Em empate nos dois anteriores, o mais simples ganha (critério registrado na §4.3.1 da documentação, aplicado quando 13cat empatou com perfil). Sete modelos idênticos são mais fáceis de versionar, explicar e auditar do que sete pipelines com codificações e estimadores diferentes.

Regras de leitura que valem para qualquer candidato novo:
- ganho abaixo de 0,10 °C, ou abaixo do ruído entre sementes, **não é ganho**;
- ganho medido escolhendo-se o melhor entre N candidatos nas mesmas dobras é **otimista**, e o otimismo cresce com N;
- número do teste reservado vale para o regime de alumínio e já foi lido duas vezes — não decide mais nada sozinho;
- comparar `_snull` com máscara, ou média de áreas com média de componentes, é comparar coisas diferentes.

> 💡 **Em palavras simples.** Para escolher o melhor modelo, pergunte, nesta ordem: (1) **Qual erra menos numa configuração que nunca viu?** — desde que todos tenham feito a mesma prova. (2) **Qual deixa passar menos componentes perigosos?** — porque errar 1 °C a mais e evitar um superaquecimento pode valer a pena. (3) **Se empatarem, qual é mais simples de manter?** E desconfie de ganhos pequenos, de ganhos obtidos "escolhendo o melhor de muitos", e de números do teste final — que já foi usado.

## 3.3. Recomendação

**Técnica.**

1. **Melhor resultado medido no projeto:** o candidato **M3** de `colabs_S3/analise_dataset/modelo_melhorado.ipynb` — codificação das perdas e estimador escolhidos por região, com seleção aninhada — com **MAE 6,22 °C** (3 sementes) contra 6,57 °C da entrega, ganho +0,32 °C (IC 95% [+0,27; +0,37]). É o sucessor natural do modelo entregue: mesma formulação por área, mesmo protocolo, e só duas alterações, ambas com ganho reprodutível. Acrescentar o alvo em log no Coil Temps, no lugar da média RF+GB nessa região, é a variante mais simples de igual efeito (analise_completa §3.6).
2. **Modelo de produção até a confirmação: continuar com o RF por área da Sprint 3**, com margem de segurança de 8 °C e a entrega no formato de **lista ordenada de componentes em risco**, não de veredito binário. É o único candidato com leitura protegida no teste reservado, tem falsos aprovados medidos (36 em CV; 6 no teste) e é o mais simples.
3. **O que falta para promover o M3** (em ordem):
   - medir os **falsos aprovados** do M3 na curva de margem, sobre as mesmas 3.037 leituras com limite, e o **viés onde atinge o limite** — o M3 foi selecionado por MAE, e o projeto já mostrou que menor MAE não implica menor aprovação indevida;
   - **confirmação em dado independente**: ensaios novos da parceira (broil c1, suporte de plástico), já que o teste reservado foi consumido;
   - conferir a **ordem de chaveamento** dos IGBTs e o **perfil de potência** (simone = 240/145/180/180 W) com a parceira — se confirmados, a codificação C ganha fundamento físico e 32 dos 56 ensaios passam a ter potência numérica por bobina, o que é ganho de outra ordem.
4. **O que não fazer:** trocar de algoritmo por resultado de varredura de uma divisão só; ajustar hiperparâmetros finos do RF (28 empates); mesclar RF com ET; aplicar FEM com a geometria atual; medir desempenho sobre `_snull`.

> 💡 **Em palavras simples.**
> - **O melhor modelo que o projeto conseguiu medir** é o M3: o mesmo Random Forest por área de hoje, com duas melhorias — o jeito de codificar as perdas muda por região, e em quatro regiões usa-se a média de dois modelos. Ele erra 0,32 °C a menos, e quase todo o ganho está no Coil Temps, a região mais crítica.
> - **Mas ainda não é hora de trocar o modelo em produção.** O M3 foi escolhido pelo erro médio, e falta conferir a pergunta que mais importa: ele deixa passar menos componentes perigosos? Isso ainda não foi medido. E a "prova final" já foi usada, então a confirmação de verdade depende de ensaios novos da Whirlpool.
> - **Até lá:** manter o Random Forest por área da Sprint 3, com a margem de 8 °C, entregando a lista dos componentes a verificar primeiro.

---

## Anexo — Índice dos notebooks consultados

| Pasta | Notebook | Papel |
|---|---|---|
| `colabs_S3/preparacao_testes/` | `split_treino_teste` | gera a partição fixa |
| | `verificacao_vazamento` | 9 verificações + casos de controle |
| | `metricas` | função canônica, 16 testes |
| `colabs_S3/` | `modelagem` | entrega da Sprint 3 (§19), comparações, teste reservado (§20) |
| | `linha_base_kpi` | indicador "dentro de 10%" por componente |
| | `treino_extratrees_7areas` | ET por componente, 4 combinações |
| `testes_treinamento/`, `testes_variados/` | `treino_gradient_boosting` | GB por componente, 13cat × perfil, diagnóstico dos componentes fracos |
| `testes_variados/` | `random_search` | 28 pares, 0 trocas; artefato `hiperparametros.json` |
| `testes_variados/analise_dataset/` | `analise_completa` | revisão crítica, 8 variantes, M3 reproduzido, testes pré-registrados |
| | `modelo_melhorado` | **M3 fechado: 6,22 °C** |
| | `pipeline_custo_shap` | pipeline sem vazamento, custo de negócio, SHAP, grade, cronologia |
| `testes_variados/colabs_FEM/` | `fem_mainback`, `piloto_knobs` | FEM — não recomendado |
| `testes_S4/` | `teste_mesclagem_algoritmos`, `teste_mesclagem_extratrees` | mescla por média ponderada |
| `testes_S4/testesCoilEOven/` | `teste_remocao_material_coil_support` | remover feature piora |
| `documents/extras/relatorios_sprints_3/relatorios_treinamentos/` | `registroModelagemSprint3.md`, `documentacao_extra_tree.md`, `documentacao_gradient_boosting.md` | registros escritos |
