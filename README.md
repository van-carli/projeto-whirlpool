# Inteli - Instituto de Tecnologia e Liderança 

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="documents/assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0"></a>
</p>

<p align="center">
  <a href="documents/documentacao.md"><img src="documents/assets/bannerIgnis.svg" alt="Olá, sejam bem-vindos ao nosso projeto! Leia nossa documentação para entender mais sobre nossa proposta"></a>
</p>

# Ignis

## Os CALORos 

## :student: Integrantes: 
<div align="center">
  <table>
    <tr>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/ana-camily-figueiredo-1125a83b1/"><img src="documents/assets/integrantes/anaCamily.png" width="120" height="120" alt="Foto de Ana Camily Figueiredo dos Santos" /><br><b>Ana Camily</b></a><br><sub>Figueiredo dos Santos</sub></td>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/anacarvalholuiza/"><img src="documents/assets/integrantes/anaLuiza.png" width="120" height="120" alt="Foto de Ana Luiza Lima de Carvalho" /><br><b>Ana Luiza</b></a><br><sub>Lima de Carvalho</sub></td>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/guilhermebarbosa-souza/"><img src="documents/assets/integrantes/guilherme.png" width="120" height="120" alt="Foto de Guilherme Barbosa de Souza" /><br><b>Guilherme</b></a><br><sub>Barbosa de Souza</sub></td>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/jo%C3%A3o-pedro-de-barros-peixoto/"><img src="documents/assets/integrantes/joaoPedro.png" width="120" height="120" alt="Foto de João Pedro de Barros Lima Dantas Peixoto" /><br><b>João Pedro</b></a><br><sub>de Barros Peixoto</sub></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/julia-amanda-gregate-de-araujo/"><img src="documents/assets/integrantes/julia.png" width="120" height="120" alt="Foto de Júlia Amanda Gregate de Araujo" /><br><b>Júlia Amanda</b></a><br><sub>Gregate de Araujo</sub></td>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/matheus-porto-/"><img src="documents/assets/integrantes/matheus.png" width="120" height="120" alt="Foto de Matheus Porto Monzani de Souza" /><br><b>Matheus Porto</b></a><br><sub>Monzani de Souza</sub></td>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/melissa-leonel-dangelo/"><img src="documents/assets/integrantes/melissa.png" width="120" height="120" alt="Foto de Melissa Leonel D'Angelo" /><br><b>Melissa</b></a><br><sub>Leonel D'Angelo</sub></td>
      <td align="center" valign="top" width="170"><a href="https://www.linkedin.com/in/van-carli/"><img src="documents/assets/integrantes/vanessa.png" width="120" height="120" alt="Foto de Vanessa Carli de Andrade" /><br><b>Vanessa</b></a><br><sub>Carli de Andrade</sub></td>
    </tr>
  </table>
</div>

## :teacher: Professores:
### Orientador(a) 
- <a href="https://www.linkedin.com/in/fabiocassiosouza/">Fábio Cássio de Souza</a>
### Instrutores
- <a href="https://www.linkedin.com/in/egondaxbacher/">Egon Ferreira Daxbacher</a>
- <a href="https://www.linkedin.com/in/geraldo-magela-severino-vasconcelos-22b1b220/">Geraldo Magela Severino Vasconcelos</a> 
- <a href="https://www.linkedin.com/in/heloisacandello/">Heloisa Caroline de Souza Pereira Candello</a>
- <a href="https://www.linkedin.com/in/roberto-c%C3%A2ndido-450582a0/">José Roberto Cândido da Silva</a> 
- <a href="https://www.linkedin.com/in/laizaribeiro/">Laíza Ribeiro Silva</a> 


## 📝 Descrição

O **Ignis** é uma solução de Machine Learning desenvolvida em parceria com a **Whirlpool Corporation**, líder do mercado brasileiro de linha branca com as marcas Brastemp e Consul, para acelerar a validação térmica de fogões de piso (*freestanding*) produzidos para os mercados brasileiro e mexicano.

**O problema.** Antes de aprovar uma nova arquitetura de fogão, a engenharia precisa garantir que cada componente crítico (placa inversora, vidros, motores, botões) opere abaixo do seu limite térmico. Hoje, essa verificação depende de simulações de dinâmica dos fluidos computacional (CFD) e de ensaios físicos com protótipos instrumentados por termopares. Cada ciclo leva cerca de três semanas, exige licenças de software caras e especialistas com agenda restrita, e qualquer alteração de design reinicia o processo. Como consequência, falhas térmicas aparecem tarde, quando corrigi-las já é caro, e a empresa gasta com protótipos e testes destrutivos que poderiam ser evitados.

