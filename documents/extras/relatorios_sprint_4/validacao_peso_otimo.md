# Validação do peso ótimo da mesclagem em coil_temps e ipc_comp

Verificação do peso ótimo da mesclagem RF e GB nas áreas coil_temps e ipc_comp, a partir da varredura de pesos (`varredura_pesos_mesclagem.md`). O peso global é o peso único de menor MAE quando os 74 componentes das sete áreas são avaliados juntos, calculado por sufixo com a mesma média macro do baseline, e é comparado ao peso ótimo local de cada área. A verificação por dobra recalcula o MAE da área em cada uma das 17 dobras leave-one-group-out da validação, as mesmas do baseline (`baseline_metricas_por_area.md`), comparando a mesclagem no peso local com o melhor modelo individual da área; o conjunto de teste reservado não entra em nenhuma etapa. Gerado por `notebooks/colabs_S4/testes_extras/testes_treinamento/validacao_peso_otimo.ipynb`.

## Peso local, peso global e MAE

Médias macro (peso igual por componente). O peso é o do rf; o do gb é o complemento.

| Sufixo | Área | Peso local | MAE peso local | Peso global | MAE peso global | MAE rf | MAE gb |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| _13cat | coil_temps | 0,55 | 11,99 | 0,30 | 12,19 | 12,25 | 12,85 |
| _13cat | ipc_comp | 0,00 | 8,02 | 0,30 | 8,13 | 8,59 | 8,02 |
| _perfil | coil_temps | 0,75 | 12,13 | 0,30 | 12,53 | 12,26 | 13,10 |
| _perfil | ipc_comp | 0,00 | 7,79 | 0,30 | 7,88 | 8,35 | 7,79 |

## Verificação por dobra

MAE da área em cada dobra, com a mesclagem no peso local contra o melhor modelo individual da área. A diferença é o MAE do individual menos o da mesclagem, em °C; positiva quando a mesclagem erra menos. Empate é diferença nula.

| Sufixo | Área | Peso local | Individual | Dobras | Peso local melhor | Empates | Individual melhor | Diferença média | Diferença mínima |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| _13cat | coil_temps | 0,55 | rf | 17 | 10 | 0 | 7 | +0,37 | -0,92 |
| _13cat | ipc_comp | 0,00 | gb | 17 | 0 | 17 | 0 | 0,00 | 0,00 |
| _perfil | coil_temps | 0,75 | rf | 17 | 8 | 0 | 9 | +0,21 | -0,40 |
| _perfil | ipc_comp | 0,00 | gb | 17 | 0 | 17 | 0 | 0,00 | 0,00 |

Em ipc_comp o peso ótimo local é 0,00 nos dois sufixos, ou seja a mesclagem ótima é o próprio gb, e por isso as 17 dobras empatam por construção. Em coil_temps o ganho médio por dobra é positivo, 0,37 °C no `_13cat` e 0,21 °C no `_perfil`, mas a vitória por dobra é dividida, 10 a 7 e 8 a 9, e a média é puxada por poucas dobras com diferença grande, como a dobra 9 (+3,21 °C e +1,86 °C) e a dobra 15 (+2,16 °C e +0,87 °C), enquanto nas demais a diferença fica em torno de ±0,5 °C. Nas piores dobras a mesclagem perde por 0,92 °C e 0,40 °C. Por isso o ganho da mesclagem em coil_temps não se sustenta de forma consistente entre as dobras.
