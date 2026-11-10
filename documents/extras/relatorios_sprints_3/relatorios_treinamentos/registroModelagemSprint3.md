# Registro de modelagem — Sprint 3

Registro do que foi medido nesta sprint, para que a Sprint 4 parta da evidência e não repita experimentos já conduzidos. Todos os números provêm do mesmo protocolo: validação cruzada agrupada, na forma de leave-one-group-out sobre as 17 configurações de treino, com as 8 configurações de teste reservadas, salvo indicação em contrário.

## Solução entregue

Sete modelos, um por área térmica, Random Forest com 300 árvores, sobre a versão da base com perfil de perdas. Cada modelo é treinado sobre o formato longo da sua área, e ao vetor de configuração somam-se dois atributos do componente calculados apenas sobre o treino de cada dobra: o patamar, que é a média, e a escala, que é o desvio-padrão.

Erro absoluto médio de 6,57 graus, erro percentual de 8,50 por cento, 73,8 por cento das previsões dentro da margem de 10 por cento, e 36 falsos aprovados de 193 excessos reais na margem de segurança de 8 graus.

## Estruturas comparadas

| Estrutura | Modelos | Erro absoluto médio | Falsos aprovados |
|---|---|---|---|
| Um por área, Random Forest, entregue | 7 | 6,57 °C | 36 |
| Um por área, Gradient Boosting 300 | 7 | 7,06 °C | 26 |
| Um por componente, Gradient Boosting | 74 | 6,92 °C | 37 |
| Um por área, identidade por indicadores | 7 | 8,46 °C | 103 |
| Modelo único, patamar como entrada | 1 | 9,22 °C | 123 |
| Modelo único, identidade por indicadores | 1 | 14,02 °C | 176 |

A comparação pareada por componente entre a solução entregue e a formulação por componente devolve diferença de menos 0,379 grau em favor da entregue, com p de 0,0097 e intervalo de confiança de menos 0,664 a menos 0,095.

## O que decidiu o desempenho

A codificação do componente pesa mais que o número de modelos. Fornecer a identidade por colunas indicadoras faz o erro saltar para 14,02 graus, porque o modelo gasta capacidade memorizando setenta e quatro patamares. Fornecer o patamar como entrada leva a 7,17, e acrescentar a escala leva a 6,57.

Transformar o alvo em desvio, subtraindo o patamar, é pior que fornecê-lo como entrada, pois impõe um único mecanismo de resposta compartilhado por componentes que respondem de forma diferente.

## Algoritmos, sob a formulação por área

| Algoritmo | Erro absoluto médio | Falsos aprovados |
|---|---|---|
| Random Forest, 300 árvores | 6,57 °C | 36 |
| HistGradientBoosting, folha mínima 5 | 7,01 °C | 38 |
| Gradient Boosting, 300 árvores, taxa 0,05 | 7,06 °C | 26 |
| Lasso | 9,82 °C | 73 |
| Ridge | 9,99 °C | 70 |

O algoritmo que minimiza o erro médio não é o que minimiza a aprovação indevida. A escolha entre Random Forest e Gradient Boosting é uma troca entre precisão e segurança, e não uma questão de qual é melhor.

## Hiperparâmetros que custaram caro

O parâmetro de atributos por divisão do Random Forest, quando fixado na raiz do total, que é o padrão de classificação e não o de regressão, custa 1,55 grau no agregado. O efeito concentra-se no Coil Temps, que passa de 12,49 para 22,18 graus.

A folha mínima do HistGradientBoosting, quando mantida no padrão de 20, torna os modelos por componente praticamente constantes, com 188 falsos aprovados de 193. O padrão é adequado à formulação por área e inadequado à formulação por componente, o que ilustra que a escolha de hiperparâmetro depende do número de linhas por modelo.

## Caminhos já descartados com medição

Escolher algoritmo por área rende 0,05 grau sobre usar um único algoritmo, ao custo de sete configurações a manter. Escolher algoritmo por componente é pior que não escolher: a escolha aninhada entrega 6,96 graus contra 6,88 do melhor algoritmo único, porque com 45 linhas de validação a decisão oscila quase ao acaso, e o algoritmo mais escolhido responde por apenas 31,6 por cento das escolhas.

Um híbrido que usasse modelo por área apenas no Coil Temps pareceu vantajoso na validação e não se confirmou no conjunto de teste, onde ficou 0,94 grau pior.

## O que rendeu ganho de verdade

A extração de atributos físicos do texto do motivo do ensaio reduziu o erro de 7,560 para 6,991 graus, com p inferior a 0,0001, e os falsos aprovados de 44 para 31. É o maior ganho isolado obtido na sprint, e veio de dados que já estavam na planilha.

## Estado do conjunto de teste

O conjunto reservado foi utilizado uma única vez, em 11 de setembro de 2026, para comparar a formulação por componente contra um híbrido. Não se encontra mais disponível como árbitro imparcial, e qualquer escolha futura de modelo depende de ensaios adicionais.

Registra-se que ele não contém ensaio algum com suporte de bobina em plástico nem do modo broil c1, de modo que o desempenho nele medido vale para o regime de alumínio.

## Pedidos à parceira, em ordem de retorno esperado

Ensaios adicionais com suporte de bobina em plástico, em particular combinados ao caso de ensaio broil c2, célula que hoje reúne quatro ensaios de uma única configuração.

Ensaios adicionais no modo broil c1, que hoje possui duas configurações e nenhuma representação no conjunto de teste.

A intensidade do soprador como coluna estruturada, em lugar de texto livre interpretado pela equipe.

Confirmação de que as quatro placas de alumínio pertencem à área Coil Temps, uma vez que não possuem área declarada na planilha e seu limite é de 150 graus contra 220 das bobinas.
