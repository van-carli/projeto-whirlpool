# Consolidação dos resultados dos modelos por área

Este documento reúne, numa só tabela, todas as configurações de modelo avaliadas por área térmica: Random Forest e Gradient Boosting com a configuração padrão, os mesmos algoritmos com os hiperparâmetros entregues pela busca aleatória, e as mesclagens entre os dois. Todas foram medidas da mesma forma, com um modelo por componente, validação cruzada leave-one-group-out em 17 dobras e o conjunto de teste reservado fora de todas as etapas. As métricas são a média entre os componentes de cada área.

O Δ MAE compara cada configuração com o menor MAE entre Random Forest e Gradient Boosting padrão no mesmo sufixo e área. Valor negativo indica erro menor que o do baseline. Em cada sufixo e área, a configuração de menor MAE está em negrito; quando duas configurações empatam exatamente, fica marcada a mais simples.

| Sufixo | Área | Configuração | Algoritmo | MAE (°C) | RMSE (°C) | R² | Δ MAE (°C) |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| _perfil | coil_temps | Padrão | Random Forest | 12,264 | 17,440 | 0,684 | 0,000 |
| _perfil | coil_temps | Padrão | Gradient Boosting | 13,103 | 18,347 | 0,673 | +0,840 |
| _perfil | coil_temps | Hiperparâmetros da busca | Random Forest | 12,264 | 17,440 | 0,684 | 0,000 |
| _perfil | coil_temps | Hiperparâmetros da busca | Gradient Boosting | 13,536 | 18,589 | 0,680 | +1,272 |
| _perfil | coil_temps | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 12,271 | 17,447 | 0,691 | +0,007 |
| _perfil | coil_temps | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 12,528 | 17,707 | 0,687 | +0,264 |
| _perfil | coil_temps | Mesclagem, peso por área | Random Forest e Gradient Boosting | 12,126 | 17,324 | 0,690 | -0,137 |
| _perfil | coil_temps | **Mesclagem, peso por área, hiperparâmetros da busca** | Random Forest e Gradient Boosting | 12,116 | 17,275 | 0,691 | -0,148 |
| _perfil | ct_knobs | Padrão | Random Forest | 3,035 | 4,671 | 0,084 | 0,000 |
| _perfil | ct_knobs | Padrão | Gradient Boosting | 3,191 | 5,078 | -0,099 | +0,156 |
| _perfil | ct_knobs | Hiperparâmetros da busca | Random Forest | 3,035 | 4,671 | 0,084 | 0,000 |
| _perfil | ct_knobs | Hiperparâmetros da busca | Gradient Boosting | 3,220 | 5,119 | -0,102 | +0,185 |
| _perfil | ct_knobs | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 3,069 | 4,830 | 0,015 | +0,033 |
| _perfil | ct_knobs | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 3,102 | 4,919 | -0,025 | +0,067 |
| _perfil | ct_knobs | **Mesclagem, peso por área** | Random Forest e Gradient Boosting | 3,034 | 4,695 | 0,074 | -0,001 |
| _perfil | ct_knobs | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 3,035 | 4,671 | 0,084 | 0,000 |
| _perfil | ipc_comp | Padrão | Random Forest | 8,348 | 11,677 | -0,126 | +0,559 |
| _perfil | ipc_comp | **Padrão** | Gradient Boosting | 7,789 | 11,338 | -0,239 | 0,000 |
| _perfil | ipc_comp | Hiperparâmetros da busca | Random Forest | 8,348 | 11,677 | -0,126 | +0,559 |
| _perfil | ipc_comp | Hiperparâmetros da busca | Gradient Boosting | 8,087 | 10,931 | -0,068 | +0,298 |
| _perfil | ipc_comp | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 7,971 | 11,372 | -0,155 | +0,182 |
| _perfil | ipc_comp | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 7,876 | 11,324 | -0,182 | +0,087 |
| _perfil | ipc_comp | Mesclagem, peso por área | Random Forest e Gradient Boosting | 7,789 | 11,338 | -0,239 | 0,000 |
| _perfil | ipc_comp | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 8,085 | 10,955 | -0,066 | +0,296 |
| _perfil | ipc_cooling | Padrão | Random Forest | 3,923 | 6,320 | 0,107 | +0,324 |
| _perfil | ipc_cooling | Padrão | Gradient Boosting | 3,599 | 6,181 | 0,052 | 0,000 |
| _perfil | ipc_cooling | Hiperparâmetros da busca | Random Forest | 3,923 | 6,320 | 0,107 | +0,324 |
| _perfil | ipc_cooling | Hiperparâmetros da busca | Gradient Boosting | 4,161 | 6,703 | -0,011 | +0,562 |
| _perfil | ipc_cooling | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 3,702 | 6,102 | 0,128 | +0,103 |
| _perfil | ipc_cooling | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 3,628 | 6,098 | 0,109 | +0,029 |
| _perfil | ipc_cooling | **Mesclagem, peso por área** | Random Forest e Gradient Boosting | 3,591 | 6,142 | 0,075 | -0,008 |
| _perfil | ipc_cooling | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 3,923 | 6,320 | 0,107 | +0,324 |
| _perfil | main_vent_sys | **Padrão** | Random Forest | 4,534 | 6,836 | 0,256 | 0,000 |
| _perfil | main_vent_sys | Padrão | Gradient Boosting | 4,952 | 7,851 | 0,023 | +0,418 |
| _perfil | main_vent_sys | Hiperparâmetros da busca | Random Forest | 4,534 | 6,836 | 0,256 | 0,000 |
| _perfil | main_vent_sys | Hiperparâmetros da busca | Gradient Boosting | 4,982 | 7,911 | 0,023 | +0,448 |
| _perfil | main_vent_sys | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 4,696 | 7,260 | 0,162 | +0,162 |
| _perfil | main_vent_sys | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 4,776 | 7,478 | 0,112 | +0,242 |
| _perfil | main_vent_sys | Mesclagem, peso por área | Random Forest e Gradient Boosting | 4,534 | 6,836 | 0,256 | 0,000 |
| _perfil | main_vent_sys | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 4,534 | 6,836 | 0,256 | 0,000 |
| _perfil | mainback | Padrão | Random Forest | 5,743 | 9,345 | 0,174 | +0,147 |
| _perfil | mainback | Padrão | Gradient Boosting | 5,595 | 9,974 | 0,043 | 0,000 |
| _perfil | mainback | Hiperparâmetros da busca | Random Forest | 5,743 | 9,345 | 0,174 | +0,147 |
| _perfil | mainback | Hiperparâmetros da busca | Gradient Boosting | 6,390 | 9,819 | 0,096 | +0,795 |
| _perfil | mainback | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 5,550 | 9,467 | 0,150 | -0,045 |
| _perfil | mainback | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 5,531 | 9,626 | 0,117 | -0,065 |
| _perfil | mainback | **Mesclagem, peso por área** | Random Forest e Gradient Boosting | 5,530 | 9,675 | 0,106 | -0,065 |
| _perfil | mainback | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 5,743 | 9,345 | 0,174 | +0,147 |
| _perfil | oven_hmi | **Padrão** | Random Forest | 2,367 | 4,072 | -0,401 | 0,000 |
| _perfil | oven_hmi | Padrão | Gradient Boosting | 2,519 | 4,431 | -0,657 | +0,152 |
| _perfil | oven_hmi | Hiperparâmetros da busca | Random Forest | 2,367 | 4,072 | -0,401 | 0,000 |
| _perfil | oven_hmi | Hiperparâmetros da busca | Gradient Boosting | 2,688 | 4,495 | -0,707 | +0,321 |
| _perfil | oven_hmi | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 2,407 | 4,230 | -0,511 | +0,040 |
| _perfil | oven_hmi | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 2,446 | 4,306 | -0,565 | +0,079 |
| _perfil | oven_hmi | Mesclagem, peso por área | Random Forest e Gradient Boosting | 2,367 | 4,072 | -0,401 | 0,000 |
| _perfil | oven_hmi | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 2,367 | 4,072 | -0,401 | 0,000 |
| _13cat | coil_temps | Padrão | Random Forest | 12,254 | 17,449 | 0,679 | 0,000 |
| _13cat | coil_temps | Padrão | Gradient Boosting | 12,846 | 18,298 | 0,663 | +0,592 |
| _13cat | coil_temps | Hiperparâmetros da busca | Random Forest | 12,254 | 17,449 | 0,679 | 0,000 |
| _13cat | coil_temps | Hiperparâmetros da busca | Gradient Boosting | 13,206 | 18,424 | 0,673 | +0,953 |
| _13cat | coil_temps | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 11,993 | 17,284 | 0,688 | -0,260 |
| _13cat | coil_temps | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 12,192 | 17,558 | 0,682 | -0,062 |
| _13cat | coil_temps | **Mesclagem, peso por área** | Random Forest e Gradient Boosting | 11,987 | 17,245 | 0,689 | -0,267 |
| _13cat | coil_temps | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 12,095 | 17,221 | 0,688 | -0,159 |
| _13cat | ct_knobs | **Padrão** | Random Forest | 2,960 | 4,599 | 0,116 | 0,000 |
| _13cat | ct_knobs | Padrão | Gradient Boosting | 3,165 | 5,002 | -0,062 | +0,205 |
| _13cat | ct_knobs | Hiperparâmetros da busca | Random Forest | 2,960 | 4,599 | 0,116 | 0,000 |
| _13cat | ct_knobs | Hiperparâmetros da busca | Gradient Boosting | 3,203 | 5,190 | -0,129 | +0,243 |
| _13cat | ct_knobs | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 3,031 | 4,767 | 0,043 | +0,071 |
| _13cat | ct_knobs | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 3,076 | 4,854 | 0,004 | +0,116 |
| _13cat | ct_knobs | Mesclagem, peso por área | Random Forest e Gradient Boosting | 2,960 | 4,599 | 0,116 | 0,000 |
| _13cat | ct_knobs | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 2,960 | 4,599 | 0,116 | 0,000 |
| _13cat | ipc_comp | Padrão | Random Forest | 8,594 | 11,852 | -0,140 | +0,570 |
| _13cat | ipc_comp | Padrão | Gradient Boosting | 8,024 | 11,560 | -0,280 | 0,000 |
| _13cat | ipc_comp | Hiperparâmetros da busca | Random Forest | 8,594 | 11,852 | -0,140 | +0,570 |
| _13cat | ipc_comp | **Hiperparâmetros da busca** | Gradient Boosting | 7,832 | 10,598 | 0,063 | -0,192 |
| _13cat | ipc_comp | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 8,229 | 11,595 | -0,185 | +0,205 |
| _13cat | ipc_comp | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 8,126 | 11,554 | -0,217 | +0,102 |
| _13cat | ipc_comp | Mesclagem, peso por área | Random Forest e Gradient Boosting | 8,024 | 11,560 | -0,280 | 0,000 |
| _13cat | ipc_comp | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 7,832 | 10,598 | 0,063 | -0,192 |
| _13cat | ipc_cooling | Padrão | Random Forest | 4,045 | 6,486 | 0,061 | +0,261 |
| _13cat | ipc_cooling | Padrão | Gradient Boosting | 3,784 | 6,232 | 0,070 | 0,000 |
| _13cat | ipc_cooling | Hiperparâmetros da busca | Random Forest | 4,045 | 6,486 | 0,061 | +0,261 |
| _13cat | ipc_cooling | Hiperparâmetros da busca | Gradient Boosting | 4,214 | 6,718 | -0,023 | +0,430 |
| _13cat | ipc_cooling | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 3,863 | 6,250 | 0,099 | +0,079 |
| _13cat | ipc_cooling | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 3,803 | 6,216 | 0,095 | +0,019 |
| _13cat | ipc_cooling | **Mesclagem, peso por área** | Random Forest e Gradient Boosting | 3,780 | 6,218 | 0,081 | -0,004 |
| _13cat | ipc_cooling | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 4,044 | 6,483 | 0,061 | +0,260 |
| _13cat | main_vent_sys | **Padrão** | Random Forest | 4,147 | 6,520 | 0,306 | 0,000 |
| _13cat | main_vent_sys | Padrão | Gradient Boosting | 4,225 | 7,056 | 0,166 | +0,078 |
| _13cat | main_vent_sys | Hiperparâmetros da busca | Random Forest | 4,147 | 6,520 | 0,306 | 0,000 |
| _13cat | main_vent_sys | Hiperparâmetros da busca | Gradient Boosting | 4,561 | 7,270 | 0,152 | +0,414 |
| _13cat | main_vent_sys | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 4,172 | 6,740 | 0,248 | +0,025 |
| _13cat | main_vent_sys | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 4,189 | 6,855 | 0,218 | +0,042 |
| _13cat | main_vent_sys | Mesclagem, peso por área | Random Forest e Gradient Boosting | 4,147 | 6,520 | 0,306 | 0,000 |
| _13cat | main_vent_sys | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 4,147 | 6,520 | 0,306 | 0,000 |
| _13cat | mainback | Padrão | Random Forest | 5,811 | 9,362 | 0,167 | +0,114 |
| _13cat | mainback | Padrão | Gradient Boosting | 5,696 | 10,048 | 0,043 | 0,000 |
| _13cat | mainback | Hiperparâmetros da busca | Random Forest | 5,811 | 9,362 | 0,167 | +0,114 |
| _13cat | mainback | Hiperparâmetros da busca | Gradient Boosting | 6,420 | 9,862 | 0,080 | +0,724 |
| _13cat | mainback | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 5,678 | 9,547 | 0,138 | -0,019 |
| _13cat | mainback | **Mesclagem, peso global 0,30** | Random Forest e Gradient Boosting | 5,659 | 9,711 | 0,108 | -0,037 |
| _13cat | mainback | Mesclagem, peso por área | Random Forest e Gradient Boosting | 5,659 | 9,711 | 0,108 | -0,037 |
| _13cat | mainback | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 5,811 | 9,362 | 0,167 | +0,114 |
| _13cat | oven_hmi | **Padrão** | Random Forest | 2,514 | 4,175 | -0,472 | 0,000 |
| _13cat | oven_hmi | Padrão | Gradient Boosting | 2,673 | 4,548 | -0,745 | +0,159 |
| _13cat | oven_hmi | Hiperparâmetros da busca | Random Forest | 2,514 | 4,175 | -0,472 | 0,000 |
| _13cat | oven_hmi | Hiperparâmetros da busca | Gradient Boosting | 2,859 | 4,637 | -0,815 | +0,345 |
| _13cat | oven_hmi | Mesclagem, peso 0,5 | Random Forest e Gradient Boosting | 2,564 | 4,343 | -0,591 | +0,050 |
| _13cat | oven_hmi | Mesclagem, peso global 0,30 | Random Forest e Gradient Boosting | 2,597 | 4,421 | -0,649 | +0,083 |
| _13cat | oven_hmi | Mesclagem, peso por área | Random Forest e Gradient Boosting | 2,514 | 4,175 | -0,472 | 0,000 |
| _13cat | oven_hmi | Mesclagem, peso por área, hiperparâmetros da busca | Random Forest e Gradient Boosting | 2,514 | 4,175 | -0,472 | 0,000 |

