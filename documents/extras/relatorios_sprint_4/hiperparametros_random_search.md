# Tuning de hiperparâmetros por busca aleatória
 
Documento de apoio da Sprint 4. Cobre a otimização de hiperparâmetros dos quatro algoritmos nas sete áreas térmicas. A mesclagem das áreas e a construção da Reason são tratadas em documentos próprios.
 
## 1. Escopo e protocolo
 
A otimização foi conduzida por **busca aleatória** (*random search*) sobre a **validação cruzada leave-one-group-out** descrita na Seção 4.3, sem nenhuma alteração da formulação ali documentada. Valem, portanto, as mesmas regras:
 
- Formato longo por área, uma linha por par de ensaio e componente, com o patamar e a escala do componente calculados **dentro de cada dobra** de treino e acrescentados ao vetor de entrada.
- Agrupamento por configuração de ensaio, 17 dobras, partição lida de `particao_treino_teste.csv`.
- Tratamento de ausentes por máscara: linhas sem medição são excluídas do ajuste e da avaliação, nunca preenchidas.
- Métricas calculadas uma única vez sobre o conjunto das previsões fora da dobra, e não como média entre dobras.
**O conjunto reservado não participou de nenhuma etapa do tuning.** O notebook lê a partição, marca os ensaios de teste e os descarta na montagem do formato longo, antes de qualquer ajuste; uma verificação automática interrompe a execução caso algum ensaio de teste chegue ao conjunto de trabalho. Os hiperparâmetros aqui documentados foram escolhidos exclusivamente com dados de treino.
 
## 2. Por que busca aleatória e não busca exaustiva
 
Dois motivos, um de cobertura e um de custo.
 
**Cobertura de parâmetros contínuos.** Três dos parâmetros relevantes são contínuos: a taxa de aprendizado do Gradient Boosting, a fração de atributos por divisão das florestas e a regularização do Ridge. Uma grade só os visita nos poucos valores tabelados, e a resolução da grade vira um limite do resultado. Na busca aleatória, cada sorteio produz um valor distinto: com 30 sorteios, o `alpha` do Ridge foi avaliado em 30 pontos da faixa, contra os 13 pontos de uma grade logarítmica de 10⁻³ a 10³.
 
**Custo de execução.** O custo de uma grade é o produto das dimensões. No espaço do Gradient Boosting, cinco parâmetros com apenas quatro valores cada já dariam 1.024 combinações por área, ou 7.168 ajustes de validação — inviável dentro da sprint. A busca aleatória desacopla o orçamento do número de dimensões: o mesmo orçamento de 30 sorteios cobre um espaço de cinco parâmetros, o que permitiu incluir a subamostragem do Gradient Boosting, que teria de ficar fixa em uma grade.
 
Há ainda um argumento de eficiência estatística: quando poucos parâmetros dominam o erro, a grade desperdiça avaliações repetindo os valores dos parâmetros irrelevantes em todas as combinações dos demais, enquanto a amostragem aleatória distribui o orçamento sobre valores distintos de cada parâmetro.
 
## 3. Espaços de busca
 
Os suportes foram definidos pelo tamanho do treino no formato longo — de cerca de 170 linhas por dobra no Oven HMI a cerca de 1.500 no IPC Comp, com aproximadamente 30 colunas de entrada — e não herdados da formulação por componente da Sprint 3, ajustada para cerca de 40 linhas. O mesmo espaço foi usado nas sete áreas, sem ajuste por área, de modo que a comparação entre áreas não ficasse condicionada ao esforço de busca. Coil Temps e IPC Comp, as duas áreas mais difíceis, receberam exatamente o mesmo espaço e o mesmo orçamento das demais.
 
**Tabela 1 - Espaços amostrados**
 
