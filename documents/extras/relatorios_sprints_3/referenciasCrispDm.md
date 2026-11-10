# Levantamento bibliográfico — CRISP-DM

Documento de apoio à redação da Seção 3 (Metodologia) do WAD. Reúne as referências
selecionadas sobre o CRISP-DM, com todos os campos necessários à citação em norma ABNT,
e registra o critério que orientou a seleção.

Este arquivo é insumo de trabalho. As entradas consolidadas são transcritas para a
Seção 6 do `documentacao.md` no card de integração.

## Critério de seleção

O conjunto foi montado para cobrir três naturezas distintas, de modo que a Seção 3 possa
apoiar-se tanto na definição de origem do framework quanto em avaliação posterior do seu
uso:

1. **Fonte fundacional** — o guia de referência produzido pelo consórcio que criou o
   framework, e a publicação acadêmica que o apresentou à comunidade. Sustentam a
   descrição das seis etapas.
2. **Obra de referência em mineração de dados** — livro que situa o CRISP-DM no contexto
   mais amplo do processo de análise de dados. Sustenta a justificativa da escolha
   metodológica.
3. **Revisão recente** — trabalhos publicados duas décadas após a proposta original, que
   avaliam criticamente o modelo e levantam como ele vem sendo aplicado. Sustentam o
   registro das limitações e da atualidade do framework.

Referências que não puderam ter todos os campos confirmados na fonte foram descartadas,
conforme registrado ao final.

## Convenção de registro

Cada entrada traz: autores, título, veículo, volume, número, páginas, ano, identificador
persistente (DOI ou URL) e data de acesso. Obras impressas não recebem link, conforme o
padrão já adotado no primeiro bloco da Seção 6 do WAD.

## 1. Fontes fundacionais

### 1.1 Guia de referência do consórcio

**Entrada ABNT**

CHAPMAN, Pete; CLINTON, Julian; KERBER, Randy; KHABAZA, Thomas; REINARTZ, Thomas; SHEARER, Colin; WIRTH, Rüdiger. CRISP-DM 1.0: step-by-step data mining guide. [S. l.]: CRISP-DM Consortium, 2000. Disponível em: https://public.dhe.ibm.com/software/analytics/spss/documentation/modeler/14.2/es/CRISP-DM.pdf. Acesso em: 1 set. 2026.

**Campos conferidos**

| Campo | Valor |
|---|---|
| Autores | Sete, com afiliações NCR, SPSS e DaimlerChrysler |
| Título | CRISP-DM 1.0: step-by-step data mining guide |
| Responsabilidade | CRISP-DM Consortium (NCR Systems Engineering Copenhagen, DaimlerChrysler AG, SPSS Inc., OHRA Verzekeringen en Bank Groep B.V.) |
| Ano | 2000 |
| Extensão | 65 páginas |

**Uso previsto na Seção 3.** É a fonte da definição das seis etapas e da estrutura em quatro
níveis do framework. Deve sustentar o parágrafo geral de cada etapa.

**Observação.** A obra é frequentemente citada como se a editora fosse "SPSS Inc.". A
responsabilidade correta é do consórcio, do qual a SPSS é apenas um dos quatro membros.

### 1.2 Publicação acadêmica de apresentação

**Entrada ABNT**

WIRTH, Rüdiger; HIPP, Jochen. CRISP-DM: towards a standard process model for data mining. In: INTERNATIONAL CONFERENCE ON THE PRACTICAL APPLICATION OF KNOWLEDGE DISCOVERY AND DATA MINING, 4., 2000, Manchester. Proceedings [...]. Manchester: Practical Application Company, 2000. p. 29-39.

**Campos conferidos**

| Campo | Valor |
|---|---|
| Autores | Rüdiger Wirth (DaimlerChrysler Research & Technology) e Jochen Hipp (Universität Tübingen) |
| Título | CRISP-DM: towards a standard process model for data mining |
| Evento | 4th International Conference on the Practical Application of Knowledge Discovery and Data Mining |
| Ano | 2000 |
| Páginas | 29-39 |

**Uso previsto na Seção 3.** Sustenta o caráter iterativo do modelo e a distinção entre
modelo genérico e modelo especializado, além do relato de aplicação industrial que os
autores conduziram na DaimlerChrysler.

**Ressalva de conferência.** Título, autores e afiliações foram conferidos no PDF do artigo.
O intervalo de páginas 29-39 provém de citações secundárias, pois o PDF em circulação não
traz numeração de anais. Tratada como obra impressa, sem link, o que dispensa data de acesso.

### 1.3 Modelo de processo alternativo, para efeito de comparação

**Entrada ABNT**

