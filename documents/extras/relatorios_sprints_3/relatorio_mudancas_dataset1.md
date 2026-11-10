# Relatório de Mudanças — Do Dataset Único para os 7 Datasets Térmicos

**Projeto:** Thermal Predictor — Whirlpool
**Fonte de dados:** `dados_whirlpool.xlsx` (aba "Option 3 - First cases HE")
**Comparação entre:** os notebooks já desenvolvidos (`leitura`, `normalizacao`, `graficos`, `analise_escalonamento`, `hipoteses`) e o novo planejamento definido pelo professor de programação

---

## 1. Resumo da mudança

O trabalho já feito trata o problema como **um único modelo**, treinado sobre uma base longa que reúne as sete áreas térmicas do fogão de uma vez, com `Key Area` como mais uma feature categórica. O novo planejamento propõe o oposto: **sete modelos independentes**, um por área, cada um enxergando apenas os componentes daquela região.

Essa mudança de arquitetura arrasta consigo decisões que já estavam consolidadas nos notebooks 1 e 2 — algumas precisam ser refeitas, outras continuam válidas exatamente como estão. É esse o foco deste relatório.

---

## 2. Como estava (notebooks `leitura` e `normalizacao`)

| Etapa | Decisão tomada |
|---|---|
| Estrutura | **1 dataset único**, formato longo (uma linha = um termopar em um run), todas as 7 áreas misturadas |
| `Reason` | **Mantida** e codificada por One-Hot Encoding, junto com as demais colunas de configuração do ensaio |
| `TC Number` | Reconstruído via `factorize` sobre `TC Name` (a coluna original estava quebrada, cheia de `#REF!`) e depois excluído de X por ser redundante ao `TC Name` já codificado |
| `Key Area` | **Mantida como feature**, codificada por One-Hot Encoding |
| `Active Limit` | **Mantido como feature**, tratado como variável categórica (não numérica) e codificado por One-Hot Encoding. Nulos preenchidos com 0 e sinalizados por uma coluna auxiliar `Possui Active Limit` |
| `Temperature` (alvo) | **Normalizada** com `StandardScaler` (padronização z-score) |
| Sensor `Oven RTD Connector Body` | **Descartado da base inteira** — todas as leituras estavam acima do limite de segurança (mínimo de 198,76 °C contra limite de 150 °C), padrão consistente com falha de calibração, confirmado com a parceira |
| Outliers | Detectados por IQR, agrupando por `TC Name` **+** `Run Case` (não só por sensor, para não misturar Pyro com Broil na mesma distribuição) |
| Margem de Segurança | Calculada como `Active Limit - Temperature`, mantida só para análise (fora de X, por vazamento de dados) |
| Correção de leitura | Tratamento das 8 células gravadas em formato de percentual na coluna "Run 5 - Broil Qualitative" (bug do Excel, não do CSV) |

Essa base alimentou inclusive as três hipóteses testadas no notebook 4 — a mais relevante para o novo planejamento é a **Hipótese 1**: a `Key Area` sozinha já explica boa parte da variância da temperatura, o que é justamente o motivo estatístico que sustenta a divisão em 7 modelos.

---

## 3. Como fica agora (feedback do professor)

| Etapa | Nova decisão |
|---|---|
| Estrutura | **7 datasets**, um por `Key Area`, cada um só com os componentes daquela região |
| `Reason` | **Descartada** — não impacta a predição da temperatura |
| `TC Number` | **Descartada** — inútil para o modelo |
| `Key Area` | **Descartada de dentro de cada arquivo** — ela deixa de ser feature porque já é a própria chave que separa os 7 modelos |
| `Active Limit` | **Descartado do treino**, mas preservado como tabela de referência à parte, para comparação pós-predição (zona segura / limite / excedido) |
| `Temperature` (alvo) | **Não normalizada** — permanece em °C |

---

## 4. O que muda de fato — e o que fica valendo

**Muda:**

