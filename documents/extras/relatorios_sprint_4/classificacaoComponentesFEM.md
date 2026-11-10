# Classificação dos componentes instrumentados

Os 77 pontos instrumentados foram classificados segundo o fenômeno térmico que governa a temperatura de cada um. A classificação determina qual método de cálculo se aplica a cada ponto, qual informação precisa ser levantada e onde ela é obtida. Ela precede a decisão sobre o uso do método dos elementos finitos, uma vez que o método não é adequado a todas as classes.

## Classes adotadas

| Classe | Quantidade | O que governa a temperatura | O que precisa ser levantado |
|---|---:|---|---|
| Fonte eletronica | 36 | Dissipacao propria do componente | Potencia dissipada e resistencia termica de folha de dados |
| Ar | 13 | Escoamento e balanco de energia no ar | Vazao, propriedades do ar, calor recolhido no trajeto |
| Solido passivo | 13 | Conducao a partir de fontes vizinhas | Material da peca e caminho de conducao ate a fonte |
| Enrolamento | 9 | Perda no cobre, e perda no nucleo quando houver | Corrente, resistencia do enrolamento, potencia aplicada |
| Metal sob a bobina | 4 | Conducao, possivelmente somada a aquecimento por inducao | Liga do metal, espessura, e confirmacao sobre correntes induzidas |
| Cabo | 1 | Efeito Joule no condutor | Corrente, bitola, e classe termica da isolacao |
| Dissipador | 1 | Conducao no corpo somada a conveccao nas aletas | Geometria das aletas, liga, e vazao sobre elas |

## Consequência para o método de cálculo

Aos pontos da classe Ar não se aplica o método dos elementos finitos em sólido, uma vez que o termopar mede a temperatura do ar e não a de uma peça. A esses pontos aplica-se um balanço de energia sobre o escoamento, com as correlações de escoamento interno.

Aos pontos da classe Fonte eletrônica aplica-se, como primeiro recurso, a rede de resistências térmicas construída a partir das folhas de dados dos componentes, e não o método dos elementos finitos. A resistência entre junção e encapsulamento é informada pelo fabricante, e o limite do componente decorre dela. O método dos elementos finitos passa a ser necessário apenas quando o espalhamento do calor pela placa precisar ser resolvido espacialmente.

Aos pontos das classes Sólido passivo, Dissipador e Metal sob a bobina aplica-se o método dos elementos finitos com proveito, uma vez que neles a condução no sólido é o fenômeno dominante e a geometria importa.

## Observação sobre as placas de alumínio

As quatro placas de alumínio foram classificadas em separado. Situadas sob as bobinas de indução, elas estão sujeitas a correntes induzidas, que constituem geração de calor no próprio corpo da placa, e não apenas condução a partir da bobina. A hipótese é compatível com duas observações já registradas: o erro elevado do modelo estatístico nessas colunas, e a diferença de comportamento entre a versão em alumínio e a versão em plástico do suporte, uma vez que o plástico não admite corrente induzida. A confirmação depende da parceira.

## Tabela por área

### Coil Temps

| Componente | Classe |
|---|---|
| Coil FR | Enrolamento |
| Coil FL | Enrolamento |
| Coil RR | Enrolamento |
| Coil RL | Enrolamento |
| Aluminium Plate FR | Metal sob a bobina |
| Aluminium Plate FL | Metal sob a bobina |
| Aluminium Plate RR | Metal sob a bobina |
| Aluminium Plate RL | Metal sob a bobina |

### IPC Comp