| Algoritmo | Parâmetro | Distribuição | Suporte | Justificativa |
|---|---|---|---|---|
| Random Forest e Extra Trees | `max_features` | uniforme | [0,4; 1,0] | 1,0 é o padrão de regressão e a configuração atual; a raiz do total foi medida na Seção 4.3 e custa 1,55 °C, o que fixa o piso do suporte em 40% das colunas |
| | `max_depth` | inteiro uniforme | [4; 30] | com até 1.500 linhas por ajuste, profundidade 30 é indistinguível de árvore sem limite, que é a configuração atual |
| | `min_samples_leaf` | inteiro uniforme | [1; 15] | 1 é o padrão; folhas maiores suavizam a previsão em áreas de alvo ruidoso |
| | `n_estimators` | fixo em 300 | — | em *bagging*, mais árvores estabilizam a média sem aumentar o sobreajuste; sortear o número gastaria orçamento sem responder a pergunta alguma |
| Gradient Boosting | `learning_rate` | log-uniforme | [0,01; 0,3] | escala logarítmica porque o efeito é multiplicativo; cobre o atual 0,05 com uma ordem de grandeza para cada lado |
| | `n_estimators` | inteiro uniforme | [150; 800] | sorteado junto com a taxa, que é o par que decide o ponto de parada |
| | `max_depth` | inteiro uniforme | [2; 6] | do atual até a profundidade que capta a interação entre componente e configuração |
| | `min_samples_leaf` | inteiro uniforme | [2; 30] | 2 é o atual; 20 é o padrão do HistGradientBoosting, adequado à formulação por área |
| | `subsample` | uniforme | [0,6; 1,0] | 0,8 é o atual; 1,0 recupera o *boosting* determinístico |
| Ridge | `alpha` | log-uniforme | [10⁻³; 10³] | seis ordens de grandeza, com escalonamento aplicado a todas as colunas para que a penalidade atue de forma equivalente sobre patamar, escala e indicadores |
 
O Ridge é ajustado dentro de um pipeline com escalonador, e o escalonador aprende apenas com as linhas de treino de cada dobra. O `alpha` documentado vale sob escalonamento: usá-lo sem o escalonador altera o significado do valor.
 
A configuração atual de cada algoritmo **não** foi sorteada. Ela foi avaliada à parte, sob o mesmo protocolo, e serve de referência para medir o ganho do tuning.
 
## 4. Orçamento, sementes e reprodutibilidade
 
O orçamento foi de **30 sorteios por par de área e algoritmo**, igual para os quatro algoritmos, de modo que a comparação entre eles não fosse contaminada por esforços de busca diferentes. Somadas a configuração atual de cada par, a execução avaliou 28 × 31 = 868 configurações, ou 14.756 ajustes de validação, em cerca de 45 minutos de CPU.
 
Duas sementes independentes governam a execução: **semente de amostragem 7**, que fixa as combinações sorteadas, e **semente de modelo 42**, que fixa o *bootstrap* das florestas e a subamostragem do Gradient Boosting. Como a semente de amostragem é única, as 30 combinações de um mesmo algoritmo são idênticas nas sete áreas, o que torna a comparação entre áreas pareada por configuração. Uma verificação automática no notebook confere essa identidade antes da consolidação.
 
### Saturação do orçamento
 
A evidência de que 30 sorteios bastaram é a curva do melhor MAE acumulado ao longo dos sorteios. A mediana do sorteio vencedor foi 14 de 30, e em apenas 4 dos 28 pares a vencedora surgiu nos últimos 20% do orçamento. As curvas ficam planas da metade em diante.
 
**Tabela 2 - Melhor MAE acumulado (°C) por número de sorteios, Gradient Boosting**
 
| Área | n=1 | n=5 | n=10 | n=15 | n=20 | n=25 | n=30 | Sorteio vencedor |
|---|---|---|---|---|---|---|---|---|
| Oven HMI | 2,62 | 2,39 | 2,39 | 2,39 | 2,39 | 2,39 | 2,32 | 28 |
| CT Knobs | 3,55 | 3,07 | 3,07 | 3,07 | 3,07 | 3,07 | 3,07 | 4 |
| IPC Cooling | 4,45 | 4,28 | 4,28 | 4,28 | 4,28 | 4,28 | 4,28 | 3 |
| Main Vent Sys | 5,01 | 4,73 | 4,73 | 4,73 | 4,73 | 4,73 | 4,73 | 4 |
| Mainback | 7,31 | 5,44 | 5,44 | 5,44 | 5,44 | 5,44 | 5,44 | 4 |
| IPC Comp | 8,68 | 7,20 | 7,20 | 7,20 | 7,20 | 7,20 | 7,20 | 5 |
| Coil Temps | 16,88 | 10,95 | 10,95 | 10,42 | 10,42 | 10,42 | 10,42 | 11 |
 
