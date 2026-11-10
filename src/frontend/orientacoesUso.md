# Orientações de uso · frontend

Esta pasta tem duas coisas que compartilham a mesma paleta:

- **O dashboard Ignis**, que roda no navegador sem build — HTML, CSS e módulos JavaScript,
  com three.js (3D), Plotly (gráficos 2D) e um gráfico de coordenadas paralelas próprio em
  SVG. Todos os números vêm dos arquivos de `dados/`; nada é chumbado.
- **O design base em Streamlit** (`css/base/`), com as peças visuais prontas, alinhado ao
  guia corporativo Whirlpool (style.whirlpoolcorp.com) e ao guia de estilos do projeto
  (`documents/assets/guiaEstilos`).

A fonte única de cores, fontes e medidas é `css/base/tokens.py`, e é dela que sai o
`css/tokens.css` do dashboard.

## O que tem nesta pasta

```
src/frontend/
├── index.html              casca: barra superior, menu lateral, área principal
├── servir.py               servidor HTTP local (raiz = src/frontend/) + API de testes
├── css/
│   ├── base/               design base em Python (fonte única de cores e medidas)
│   │   ├── tokens.py       paleta, tipografia, escala e as paletas de daltonismo
│   │   └── css.py · layout.py · navegacao.py · botoes.py · estados.py · …
│   ├── gerarTokens.py      escreve tokens.css a partir de base/tokens.py
│   ├── tokens.css          GERADO · tema claro, escuro e os ajustes de daltonismo
│   └── ignis.css           layout e componentes (cartão, estado, medidor, tabela…)
├── js/
│   ├── app.js              carrega dados, barra superior, menu, despacho das telas
│   ├── dados.js            leitura dos arquivos (JSON/CSV), estado vazio quando faltam
│   ├── estado.js           modo, linha, tela, recorte, tema, texto e filtro de cor
│   ├── i18n.js             português, inglês e espanhol
│   ├── formato.js          números pt-BR, rótulos das variáveis
│   ├── ui.js               peças do design base (mesma semântica de css/base)
│   ├── graficos.js         Plotly com a paleta de tokens
│   ├── parcoords.js        coordenadas paralelas (brush, reordenar, inverter, teclado)
│   ├── parecer.js          RF-T08 (registro de consulta) e RF-T09 (exportar parecer)
│   └── telas/
│       ├── visaoGeral.js   Composição: 3D + seletor de regiões + lista de componentes
│       ├── testes.js       Veredito por região (viável / não viável) + parecer
│       ├── visualizacao.js Diagnóstico, sensibilidade e configurações
│       └── glossario.js    Termos, variáveis e métricas
│
├── geometriaFogao/         tudo sobre a geometria do fogão
│   ├── geometria.py        posições (mm) dos 73 componentes e checagem de sobreposição
│   ├── fogao3d.js          modelo 3D paramétrico em three.js
│   └── README.md           o que é a pasta e por que o JSON gerado fica em dados/
│
├── dados/
│   ├── exportar.py         gera os arquivos abaixo a partir dos notebooks
│   ├── componentes.csv     catálogo (fora do git: *.csv é ignorado pelo projeto)
│   ├── metricas_areas.json · metricas_componentes.json · predicoes.json
│   ├── importancias.json · ensaios.json · parametros.json · testes.json
│   ├── geometria_3d.json   saída de geometriaFogao/geometria.py, por teste
│   └── glossario.json      termos cadastrados pelo time
│
├── tools/contraste.py      verifica WCAG e as paletas de daltonismo
├── temas/                  config.toml e configEscuro.toml (Streamlit)
├── assets/favicon.svg
├── rodar.py                roda o app Streamlit com um dos temas
└── orientacoesUso.md       este arquivo
```

O `geometria_3d.json` fica em `dados/` porque é gerado por teste; o que define a
geometria (`geometria.py`) e o que a desenha (`fogao3d.js`) ficam em `geometriaFogao/`.

As cores não são escritas duas vezes: `css/tokens.css` sai de `css/base/tokens.py`.

