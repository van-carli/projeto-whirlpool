# Mesclagem RF e GB por média ponderada

Mesclagem das previsões fora-da-dobra de RandomForest e GradientBoosting por média ponderada com peso 0,5 para o rf e 0,5 para o gb, componente a componente. A comparação é contra o baseline de métricas por área (`baseline_metricas_por_area.md`), com as mesmas previsões, a mesma célula canônica de métricas e a mesma validação nas 17 dobras leave-one-group-out. Gerado por `notebooks/colabs_S4/testes_extras/testes_treinamento/mesclagem_rf_gb.ipynb`.

## Comparação por sufixo e área

Médias macro (peso igual por componente). A última coluna é o MAE da mesclagem menos o menor MAE entre rf e gb; negativo quando a mesclagem erra menos que o melhor modelo individual.

| Sufixo | Área | MAE rf | MAE gb | MAE mescla | RMSE rf | RMSE gb | RMSE mescla | R2 rf | R2 gb | R2 mescla | MAE mescla − melhor |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| _13cat | coil_temps | 12,25 | 12,85 | 11,99 | 17,45 | 18,30 | 17,28 | 0,68 | 0,66 | 0,69 | -0,26 |
| _13cat | ct_knobs | 2,96 | 3,16 | 3,03 | 4,60 | 5,00 | 4,77 | 0,12 | -0,06 | 0,04 | +0,07 |
| _13cat | ipc_comp | 8,59 | 8,02 | 8,23 | 11,85 | 11,56 | 11,60 | -0,14 | -0,28 | -0,18 | +0,21 |
| _13cat | ipc_cooling | 4,04 | 3,78 | 3,86 | 6,49 | 6,23 | 6,25 | 0,06 | 0,07 | 0,10 | +0,08 |
| _13cat | main_vent_sys | 4,15 | 4,23 | 4,17 | 6,52 | 7,06 | 6,74 | 0,31 | 0,17 | 0,25 | +0,03 |
| _13cat | mainback | 5,81 | 5,70 | 5,68 | 9,36 | 10,05 | 9,55 | 0,17 | 0,04 | 0,14 | -0,02 |
| _13cat | oven_hmi | 2,51 | 2,67 | 2,56 | 4,18 | 4,55 | 4,34 | -0,47 | -0,75 | -0,59 | +0,05 |
| _perfil | coil_temps | 12,26 | 13,10 | 12,27 | 17,44 | 18,35 | 17,45 | 0,68 | 0,67 | 0,69 | +0,01 |
| _perfil | ct_knobs | 3,04 | 3,19 | 3,07 | 4,67 | 5,08 | 4,83 | 0,08 | -0,10 | 0,01 | +0,03 |
| _perfil | ipc_comp | 8,35 | 7,79 | 7,97 | 11,68 | 11,34 | 11,37 | -0,13 | -0,24 | -0,16 | +0,18 |
| _perfil | ipc_cooling | 3,92 | 3,60 | 3,70 | 6,32 | 6,18 | 6,10 | 0,11 | 0,05 | 0,13 | +0,10 |
| _perfil | main_vent_sys | 4,53 | 4,95 | 4,70 | 6,84 | 7,85 | 7,26 | 0,26 | 0,02 | 0,16 | +0,16 |
| _perfil | mainback | 5,74 | 5,60 | 5,55 | 9,35 | 9,97 | 9,47 | 0,17 | 0,04 | 0,15 | -0,05 |
| _perfil | oven_hmi | 2,37 | 2,52 | 2,41 | 4,07 | 4,43 | 4,23 | -0,40 | -0,66 | -0,51 | +0,04 |

Com peso 0,5, a mesclagem erra menos que o melhor modelo individual em mainback nos dois sufixos e em coil_temps no `_13cat`. Nas demais áreas piora contra o melhor individual: ct_knobs, ipc_comp, ipc_cooling, main_vent_sys e oven_hmi nos dois sufixos, e coil_temps no `_perfil`. A diferença vai de -0,26 °C em coil_temps (`_13cat`) a +0,21 °C em ipc_comp (`_13cat`).