| Componente | Classe |
|---|---|
| IPC Blower (Air Outlet Temp) | Ar |
| IPC Blower Housing | Solido passivo |
| Heat Sink (Point/Probe) | Dissipador |
| Bridge | Fonte eletronica |
| IGBT 1 | Fonte eletronica |
| IGBT 2 | Fonte eletronica |
| IGBT 3 | Fonte eletronica |
| IGBT 4 | Fonte eletronica |
| IGBT 5 | Fonte eletronica |
| IGBT 6 | Fonte eletronica |
| IGBT 7 | Fonte eletronica |
| IGBT 8 | Fonte eletronica |
| IGBT 9 | Fonte eletronica |
| IGBT 10 | Fonte eletronica |
| IGBT 11 | Fonte eletronica |
| IGBT 12 | Fonte eletronica |
| IGBT 13 | Fonte eletronica |
| IGBT 14 | Fonte eletronica |
| IGBT 15 | Fonte eletronica |
| IGBT 16 | Fonte eletronica |
| DCBUS Cap 1 | Fonte eletronica |
| DCBUS Cap 2 | Fonte eletronica |
| DCBUS Cap 3 | Fonte eletronica |
| DCBUS Cap 4 | Fonte eletronica |
| CMC 1 | Enrolamento |
| CMC 2 | Enrolamento |
| DMC | Enrolamento |
| Reso Cap 1 | Fonte eletronica |
| Reso Cap 2 | Fonte eletronica |
| Reso Cap 3 | Fonte eletronica |
| Reso Cap 4 | Fonte eletronica |
| Reso Cap 5 | Fonte eletronica |
| Reso Cap 6 | Fonte eletronica |
| Reso Cap 7 | Fonte eletronica |
| Reso Cap 8 | Fonte eletronica |
| Beatrice Micro | Fonte eletronica |
| Micro (Below Board) | Fonte eletronica |

### IPC Cooling

| Componente | Classe |
|---|---|
| IPC Vertical Duct Inlet (Bottom) | Ar |
| IPC Horizontal Duct Oulet (Inlet IPC Fan) | Ar |
| IPC Housing Surface | Solido passivo |
| IPC Housing Outlet | Ar |

### Main Vent Sys

| Componente | Classe |
|---|---|
| AC Blower Inlet Max | Ar |
| AC Blower Inlet Avg | Ar |
| AC Blower HES Connector | Fonte eletronica |
| AC Blower Windings | Enrolamento |
| AC Blower Housing | Solido passivo |
| Top Duct Inlet | Ar |
| Turbo Duct / AC Blower Outlet | Ar |

### Mainback

| Componente | Classe |
|---|---|
| Door Lock Motor Ambient 1/2" Below | Ar |
| Door Lock Microswitch Body | Solido passivo |
| Convect Motor Winding | Enrolamento |
| Hot Surface Indicator Body | Solido passivo |
| Power On Indicator Body | Solido passivo |
| Oven RTD Connector Body | Solido passivo |
| Storage Drawer (Metal Above) | Solido passivo |
| L2, Wire, Power Cord | Cabo |
| Ambient Below Terminal Block | Ar |
| ACU Ambient (Hill Only) Top | Ar |
| ACU K8 Housing / Double Line Break | Fonte eletronica |

### Oven HMI

| Componente | Classe |
|---|---|
| A33/Bellatrix Thermistor | Solido passivo |
| A33/Bellatrix UI Wifi | Fonte eletronica |
| A33/Bellatrix Microchip | Fonte eletronica |
| A33/Bellatrix UI LCD Screen | Fonte eletronica |

### CT Knobs

| Componente | Classe |
|---|---|
| Ambient Between Left Encoders | Ar |
| Left Encoder | Solido passivo |
| Left Center Encoder | Solido passivo |
| Ambient Between Right Encoders | Ar |
| Right Center Encoder | Solido passivo |
| Right Encoder | Solido passivo |

## Informações pendentes

A classificação evidencia quais informações são necessárias e ainda não estão disponíveis. São quatro, em ordem de impacto.

A primeira é a potência dissipada por componente. A coluna de perdas registra rótulos de perfil, e não valores em watts, de modo que a grandeza que alimenta qualquer cálculo térmico não está na base. Alguns rótulos trazem uma sequência de quatro números, presumivelmente a potência aplicada a cada bobina, o que sustenta a interpretação mas não cobre os demais rótulos.

A segunda é a posição de cada termopar, sem a qual o resultado do cálculo não pode ser confrontado com a medição.

A terceira são os códigos dos componentes eletrônicos, dos quais decorrem as resistências térmicas e os limites de junção.

A quarta é a confirmação, para cada ponto rotulado como ambiente, de que a medição é de fato do ar e não da superfície próxima.