```bash
python css/gerarTokens.py              # reescreve o tokens.css
python css/gerarTokens.py --conferir   # sai 1 se estiver desatualizado
python tools/contraste.py              # WCAG + simulação de daltonismo
```

# Parte 1 · dashboard no navegador

## Rodar

```bash
# 1. gerar os dados a partir dos notebooks (reproduz o modelo da Sprint 4)
python src/frontend/dados/exportar.py

# 2. servir a pasta src/frontend/ e abrir o app
python src/frontend/servir.py                  # http://localhost:8765/
```

O `servir.py` também expõe a API local de testes (`/api/testes`, que lista os testes e
troca o ativo) e a do glossário (`/api/glossario`), usada pela tela Glossário.

O `index.html` não funciona aberto direto do disco (`file://`), porque o app lê os dados
com `fetch()`. Requer Python 3.11+ com pandas e scikit-learn (o `.venv` do projeto serve).

As fontes, os ícones, o three.js e o Plotly ficam em src/frontend/assets/vendor e são servidos
pela própria pasta, sem CDN, para que abrir o dashboard não envie o IP do usuário a
terceiros (Seção 4.1.8 da documentação). Para trocar uma versão, a lista fica no
src/frontend/tools/baixarVendor.py, e o script baixa tudo de novo.

## Acessibilidade

O botão de engrenagem na barra superior abre as configurações de exibição, e a escolha
fica gravada no navegador:

| Ajuste | O que faz |
|---|---|
| Tema | claro ou escuro |
| Tamanho do texto | de 90 % a 140 %, em passos de 10 % (`--ig-escala`) |
| Ajuste de cores para daltonismo | protanopia/deuteranopia, tritanopia ou sem cor |

Os ajustes de cor trocam **tudo** que carrega sentido pela cor: estados (ícone, texto e
faixa), identidade das sete regiões e as escalas dos gráficos. Eles escolhem cores que
continuam separadas na visão simulada em vez de banir uma matiz — um azul pode ficar,
desde que não se confunda com as outras cores da tela. Só a opção sem cor deixa a
interface inteira em tons de cinza, marca inclusive.

Nada depende só da cor: todo estado também vem escrito, e os gráficos usam contorno,
traço e hachura além do tom. O `tools/contraste.py` verifica o contraste de cada paleta e
a separação entre as cores na simulação de dicromacia (Viénot 1999, distância em CIELAB).

## Como os dados são gerados

`exportar.py` reproduz o modelo entregue na Sprint 4, definido na Seção 23 de
`colabs_S4/modelagem.ipynb`: um modelo por área, no formato longo, sobre a variante
`_13cat`, com o estimador e a codificação das perdas da regra por área, peso maior para as
leituras próximas do limite e validação Leave-One-Group-Out com a partição lida de
`colabs_S3/preparacao_testes/particao_treino_teste.json` (17 dobras). As funções do modelo e a regra
são lidas do próprio caderno, então uma mudança na Seção 23 chega ao dashboard na próxima
exportação; em troca, editar os trechos que o script procura (`def _fora_da_dobra`,
`_ndet = ` e `_REGRA = {`) quebra a exportação. A função canônica `avaliar`/`consolidar` é
executada direto da célula de `colabs_S3/preparacao_testes/metricas.ipynb`, e o script interrompe se
o MAE de alguma área se afastar mais de 0,1 °C do registrado na Seção 23.

A exportação usa a regra fixa e uma semente (42). Os valores oficiais da documentação
(Seção 4.3) são a média de três sementes, então os números do dashboard podem diferir em
décimos; a tela de testes informa isso no subtítulo técnico, lendo a nota de
`parametros.json`.

Parâmetros de leitura (Seção 12 do prompt, a confirmar pelo grupo) ficam no topo de
`exportar.py` e saem em `parametros.json` / `metricas_areas.json`:

| Parâmetro | Valor | Efeito |
|---|---|---|
| `ALVO_DENTRO_10` | 70 % | área viável se a proporção dentro de 10 % atinge o alvo |
| `MAX_FALSO_APROVADO_PCT` | 5 % | acima disso a área não é viável |
| `FOLGA_ATENCAO_PCT` | 10 % | folga menor que 10 % do limite = atenção (folga de segurança) |