**A solução.** O Ignis é um modelo substituto da simulação: um modelo preditivo treinado sobre o histórico de ensaios da própria Whirlpool, que estima a temperatura de cada componente a partir das oito decisões de projeto declaradas em cada ensaio (direção do ventilador, posição da placa, modo de operação, material do suporte da bobina, entre outras), sem executar a simulação completa. O problema foi formulado como regressão supervisionada, com um modelo por área térmica do fogão, sete no total, cobrindo 73 componentes.

**O modelo entregue** não é um estimador único. Cada área recebe o estimador e o tratamento de *losses* que venceram na validação: Random Forest em quatro delas, e médias entre Random Forest, Gradient Boosting e Extra Trees nas outras três. O erro absoluto médio fica entre **5,96 e 6,23 °C** na validação cruzada agrupada por configuração de ensaio, protocolo que simula o uso real da ferramenta, ou seja, prever um fogão ainda não ensaiado, e em **5,15 °C** no conjunto de teste reservado, mantido fora de todo o desenvolvimento. A formulação de referência, com Random Forest em todas as áreas, mede 6,47 °C na mesma validação, e o detalhamento de como o modelo foi construído e medido está em <a href="notebooks/modelo_final/">notebooks/modelo_final</a>.

**O dashboard.** O modelo chega aos usuários por um dashboard web (HTML, CSS e JavaScript, servido por um script Python local), no qual engenheiros e áreas como design, qualidade e marketing montam cenários, comparam alternativas e visualizam, para cada componente, a previsão, a incerteza e o estado de segurança: um componente entra em atenção quando a folga até o seu limite cai abaixo de 10%. A previsão é feita sob demanda a partir do modelo exportado dos notebooks, e as configurações salvas ficam em um banco Postgres no Supabase. O Ignis atua como **triagem**, não como substituto da CFD: arquiteturas próximas do limite continuam exigindo validação completa, mas só chegam ao laboratório as configurações que passaram pelo filtro.

**Impacto esperado.** Reduzir o *assessment* térmico de três semanas para menos de um dia, contribuir para a meta de diminuir em até 30% o tempo de desenvolvimento de novos produtos e em 25% os gastos com protótipos, e reduzir o desperdício de materiais em testes destrutivos, em linha com as metas de sustentabilidade da Whirlpool. Todo o pipeline usa bibliotecas abertas em Python, sem custo de licença, e é documentado para que a Whirlpool possa retreinar o modelo com novos dados e levar a metodologia a outras categorias, como Refrigeração e Lavanderia.

<b>Link para <a href="https://youtu.be/eBFNW5e_CwU?si=yGPNoUxeiKduy63B">vídeo demonstrativo</a></b>

## 📁 Estrutura de pastas

Dentre os arquivos e pastas presentes na raiz do projeto, definem-se:

- <b>README.md</b>: arquivo que serve como guia e explicação geral sobre o projeto (o mesmo que você está lendo agora).

- <b>documents</b>: toda a documentação do projeto, com a pasta <b>assets</b> para todas as imagens e mídias utilizadas no README, nos notebooks e na documentação, separadas por tema, e a pasta <b>extras</b> para os relatórios de cada sprint e os materiais complementares.

- <b>notebooks</b>: todos os Jupyter Notebooks criados para o desenvolvimento do projeto, organizados por sprint, com o modelo final em <b>modelo_final</b>.

- <b>src</b>: o código da solução, com a pasta <b>frontend</b> para o dashboard Ignis, que leva as previsões do modelo ao usuário, e a pasta <b>supabase</b> para as migrações e a carga do banco que guarda o histórico de configurações salvas no dashboard.

## 💻 Execução dos projetos

### Requisitos

- **Python 3.11** ou mais novo.
- **Jupyter**, pela extensão Jupyter do VS Code ou pelo Google Colab.
- **A base de ensaios**, `dataset_original.xlsx`. Ela **não está no repositório**: o
  `.gitignore` do Inteli bloqueia `*.xlsx` e `*.csv`, por compromisso de proteção de dados
  firmado com a parceira. Peça o arquivo ao grupo e salve em `documents/outros/`.

### Clonar e preparar o ambiente