O Gradient Boosting é o caso mais exigente, por ter cinco dimensões, e mesmo nele a melhora se esgota até o sorteio 11 em seis das sete áreas. A curva completa dos 28 pares está em `resultados_random/curvas_saturacao.csv`.
 
A exceção é o Oven HMI, cuja vencedora surgiu no sorteio 28, com ganho de 0,07 °C sobre o patamar alcançado no sorteio 5. É melhora tardia e marginal, não indício de orçamento insuficiente.
 
## 5. Critério de decisão
 
A melhor combinação sorteada só substitui a configuração atual quando satisfaz **dois** critérios:
 
1. **Significância.** Teste de Wilcoxon pareado (α = 0,05) sobre o erro médio das 17 dobras. A dobra é a unidade do teste, e não a previsão, porque as previsões de uma mesma configuração não são independentes entre si.
2. **Relevância física.** O ganho de MAE precisa alcançar o piso de ruído experimental da área, apurado no item b da Seção 4.3 a partir das configurações replicadas: 0,58 °C no Oven HMI, 0,92 no CT Knobs, 1,16 no Main Vent Sys, 1,33 no Mainback, 2,15 no IPC Cooling, 3,30 no IPC Comp e 6,36 no Coil Temps.
Falhando qualquer um dos dois, o par é registrado como empate e a configuração atual é mantida, por ser a mais simples de justificar.
 
## 6. Resultados
 
**Tabela 3 - Melhor combinação sorteada contra a configuração atual, por área e algoritmo**
 
MAE em °C; R² adimensional. Δ negativo indica ganho da busca. A coluna *Sig.* marca os pares que passariam apenas pelo critério de significância.
 