Com esses valores, `coil_temps` é a única área não viável: 69,8 % dentro da margem, abaixo
do alvo de 70 %, com 4,1 % de falsos aprovados. Na média de três sementes da documentação
ela fica em 69,0 %, e as outras seis áreas passam do alvo nas duas leituras, então o
veredito por região é o mesmo.

## Histórico de configurações no Supabase

As configurações salvas pelo dashboard ficam num projeto Supabase, com o esquema definido
em src/supabase/migrations. São gravados o nome e o código da configuração (WHBR0001), os oito
campos de entrada do modelo, os componentes usados e o active limit de cada um. Nenhuma
temperatura é gravada, e os componentes são identificados por um código mascarado, formado
pelo prefixo da área e por um HMAC do nome (src/frontend/dados/mascara.py); o nome real fica
só no componentes.csv local. Ao abrir uma configuração salva, a predição é refeita no front.

O navegador não fala com o Supabase. As rotas /api/historico do servir.py chamam o banco
com a chave service_role (src/frontend/historico.py), e as tabelas ficam com RLS ligado e sem
política para a chave pública.

Configuração, uma vez por máquina:

1. O arquivo .env.exemplo da raiz é copiado para .env, que não é versionado, e preenchido
   com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e IGNIS_CHAVE_MASCARA. A chave do
   mascaramento é a mesma para todo o grupo, ou os códigos não coincidem entre máquinas.
2. A exportação é refeita com python src/frontend/dados/exportar.py, para que o componentes.csv
   ganhe a coluna de código mascarado. A unicidade dos códigos pode ser conferida com
   python src/frontend/dados/mascara.py.

Configuração, uma vez por projeto Supabase:

1. As migrações de src/supabase/migrations são aplicadas ao projeto, em ordem de nome, colando o
   conteúdo de cada arquivo no editor SQL do painel. Os arquivos usam a extensão .pgsql
   porque o .gitignore do projeto ignora *.sql, na lista de proteção de dados; o conteúdo é
   SQL comum do Postgres e contém só o esquema, sem dado algum.
2. O catálogo mascarado é carregado com python src/supabase/carregar_componentes.py. Rodar de
   novo atualiza os registros, sem duplicá-los.

Rotas disponíveis: GET /api/historico, com ?busca= para filtrar por código ou nome;
GET /api/historico/WHBR0001, para abrir uma configuração; e POST /api/historico, com o
corpo {"nome", "linha", "configuracao", "componentes", "versao_modelo"}, que devolve o
registro criado com o código gerado pelo banco. Sem as variáveis do Supabase, as rotas
respondem 503 e o restante do dashboard funciona normalmente.

## Previsão de uma configuração

A tela de Visão Geral traz, logo abaixo do modelo 3D, o bloco Configuração do fogão, com os oito campos de entrada
do modelo: direção do soprador, compartimento, posição da placa, furo do defletor e
suporte das bobinas, que descrevem os componentes do fogão, e tipo de ensaio, perfil de
perdas e motivo, que descrevem a condição do ensaio. O botão Prever chama a rota
POST /api/prever, com o corpo {"configuracao": {os oito campos}}, e o 3D, o painel das
regiões e a lista de componentes passam a mostrar a temperatura prevista para aquela
configuração. O botão Voltar aos dados de validação retorna à maior temperatura prevista
na validação cruzada.

O mesmo bloco traz os componentes de cada região, numa seção recolhível por região, para
que a tela descreva um protótipo, e não todos os pontos já medidos. O protótipo começa
vazio: o engenheiro marca os componentes que vão no fogão, e só eles aparecem no 3D, no
painel das regiões e na lista; uma região sem componente marcado fica de fora. Os
componentes de mesma função ficam agrupados, como IGBT 1 a 16, Reso Cap 1 a 8, as quatro
bobinas e as quatro placas de alumínio. A escolha não altera a temperatura prevista de
cada componente, porque não é entrada do modelo.

