# Relatório de Mudanças Pós-Revisão — Notebooks de Preparação e Tratamento

**Projeto:** Whirlpool Thermal Predictor
**Escopo:** alterações feitas nos notebooks após a rodada de revisão do grupo

Este relatório documenta o que mudou nos notebooks depois da revisão, o motivo de cada mudança e por que passamos a ter **dois notebooks de tratamento** em vez de um.

---

## 1. Visão geral da pipeline atual

A preparação dos dados ficou organizada em duas etapas:

1. **`preparacao_datasets.ipynb`** — lê o dataset original, padroniza e divide em 7 datasets (um por área do fogão).
2. **`tratamento_datasets_13cat.ipynb`** e **`tratamento_datasets_perfil.ipynb`** — dois notebooks que aplicam os mesmos tratamentos, diferindo **apenas** no tratamento da coluna `losses`.

O tratamento dos valores nulos **não faz parte destes notebooks** e será conduzido por outro integrante do grupo (ver seção 5).

---

## 2. Mudanças no notebook de preparação (`preparacao_datasets`)

**Unificação de `housing` movida para cá.** A unificação de `"open - updated"` com `"open"` passou a ser feita no notebook de preparação, e não mais no de tratamento. O motivo é conceitual: trata-se de uma **padronização de categoria** (dois rótulos para a mesma configuração física), então pertence à mesma etapa que unifica `To Front`/`To front`. A justificativa da unificação continua a mesma: a diferença de temperatura entre os dois rótulos inverte de sinal conforme o `run_case`, o que indica que não são configurações fisicamente distintas.

**Melhorias de robustez.** O notebook ganhou um diagnóstico da conversão numérica (quantas células não puderam virar número) e passou a preservar componentes sem medição como coluna nula (`dropna=False`), em vez de deixá-los sumir silenciosamente. Essas mudanças não alteram os dados — apenas tornam o processo mais transparente.

---

## 3. Mudanças no tratamento dos dados

### 3.1. IGBTs e Reso Caps mantidos individualmente

Uma versão anterior agregava os 16 IGBTs em uma coluna de média e os 8 Reso Caps em outra. **Essa agregação foi revertida.** Agora cada IGBT (1 a 16) e cada Reso Cap (1 a 8) permanece como uma coluna própria.

O motivo é de segurança do modelo: a temperatura entre o IGBT mais quente e o mais frio no mesmo ensaio chega a variar 28 °C. Contra o limite de segurança de 110 °C, existem ensaios em que um IGBT individual atinge o limite mas a média do grupo não acusa. Como o objetivo do projeto é justamente alertar quando um componente se aproxima do limite, usar a média **esconderia estouros reais**. Manter os componentes individuais preserva essa informação crítica.

### 3.2. Tratamento de `losses` — a origem dos dois notebooks

Ver seção 4, dedicada a este ponto.

### 3.3. Correções pontuais

- **One-Hot Encoding gera 0/1**, não `True`/`False` (foi adicionado `.astype(int)`). Versões recentes do pandas produzem booleano por padrão, o que não é adequado para o treino.
- **`run_idx` é removido** dos datasets finais, na etapa de one-hot. Antes ele era mantido "para retirar depois"; como o treino começará em breve e ele precisa sair de qualquer forma, é removido agora para evitar o risco de entrar como variável por engano.
- **Remoção de componentes sem medição** passou a ser dinâmica: qualquer coluna 100% nula é removida (dos datasets e da tabela de limites), em vez de listar componentes por nome.
- **Nomes das categorias preservados como no original.** Uma versão anterior traduzia nomes (`losses` → `perfil_perdas`, `no losses` → `nenhum`). Isso foi revertido — os nomes originais do dataset da Whirlpool são mantidos, apenas padronizados (minúsculas, espaços limpos), para não quebrar a rastreabilidade com a planilha original e o glossário.

---

## 4. Por que dois notebooks de tratamento

A coluna `losses` registra o perfil de perda térmica (em Watts) de cada ensaio. No dataset original ela tem 13 categorias distintas para apenas 56 ensaios, e há uma dúvida legítima sobre como tratá-la:

- **Manter as 13 categorias** preserva toda a informação, mas gera muitas colunas esparsas (várias categorias aparecem em 1 ou 2 ensaios só), o que aumenta o risco de o modelo "decorar" em vez de aprender.
- **Agrupar as categorias** reduz esse risco, mas descarta parte da granularidade.

Como não há uma resposta única e correta, e como essa é uma decisão que o professor vai querer avaliar, optamos por gerar **as duas versões** em notebooks separados, para comparar o desempenho de cada uma no treino:

**`tratamento_datasets_13cat.ipynb`** — mantém as 13 categorias originais de `losses`, com One-Hot Encoding em todas. Segue a orientação original do professor.

**`tratamento_datasets_perfil.ipynb`** — agrupa `losses` em 3 categorias pelo **perfil de perda** (`no losses`, `simone`, `miro`), preservando os nomes originais. A ordem de montagem (front/back) foi analisada e **não** foi incluída, porque seu efeito na temperatura não é consistente (o sinal inverte entre perfis e a amostra de "back" é muito pequena).

Os dois notebooks são **idênticos em todo o resto** — mesmos tratamentos, mesma estrutura. Só a seção 5 (losses) difere. Cada um gera seu próprio conjunto de arquivos (sufixo `_13cat` ou `_perfil`), então podem coexistir na mesma pasta sem conflito, e o grupo pode rodar os dois e comparar.

**Nota sobre `losses` sem registro.** Em ambas as versões, um ensaio sem registro de losses fica com todas as colunas de losses em 0. Isso é mantido **distinto** de `no losses` (perda zero, caso do modo Pyro), que tem sua própria coluna. São 6 ensaios do modo Broil sem registro — "não houve perda" e "perda não registrada" são fisicamente diferentes e não são tratados como sinônimos.

---

## 5. O que NÃO foi alterado: tratamento dos nulos

**O tratamento dos valores nulos não foi tocado nesta revisão e não faz parte destes notebooks.** Essa etapa será conduzida por outro integrante do grupo, em conjunto com o professor.

O que se sabe até aqui, e que serve de ponto de partida para quem for tratá-los: todos os nulos restantes estão nas **colunas de temperatura** (as variáveis-alvo), não nas features de entrada. Isso torna a decisão de como tratá-los mais delicada do que uma imputação comum, porque preencher a variável-alvo com média ou mediana afeta tanto o treino quanto a avaliação do modelo. Mas a decisão final fica a cargo do responsável por essa etapa.

---

## 6. Resumo das saídas

Após rodar o notebook de preparação e um dos notebooks de tratamento, a pasta terá:

| Arquivo | Origem | Conteúdo |
|---|---|---|
| `dataset_<area>.csv` (7) | preparação | padronizados e divididos, antes do tratamento |
| `dataset_<area>_13cat.csv` (7) | tratamento 13cat | tratados, com 13 categorias de losses |
| `dataset_<area>_perfil.csv` (7) | tratamento perfil | tratados, com losses agrupado por perfil |
| `limites_ativos.csv` | preparação + tratamento | tabela de referência dos limites |

Os IGBTs (1–16) e Reso Caps (1–8) aparecem como colunas individuais em ambas as versões tratadas — não foram agregados.