| Área | Algoritmo | MAE atual | MAE melhor | Δ MAE | R² atual | R² melhor | Piso | p | Sig. | Decisão |
|---|---|---|---|---|---|---|---|---|---|---|
| Oven HMI | Random Forest | 2,416 | 2,426 | +0,010 | −0,163 | 0,060 | 0,58 | 0,353 | não | empate |
| Oven HMI | Extra Trees | 2,806 | 2,333 | −0,473 | −0,509 | 0,041 | 0,58 | 0,013 | **sim** | empate |
| Oven HMI | Gradient Boosting | 2,661 | 2,319 | −0,342 | −0,478 | 0,108 | 0,58 | 0,174 | não | empate |
| Oven HMI | Ridge | 3,176 | 2,758 | −0,418 | −0,825 | −0,167 | 0,58 | 0,644 | não | empate |
| CT Knobs | Random Forest | 3,161 | 3,355 | +0,194 | 0,561 | 0,566 | 0,92 | 0,109 | não | empate |
| CT Knobs | Extra Trees | 3,398 | 3,321 | −0,078 | 0,472 | 0,515 | 0,92 | 0,854 | não | empate |
| CT Knobs | Gradient Boosting | 3,646 | 3,070 | −0,575 | 0,427 | 0,506 | 0,92 | 0,007 | **sim** | empate |
| CT Knobs | Ridge | 4,703 | 4,226 | −0,477 | 0,282 | 0,401 | 0,92 | 0,132 | não | empate |
| IPC Cooling | Random Forest | 4,035 | 4,183 | +0,149 | 0,846 | 0,850 | 2,15 | 0,035 | não | empate |
| IPC Cooling | Extra Trees | 4,285 | 4,144 | −0,141 | 0,802 | 0,859 | 2,15 | 0,071 | não | empate |
| IPC Cooling | Gradient Boosting | 5,053 | 4,281 | −0,772 | 0,761 | 0,857 | 2,15 | 0,243 | não | empate |
| IPC Cooling | Ridge | 6,734 | 6,447 | −0,287 | 0,697 | 0,738 | 2,15 | 0,678 | não | empate |
| Main Vent Sys | Random Forest | 4,668 | 4,823 | +0,154 | 0,886 | 0,886 | 1,16 | 0,487 | não | empate |
| Main Vent Sys | Extra Trees | 5,028 | 4,800 | −0,227 | 0,855 | 0,883 | 1,16 | 0,353 | não | empate |
| Main Vent Sys | Gradient Boosting | 5,080 | 4,730 | −0,350 | 0,843 | 0,870 | 1,16 | 0,225 | não | empate |
| Main Vent Sys | Ridge | 6,912 | 6,561 | −0,351 | 0,789 | 0,810 | 1,16 | 0,190 | não | empate |
| Mainback | Random Forest | 5,671 | 5,967 | +0,296 | 0,842 | 0,844 | 1,33 | 0,109 | não | empate |
| Mainback | Extra Trees | 5,834 | 6,052 | +0,218 | 0,798 | 0,830 | 1,33 | 0,190 | não | empate |
| Mainback | Gradient Boosting | 6,698 | 5,441 | −1,258 | 0,856 | 0,835 | 1,33 | 0,064 | não | empate |
| Mainback | Ridge | 8,382 | 8,330 | −0,052 | 0,792 | 0,794 | 1,33 | 1,000 | não | empate |
| IPC Comp | Random Forest | 7,309 | 7,519 | +0,210 | 0,612 | 0,599 | 3,30 | 0,243 | não | empate |
| IPC Comp | Extra Trees | 7,241 | 7,412 | +0,172 | 0,607 | 0,616 | 3,30 | 0,487 | não | empate |
| IPC Comp | Gradient Boosting | 8,647 | 7,203 | −1,444 | 0,549 | 0,631 | 3,30 | 0,001 | **sim** | empate |
| IPC Comp | Ridge | 10,864 | 10,435 | −0,429 | 0,292 | 0,376 | 3,30 | 0,926 | não | empate |
| Coil Temps | Random Forest | 11,622 | 12,371 | +0,750 | 0,854 | 0,847 | 6,36 | 0,487 | não | empate |
| Coil Temps | Extra Trees | 13,616 | 11,826 | −1,789 | 0,772 | 0,846 | 6,36 | 0,306 | não | empate |
| Coil Temps | Gradient Boosting | 12,748 | 10,418 | −2,330 | 0,847 | 0,878 | 6,36 | 0,243 | não | empate |
| Coil Temps | Ridge | 19,798 | 19,644 | −0,153 | 0,701 | 0,702 | 6,36 | 0,263 | não | empate |
 
**Tabela 4 — Melhores valores sorteados, por área e algoritmo**
 
Valores arredondados para leitura; o artefato `artefatos/hiperparametros.json` guarda a precisão integral.
 
| Área | Random Forest e Extra Trees | Gradient Boosting | Ridge |
|---|---|---|---|
| Oven HMI | RF: prof. 9, feat. 0,96, folha 8 · ET: prof. 29, feat. 0,72, folha 9 | taxa 0,010, 235 árvores, prof. 6, folha 9, subam. 0,98 | α = 285,0 |
| CT Knobs | prof. 12, feat. 0,61, folha 2 (ambos) | taxa 0,192, 225 árvores, prof. 6, folha 2, subam. 0,87 | α = 66,4 |
| IPC Cooling | RF: prof. 12, feat. 0,61, folha 2 · ET: prof. 23, feat. 0,66, folha 6 | taxa 0,013, 317 árvores, prof. 4, folha 10, subam. 0,81 | α = 21,9 |
| Main Vent Sys | prof. 12, feat. 0,61, folha 2 (ambos) | taxa 0,192, 225 árvores, prof. 6, folha 2, subam. 0,87 | α = 21,9 |
| Mainback | prof. 12, feat. 0,61, folha 2 (ambos) | taxa 0,192, 225 árvores, prof. 6, folha 2, subam. 0,87 | α = 11,9 |
| IPC Comp | prof. 12, feat. 0,61, folha 2 (ambos) | taxa 0,098, 475 árvores, prof. 6, folha 14, subam. 0,97 | α = 285,0 |
| Coil Temps | prof. 12, feat. 0,61, folha 2 (ambos) | taxa 0,016, 631 árvores, prof. 6, folha 5, subam. 0,74 | α = 66,4 |
 