Um grupo pode ser declarado de escolha única na constante GRUPOS_EXCLUSIVOS do
src/frontend/js/telas/visaoGeral.js, e a tela passa a aceitar um só componente dele. A lista
está vazia porque os dados não indicam alternativas: nos 56 ensaios, todo par de
componentes de uma região aparece medido junto em algum ensaio.

Depois da previsão, a configuração pode ser salva no histórico com um nome. São gravados
os componentes marcados nas regiões do recorte, pelo código mascarado, e a versão do
modelo que fez a previsão. Se algum campo mudar depois da previsão, o salvamento fica bloqueado até
que ela seja refeita.

A previsão usa os sete modelos finais gravados pelo exportar.py em
src/frontend/dados/modelos/modelos.joblib, com o escalador, o patamar e a escala de cada
componente. A montagem das entradas repete a da Seção 23 do caderno de modelagem e foi
conferida contra a matriz de treino nas 319 combinações de ensaio e área. O arquivo tem
cerca de 15 MB e não é versionado, porque as árvores são ajustadas sobre as temperaturas
da parceira; cada máquina o gera ao rodar a exportação. As opções de cada campo e a
versão do modelo saem no parametros.json. A rota exige o scikit-learn no ambiente do
servidor, e a primeira chamada leva alguns segundos, enquanto os modelos são carregados.

## Veredito do protótipo

Depois da previsão, uma faixa acima do 3D informa se o fogão passa ou é reprovado, pela
regra de projeto da parceira: cada componente com limite ativo precisa ficar com a
temperatura prevista até 90% do limite, isto é, com margem de segurança de 10%. O fogão
é aprovado quando todos os componentes com limite do protótipo cumprem a regra;
componentes sem limite são só monitorados e não entram na decisão. Na reprovação, a
faixa lista os componentes que falharam, dos mais próximos do limite aos menos, com a
temperatura prevista e a porcentagem do limite, e separa os que passam do limite dos
que só invadem a margem. Na aprovação, a faixa avisa quantos componentes chegariam à
margem se a incerteza do modelo, o erro médio absoluto de cada um, fosse somada à
previsão.

A mesma faixa informa a distância da configuração até o ensaio mais próximo da base,
em número de campos diferentes entre os sete que o ensaios.json registra; o motivo do
ensaio não entra nessa conta. Coincidência total indica previsão dentro do que o modelo
conhece, e três ou mais campos diferentes indicam extrapolação, com resultado pouco
confiável. O modelo aceita qualquer combinação dos oito campos, mas só aprendeu com as
combinações ensaiadas, e não conhece peças ou atributos que não estão na base.

## Integração com a aba de Histórico

A aba de Histórico ainda não faz parte do dashboard, mas a integração está pronta no
src/frontend/js/configuracaoSalva.js. A lista vem de GET /api/historico, com ?busca= para
filtrar por código ou nome, e cada registro traz codigo, nome, linha, os oito campos da
configuração, versao_modelo, criado_em e componentes, que é a lista de códigos mascarados.

O módulo oferece três funções. A componentesDoRegistro traduz os códigos para os
componentes do catálogo local e conta os que não foram reconhecidos, o que acontece
quando a IGNIS_CHAVE_MASCARA da máquina difere da usada por quem salvou. A outraVersao
indica se a configuração foi salva com um modelo diferente do exportado na máquina. A
abrirConfiguracaoSalva leva o registro para a Visão Geral: a configuração e os
componentes são restaurados, as regiões do protótipo abrem expandidas, a previsão é
refeita com o modelo atual e a mensagem da tela informa de qual código a configuração
veio, com um aviso quando o modelo mudou.

Para ligar a aba, basta criar a tela em src/frontend/js/telas, registrá-la em TELAS no
src/frontend/js/app.js e na lista de telas válidas do src/frontend/js/estado.js, e acrescentar o
item do menu no src/frontend/index.html, como as demais telas.

## Vários testes no mesmo dashboard