## Leitura dos resultados

Nenhuma configuração supera o baseline por 0,5 °C ou mais em qualquer área. O maior ganho é de 0,267 °C, em coil_temps no `_13cat`, com a mesclagem de peso por área. Pelo critério adotado na comparação das mesclagens, todos os ganhos da tabela são empates. As diferenças de 0,5 °C ou mais são todas pioras, e a maior delas é de 1,272 °C, com o Gradient Boosting da busca em coil_temps no `_perfil`.

O Random Forest com os hiperparâmetros da busca repete exatamente o Random Forest padrão, porque a busca manteve a configuração de partida em todas as áreas. Já o Gradient Boosting com os hiperparâmetros da busca ficou pior que o Gradient Boosting padrão em treze das catorze combinações de sufixo e área. A única melhora foi em ipc_comp no `_13cat`, de 0,192 °C.

O Random Forest padrão e a mesclagem com peso por área aparecem cinco vezes cada como menor MAE. Em nove das catorze combinações, a configuração vencedora fica a menos de 0,01 °C do baseline. Em duas, ambas em mainback, a diferença fica entre 0,01 °C e 0,1 °C. Só três passam de 0,1 °C: coil_temps nos dois sufixos, com mesclagem, e ipc_comp no `_13cat`, com o Gradient Boosting da busca.

Os resultados das mesclagens com peso escolhido na validação são otimistas, porque o peso foi escolhido e avaliado nas mesmas dezessete dobras. Em coil_temps, a verificação dobra a dobra já registrada mostrou que o ganho da mesclagem com peso por área vem de poucas dobras.

Com esses números, o melhor dos dois modelos individuais com configuração padrão continua sendo a referência mais simples em cada área: o Random Forest em coil_temps, ct_knobs, main_vent_sys e oven_hmi, e o Gradient Boosting em ipc_comp, ipc_cooling e mainback.