A repetição da combinação "profundidade 12, fração 0,61, folha 2" em cinco áreas não é coincidência: é o mesmo sorteio, o de índice 14, vencendo em áreas diferentes, consequência de a semente de amostragem ser única. O mesmo vale para a combinação de índice 4 do Gradient Boosting, vencedora em três áreas.
 
### Leitura dos resultados
 
O Random Forest na configuração atual permanece o melhor algoritmo em seis das sete áreas, e o Extra Trees no IPC Comp — o mesmo quadro da Seção 4.3, agora confirmado sob busca. Nas florestas, a busca não encontrou nada melhor: o Δ médio do Random Forest é **+0,25 °C**, ou seja, as combinações sorteadas foram em média piores que a configuração atual, o que indica que a configuração padrão já está bem posicionada no espaço.
 
O Gradient Boosting é o único algoritmo que ganha de forma consistente com o tuning, com Δ médio de **−1,01 °C**. A razão aparece na Tabela 4: a profundidade vencedora é 6 em cinco das sete áreas, contra a profundidade 2 da configuração atual. A configuração atual havia sido fixada para a formulação por componente da Sprint 3 e é rasa demais para o formato longo, em que o modelo precisa combinar o patamar do componente com a configuração do ensaio. Ainda assim, os ganhos não bastam para vencer o piso.
 
O R² confirma a leitura pelo MAE, com uma ressalva no Oven HMI. Ali todos os valores ficam próximos de zero ou negativos — o melhor é 0,108, no Gradient Boosting sorteado —, o que não indica modelo ruim, e sim uma área de variância muito baixa: com MAE em torno de 2,4 °C e temperaturas quase constantes entre ensaios, prever a média já é difícil de superar. Nessa área, o MAE é a métrica que deve orientar a leitura. Nas demais, o R² das configurações atuais do Random Forest vai de 0,561 no CT Knobs a 0,886 no Main Vent Sys.
 
## 7. Empates
 
**Os 28 pares terminaram em empate**, e o artefato entrega, em todos eles, a configuração atual do algoritmo. Isso não é ausência de resultado: cada configuração entregue sobreviveu a 30 sorteios de busca sem que nenhuma alternativa a superasse por margem maior que o piso da área.
 
Em 25 pares, o empate decorre de ambos os critérios. Em três, a diferença é estatisticamente consistente entre dobras e só não alcança o piso:
 
| Área | Algoritmo | Δ MAE | Piso | p |
|---|---|---|---|---|
| IPC Comp | Gradient Boosting | −1,444 | 3,30 | 0,001 |
| CT Knobs | Gradient Boosting | −0,575 | 0,92 | 0,007 |
| Oven HMI | Extra Trees | −0,473 | 0,58 | 0,013 |
 
O critério do piso é deliberadamente conservador, e convém registrar por quê ele é discutível. O piso mede a dispersão de uma **leitura individual** entre ensaios replicados; o Δ de MAE é uma **média** sobre milhares de previsões, cuja incerteza é bem menor. O erro-padrão do Δ entre as 17 dobras ilustra a diferença de escala: 0,35 °C no IPC Comp contra um piso de 3,30 °C, e 1,07 °C no Coil Temps contra um piso de 6,36 °C. Comparado a essa escala, o ganho do Gradient Boosting no IPC Comp equivale a quatro erros-padrão. A decisão registrada segue o critério acordado pelo grupo; os três pares acima ficam documentados para o caso de o critério ser revisto, e `resultados_random/escolhas.csv` permite refazer o artefato sem repetir busca alguma.
 