Cada teste é um conjunto de ensaios. O registro fica em `src/frontend/dados/testes.json`:
o teste 1 é o dataset original da parceria e mora na própria pasta de dados; os demais
ficam em `src/frontend/dados/testes/<id>/`. O dashboard mostra o teste marcado como `ativo`
nesse registro; para trocar, altere o campo (ou use `POST /api/testes/ativo`) e recarregue
a página.

O registro de um teste novo pelo dashboard foi retirado, junto com a tela de Histórico.
Para acrescentar um teste, rode os notebooks de preparação e tratamento sobre a planilha e
depois o `exportar.py` apontando as variáveis `IGNIS_PASTA_NB`, `IGNIS_PASTA_PARTICAO` e
`IGNIS_SAIDA` para a pasta do teste novo. A pasta indicada em `IGNIS_PASTA_NB` precisa ter
o `modelagem.ipynb` da Sprint 4, os `dataset_<área>.csv`, os `dataset_<área>_13cat.csv` e o
`limites_ativos.csv`. A planilha precisa ter a estrutura do
`documents/outros/dataset_original.xlsx`:

| Onde | O que |
|---|---|
| linha 1 | `TC Number`, `TC Name`, `Key Area`, `Active Limit` e uma coluna por Run |
| linhas 3 a 9 | as sete variáveis de configuração, uma por linha |
| linha 11 em diante | uma linha por componente, com a temperatura medida em cada ensaio |

Componentes a mais entram como linhas novas. Sem posição conhecida no modelo 3D, o
componente aparece na lista marcado como "sem posição no modelo", nunca num lugar
inventado.

## Revisão v2

- **Cooktop de indução com quatro zonas**, ligadas às bobinas de baixo: clicar na marcação
  do vidro seleciona a bobina daquela posição. A referência é o manual de fogão de piso por
  indução (W11477340A); a geometria segue marcada como aproximada.
- **IPC Comp e IPC Cooling separados**: a placa ocupa a metade direita do burner box e o
  caminho de ar, a esquerda. `geometria.conflitos()` confere que nenhum componente ocupa o
  espaço de outro e hoje devolve lista vazia.
- **Mapa de calor ligável** no 3D, de azul intenso (mais frio) a vermelho intenso (mais
  quente), com barra em °C; ligá-lo liga junto o raio-X, para as peças internas aparecerem.
  Desligado, o modelo volta às cores por região.
- **Contexto transparente**: ao isolar regiões, carcaça, porta, cavidade e tampo se apagam.
- **Gráficos com frase descritiva e legenda**; tabelas equivalentes por região, com os
  componentes em cascata; descrição de cada coluna ao passar o mouse e ao focar por teclado.
- **Sem nome de algoritmo na interface**: a tela informa resultado e validação.
- **Glossário** como tela própria (a de Histórico foi retirada); os filtros laterais ficaram só com os
  nomes das regiões.
- **Custo-benefício removido**, da interface e da exportação.
- **Cores das regiões** em `css/base/tokens.py` (`Cores.regiao`), conferidas por
  `tools/contraste.py`. Elas também são a paleta categórica dos gráficos.

## Idiomas

A interface é em português. O seletor na barra superior oferece **Português (Brasil),
English e Español** em qualquer linha de produto, e a escolha fica gravada no navegador.

A tradução cobre a casca do app: menu, barra superior, filtros, títulos das telas, botões,
rótulos das colunas, legendas do 3D e estados vazios. Os textos longos de análise e as
definições do Glossário seguem em português, e a tela avisa isso numa linha sob o título.
Os textos ficam em `js/i18n.js`, três por chave, na ordem pt, en, es.

## Decisões tomadas onde o prompt deixou aberto

- **Accent Blue** `#0077A5` no tema claro, no `tokens.py` e no CSS. O `#00A0DD` oficial dá
  2,97:1 no branco e reprova até como elemento gráfico; no tema escuro ele passa e é usado.
- **Métrica de aceitação:** proporção dentro de 10 % (canônica), com falso aprovado como
  segunda condição; MAE ÷ limite não é usado.
