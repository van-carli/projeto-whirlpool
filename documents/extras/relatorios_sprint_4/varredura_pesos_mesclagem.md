# Varredura do peso da mesclagem RF e GB

Varredura do peso da mesclagem das previsões fora-da-dobra de RandomForest e GradientBoosting por média ponderada, componente a componente, com o peso do rf indo de 0 a 1 em passos de 0,05 (21 valores; o peso do gb é o complemento). A avaliação é a mesma do baseline de métricas por área (`baseline_metricas_por_area.md`): as mesmas previsões, a mesma célula canônica de métricas e a mesma validação nas 17 dobras leave-one-group-out, de modo que o peso 0 reproduz o gb do baseline e o peso 1 o rf. Gerado por `notebooks/colabs_S4/testes_extras/testes_treinamento/varredura_pesos.ipynb`.

## Peso ótimo por sufixo e área

Médias macro (peso igual por componente). O peso ótimo é o de menor MAE na varredura; em empate fica o menor. O ganho é o menor MAE entre rf e gb menos o MAE no peso ótimo, em °C; positivo quando a mesclagem erra menos que o melhor modelo individual e zero quando o peso ótimo é um dos extremos.

| Sufixo | Área | Peso ótimo | MAE no peso ótimo | MAE rf | MAE gb | Ganho |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| _13cat | coil_temps | 0,55 | 11,99 | 12,25 | 12,85 | 0,27 |
| _13cat | ct_knobs | 1,00 | 2,96 | 2,96 | 3,16 | 0,00 |
| _13cat | ipc_comp | 0,00 | 8,02 | 8,59 | 8,02 | 0,00 |
| _13cat | ipc_cooling | 0,10 | 3,78 | 4,04 | 3,78 | 0,00 |
| _13cat | main_vent_sys | 1,00 | 4,15 | 4,15 | 4,23 | 0,00 |
| _13cat | mainback | 0,30 | 5,66 | 5,81 | 5,70 | 0,04 |
| _13cat | oven_hmi | 1,00 | 2,51 | 2,51 | 2,67 | 0,00 |
| _perfil | coil_temps | 0,75 | 12,13 | 12,26 | 13,10 | 0,14 |
| _perfil | ct_knobs | 0,90 | 3,03 | 3,04 | 3,19 | 0,00 |
| _perfil | ipc_comp | 0,00 | 7,79 | 8,35 | 7,79 | 0,00 |
| _perfil | ipc_cooling | 0,10 | 3,59 | 3,92 | 3,60 | 0,01 |
| _perfil | main_vent_sys | 1,00 | 4,53 | 4,53 | 4,95 | 0,00 |
| _perfil | mainback | 0,25 | 5,53 | 5,74 | 5,60 | 0,06 |
| _perfil | oven_hmi | 1,00 | 2,37 | 2,37 | 2,52 | 0,00 |

A mesclagem compensa em coil_temps e mainback nos dois sufixos, com peso intermediário e ganho de 0,27 °C e 0,14 °C em coil_temps e de 0,04 °C e 0,06 °C em mainback. Em ipc_cooling nos dois sufixos e em ct_knobs no `_perfil` o peso ótimo também é intermediário, mas o ganho é de no máximo 0,01 °C e não separa a mesclagem do melhor modelo individual. Nas demais áreas o peso ótimo cai num extremo: 1,0, só rf, em ct_knobs no `_13cat` e em main_vent_sys e oven_hmi nos dois sufixos; e 0,0, só gb, em ipc_comp nos dois sufixos.