Um caso merece atenção oposta. O Gradient Boosting no Coil Temps produziu o maior ganho absoluto de toda a execução, −2,33 °C, com p = 0,244. O ganho se concentra em poucas dobras, o que sinaliza sensibilidade a configurações de ensaio específicas, e não melhora consistente. É o exemplo de por que o teste pareado importa: sem ele, a diferença de maior magnitude da execução teria sido adotada.
 
## 8. Extremos do suporte
 
Em 10 dos 28 pares, a combinação vencedora caiu nos 10% externos do suporte de alguma distribuição — nos parâmetros log-uniformes, medidos em escala logarítmica. É sinal de que o suporte pode estar curto e de que o ótimo está fora dele.
 
O padrão é sistemático em dois parâmetros. A profundidade do Gradient Boosting atingiu o teto de 6 em seis pares, coerente com a leitura da seção 6: o algoritmo quer árvores mais fundas que o suporte permite. O `alpha` do Ridge atingiu o extremo superior no Oven HMI e no IPC Comp, isto é, o modelo linear quer regularização mais forte que 10³, o que é esperado em um problema com colinearidade alta entre indicadores de configuração.
 
Como nenhuma dessas vencedoras foi adotada, o suporte curto não afeta a entrega. Afeta a conclusão sobre o potencial do Gradient Boosting: o −1,01 °C de Δ médio é um piso, não um teto, e uma segunda rodada com profundidade até 8 ou 10 provavelmente iria além.
 
## 9. Limitações
 
**A busca é amostral e não garante o ótimo do espaço.** Trinta sorteios cobrem uma fração do espaço, e nada assegura que a melhor combinação encontrada seja a melhor existente. As curvas da Tabela 2 mostram que o orçamento saturou dentro dos suportes adotados, mas saturação é evidência empírica de suficiência, não prova de otimalidade.
 
**Os suportes são uma escolha, e restringem o resultado.** Os 10 pares da seção 8 mostram que parte do espaço promissor ficou de fora. Um suporte diferente produziria vencedoras diferentes.
 
**A seleção pelo mínimo de validação enviesa a estimativa.** Escolher a melhor entre 30 combinações avaliadas na mesma validação cruzada torna o MAE da vencedora otimista: parte do ganho aparente é ajuste às particularidades das 17 dobras. Esse é um dos motivos pelos quais o critério de decisão exige significância pareada e margem acima do piso, e não apenas o menor MAE. Como o resultado final manteve as configurações atuais, o viés não se propaga à entrega; propagaria, se as vencedoras tivessem sido adotadas.
 
**O piso de ruído é um critério severo e de escala discutível**, conforme a seção 7.
 
**A comparação entre áreas é pareada, mas as áreas não são independentes.** As mesmas 30 combinações foram usadas nas sete áreas, o que fortalece a comparação entre áreas e, ao mesmo tempo, faz com que uma combinação infeliz do sorteio prejudique todas elas do mesmo modo.
 
## 10. Rastreabilidade
 
Todo número deste documento sai da execução de `random_search.ipynb`, Partes III e IV, e pode ser reproduzido a partir dos arquivos abaixo.
 
| Arquivo | Conteúdo | Seções deste documento |
|---|---|---|
| `resultados_random/<area>__<algoritmo>.csv` | as 30 combinações sorteadas de cada par, mais a configuração atual, com métricas e erro por dobra | Tabelas 3 e 4 |
| `resultados_random/escolhas.csv` | tabela consolidada dos 28 pares | Tabela 3, seções 6 e 7 |
| `resultados_random/curvas_saturacao.csv` | melhor MAE acumulado por número de sorteios | Tabela 2, seção 4 |
| `artefatos/hiperparametros.json` | hiperparâmetros entregues, com sementes, orçamento e métricas | seção 7, Tabela 4 |
| `artefatos/hiperparametros.py` | funções de leitura usadas pelos notebooks de mesclagem | — |
 
A reprodução integral exige reexecutar o notebook com a semente de amostragem 7 e a semente de modelo 42, sobre a mesma partição.