- **Dobras:** 17 (valor real da partição).
- **Linha México:** não há ensaios exportados; o filtro existe e mostra estado vazio.
- **Perfil de perdas:** no dataset é categórico (`no losses`, `simone losses`, `miro`…), não
  um valor em W; o eixo de perdas das coordenadas paralelas é categórico. Seis ensaios sem
  perfil aparecem como "não informado".
- **Componentes:** o catálogo traz só os componentes presentes nos conjuntos de dados: 73,
  todos com predição e posição no 3D. Ficam de fora os três que constam de
  `limites_ativos.csv` mas não do dataset (`Oven RTD Connector Body`, `AC Blower Inlet Max`,
  `AC Blower Inlet Avg`) e o `A33/Bellatrix Thermistor`, descartado na preparação por ser
  cópia exata do Microchip.
- **Rótulos das variáveis:** a Sensibilidade mostra as variáveis do modelo com nome legível
  (`reason_plate` vira "Reason: Plate", `perdas_simone` vira "Losses: Simone"), pelos mapas
  de `js/formato.js`.
- **Leitura por componente no 3D:** a cor usa a **maior temperatura prevista** na validação
  (`t_max_prevista`), com a incerteza igual ao MAE do componente; `ultima_leitura` (último
  ensaio validado) fica no CSV para a rastreabilidade.

## Verificado

Navegação headless (Chromium) pelas três telas nos dois modos, tema escuro, linha México,
largura de 390 px e 1366 px: sem erros de console; clique e hover no 3D selecionam a
região e preenchem o tooltip e o `aria-label`; brush das coordenadas paralelas filtra e
atualiza o contador e a tabela.

# Parte 2 · design base em Streamlit

Cada tela nova só monta as peças; cores, fontes e espaçamentos já vêm aplicados.

## Instalar e rodar

Requer Python 3.11+ e Streamlit 1.63 ou mais novo:

```bash
pip install "streamlit>=1.63"
```

Sempre rode pelo `rodar.py`, de dentro de `src/frontend/`. Ele aplica o tema (o Streamlit
não lê a pasta `temas/` sozinho) e avisa o app de qual tema está ativo:

```bash
python rodar.py                  # tema claro, arquivo app.py
python rodar.py escuro           # tema escuro
python rodar.py escuro outra.py  # outro arquivo de tela
```

O `app.py` é o arquivo da tela de vocês: ele não vem com o design base.

## Montando uma tela

```python
import os

from css.base import (AplicacaoBase, Coluna, Estado, ItemComposto, ItemNav, Medidor,
                      Menu, Secao, Tabela, Tema)


def telaPontos():
    Secao("Veredito por ponto").renderizar()
    Tabela(
        colunas=[
            Coluna("Ponto de medição", "ponto", quebrar=False),
            Coluna("Previsto", "temp", numerica=True, casas=1, unidade="°C"),
            Coluna("Previsão x limite", "barra", formato=lambda l: Medidor(
                l["temp"], l["limite"], 5, estado=l["estado"], maximo=140, compacto=True).html()),
            Coluna("Estado", "estado"),
        ],
        linhas=[{"ponto": "Motor do ventilador", "temp": 118.4, "limite": 109,
                 "estado": Estado.CRITICO}],
    ).renderizar()


menu = Menu(itens=[
    ItemComposto("telas", "Telas", filhos=[
        ItemNav("pontos", "Pontos de atenção", icone="ph-warning",
                titulo="Dois pontos exigem revisão", pagina=telaPontos),
    ]),
])

tema = Tema.escuro() if os.environ.get("TEMA") == "escuro" else Tema()   # vem do rodar.py
app = AplicacaoBase(menu=menu, tema=tema)
app.iniciar()     # page_config + CSS + menu + cabeçalho
app.despachar()   # chama a função da aba ativa
```

Cada aba do menu é uma função. O título do topo, o título da guia do navegador e o
destaque do menu seguem a aba ativa sozinhos.

Para usar uma peça fora do `AplicacaoBase`, aplique o CSS uma vez por tela antes:

```python
from css.base import css, Tema
css.aplicar(Tema())
```

## Peças disponíveis