```bash
git clone https://git.inteli.edu.br/graduacao/2026-2a/t29/g01.git
cd g01
python -m venv .venv
```

Ativar o ambiente (Windows, no PowerShell):

```bash
.venv\Scripts\Activate.ps1
```

Ativar o ambiente (Linux e macOS):

```bash
source .venv/bin/activate
```

Instalar o que todo o pipeline usa:

```bash
pip install pandas numpy scikit-learn scipy matplotlib joblib openpyxl
```

As bibliotecas abaixo são de uso pontual, e só fazem falta no notebook indicado:

```bash
pip install shap                # comparacao_modelos_final, contribuição das variáveis
pip install flaml pycaret       # analises_complementares, AutoML
pip install lazypredict         # modelagem, triagem inicial de estimadores
pip install seaborn             # gráficos das sprints 1 e 2
pip install scikit-fem          # testes de elementos finitos, em testes_extras
```

### Notebooks, localmente no VS Code

Abra a pasta do repositório, selecione o `.venv` como kernel e rode as células na ordem.
Não é preciso ajustar caminho nenhum: a primeira célula de cada notebook localiza a raiz do
repositório sozinha, de modo que o kernel pode ter sido aberto em qualquer pasta.

A ordem do pipeline, com o que cada etapa deixa em `notebooks/colabs_S4/`:

| Ordem | Notebook | Gera |
|---|---|---|
| 1 | `preparacao_datasets.ipynb` | `dataset_<area>.csv` (sete), `limites_ativos.csv` e `chave_replicata.json` |
| 2 | `tratamento_datasets_13cat.ipynb` | `dataset_<area>_13cat.csv` (sete), que é a base que todas as etapas adiante leem, mais `dataset_<area>_perfil.csv` (sete) e `particao_treino_teste.csv` |
| 3 | `modelagem.ipynb` | o modelo entregue, na Seção 23 |
| 4 | `random_search_13cat.ipynb` | métricas em `resultados_random_search/` |
| 5 | `comparacao_modelos_final.ipynb` | a comparação entre os estimadores |
| 6 | `analises_complementares.ipynb` | as verificações de robustez |

Os quatro últimos leem as mesmas entradas e **não dependem uns dos outros**, de modo que
podem rodar em qualquer ordem entre si, ou isoladamente. Para só reproduzir o modelo
entregue, bastam as etapas 1, 2 e 3.

A partição de treino e teste é o que garante que o conjunto reservado seja sempre o mesmo,
e existe em dois formatos. O `particao_treino_teste.json`, em
`notebooks/colabs_S3/preparacao_testes/`, é versionado e não precisa ser regerado. O
`particao_treino_teste.csv` é derivado dele pela etapa 2, e é o que as etapas 3, 4 e 6 leem.
Já `tratamento_nulos_pos_revisao.ipynb` registra um estudo de imputação de
nulos cujas saídas nenhuma etapa adiante consome, e por isso fica fora da ordem acima.

Para ler apenas **como o modelo final foi construído e medido**, sem rodar o pipeline todo,
vá direto a <a href="notebooks/modelo_final/">notebooks/modelo_final</a>: o
`guia_modelo_final.ipynb` explica o caminho inteiro, e o `modelo_final.ipynb` treina e avalia
a formulação entregue. Ele precisa de nove arquivos: os sete `dataset_<area>_13cat.csv` da
etapa 2, o `limites_ativos.csv` da etapa 1 e o `particao_treino_teste.json` versionado. A
primeira célula confere se estão no lugar e diz quais faltam.

### Notebooks no Google Colab

Os notebooks detectam o Colab e se ajustam a ele, mas os arquivos precisam ser enviados à
sessão, porque lá não existe o repositório:

1. Suba o notebook e, ao lado dele, o que a etapa exige:
   - **etapa 1**: o `dataset_original.xlsx`;
   - **etapa 2**: os sete `dataset_<area>.csv` e o `limites_ativos.csv` da etapa 1, mais o
     `particao_treino_teste.json`;
   - **etapas 3 a 6**: os sete `dataset_<area>_13cat.csv`, o `limites_ativos.csv` e o
     `particao_treino_teste.csv`. A etapa 3 pede ainda os sete `dataset_<area>_perfil.csv`,
     o `chave_replicata.json` e o `particao_treino_teste.json`.

   O `modelo_final.ipynb` é a exceção: ele abre o seletor de envio sozinho e lista o que espera.