FAYYAD, Usama; PIATETSKY-SHAPIRO, Gregory; SMYTH, Padhraic. From data mining to knowledge discovery in databases. AI Magazine, v. 17, n. 3, p. 37-54, 1996. Disponível em: https://doi.org/10.1609/aimag.v17i3.1230. Acesso em: 9 set. 2026.

**Campos conferidos**

| Campo | Valor |
|---|---|
| Autores | Usama Fayyad; Gregory Piatetsky-Shapiro; Padhraic Smyth |
| Periódico | AI Magazine |
| Volume / número / páginas | 17 / 3 / 37-54 |
| Ano | 1996 |
| DOI | 10.1609/aimag.v17i3.1230 |

**Uso previsto na Seção 3.** Referência do processo de descoberta de conhecimento em bases
de dados (KDD), usada como termo de comparação para justificar a adoção do CRISP-DM. Não
sustenta a descrição das etapas do framework adotado, e sim o contraste que motiva a escolha.

**Observação sobre o SEMMA.** O SEMMA é a outra alternativa recorrentemente citada em
comparações entre modelos de processo. Não foi possível localizar fonte primária citável que
o descreva, por se tratar de metodologia associada a fornecedor específico e sem publicação
de referência equivalente às demais deste levantamento. Por essa razão, o SEMMA é apenas
nomeado na Seção 3, sem caracterização atribuída a fonte, e a comparação substantiva é
conduzida com o KDD.

## 2. Obra de referência em mineração de dados

**Entrada ABNT**

PROVOST, Foster; FAWCETT, Tom. Data science for business: what you need to know about data mining and data-analytic thinking. Sebastopol: O'Reilly Media, 2013.

**Campos conferidos**

| Campo | Valor |
|---|---|
| Autores | Foster Provost; Tom Fawcett |
| Editora | O'Reilly Media, Sebastopol |
| Ano | 2013 |
| ISBN | 978-1-4493-6132-7 |

**Uso previsto na Seção 3.** Situa o CRISP-DM dentro do processo de análise de dados
orientado a negócio e sustenta a justificativa da escolha metodológica, em especial o
argumento de que a etapa de entendimento do negócio antecede e condiciona as demais.

**Observação.** Obra impressa, sem link, conforme o padrão da Seção 6.

## 3. Revisões recentes

### 3.1 Avaliação crítica após duas décadas

**Entrada ABNT**

MARTÍNEZ-PLUMED, Fernando; CONTRERAS-OCHANDO, Lidia; FERRI, César; HERNÁNDEZ-ORALLO, José; KULL, Meelis; LACHICHE, Nicolas; RAMÍREZ-QUINTANA, María José; FLACH, Peter. CRISP-DM twenty years later: from data mining processes to data science trajectories. IEEE Transactions on Knowledge and Data Engineering, v. 33, n. 8, p. 3048-3061, 2021. Disponível em: https://doi.org/10.1109/TKDE.2019.2962680. Acesso em: 1 set. 2026.

**Campos conferidos**

| Campo | Valor |
|---|---|
| Autores | Oito, na ordem registrada acima |
| Periódico | IEEE Transactions on Knowledge and Data Engineering |
| Volume / número / páginas | 33 / 8 / 3048-3061 |
| Ano | 2021 |
| DOI | 10.1109/TKDE.2019.2962680 |

**Uso previsto na Seção 3.** Sustenta o registro de que o framework, embora consolidado,
recebeu crítica quanto à sua rigidez sequencial, e que projetos reais percorrem trajetórias
menos lineares do que o diagrama sugere. Útil para justificar a natureza iterativa adotada
no projeto sem apresentá-la como concessão.

**Ressalva de conferência.** O artigo foi publicado em versão eletrônica antecipada em
dezembro de 2019, o que faz parte das bases registrarem 2019. A versão final, com volume,
número e paginação, é de 2021 — e é essa que deve ser citada.

### 3.2 Revisão sistemática de aplicação

**Entrada ABNT**

SCHRÖER, Christoph; KRUSE, Felix; GÓMEZ, Jorge Marx. A systematic literature review on applying CRISP-DM process model. Procedia Computer Science, v. 181, p. 526-534, 2021. Disponível em: https://doi.org/10.1016/j.procs.2021.01.199. Acesso em: 1 set. 2026.

**Campos conferidos**

| Campo | Valor |
|---|---|
| Autores | Christoph Schröer; Felix Kruse; Jorge Marx Gómez |
| Periódico | Procedia Computer Science |
| Volume / páginas | 181 / 526-534 |
| Ano | 2021 |
| DOI | 10.1016/j.procs.2021.01.199 |