| Peça | Para quê | Exemplo |
|---|---|---|
| `Tipografia` + `Estilo` | Texto com o estilo do guia | `Tipografia.escrever("Título", Estilo.HEADLINE)`; atalhos `headline`, `kicker`, `subhead`, `metrica`, `corpo`, `tabela`, `nota`, `rotulo` |
| `formatarNumero` | Número no padrão brasileiro | `formatarNumero(118.44, 1, "°C")` → `118,4 °C` |
| `Rotulo` + `Estado` | Estado com ícone, rótulo e número | `Rotulo(Estado.CRITICO, detalhe="9 °C acima").renderizar()`; formatos `linha`, `faixa`, `chip` |
| `Estado.porFolga` | Folga numérica → estado | `Estado.porFolga(-9.4)` → `CRITICO` (atenção abaixo de 10) |
| `corMetrica` | Cor do número no card | vermelho só no crítico |
| `Botao` + `Variante` | Botão | `Botao("Prever", Variante.PRIMARIO, aoClicar=funcao)` |
| `BarraBotoes` | Linha de botões | devolve `{chave: clicado}`, ex.: `acoes["salvar-cenario"]` |
| `Tabela` + `Coluna` | Tabela técnica | unidade no cabeçalho, `ordenarPor`, `destacar`, `densa`, `quebrar=False` |
| `Medidor` | Valor contra limite, com incerteza | `Medidor(118, limite=109, incerteza=6.2, estado=Estado.CRITICO)` |
| `FichaTecnica` | Parâmetros rótulo → valor | `FichaTecnica([("Potência", "2.400 W")])` |
| `barra` | Barra proporcional (ranking, peso) | `barra(0.41, 0.41)` dentro de uma `Coluna(formato=...)` |
| `Secao` | Título de bloco (subhead) | `Secao("Veredito por ponto").renderizar()` |
| `Cartao` | Caixa com contorno | `with Cartao("pcb", estado=Estado.CRITICO): ...` — borda colorida só no crítico |
| `EstadoVazio` | Tela ou bloco sem dados | `EstadoVazio("Nenhum ensaio", "Amplie a faixa nos filtros.")` |
| `Menu` + `ItemNav` / `ItemComposto` / `MenuSuspenso` | Menu lateral | `ItemComposto` sem `pagina` vira seção ("TELAS"); `Menu(filtros=funcao)` cria a seção de filtros |

Ícones do menu: `icone="ph-<nome>"` usa Phosphor (traço, mesmo conjunto do guia). Emoji e
`":material/<nome>:"` também funcionam. `MenuSuspenso` não aceita ícone Phosphor.

## Temas e cores

- **As cores dos componentes** vêm de `css/base/tokens.py` (`Tema()` e `Tema.escuro()`).
- **As cores do dashboard web** saem do mesmo arquivo: `css/tokens.css` é gerado, não
  escrito à mão.
- **As cores dos widgets nativos** do Streamlit vêm de `temas/*.toml`.
- **Mudou uma cor?** Mude no `tokens.py`, regenere o CSS e rode o verificador:

```bash
python css/gerarTokens.py     # reescreve css/tokens.css
python tools/contraste.py     # WCAG + simulação de daltonismo
```

O verificador confere 58 pares por tema (4,5:1 para texto, 3:1 para ícones e bordas) e
mais as seis paletas de daltonismo, e termina com erro se algum reprovar. Ele só lê o
`tokens.py`: não percebe se os `.toml` do Streamlit ficarem diferentes.

## Guia Whirlpool: o que foi aplicado

| Regra | Onde |
|---|---|
| Base branca, cor só como acento | fundo `#FFFFFF`; cabeçalho branco por padrão |
| Só cores oficiais na marca | Accomplished Blue, Accent Blue, Light Accent Blue, neutros oficiais |
| Texto de apoio legível | Charcoal Gray `#505863` (o Dark Gray `#767777` dá 4,49:1 e reprova) |
| Kicker 1/2 do headline, mínimo 12pt, tracking 50 | `Estilo.KICKER` 16px, `0.05em` |
| Subhead 2/3 do headline, caixa alta, tracking 30 | `Estilo.SUBHEAD` 20px, `0.03em` |
| CTA em Nunito Sans Bold | botões |
| Noto Sans como reserva | pilhas de fonte |
| Ícones em traço, sem preenchimento, na cor principal | Phosphor regular em `#0D436B` |
| Lockup de sistema interno | `Marca(logo=...)`: logo oficial, linha de 1px, nome em Nunito Sans Light |

