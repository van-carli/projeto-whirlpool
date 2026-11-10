# Baseline de métricas por área

Métricas fora-da-dobra de RandomForest e GradientBoosting treinados por componente em cada uma das sete áreas, sobre os `dataset_<area>_perfil.csv` e `dataset_<area>_13cat.csv` de `notebooks/colabs_S3/`, com validação nas 17 dobras leave-one-group-out da partição gravada em `colabs_S3/preparacao_testes/particao_treino_teste.json`. Gerado por `notebooks/colabs_S4/testes_extras/testes_treinamento/baseline_metricas_por_area.ipynb`; a tabela completa, com as médias micro, é gerada localmente pelo notebook. 

## Hiperparâmetros

| Modelo | Algoritmo | Hiperparâmetros |
|---|---|---|
| rf | RandomForestRegressor | n_estimators=300, random_state=42, n_jobs=-1 |
| gb | GradientBoostingRegressor | random_state=42 |

## Baseline por sufixo, área e modelo

Médias macro (peso igual por componente); `n` é o total de observações fora-da-dobra. As colunas de decisão usam os limites de `limites_ativos.csv` e são somas sobre os componentes.

| Sufixo | Área | Modelo | Componentes | n | MAE | RMSE | R2 | MAPE (%) | Dentro de 10% (%) | Reprovas reais | Falsos aprovados | Falsos reprovados |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| _13cat | coil_temps | gb | 8 | 344 | 12,85 | 18,30 | 0,66 | 13,33 | 67,77 | 25 | 19 | 5 |
| _13cat | coil_temps | rf | 8 | 344 | 12,25 | 17,45 | 0,68 | 13,44 | 68,82 | 25 | 13 | 11 |
| _13cat | ct_knobs | gb | 6 | 270 | 3,16 | 5,00 | -0,06 | 6,58 | 82,22 | 0 | 0 | 0 |
| _13cat | ct_knobs | rf | 6 | 270 | 2,96 | 4,60 | 0,12 | 6,15 | 85,19 | 0 | 0 | 0 |
| _13cat | ipc_comp | gb | 37 | 1616 | 8,02 | 11,56 | -0,28 | 10,66 | 67,64 | 142 | 38 | 36 |
| _13cat | ipc_comp | rf | 37 | 1616 | 8,59 | 11,85 | -0,14 | 11,31 | 63,72 | 142 | 62 | 17 |
| _13cat | ipc_cooling | gb | 4 | 179 | 3,78 | 6,23 | 0,07 | 6,21 | 82,70 | 0 | 0 | 0 |
| _13cat | ipc_cooling | rf | 4 | 179 | 4,04 | 6,49 | 0,06 | 6,65 | 81,01 | 0 | 0 | 0 |
| _13cat | main_vent_sys | gb | 5 | 230 | 4,23 | 7,06 | 0,17 | 5,12 | 85,22 | 0 | 0 | 0 |
| _13cat | main_vent_sys | rf | 5 | 230 | 4,15 | 6,52 | 0,31 | 5,07 | 84,35 | 0 | 0 | 0 |
| _13cat | mainback | gb | 10 | 458 | 5,70 | 10,05 | 0,04 | 8,47 | 73,85 | 26 | 13 | 12 |
| _13cat | mainback | rf | 10 | 458 | 5,81 | 9,36 | 0,17 | 8,72 | 69,92 | 26 | 17 | 14 |
| _13cat | oven_hmi | gb | 4 | 180 | 2,67 | 4,55 | -0,75 | 4,82 | 90,00 | 0 | 0 | 0 |
| _13cat | oven_hmi | rf | 4 | 180 | 2,51 | 4,18 | -0,47 | 4,56 | 90,56 | 0 | 0 | 0 |
| _perfil | coil_temps | gb | 8 | 344 | 13,10 | 18,35 | 0,67 | 13,23 | 67,93 | 25 | 17 | 5 |
| _perfil | coil_temps | rf | 8 | 344 | 12,26 | 17,44 | 0,68 | 13,41 | 69,52 | 25 | 12 | 11 |
| _perfil | ct_knobs | gb | 6 | 270 | 3,19 | 5,08 | -0,10 | 6,68 | 83,33 | 0 | 0 | 0 |
| _perfil | ct_knobs | rf | 6 | 270 | 3,04 | 4,67 | 0,08 | 6,31 | 84,81 | 0 | 0 | 0 |
| _perfil | ipc_comp | gb | 37 | 1616 | 7,79 | 11,34 | -0,24 | 10,36 | 69,56 | 142 | 34 | 32 |
| _perfil | ipc_comp | rf | 37 | 1616 | 8,35 | 11,68 | -0,13 | 11,09 | 66,23 | 142 | 53 | 22 |
| _perfil | ipc_cooling | gb | 4 | 179 | 3,60 | 6,18 | 0,05 | 6,03 | 83,28 | 0 | 0 | 0 |
| _perfil | ipc_cooling | rf | 4 | 179 | 3,92 | 6,32 | 0,11 | 6,47 | 83,83 | 0 | 0 | 0 |
| _perfil | main_vent_sys | gb | 5 | 230 | 4,95 | 7,85 | 0,02 | 6,06 | 80,43 | 0 | 0 | 0 |
| _perfil | main_vent_sys | rf | 5 | 230 | 4,53 | 6,84 | 0,26 | 5,59 | 81,30 | 0 | 0 | 0 |
| _perfil | mainback | gb | 10 | 458 | 5,60 | 9,97 | 0,04 | 8,31 | 74,95 | 26 | 13 | 13 |
| _perfil | mainback | rf | 10 | 458 | 5,74 | 9,35 | 0,17 | 8,62 | 69,27 | 26 | 16 | 15 |
| _perfil | oven_hmi | gb | 4 | 180 | 2,52 | 4,43 | -0,66 | 4,58 | 90,00 | 0 | 0 | 0 |
| _perfil | oven_hmi | rf | 4 | 180 | 2,37 | 4,07 | -0,40 | 4,31 | 90,56 | 0 | 0 | 0 |