- **`Key Area` sai da lista de features e vira critério de separação dos arquivos.** Antes ela era uma coluna codificada dentro de X; agora ela é o motivo de existirem 7 X's diferentes.
- **`Reason` deixa de ser codificada.** No notebook 2 ela entrava no One-Hot Encoding junto com `Blower Direction`, `Housing` etc. Isso não acontece mais.
- **`Active Limit` sai de X.** Antes era categórico e codificado (inclusive gerando a flag `Possui Active Limit`); agora vira só uma tabela de consulta pós-predição, papel que a coluna `Margem de Segurança` já cumpria na análise, mas nunca em X.
- **A normalização da `Temperature` é revertida.** O notebook 2 padronizava com `StandardScaler`; a decisão agora é manter em °C. Isso é coerente com o motivo original documentado no próprio notebook — a padronização servia para a variável entrar em pé de igualdade com outras numéricas, mas ela é a única variável numérica da base, então o argumento que justificava normalizar deixa de existir.

**Não muda (e vale reaproveitar tal como está):**

- A reestruturação da matriz transposta para o formato longo (notebook `leitura`, células 5–7).
- A correção do bug de percentual na coluna "Run 5 - Broil Qualitative".
- A reconstrução do `TC Number` **não é mais necessária**, já que a coluna será descartada — mas o `TC Name` continua essencial e precisa ser preservado dentro de cada um dos 7 arquivos, exatamente como está.
- A padronização de categorias (espaços, "Broil Case 2" → "Broil C2" etc.).
- O tratamento de nulos categóricos com rótulo explícito.
- A tabela de `Active Limit` por componente, hoje calculada dentro de `df_limpo`, pode ser exportada como o arquivo de referência separado que o novo plano pede — o dado já existe, só muda o papel dela na pipeline.

---

## 5. Pontos que precisam de decisão antes de gerar os 7 datasets finais

Os notebooks já resolveram três problemas que **não estavam no escopo do feedback do professor**, mas que continuam existindo nos dados e precisam de uma decisão para cada um dos 7 modelos:

1. **`Oven RTD Connector Body` (área Mainback).** Foi excluído da base porque todas as leituras superam o limite de segurança, indício de sensor com defeito. Essa exclusão precisa se repetir no dataset da área Mainback — se não for reaplicada, o modelo daquela área vai treinar sobre uma leitura fisicamente inválida.
2. **Outliers.** A detecção por IQR agrupando `TC Name` + `Run Case` foi pensada para uma base única; com os dados já divididos por área, o agrupamento por `Run Case` continua fazendo sentido dentro de cada arquivo, mas precisa ser reaplicado modelo a modelo.
3. **Sensores sem `Active Limit`.** A lista `sem_limite` (10 componentes de monitoramento, sem limite de segurança real) está distribuída por mais de uma área — vale conferir se a tabela de referência final marca corretamente todos esses casos em cada um dos 7 arquivos.

Nenhum desses três pontos contradiz o feedback recebido; eles só não foram mencionados nele porque já estavam resolvidos na etapa anterior do projeto. Vale confirmar com o professor se a intenção é manter essas correções ou reavaliá-las agora que a base está segmentada.

---

## 6. Esclarecimentos adicionais

### 6.1. `Losses` — o que ela é e por que preocupa

`Losses` é uma coluna categórica (não numérica) que descreve o perfil de perda térmica usado no ensaio. Ela tem 13 valores distintos em apenas 56 runs, e boa parte deles está fortemente amarrada ao `Run Case`: todo run em modo `pyro` tem `losses = "no losses"`, sem exceção; todo run em `broil c1` tem `losses = "c1 simone..."`, também sem exceção. Só dentro de `broil c2` e `broil qualitative` a coluna varia de fato e adiciona informação nova (perfis "Simone" vs. "Miro"). Ao mesmo tempo, o efeito na temperatura é real — cerca de 18 °C de diferença entre `"no losses"` e `"simone losses"` no IPC Comp. É uma feature valiosa, mas de alta cardinalidade para o tamanho da base: precisa de uma decisão de tratamento antes do treino (simplificar categorias, aplicar One-Hot só dentro dos `run_case` onde ela varia, ou outra abordagem), sob risco de gerar colunas esparsas e favorecer overfitting.

### 6.2. Agrupamento por `Run Case` para outliers

O método IQR (intervalo interquartil) marca como outlier qualquer valor fora da faixa `[Q1 − 1,5×IQR, Q3 + 1,5×IQR]` calculada sobre uma distribuição. O que muda com o agrupamento é *qual* distribuição serve de referência.