**Exceção: cores de estado.** A paleta Whirlpool não tem vermelho, e o verde, o amarelo
e o laranja dela reprovam contraste (o próprio guia proíbe usá-los em texto). Seguro,
atenção e crítico usam as cores do guia do projeto; os fundos usam os tons claros
oficiais (Light Accent Green, Yellow e Orange).

**Fora do guia Whirlpool:** o tema escuro (o guia pede base branca) e os títulos em
caixa de frase (o guia pede *title case*, que é convenção do inglês).

**Logo:** o arquivo oficial fica na biblioteca da Whirlpool (exige Whirlpool ID). Sem
ele, só o nome do sistema aparece; nunca use um logo improvisado. Para incluir:
`Tema(marca=Marca(logo="assets/logo.png"))` (vale também para `Tema.escuro(marca=...)`). O guia exige no mínimo 90px de altura e fundo claro,
por isso o logo aparece no cabeçalho branco, não na barra lateral.

## Tela com cara de ferramenta, não de mockup

- **A tela reage aos dados:** título, badges e avisos vêm dos dados, e um aviso só
  aparece quando é verdade.
- **Nada repetido:** nenhum card destacando o que a tabela já mostra.
- **Um título de seção por coluna.** Blocos secundários usam `Estilo.ROTULO` com
  `classes="ig-bloco"`.
- **Unidade no cabeçalho da tabela**, não em cada célula.
- **Mesma escala em todas as barras** de uma tabela (`Medidor(maximo=...)`).
- **Parâmetros como ficha técnica** (`FichaTecnica`), não como frase.

## Texto de interface

- Diga o que aconteceu e com quais dados: "Última previsão: hoje às 14:32", não
  "Previsão atualizada".
- Estado vazio sempre com o próximo passo: `EstadoVazio(titulo, proximoPasso)`.
- Números com `formatarNumero`: vírgula decimal, ponto de milhar, sinal de menos
  tipográfico.
- Evite o separador "·" como tique; ele só aparece no rótulo de estado, que vem do guia
  do projeto.

## Cuidados ao mexer no design base

- **Nunca escreva `<` dentro do CSS**, nem em comentário. O `st.html` descarta a folha
  inteira sem avisar; por isso `css.folha()` acusa erro na hora se encontrar um.
- **Peça nova com CSS próprio:** crie `regrasCss(tema)` no módulo e inclua em
  `css._compor()`.
- **Cor nova:** adicione em `Cores` (`css/base/tokens.py`) e use com
  `cssVar("nomeDoToken")`, nunca com hex solto. Depois rode `python css/gerarTokens.py` e
  `python tools/contraste.py`.
- **Nunca edite `css/tokens.css` à mão:** ele é gerado e a sua alteração some na próxima
  execução do `gerarTokens.py`.

## Convenção de nomes

| O quê | Padrão | Exemplo |
|---|---|---|
| classes | PascalCase | `ItemComposto`, `AplicacaoBase` |
| funções, métodos, variáveis, atributos, parâmetros | camelCase | `aoMudarAba`, `larguraTotal`, `corMetrica` |
| tokens de cor | camelCase | `primariaTexto`, `criticoFundo` |
| membros de Enum | MAIÚSCULAS | `Estado.CRITICO`, `Estilo.HEADLINE` |
| variáveis CSS | kebab-case, geradas por `cssVar()` | `var(--ig-primaria-texto)` |
| classes CSS | BEM com prefixo `ig-` | `ig-estado--faixa` |
| chaves de widget | `tipo-chave` | `nav-aceitacao`, `btn-primario-prever`, `cartao-pcb` |

Os parâmetros do Streamlit (`on_click`, `unsafe_allow_html`, `page_title`…) continuam
em snake_case porque são da biblioteca.