**Uso previsto na Seção 3.** Levanta como o CRISP-DM vem sendo efetivamente aplicado em
projetos publicados, incluindo os desvios mais comuns em relação ao modelo original.
Sustenta o argumento de adequação do framework a contextos industriais.

**Ressalva de conferência.** O trabalho foi apresentado na CENTERIS 2020, mas o volume 181
da Procedia Computer Science foi publicado em 2021. O ano de publicação do periódico é o
que deve constar da referência.

## 4. Bloco consolidado para a Seção 6

As cinco entradas abaixo são transcritas para a Seção 6 do `documentacao.md` no card de
integração, respeitando a ordem alfabética do primeiro bloco de referências. Posições:

- CHAPMAN — entre BUSSAB e GOTHELF
- MARTÍNEZ-PLUMED — entre LIU e MONTGOMERY
- PROVOST — entre PROJECT MANAGEMENT INSTITUTE e RAZALI
- SCHRÖER — entre RAZALI e SHAPIRO
- WIRTH — entre WHIRLPOOL CORPORATION (Sustentabilidade) e o fim do bloco

CHAPMAN, Pete; CLINTON, Julian; KERBER, Randy; KHABAZA, Thomas; REINARTZ, Thomas; SHEARER, Colin; WIRTH, Rüdiger. CRISP-DM 1.0: step-by-step data mining guide. [S. l.]: CRISP-DM Consortium, 2000. Disponível em: https://public.dhe.ibm.com/software/analytics/spss/documentation/modeler/14.2/es/CRISP-DM.pdf. Acesso em: 1 set. 2026.

MARTÍNEZ-PLUMED, Fernando; CONTRERAS-OCHANDO, Lidia; FERRI, César; HERNÁNDEZ-ORALLO, José; KULL, Meelis; LACHICHE, Nicolas; RAMÍREZ-QUINTANA, María José; FLACH, Peter. CRISP-DM twenty years later: from data mining processes to data science trajectories. IEEE Transactions on Knowledge and Data Engineering, v. 33, n. 8, p. 3048-3061, 2021. Disponível em: https://doi.org/10.1109/TKDE.2019.2962680. Acesso em: 1 set. 2026.

PROVOST, Foster; FAWCETT, Tom. Data science for business: what you need to know about data mining and data-analytic thinking. Sebastopol: O'Reilly Media, 2013.

SCHRÖER, Christoph; KRUSE, Felix; GÓMEZ, Jorge Marx. A systematic literature review on applying CRISP-DM process model. Procedia Computer Science, v. 181, p. 526-534, 2021. Disponível em: https://doi.org/10.1016/j.procs.2021.01.199. Acesso em: 1 set. 2026.

WIRTH, Rüdiger; HIPP, Jochen. CRISP-DM: towards a standard process model for data mining. In: INTERNATIONAL CONFERENCE ON THE PRACTICAL APPLICATION OF KNOWLEDGE DISCOVERY AND DATA MINING, 4., 2000, Manchester. Proceedings [...]. Manchester: Practical Application Company, 2000. p. 29-39.

## 5. Referências avaliadas e descartadas

SHEARER, Colin. The CRISP-DM model: the new blueprint for data mining. Journal of Data
Warehousing, v. 5, 2000.

Descartada. Foi possível confirmar autor, título, veículo, volume, intervalo de páginas
(13-22) e ano, mas não o número do fascículo, campo que aparece em citações secundárias sem
respaldo em fonte primária. O periódico está extinto e a obra não possui identificador
persistente. Como o critério de aceite deste card veda campo preenchido por suposição, a
referência foi retirada do conjunto. A cobertura que ela ofereceria — descrição das etapas
do framework — já está atendida por CHAPMAN et al. (2000) e WIRTH e HIPP (2000).

## 6. Registro da conferência

| Referência | Campos conferidos | Pendência |
|---|---|---|
| CHAPMAN et al. (2000) | Autores, título, consórcio, ano, extensão | Nenhuma |
| WIRTH; HIPP (2000) | Autores, afiliações, título, evento, ano | Páginas de fonte secundária |
| PROVOST; FAWCETT (2013) | Autores, título, editora, local, ano, ISBN | Nenhuma |
| MARTÍNEZ-PLUMED et al. (2021) | Autores, periódico, volume, número, páginas, ano, DOI | Nenhuma |
| SCHRÖER; KRUSE; GÓMEZ (2021) | Autores, periódico, volume, páginas, ano, DOI | Nenhuma |

As datas de acesso registradas devem ser atualizadas para o dia em que cada link for
efetivamente aberto na conferência final, antes da transcrição para a Seção 6.