Teste feito sobre o componente "Bridge" (IPC Comp), com os 56 valores reais:

| Método | Faixa aceita | Outliers detectados |
|---|---|---|
| Sem agrupar (56 valores juntos, todos os `run_case` misturados) | 46,5 – 123,5 °C | Nenhum |
| Agrupando por `run_case` — grupo pyro (8 valores) | 31,1 – 105,7 °C | **106,27 °C** |

Sem separar por `run_case`, a distribuição do Bridge fica artificialmente larga (mistura leituras frias de pyro com leituras quentes de broil qualitative), e um valor de 106,27 °C no grupo pyro — quase o dobro das outras leituras de pyro daquele mesmo componente — passa despercebido. Ao isolar só o grupo pyro, o IQR calculado sobre aquelas 8 leituras identifica corretamente esse valor como fora do padrão.

Nos 7 novos datasets, esse agrupamento continua necessário, mas simplificado: como cada arquivo já separa por área, e o formato wide já separa por componente (uma coluna por sensor), o que resta agrupar é só por `Run Case`. No formato longo, isso gera uma coluna booleana adicional (`outlier`) ao lado de `temperatura_c`; no formato wide, o cálculo roda coluna a coluna, comparando os valores de cada componente dentro de cada `run_case`.

### 6.3. `Dedicated IPC/CKTP Outlet`

Confirmado: sem nenhuma leitura de temperatura em nenhum dos 56 runs, este componente já não aparece em nenhum dos 7 datasets de treino. A única ação pendente é remover a linha correspondente de `limites_ativos.csv`, para que a tabela de referência não mantenha um componente que nunca vai receber uma predição.

---

## 7. Pendências antes de iniciar o treino

Lista consolidada do que falta resolver em cada um dos 7 datasets antes de rodar qualquer algoritmo:

1. **Excluir `Oven RTD Connector Body` do dataset Mainback.** Todas as 53 leituras (198,8 – 273,6 °C) estão acima do limite de 150 °C, padrão consistente com falha de calibração já identificada no notebook original. Aplicar tanto no formato longo quanto no wide.
2. **Decidir o tratamento de `Losses`.** Alta cardinalidade (13 categorias / 56 runs) e forte sobreposição com `Run Case` na maior parte dos casos. Definir se será simplificada, restrita aos `run_case` onde varia, ou tratada de outra forma antes do One-Hot Encoding.
3. **Reaplicar o agrupamento de outliers por `Run Case`** em cada um dos 7 datasets (por componente, no formato wide), sinalizando os valores fora da faixa IQR local — sem remover automaticamente, apenas marcar para revisão, como já era feito no notebook original.
4. **Preencher os nulos categóricos** (principalmente em `Losses`) com um rótulo explícito, do mesmo modo que o notebook 1 fazia com `"Não Informado"`, para não travar a codificação categórica.
5. **Remover `Dedicated IPC/CKTP Outlet` de `limites_ativos.csv`**, já que não há nenhuma leitura correspondente em nenhum dos datasets de treino.
6. **Conferir consistência dos limites (`Active Limit`) entre os 7 datasets e a tabela de referência**: nomes de componentes batendo, um único limite por componente e sem contradições — repetir a checagem que o notebook 1 já fazia, agora dentro de cada área separada.
7. **Verificar se `Housing = "open - updated"` é uma categoria realmente distinta de `"open"`**, ou se é uma variação de grafia que deveria ser unificada — ainda não confirmado com a equipe ou com a parceira.
8. **Definir e aplicar o split de treino/teste — feito depois da separação em 7, dentro de cada área:**
   - No **formato longo**: usar `GroupShuffleSplit` ou `GroupKFold` agrupando por `run_idx`, para impedir que o mesmo run apareça simultaneamente no treino e no teste.
   - No **formato wide**: o vazamento por run já não existe (cada linha já é um run único), mas a base fica pequena (33 combinações de design distintas em até 56 runs). Preferir validação cruzada com vários folds (`KFold`, k=5 ou k=7) a um único split fixo de treino/teste, para uma estimativa de erro mais estável.
9. **(Adiado por design, sem ação agora)** Uso do `Active Limit` para classificar predições em zona segura / no limite / excedida — só entra depois de existir um modelo funcional para cada área.