2. Instale na sessão o que não vem pré-instalado, com `!pip install shap`,
   `!pip install flaml pycaret` ou `!pip install lazypredict`, conforme o notebook.
3. Os arquivos da sessão são apagados quando ela se encerra. Baixe os CSV gerados antes de
   fechar, ou a próxima etapa não os encontrará.

> **Salve uma cópia no seu Drive** antes de editar qualquer coisa, em Arquivo, Salvar uma
> cópia no Drive. Sem isso, o Colab não tem onde gravar, e as alterações feitas no notebook
> são perdidas ao fechar a sessão.

### Dashboard

O dashboard roda no navegador sem build, mas depende de dois passos. O primeiro treina o
modelo e grava os arquivos de dados, e por isso exige que a etapa 2 dos notebooks já tenha
rodado. O segundo sobe o servidor local:

```bash
python src/frontend/dados/exportar.py
```

```bash
python src/frontend/servir.py
```

O endereço é <b>http://localhost:8765/</b>, e `python src/frontend/servir.py 8080` troca a porta.
Abrir o `index.html` direto do disco **não funciona**, porque o app lê os dados com `fetch()`,
que os navegadores bloqueiam em `file://`.

O `exportar.py` lê as funções e a regra por área da própria Seção 23 de `modelagem.ipynb`, em
vez de copiá-las, de modo que uma mudança no notebook chega ao dashboard na exportação
seguinte. Ele também interrompe a exportação se o erro de alguma área se afastar mais de
0,1 °C do valor registrado na seção, o que serve de verificação.

### Histórico de configurações, opcional

A tela de histórico guarda as configurações salvas em um banco Postgres no Supabase. Sem as
chaves, ela responde "histórico indisponível" e as outras telas seguem funcionando, então
este passo só é necessário para usá-la:

1. Copie o `.env.exemplo` da raiz para `.env` e preencha `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` e `IGNIS_CHAVE_MASCARA`. O `.env` não é versionado, e a chave
   de máscara precisa ser a mesma para todo o grupo, ou os códigos dos componentes não
   coincidem entre máquinas.
2. Aplique a migração `src/supabase/migrations/20260929120000_historico_configuracoes.pgsql` no
   projeto do Supabase.
3. Rode `python src/supabase/carregar_componentes.py`, que envia ao banco apenas o código
   mascarado, a área e o limite de cada componente. O nome real fica no CSV local.

## 🗃 Histórico de lançamentos

* 1.0.0 - 05/10/2026
    * Lançamento da primeira versão do modelo preditivo com documentação.
* 0.4.0 - 25/09/2026
    * Comparação de modelos preditivos e dashboard
* 0.3.0 - 11/09/2026
    * Preparação de dados e modelo preditivo preliminar
* 0.2.0 - 28/08/2026
    * Análise exploratória e levantamento de hipóteses
* 0.1.0 - 14/08/2026
    * Documentação de entendimento do negócio

## 📋 Licença/License

<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/">
<a property="dct:title" rel="cc:attributionURL" href="https://git.inteli.edu.br/graduacao/2026-2a/t29/g01">Ignis</a> © 2026 by
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.inteli.edu.br/" target="_blank">INTELI</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/ana-camily-figueiredo-1125a83b1/" target="_blank">ANA CAMILY FIGUEIREDO DOS SANTOS</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/anacarvalholuiza/" target="_blank">ANA LUIZA LIMA DE CARVALHO</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/guilhermebarbosa-souza/" target="_blank">GUILHERME BARBOSA DE SOUZA</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/jo%C3%A3o-pedro-de-barros-peixoto/" target="_blank">JOÃO PEDRO DE BARROS PEIXOTO</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/julia-amanda-gregate-de-araujo/" target="_blank">JÚLIA AMANDA GREGATE DE ARAUJO</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/matheus-porto-/" target="_blank">MATHEUS PORTO MONZANI DE SOUZA</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/melissa-leonel-dangelo/" target="_blank">MELISSA LEONEL D'ANGELO</a>,
<a property="cc:attributionName" rel="cc:attributionURL dct:creator noopener noreferrer" href="https://www.linkedin.com/in/van-carli/" target="_blank">VANESSA CARLI DE ANDRADE</a>
is licensed under
<a href="https://creativecommons.org/licenses/by/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">Creative Commons Attribution 4.0 International<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="documents/assets/licenca/cc.svg" alt="CC"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="documents/assets/licenca/by.svg" alt="BY"></a>
</p>
