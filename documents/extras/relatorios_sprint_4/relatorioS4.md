# Relatório da quarta sprint

## Sumário executivo

O projeto prevê a temperatura que cada componente de um fogão de indução atingirá num ensaio térmico, a partir apenas da descrição da configuração do ensaio. O uso pretendido é o de fazer uma triagem prévia, indicando quais componentes provavelmente ultrapassarão o seu limite de segurança, de modo que o ensaio físico possa ser dirigido a esses pontos.

Cinco mudanças foram feitas nesta sprint, e nenhuma delas é um algoritmo novo. Quatro corrigem o dado ou a forma de codificá-lo, e a quinta muda o que o ajuste prioriza.

| Mudança | O que era | O que passou a ser | Efeito |
|---|---|---|---|
| Motivo do ensaio | Seis indicadores de palavra, sobrepostos | Seis categorias mutuamente exclusivas | 0,245 °C de erro |
| Componente duplicado | Quatro sensores na interface, dois deles cópias | Três sensores | 0,183 °C na região |
| Estimador | O mesmo em todas as regiões | Escolhido por região, entre dois | 0,320 °C de erro |
| Perfil de perdas | Treze colunas em todas as regiões | Codificação escolhida por região | 0,127 °C de erro |
| Peso do ajuste | Todas as leituras com o mesmo peso | Peso maior perto do limite do componente | 6,4 aprovações indevidas a menos |
| Estimador em Main Vent Sys | Média entre floresta e gradiente | Média entre Extra Trees e gradiente | 0,26 °C na região, 0,02 °C no agregado |

O resultado, medido por validação cruzada que remove uma configuração experimental inteira por vez:

| Indicador | Início da sprint | Entrega |
|---|---:|---:|
| Erro médio absoluto | 6,565 °C | entre 5,96 e 6,23 °C |
| Aprovações indevidas, isto é, riscos não sinalizados | 36 | 23,3 |
| Reprovações desnecessárias, isto é, reensaios evitáveis | 194 | 157,0 |
| Detecção dos estouros de limite | 81,3% | 87,9% |

Quatro ressalvas acompanham esses números e não devem ser separadas deles.

A primeira é que o erro médio da entrega é apresentado como faixa, e não como um número só. O limite inferior vem do método de validação usado ao longo da sprint, que é levemente otimista; o superior vem de um método estrito, que é levemente pessimista. A explicação está na seção 5.7.

A segunda é que metade das leituras do projeto está numa única região, IPC Comp, de modo que o agregado é dominado por ela. O ganho desta sprint vem sobretudo dessa região, e quatro regiões pioraram alguns centésimos.

A terceira é que o conjunto de teste reservado, usado para uma verificação final, melhora em erro médio e piora em triagem. Ele tem apenas dez ensaios e não contém um dos regimes de aquecimento, de modo que a leitura conservadora do desempenho continua sendo a da validação cruzada.

A quarta é que cerca de oitenta abordagens foram avaliadas ao longo do projeto, entre elas uma varredura sistemática de sessenta variantes ao fim da sprint, e apenas uma foi adotada, a média entre Extra Trees e gradiente em Main Vent Sys, com efeito pequeno no agregado, o que está registrado na seção 10 para que não sejam repetidas.

O próximo ganho não depende de modelagem. Cinquenta e sete por cento do erro atual está acima do ruído do próprio laboratório, ou seja, é variação real que as variáveis disponíveis não explicam. Nove perguntas dirigidas à parceira, listadas na seção 15, destravariam esse espaço, e a de maior retorno é confirmar a que perfil de potência corresponde o rótulo simone, presente em trinta e dois dos cinquenta e seis ensaios.

---

## Para quem este documento foi escrito

Este relatório foi escrito para quem vai pegar o repositório e continuar o trabalho sem ter participado da sua construção. Nenhum conhecimento prévio do projeto é suposto. Todos os termos técnicos são definidos na primeira vez em que aparecem, e há uma seção de vocabulário logo adiante que pode ser consultada a qualquer momento.

A leitura pode ser feita de três formas. Quem precisa apenas saber o que foi entregue pode parar no sumário executivo acima, ou ler as seções 1 a 4 para o mesmo conteúdo com as razões de cada decisão. Quem precisa entender as decisões e poder defendê-las deve ler até a seção 9. Quem vai continuar o desenvolvimento deve ler o documento inteiro, porque as seções 10 e 11 registram o que já foi tentado e não funcionou, e repetir esses caminhos custaria semanas.

Sempre que uma temperatura é citada sem unidade, trata-se de graus Celsius.

---

## 1. O que o projeto faz

O projeto constrói um modelo capaz de prever a temperatura que cada componente de um fogão de indução atingirá durante um ensaio térmico, a partir apenas da descrição da configuração do ensaio, isto é, sem que o ensaio precise ser realizado.

O valor disso é econômico e de prazo. Cada ensaio térmico de validação ocupa bancada, instrumentação e tempo de laboratório. Se o modelo indicar com antecedência quais componentes provavelmente ultrapassarão o seu limite de segurança, o ensaio físico pode ser dirigido a esses pontos, e configurações claramente reprovadas podem ser descartadas antes de consumir bancada.

O uso pretendido, portanto, não é o de substituir o ensaio. É o de fazer uma triagem prévia, e é por esse critério que o modelo deve ser julgado.

---

## 2. Vocabulário

Os termos abaixo aparecem ao longo de todo o documento e de todos os cadernos do repositório.

| Termo | O que significa neste projeto |
|---|---|
| Ensaio, ou run | Uma execução física do fogão em laboratório, sob uma configuração declarada. A base tem cinquenta e seis ensaios. |
| Configuração | O conjunto de escolhas que descrevem um ensaio, tais como o tipo de aquecimento, a direção do soprador, o material do suporte das bobinas e o perfil de potência imposto. |
| Componente | Um ponto de medição, correspondente a um termopar instalado numa peça do fogão. A base tem setenta e oito componentes. |
| Leitura | O par formado por um ensaio e um componente, com a temperatura registrada. A base tem cerca de quatro mil leituras. |
| Região, ou área térmica | Um agrupamento de componentes que ocupam a mesma parte do fogão e sofrem os mesmos mecanismos de aquecimento. São sete, descritas na seção 3. |
| Limite ativo | A temperatura máxima admissível para um componente, definida por norma ou pela parceira. Ultrapassá-la é o que o projeto chama de estouro. |
| Margem | Uma folga somada à previsão antes de compará-la ao limite. Existe porque o modelo erra, e é preferível errar sinalizando a mais. A margem acordada é de oito graus Celsius. |
| Triagem | A decisão de sinalizar ou não um componente, obtida comparando a previsão mais a margem contra o limite ativo. |
| Aprovação indevida | O componente que estourou o limite no ensaio real e que a triagem não sinalizou. É o erro caro, porque deixa passar um risco. |
| Reprovação desnecessária | O componente que a triagem sinalizou e que não estourou. É o erro barato, porque custa apenas um reensaio. |
| Detecção | A fração dos estouros reais que a triagem conseguiu sinalizar. |
| Estimador | O algoritmo de aprendizado que produz a previsão. Neste projeto são dois, descritos na seção 6. |
| Erro médio absoluto | A média das diferenças, em módulo, entre a temperatura prevista e a medida. É a métrica principal, e é sempre expressa em graus Celsius. |
| Piso de ruído | A dispersão observada entre ensaios que repetem a mesma configuração física. Como nem o laboratório reproduz a si mesmo exatamente, nenhum modelo pode errar menos do que isso. Serve como régua do que ainda é possível melhorar. |
| Versão anterior, ou Develop | O modelo que estava em vigor antes desta sprint, registrado na branch Develop do repositório. A comparação com ele está na seção 9. |

Os termos ligados ao método de avaliação, tais como dobra, semente e seleção aninhada, são definidos na seção 5, onde o método é explicado.

---

## 3. Os dados disponíveis

Toda a base provém de uma única planilha fornecida pela parceira, com cinquenta e seis ensaios em colunas e setenta e oito componentes em linhas. Os arquivos de dados não são versionados no repositório, por compromisso de proteção de dados entre o Inteli e a parceira, de modo que os cadernos os leem de uma pasta local.

Cada ensaio é descrito por nove campos declarados na planilha, dos quais sete são usados como entrada do modelo: a direção do soprador, o estado do compartimento, a posição da placa, o tipo de ensaio, o perfil de perdas imposto, o estado do furo do defletor e o material do suporte das bobinas. Há ainda um campo de texto livre, chamado motivo, em que o laboratório anota por que aquele ensaio foi feito.

As sete regiões térmicas são as seguintes.

| Região | O que agrupa | Componentes | Leituras |
|---|---|---:|---:|
| IPC Comp | Componentes da placa de potência, incluindo transistores, capacitores e dissipador | 37 | 1.616 |
| Mainback | Peças do painel traseiro, tais como trava de porta, motor de convecção e cordão de força | 10 | 458 |
| Coil Temps | Bobinas de indução e as placas que as suportam | 8 | 344 |
| CT Knobs | Botões e comandos do cooktop | 6 | 270 |
| Main Vent Sys | Sistema principal de ventilação, com dutos e saídas de ar | 5 | 230 |
| IPC Cooling | Refrigeração dedicada à placa de potência | 4 | 179 |
| Oven HMI | Interface do usuário do forno | 3 | 135 |

A tabela já revela o principal desequilíbrio da base: metade das leituras do projeto está numa única região. Qualquer número agregado é, na prática, dominado por IPC Comp, e por isso este relatório apresenta sempre os resultados também região a região.

Um modelo separado é treinado para cada região. A razão é física: os mecanismos que aquecem uma bobina de indução e um botão de comando não são os mesmos, e um modelo único teria de aprender os dois ao mesmo tempo com poucos dados.

---

## 4. O que foi entregue nesta sprint

O modelo entregue prevê a temperatura de cada componente a partir das sete variáveis de configuração, do motivo declarado do ensaio codificado em seis categorias, e de duas variáveis derivadas do próprio componente, que são a sua temperatura média histórica e a sua dispersão histórica. O ajuste pondera as leituras pela proximidade ao limite do componente, conforme a seção 7.5.

Para cada região, duas escolhas são feitas de forma automática e documentada:

| Região | Estimador usado | Como o perfil de perdas é codificado |
|---|---|---|
| Oven HMI | Floresta aleatória | Quatro categorias agrupadas |
| CT Knobs | Floresta aleatória | Treze indicadores detalhados |
| Main Vent Sys | Média entre Extra Trees e gradiente | Treze indicadores detalhados |
| IPC Cooling | Floresta aleatória | Quatro categorias agrupadas |
| Mainback | Floresta aleatória | Treze indicadores detalhados |
| IPC Comp | Floresta aleatória | Quatro categorias agrupadas |
| Coil Temps | Média entre floresta e gradiente | Treze indicadores detalhados |

O resultado global, comparado ao ponto de partida da sprint:

| Indicador | Início da sprint | Entrega | Variação |
|---|---:|---:|---|
| Erro médio absoluto | 6,565 °C | entre 5,96 e 6,23 °C | Melhora de 0,33 a 0,60 °C |
| Aprovações indevidas | 36 | 23,3 | Menos 12,7 componentes |
| Reprovações desnecessárias | 194 | 157,0 | Menos 37,0 componentes |
| Detecção dos estouros | 81,3% | 87,9% | Mais 6,6 pontos |

As aprovações indevidas e as reprovações aparecem com casas decimais porque são a média de três execuções, conforme explicado na seção 5.

Uma observação vale mais do que qualquer um desses números. Quase todas as melhorias desta sprint vieram de corrigir o dado ou a forma de codificá-lo, e não de algoritmo novo. A única exceção é a troca da floresta pelo Extra Trees em Main Vent Sys, descrita na seção 7.6, cujo efeito no agregado é de dois centésimos de grau. Cerca de oitenta abordagens foram avaliadas ao longo do projeto e só essa foi adotada, conforme a seção 10 detalha.

---

## 5. Como o modelo é avaliado

Esta seção é a mais importante do documento para quem for continuar o trabalho, porque todo número citado aqui depende do método descrito nela.

### 5.1 O problema que o método precisa evitar

A forma comum de avaliar um modelo consiste em separar parte das linhas ao acaso e usá-las para testar. Aqui isso produziria um resultado falsamente bom.

O motivo é que várias leituras vêm do mesmo ensaio. Se metade dos componentes de um ensaio for para o treino e a outra metade para o teste, o modelo terá visto aquela condição experimental e apenas reconhecerá a configuração em vez de generalizar para uma nova. O número resultante seria alto e não se confirmaria em uso.

Isso não é argumento teórico. Foi medido, com o mesmo modelo, a mesma base e as mesmas variáveis, mudando apenas o agrupamento das dobras.

| Região | Configuração fora | Ensaio fora | Aleatório, 5 dobras | Aleatório, 10 dobras |
|---|---:|---:|---:|---:|
| Oven HMI | 2,393 | 2,164 | 1,866 | 2,076 |
| CT Knobs | 2,979 | 2,662 | 2,558 | 2,512 |
| Main Vent Sys | 4,170 | 3,308 | 3,370 | 3,196 |
| IPC Cooling | 3,994 | 3,196 | 3,288 | 3,261 |
| Mainback | 4,503 | 3,956 | 3,472 | 3,371 |
| IPC Comp | 7,503 | 5,259 | 3,419 | 3,295 |
| Coil Temps | 11,444 | 7,078 | 6,824 | 6,656 |
| Agregado | 6,474 | 4,669 | 3,642 | 3,538 |

A divisão aleatória por leitura faz o erro parecer quarenta e cinco por cento menor. O caso extremo é IPC Comp, que cai para menos da metade, o que é coerente: é a região com mais componentes por ensaio, trinta e sete, portanto a que mais se beneficia de ter irmãos do mesmo ensaio no treino.

A coluna do meio merece explicação, porque corresponde a um protocolo que parece correto e não é. Retirar um ensaio por vez, em quarenta e seis dobras, ainda deixa no treino outros ensaios de configuração idêntica: a base tem apenas trinta e oito assinaturas de entrada distintas para cinquenta e seis ensaios. O modelo continua reconhecendo em vez de generalizar, e o erro aparece 1,8 grau menor.

Uma observação de nomenclatura, útil ao comparar resultados com outras equipes. O protocolo adotado aqui é um leave one group out, em que o grupo é a configuração experimental. Dizer que um resultado usa leave one group out não o identifica: o que decide é o que define o grupo, e a diferença entre definir o grupo como a configuração ou como o ensaio é, nesta base, de 1,8 grau. Nenhum erro relatado é comparável entre equipes sem que o agrupamento esteja declarado ao lado.

### 5.2 O método adotado

A validação retira uma configuração experimental inteira por vez, com todos os seus componentes e todos os ensaios que a repetem, treina o modelo com as demais e prevê a que ficou de fora.

Há dezessete configurações distintas no conjunto de desenvolvimento, portanto o processo se repete dezessete vezes. Cada uma dessas repetições é chamada de dobra. Ao final, cada leitura foi prevista exatamente uma vez, sempre por um modelo que nunca viu a sua condição experimental.

Os algoritmos usados têm um componente aleatório, de modo que dois treinamentos sobre os mesmos dados não produzem previsões idênticas. Para que nenhuma conclusão dependa de sorte, todo o processo é repetido três vezes com sementes aleatórias diferentes, e o que se relata é a média. Semente, aqui, é apenas o número que fixa o gerador aleatório e torna a execução reproduzível.

### 5.3 O conjunto de teste reservado

Dez dos cinquenta e seis ensaios foram separados no início do projeto e não participam de nenhuma decisão. Eles servem para uma verificação final, feita uma única vez, do modelo já pronto.

Esse conjunto tem duas limitações que precisam acompanhar qualquer citação dele. A primeira é o tamanho: dez ensaios, com metade das leituras concentradas numa única região. A segunda é a composição: o tipo de ensaio broil c1 não tem representação alguma nele, e o tipo pyro, que é o regime mais quente e o que mais produz estouros, comparece com um único caso entre os oito existentes.

Por essas duas razões, a documentação do projeto registra desde a terceira sprint que a leitura conservadora do desempenho é a da validação cruzada, que cobre os dois regimes. Essa orientação foi escrita quando o conjunto reservado favorecia o modelo, e é mantida agora que ele o desfavorece.

### 5.4 O que é uma seleção aninhada

Várias decisões deste projeto consistem em escolher, para cada região, entre dois ou mais candidatos. Escolher o melhor candidato olhando o resultado final é um erro conhecido: o número obtido mede também o acerto da escolha, e não apenas a capacidade do modelo de generalizar.

Para evitá-lo, a escolha é feita de forma aninhada. Dentro de cada dobra, o candidato é escolhido pelo desempenho nas dezesseis outras dobras, e só então aplicado à dobra retida. O critério de escolha nunca observa os valores da dobra retida.

Uma ressalva de método acompanha isso e não deve ser omitida. Os erros de cada candidato são calculados uma vez, deixando uma dobra de fora por vez, e a seleção reutiliza esses erros. O modelo que previu uma leitura da dobra j foi treinado com todas as dobras exceto j, incluindo a dobra k que depois será retida, de modo que o critério de escolha, embora não veja os desfechos da dobra k, é construído a partir de modelos que a usaram no treino. A aproximação é leve e otimista. Um aninhamento estrito, com validação interna refeita dentro do conjunto de treino de cada dobra, foi implementado apenas no teste de empilhamento da seção 10.8, onde era indispensável por haver pesos a estimar.

Quanto isso importa foi medido neste projeto e é grande. Uma busca de hiperparâmetros aparentava render 0,506 °C quando escolhida olhando as mesmas dobras em que era avaliada, e rendeu 0,051 °C quando a escolha foi aninhada. Noventa por cento do ganho aparente era o próprio ato de escolher.

### 5.5 As métricas e o que cada uma decide

O erro médio absoluto é a métrica principal, por ser a única expressa na unidade do problema e comparável ao limite de cada componente.

O piso de ruído é a régua de quanto ainda é possível melhorar. Ele é medido comparando entre si ensaios que repetem a mesma configuração física: a diferença entre eles não é erro de modelo, é variação do próprio laboratório.

As aprovações indevidas e a detecção medem a segurança da triagem, que é o uso pretendido. Uma melhora no erro médio que piorasse essas duas não seria uma melhora.

O coeficiente de determinação, chamado R², consta das tabelas por convenção, mas não decide nada neste projeto. Ele compara o erro do modelo à variação total dos dados, de modo que uma região cujas temperaturas variem pouco terá R² baixo mesmo com previsões excelentes. Oven HMI é exatamente esse caso: tem o menor erro absoluto de todas as regiões e um R² próximo de zero.

### 5.6 Verificações feitas sobre o próprio método

Quatro verificações foram conduzidas para checar se o método de avaliação descrito acima é confiável. Nenhuma delas mede desempenho de modelo; todas medem se o modo de medir está correto.

A primeira tratou do vazamento de informação. O pré-processamento passou a residir num pipeline, isto é, numa sequência em que cada transformação aprende os seus parâmetros apenas com os dados de treino. O risco nesta base não está no escalonamento das variáveis, e sim na temperatura média e na dispersão de cada componente, que são derivadas do próprio alvo. Esses dois valores passam a ser calculados apenas com as linhas de treino de cada dobra e somente aplicados às linhas de validação.

A segunda tratou do custo dos erros. Para as decisões de seleção foi adotada uma métrica assimétrica, em que prever abaixo do valor real custa 5,57 vezes mais do que prever acima. Essa razão não foi arbitrada: ela decorre da troca que o projeto já aceita ao escolher a margem de oito graus.

A terceira tratou de deriva temporal. Se o fogão ou a instrumentação tivessem mudado ao longo dos meses de ensaio, treinar com ensaios antigos e prever ensaios novos seria mais difícil do que a validação cruzada sugere. Foi montada uma validação cronológica de janela expansiva, com a ordem de execução recuperada do número contido no título de cada coluna da planilha. Não há sinal de deriva: em três dos cinco cortes o erro cronológico ficou abaixo do de um controle de mesmo tamanho, e a dispersão entre controles supera qualquer das diferenças observadas. Conclui-se que o esquema de validação em uso não subestima a dificuldade do uso real.

A quarta tratou de plausibilidade física. Uma auditoria por atribuição, que mede quanto cada variável pesa na previsão, não encontrou variável implausível entre as de maior peso. A temperatura média e a dispersão do componente respondem por 52,7 por cento da atribuição em média. Nas bobinas, a média do componente cai para 30,3 por cento e o tipo de ensaio sobe para 33,4, o que corresponde a pontos governados pela potência dissipada. Em Mainback ocorre o oposto, com 69,1 por cento na média do componente e apenas 3,0 no tipo de ensaio, o que converge com o estudo por elementos finitos descrito na seção 10.7.

### 5.7 O que o número de desempenho significa, e por que ele é uma faixa

Ao fim da sprint, a escolha por região descrita na seção 5.4 foi medida de duas formas, sobre exatamente as mesmas previsões, e as duas discordam de modo que obriga a apresentar o desempenho da entrega como faixa.

A forma aproximada é a que a sprint usou em todas as suas decisões. Em cada dobra, o candidato é escolhido pelo erro nas outras dezesseis dobras. Esses erros, porém, vêm de modelos que foram treinados com todas as dobras menos aquela em que cada erro foi medido, e portanto incluem no treino a dobra que depois será julgada. O critério de escolha nunca observa os desfechos dessa dobra, mas é construído com modelos que a viram.

A forma estrita elimina essa influência. Para cada dobra, toda a escolha é refeita dentro das dezesseis dobras de treino, por uma validação interna própria, que reúne as dezesseis configurações em quatro blocos e remove um bloco por vez, recalculando o patamar e a escala de cada componente em cada bloco. Nada da dobra julgada entra em qualquer ajuste que participe da escolha.

| Forma de medir a entrega | Erro médio | Aprovações indevidas | Detecção |
|---|---:|---:|---:|
| Regra por região escrita como constante | 5,884 | 23,3 | 87,9% |
| Escolha aproximada, como na seção 23 do caderno | 5,980 | 23,3 | 87,9% |
| Escolha estrita | 6,273 | 31,3 | 83,8% |

A escolha aproximada reproduz exatamente o valor da seção 23 do caderno de modelagem, o que confirma que as duas medições tratam da mesma coisa.

Os valores acima são anteriores à troca do estimador em Main Vent Sys, descrita na seção 7.6. Com ela, a seção 23 do caderno de modelagem passa a medir 5,961 pelo método aproximado. A tabela acima foi produzida por uma implementação auxiliar, fora dos cadernos. O valor estrito que consta dos cadernos está na seção 1 do caderno analises_complementares, que reimplementa as duas escolhas sobre as mesmas previsões: 6,233 com a troca e 6,230 sem ela, com 32,3 aprovações indevidas e 83,2 por cento de detecção. A diferença de cerca de quatro centésimos entre as duas implementações do método estrito vem de detalhes de construção, e é o valor dos cadernos que o documento adota daqui em diante.

O método estrito também tem um viés, no sentido oposto. Ele decide com modelos treinados em doze configurações e prevê com modelos treinados em dezesseis, e com menos dados a escolha fica mais instável: em IPC Comp, por exemplo, ela se divide entre três candidatos, ao passo que a aproximada escolhia o mesmo em quarenta e nove de cinquenta e uma vezes. O valor estrito é, portanto, levemente pessimista.

O desempenho da entrega está entre os dois, e é por isso apresentado como faixa, hoje de 5,96 a 6,23 graus.

Uma referência sem escolha alguma ajuda a situar essa faixa. Aplicar a mesma formulação em todas as regiões, sem escolher nada por região, elimina o otimismo de seleção quase por completo.

| Formulação única, aplicada nas sete regiões | Erro médio | Aprovações indevidas | Detecção |
|---|---:|---:|---:|
| Floresta, perdas detalhadas | 6,499 | 31,7 | 83,6% |
| Floresta, perdas agrupadas | 6,101 | 25,3 | 86,9% |
| Mescla, perdas detalhadas | 6,162 | 31,0 | 83,9% |
| Mescla, perdas agrupadas | 6,096 | 22,3 | 88,4% |

A melhor formulação única, 6,096, cai dentro da faixa da entrega. A vantagem da escolha por região sobre a melhor formulação única é de 0,116 grau pelo método aproximado e de menos 0,176 pelo estrito, e não é, portanto, demonstrável.

Isso não anula o ganho da sprint, mas o reinterpreta. Da floresta com perdas detalhadas à mescla com perdas agrupadas, aplicadas por igual em todas as regiões, há 0,403 grau de ganho sem nenhuma escolha por região. O que melhorou o modelo foi a mescla e o agrupamento das perdas; a escolha área a área de qual usar acrescenta pouco ou nada que se possa medir com rigor.

Duas consequências decorrem disso. Os ganhos atribuídos neste documento à escolha por região, de 0,320 para o estimador e de 0,184 e 0,127 para as perdas, foram medidos com o método aproximado e devem ser lidos como otimistas. E a entrega foi mantida com a escolha por região, por decisão registrada ao fim da sprint, com o desempenho reportado como faixa e a formulação única como referência ao lado.

---

## 6. Os algoritmos usados, e por que apenas dois

Dois estimadores compõem a entrega, e ambos pertencem à família das árvores de decisão.

A floresta aleatória constrói trezentas árvores independentes, cada uma sobre uma amostra diferente dos dados, e devolve a média das suas previsões. As árvores crescem sem limite de profundidade. É o estimador usado em cinco das sete regiões.

A média entre floresta e gradiente combina a floresta descrita acima com um segundo modelo, o gradiente, que constrói trezentas árvores rasas, de profundidade três, cada uma corrigindo o erro deixado pelas anteriores. A previsão final é a média aritmética das duas. É o estimador usado em Main Vent Sys e Coil Temps.

Sobre hiperparâmetros, que são os valores de configuração do próprio algoritmo, cabe um registro explícito. Apenas um foi escolhido pelo projeto: o número de trezentas árvores. Todo o resto permanece no padrão da biblioteca, isto é, profundidade livre, folha mínima de um elemento, todas as variáveis consideradas em cada divisão e taxa de aprendizado de um décimo.

Essa ausência de ajuste é deliberada e medida, não negligência. As três medições que a sustentam estão na seção 10.2.

---

## 7. As mudanças desta sprint, uma a uma

### 7.1 O motivo do ensaio passou a ser codificado em categorias exclusivas

Situação anterior. O campo de texto livre em que o laboratório anota por que o ensaio foi feito era convertido em seis colunas de sim ou não, cada uma marcando a presença de uma palavra-chave, tais como fluxo, cobertura ou duto. Essas seis colunas se sobrepunham: um ensaio que acrescentasse uma cobertura e trocasse o duto acendia duas delas ao mesmo tempo.

Problema. Uma árvore de decisão separa os dados por uma coluna de cada vez. Com indicadores sobrepostos, distinguir um caso exige encadear várias divisões, o que consome profundidade e exemplos. Com um rótulo exclusivo, a mesma distinção se resolve numa divisão só.

Mudança. As seis colunas sobrepostas deram lugar a uma única classificação em seis níveis mutuamente exclusivos, de modo que cada ensaio pertence a exatamente um deles: caminho do ar, cobertura do dissipador, placa, estudo de posição, outro e não declarado.

Resultado. O ganho é positivo nas sete regiões, quando medido no estimador que cada região de fato utiliza, e nas três sementes em seis delas.

| Região | Ganho com floresta | Ganho com floresta e gradiente | Estimador da região | Ganho efetivo |
|---|---:|---:|---|---:|
| Mainback | +1,172 | +1,426 | floresta | +1,172 |
| Main Vent Sys | +0,101 | +0,380 | floresta e gradiente | +0,380 |
| CT Knobs | +0,194 | +0,168 | floresta | +0,194 |
| Oven HMI | +0,188 | +0,091 | floresta | +0,188 |
| IPC Comp | +0,128 | +0,576 | floresta | +0,128 |
| IPC Cooling | +0,073 | −0,130 | floresta | +0,073 |
| Coil Temps | −0,182 | +0,009 | floresta e gradiente | +0,009 |

Um aviso de leitura desta tabela, porque ela já induziu a erro. As duas primeiras colunas trazem o ganho que o agrupamento produziu, e não o erro do estimador. Um ganho maior indica que aquele estimador sofria mais com o defeito, e não que ele termine melhor.

Mainback ilustra o ponto. O ganho é maior com a mescla, 1,426 contra 1,172, e ainda assim a região usa floresta pura, porque o erro final da floresta é 4,500 °C contra 4,846 °C da mescla. A mescla ganha mais por partir de pior: as suas árvores têm profundidade três, de modo que indicadores sobrepostos a prejudicam mais do que prejudicam a floresta, que cresce sem limite. Corrigir o defeito devolve mais a quem perdia mais, sem inverter a ordem.

Os dois valores negativos da tabela, a refrigeração da placa com a mescla e as bobinas com a floresta pura, caem em combinações de região e estimador que a entrega não usa.

Mainback responde por boa parte do ganho, o que é coerente com o domínio: o calor chega àquela região pelo ar de exaustão, e o agrupamento reúne justamente as alterações de caminho do ar, tais como duto, bandeja e defletor.

Foi medido também o que aconteceria se o motivo declarado fosse simplesmente descartado, alternativa que chegou a ser considerada: o erro subiria para 7,335 e as aprovações indevidas de trinta e cinco para quarenta e cinco. O motivo carrega informação real, e o problema estava na forma de codificá-lo, não na sua presença.

### 7.2 Um componente duplicado foi removido

Situação anterior. A região Oven HMI tinha quatro componentes.

Problema. Dois deles, registrados na planilha com nomes diferentes, eram a mesma série numérica, bit a bit, nos cinquenta e cinco ensaios em que ambos têm leitura registrada. A correlação entre eles é exatamente um e a diferença máxima é exatamente zero. Uma das duas linhas é, portanto, uma cópia, e ela inflava artificialmente o peso daquela região e distorcia as suas estatísticas.

Mudança. A preparação dos conjuntos passa a detectar colunas de alvo idênticas e a descartar a repetida, registrando no próprio caderno os dois nomes envolvidos.

Resultado. A região melhorou de 2,565 °C para 2,382 °C, e o seu R² passou de menos 0,033 para mais 0,026.

Pendência. Qual dos dois nomes corresponde ao termopar realmente instalado é pergunta para a parceira, e está na seção 15.

### 7.3 O estimador passou a ser escolhido por região

Situação anterior. Um único estimador era usado em todas as sete regiões.

Problema. As regiões diferem em quantidade de dados, em amplitude térmica e em quão fortemente respondem à configuração, e nenhum estimador vence em todas.

Mudança. Para cada região, a escolha entre floresta e mescla é feita de forma aninhada, conforme a seção 5.4.

Resultado. Ganho de 0,320 °C, com intervalo de confiança entre mais 0,234 e mais 0,408 e ganho positivo nas três sementes.

### 7.4 O perfil de perdas passou a ser codificado por região

Esta mudança nasceu da auditoria descrita na seção 8, e é a última da sprint.

Situação anterior. O campo que declara o perfil de potência imposto às bobinas era convertido em treze colunas de sim ou não, uma para cada rótulo distinto encontrado na planilha.

Problema. Cinco dessas treze colunas estavam ativas num único ensaio cada. Sob validação que remove a configuração inteira, uma coluna ativa num único ensaio nunca está ligada no treino quando aquele ensaio é previsto, de modo que ela não pode ajudar e pode atrapalhar. Além disso, vários rótulos descrevem o mesmo perfil com nomes diferentes: dos treze indicadores, sete mencionam simone e cinco mencionam miro, e a ordem das bobinas, que distingue parte deles, já ocupa uma coluna própria desde esta sprint.

Mudança. Foi criada uma codificação alternativa, com quatro níveis mutuamente exclusivos, que são sem perdas, simone, miro e não declarado. A escolha entre as duas codificações passa a ser feita por região, de forma aninhada, junto com a escolha de estimador. A grade de candidatos tem portanto quatro elementos: dois estimadores por duas codificações.

Resultado. A tabela abaixo traz o erro de cada um dos quatro candidatos em cada região, para que o efeito da codificação seja lido com o estimador fixo e não se confunda com a troca de estimador.

| Região | Floresta, detalhadas | Floresta, agrupadas | Mescla, detalhadas | Mescla, agrupadas |
|---|---:|---:|---:|---:|
| Oven HMI | 2,382 | 2,316 (escolhida) | 2,541 | 2,512 |
| CT Knobs | 2,953 (escolhida) | 2,973 | 2,979 | 3,046 |
| Main Vent Sys | 4,139 | 4,374 | 3,865 (escolhida) | 4,078 |
| IPC Cooling | 4,004 | 3,772 (escolhida) | 4,227 | 3,876 |
| Mainback | 4,500 (escolhida) | 4,743 | 4,846 | 5,397 |
| IPC Comp | 7,522 | 6,618 (escolhida) | 7,109 | 6,934 |
| Coil Temps | 11,340 | 11,308 | 10,324 (escolhida) | 10,417 |

O agrupamento ajuda em Oven HMI, IPC Cooling e IPC Comp, e atrapalha nas outras quatro, sempre de forma consistente nas três sementes. É por isso que ele não foi adotado em bloco: aplicado a todas as regiões, rende apenas 0,042 °C, com intervalo de confiança que contém o zero, ou seja, indistinguível de ruído.

Escolhido por região, o ganho é de 0,127 °C sobre a formulação anterior, de 6,107 para 5,980, com intervalo de confiança entre mais 0,044 e mais 0,214. Este ganho foi medido com o método aproximado de escolha descrito na seção 5.4, e deve ser lido como otimista, conforme a seção 5.7.

Dois instrumentos aparecem aqui e medem coisas diferentes. O intervalo de confiança indica onde estaria o ganho médio se o experimento fosse repetido; não conter o zero significa que o ganho médio é real. O teste de Wilcoxon pergunta se as leituras individuais melhoraram de forma generalizada; rejeitar significa que o ganho não vem de poucas leituras que melhoraram muito.

Neste caso os dois discordam: o intervalo exclui o zero e o Wilcoxon não rejeita, com p de 0,18. A leitura correta é que o ganho médio existe mas se concentra numa minoria de leituras, em lugar de deslocar a distribuição inteira. Antes da adoção do peso descrito na seção 7.5, os dois concordavam; o peso, ao redistribuir a atenção do ajuste, tornou o ganho mais concentrado.

Em IPC Comp a seleção troca as duas coisas ao mesmo tempo, adotando a codificação agrupada e a floresta pura, e a região cai de 7,499 °C para 6,606 °C. Como aquela região concentra metade das leituras do projeto, é dela que vem quase todo o ganho agregado da mudança.

Uma lacuna fica registrada em vez de preenchida com conjectura. Onde o sinal do perfil de perdas é fraco, trocar resolução por suporte estatístico ajuda; onde ele é fino, a distinção entre os treze rótulos carrega informação real. Por que Mainback distingue perfis que IPC Comp não distingue não tem, até aqui, explicação física.

### 7.5 O ajuste passou a priorizar as leituras próximas do limite

Esta mudança é a última da sprint e é de natureza diferente das quatro anteriores. Ela não corrige o dado; muda o que o ajuste do modelo considera importante.

Situação anterior. Todas as leituras pesavam igual no ajuste, de modo que acertar um componente que opera a quarenta graus do seu limite valia tanto quanto acertar um que opera sobre ele.

Problema. A triagem decide comparando a previsão mais a margem contra o limite. Um erro cometido longe do limite não altera decisão alguma, ao passo que um erro de dois graus numa peça a três graus do limite inverte a decisão. A métrica que o projeto reporta, porém, trata os dois igualmente.

Mudança. Cada leitura do conjunto de treino passa a receber peso um mais duas vezes uma gaussiana de largura quinze graus, centrada no limite do seu componente. Uma leitura sobre o limite pesa três, uma a trinta graus dele pesa praticamente um, e componentes sem limite tabelado pesam um. A forma foi fixada antes de medir e não foi ajustada depois, de modo que não há otimismo de seleção a descontar. Trata-se de uma decisão única, aplicada a todas as regiões, e não de uma escolha por região.

Resultado, medido com três sementes antes da adoção e confirmado na execução do caderno.

| Indicador | Sem peso | Com peso |
|---|---:|---:|
| Erro médio absoluto | 5,950 | 5,980 |
| Viés | −0,072 | +0,196 |
| Aprovações indevidas | 29,7 | 23,3 |
| Reprovações desnecessárias | 142,7 | 157,0 |
| Detecção | 84,6% | 87,9% |

O erro médio fica praticamente inalterado, com ganho de menos 0,011 na medição de três sementes e intervalo de confiança entre menos 0,063 e mais 0,040. As aprovações indevidas caem vinte e um por cento, e a redução ocorreu nas três sementes, de vinte e nove para vinte e três, de trinta para vinte e três e de trinta para vinte e quatro. O custo são quatorze reprovações desnecessárias a mais, que correspondem a reensaio, e é a troca que o projeto já aceitou ao escolher a margem de oito graus.

O ganho de segurança concentra-se em IPC Comp, que passa de 15,7 para 11,0 aprovações indevidas e de 89,0 para 92,3 por cento de detecção.

Uma ressalva que não deve ser omitida. No conjunto de teste reservado o peso não se reproduziu: o erro subiu de 4,896 para 5,143, as aprovações indevidas permaneceram em doze e a detecção permaneceu em 81,0 por cento, com sete reprovações desnecessárias a menos. Aquele conjunto contém sessenta e três estouros contra cento e noventa e três da validação, de modo que é justamente onde o efeito deveria aparecer que ele tem menos dados para aparecer. A decisão de manter o peso apoia-se na validação cruzada, que é a leitura conservadora do projeto, e o resultado do conjunto reservado fica registrado sem atenuação.


### 7.6 Main Vent Sys passou a usar o Extra Trees na mescla com o gradiente

Ao fim da sprint, a comparação de algoritmos, feita com vários estimadores nas sete regiões, mostrou a média entre Extra Trees e gradiente à frente da média entre floresta e gradiente em Main Vent Sys, em todas as sementes, com e sem o motivo do ensaio e com e sem o peso. A mescla foi acrescentada como candidata apenas nessa região, e a escolha aninhada da seção 23 a elegeu nas cinquenta e uma escolhas.

| Main Vent Sys | Antes | Depois |
|---|---:|---:|
| Erro médio na validação cruzada, método aproximado | 4,001 | 3,739 |
| Erro médio no conjunto reservado | 3,538 | 3,708 |
| Agregado das sete regiões, método aproximado | 5,980 | 5,961 |

Três ressalvas limitam o alcance da troca. A região tem sete por cento das leituras, de modo que o agregado muda dois centésimos de grau, e pelo método estrito a diferença é nula. A troca foi identificada olhando os resultados, e o ganho está abaixo do piso de ruído da região. E no conjunto reservado, com cinquenta leituras, o erro da região subiu, repetindo o padrão já observado com o peso.

A mesma mescla não foi estendida às demais regiões. Uma grade ampla, registrada na seção 1 do caderno analises_complementares, com vinte candidatos por região, formados por cinco estimadores, duas codificações das perdas e o motivo presente ou ausente, piorou o agregado em 0,33 grau quando medida pelo aninhamento estrito, com mais aprovações indevidas. Em Coil Temps, a mescla reduz o erro médio de 10,28 para 9,66 graus, mas dobra as aprovações indevidas, de 6,3 para 14, e por isso também não foi adotada ali.

Por fim, depois da reexecução do caderno random_search_13cat com o motivo do ensaio, os hiperparâmetros vencedores do gradiente em cada região foram testados como candidatos da escolha por região, sozinhos e em média com a floresta, nas duas codificações das perdas e com o peso. O erro médio não melhora de forma demonstrável: aplicado em todas as regiões, o gradiente buscado empata com a entrega, 5,858 contra 5,866; como candidato da escolha, ganha 0,040 grau pelo método estrito, com intervalo entre menos 0,041 e mais 0,120, e perde 0,121 pelo aproximado. A triagem melhora pelo método estrito, com as aprovações indevidas caindo de 32,3 para 20,3 e a detecção subindo de 83,2 para 89,5 por cento, em troca de cerca de trinta reprovações desnecessárias a mais. Como esses hiperparâmetros foram escolhidos nas mesmas dezessete dobras em que foram avaliados, otimismo que nem o método estrito remove, e como a busca refeita dentro das dobras já havia piorado a entrega em 0,448 grau, o grupo decidiu manter a entrega. Esta medição foi feita num script auxiliar, fora dos cadernos, e não é reproduzível a partir do repositório.

---

## 8. A auditoria da qualidade do dado bruto

Ao fim da sprint, a planilha original foi submetida a uma auditoria sistemática, com dez verificações sobre ela e seis sobre a matriz de entrada que chega ao modelo.

O primeiro resultado é positivo e merece registro. O dado bruto é bom em faixa e em consistência interna: não há valor negativo, nem valor abaixo de quinze graus, nem acima de quatrocentos, nem acima do dobro do limite do próprio componente. Não há sensor com leitura congelada, nem coluna de ensaio duplicada, nem nome de sensor repetido, nem suspeita de vírgula deslocada. São quatro mil e cinquenta e sete leituras numéricas verificadas.

Cinco constatações, porém, têm consequência.

### 8.1 O perfil de perdas em treze colunas, cinco delas de ensaio único

Descrita na seção 7.4. É a única constatação da auditoria que já se converteu em ganho de desempenho.

### 8.2 Duas variáveis perfeitamente confundidas

O tipo de ensaio pyro e a ausência de perdas declaradas são a mesma coluna, nas cinquenta e seis linhas: todo ensaio de pyro tem perdas declaradas como nenhuma, e todo ensaio sem perdas é pyro. O mesmo ocorre entre o tipo broil c1 e o perfil de perdas correspondente.

A consequência é que o modelo não tem como separar o efeito de uma variável do efeito da outra, e a equipe não tem como saber qual das duas ele utilizou. Isto não é erro de digitação e sim lacuna de delineamento experimental: falta um ensaio de pyro com perdas, ou um de broil sem perdas.

### 8.3 Um par de repetições que discorda de si mesmo

A planilha contém dois ensaios chamados Run 43, com configuração declarada idêntica, que portanto são tratados como repetição um do outro. Eles discordam em 6,39 °C em média na região IPC Comp, com diferença máxima de 17,09 °C num dos transistores. Os outros quatro pares de repetição da mesma região discordam entre 0,53 °C e 1,64 °C.

A consequência recai sobre a régua e não sobre o modelo. Como o piso de ruído é estimado justamente sobre pares de repetição, esse par sozinho responde por trinta por cento do piso daquela região.

| Cenário | Piso ponderado | Folga acima do piso |
|---|---:|---|
| Como está hoje | 2,617 °C | 3,517 °C, ou 57% do erro atual |
| Sem o par Run 43 | 2,140 °C | 3,994 °C, ou 65% do erro atual |

Se aquele par for repetição legítima, o laboratório tem repetibilidade de 3,52 °C em IPC Comp e o modelo já está a duas vezes o piso, com pouca folga. Se for ensaio mal rotulado, a repetibilidade real é de 2,46 °C e há bastante a ganhar. A diferença entre essas duas leituras do projeto depende de dois ensaios.

### 8.4 Dois pontos do delineamento descritos de forma idêntica

Os ensaios identificados na planilha como DoE Run 7 e DoE Run 8 são tratados por ela como pontos diferentes do delineamento experimental, mas têm os nove campos de metadado idênticos. Eles discordam em 32,58 °C numa das placas de alumínio. Ou diferem em algo que não foi anotado, ou um dos dois rótulos está errado.

A chave de réplicas do projeto, que é mais fina do que os nove campos declarados, já os separa, de modo que o piso de ruído não é afetado por eles.

### 8.5 Os dezesseis transistores formam quatro grupos físicos

A auditoria apontou inicialmente que os componentes IGBT 3 e IGBT 4 têm correlação de 0,99959 e diferença média de 0,72 °C ao longo dos cinquenta e seis ensaios, o que sugeria dois termopares fisicamente próximos.

A investigação posterior, descrita na seção 10.6, mostrou que o caso é mais geral e mais útil. Os dezesseis transistores da placa de potência se organizam em quatro grupos de quatro, e essa estrutura foi recuperada por aglomeração hierárquica sem que nenhum nome ou ordem fosse informado ao procedimento.

| Grupo | Temperatura média | Dispersão interna | Correlação interna |
|---|---:|---:|---:|
| IGBT 1 a 4 | 88,48 °C | 1,97 °C | 0,99164 |
| IGBT 5 a 8 | 91,94 °C | 4,24 °C | 0,98962 |
| IGBT 9 a 12 | 98,54 °C | 2,56 °C | 0,99071 |
| IGBT 13 a 16 | 95,66 °C | 1,03 °C | 0,98629 |

A correlação média dentro dos grupos é de 0,9896, contra 0,9072 entre grupos. A dispersão mediana dentro de um grupo é de 2,05 °C, contra 15,82 °C entre os dezesseis.

O valor de 2,05 °C merece atenção porque é inferior ao piso de ruído de IPC Comp, que é de 3,52 °C. Dentro de um grupo, os quatro transistores diferem menos do que o próprio laboratório difere de si mesmo quando repete um ensaio, ou seja, são estatisticamente indistinguíveis.

A consequência prática está na seção 15: se a numeração corresponder a uma bobina por grupo, o perfil de potência declarado no ensaio poderá ser ligado diretamente a cada grupo de transistores.

### 8.6 Constatações de menor porte

Dez sensores não têm limite declarado, todos eles de duto ou de ar, o que é coerente com não possuírem limite normativo. Sessenta e oito das setenta e oito linhas perderam o número do termopar, substituído por uma referência quebrada de planilha, o que significa que a rastreabilidade ao termopar fisicamente instalado se perdeu numa edição anterior do arquivo. Um sensor existe como linha e não possui leitura alguma. Dois nomes contêm espaço duplo.

---
## 9. Comparação com a versão anterior

### 9.1 O que é a versão anterior

A versão anterior é a que está registrada na branch Develop do repositório e resultou da terceira sprint. Ela difere da atual em cinco pontos.

| Aspecto | Versão anterior | Quarta sprint |
|---|---|---|
| Codificação do perfil de perdas | Agrupada pelo perfil de potência | Treze categorias, escolhidas por região entre detalhadas e agrupadas |
| Motivo declarado do ensaio | Seis indicadores de palavra, sobrepostos entre si | Seis níveis mutuamente exclusivos |
| Componentes da interface | Quatro, sendo dois deles cópias um do outro | Três, após a remoção da cópia |
| Estimador | Floresta aleatória em todas as sete regiões | Escolhido por região, entre dois candidatos |
| Perfil de perdas na modelagem | Igual em todas as regiões | Escolhido por região, entre duas codificações |

### 9.2 Resultado global

| Indicador, na validação cruzada | Versão anterior | Quarta sprint | Diferença |
|---|---:|---:|---:|
| Erro médio absoluto | 6,565 | entre 5,96 e 6,23 | Melhora de 0,33 a 0,60 |
| Aprovações indevidas | 36 | 23,3 | Menos 12,7 |
| Reprovações desnecessárias | 194 | 157,0 | Menos 37,0 |
| Detecção dos estouros | 81,3% | 87,9% | Mais 6,6 pontos |

| Indicador, no conjunto reservado | Versão anterior | Quarta sprint |
|---|---:|---:|
| Erro médio absoluto | 4,37 | 5,154 |
| Predições dentro de dez por cento | 85,7% | 82,6% |
| Aprovações indevidas, margem de oito graus | 6 | 12 |

Os dois conjuntos apontam em sentidos opostos, e essa contradição é o assunto da seção 9.6. Ela não é atenuada em nenhum ponto deste documento.

### 9.3 Região a região, na validação cruzada

| Região | Versão anterior | Quarta sprint | Diferença | Estimador adotado | Perdas |
|---|---:|---:|---:|---|---|
| Coil Temps | 11,71 | 10,612 | −1,098 | floresta e gradiente | detalhadas |
| Mainback | 5,68 | 4,586 | −1,094 | floresta | detalhadas |
| Main Vent Sys | 4,68 | 3,739 | −0,941 | Extra Trees e gradiente | detalhadas |
| IPC Comp | 7,30 | 6,677 | −0,623 | floresta | agrupadas |
| CT Knobs | 3,16 | 3,051 | −0,109 | floresta | detalhadas |
| IPC Cooling | 4,04 | 4,066 | +0,026 | floresta | agrupadas |
| Oven HMI | 2,42 | 2,321 | não comparável | floresta | agrupadas |

Duas ressalvas de leitura acompanham esta tabela e não devem ser omitidas.

A primeira diz respeito a Oven HMI. A coluna da versão anterior foi medida quando aquela região tinha quatro componentes, sendo dois deles cópias exatas um do outro. A coluna atual foi medida com três. Os dois números descrevem conjuntos diferentes de leituras e não podem ser subtraídos. As demais seis regiões não foram afetadas pela remoção da cópia e são diretamente comparáveis.

A segunda diz respeito ao agregado. Pelo mesmo motivo, o total da versão anterior cobre 3.277 leituras e o atual cobre 3.232. A comparação rigorosa, feita sobre exatamente o mesmo conjunto de leituras, está na seção 9.5.

### 9.4 Triagem de segurança

Esta é a comparação de maior consequência prática, porque a aprovação indevida corresponde ao componente que ultrapassou o limite de segurança no ensaio real e que a triagem deixou passar.

Os números abaixo são de validação cruzada, sobre 193 estouros reais em 3.037 leituras que possuem limite tabelado, com a margem de oito graus acordada com a parceira.

| Indicador | Versão anterior | Após o motivo agrupado e o estimador por região | Entrega atual |
|---|---:|---:|---:|
| Aprovações indevidas | 36 | 33,7 | 23,3 |
| Reprovações desnecessárias | 194 | 181,3 | 157,0 |
| Detecção | 81,3% | 82,6% | 87,9% |

As três colunas mostram que o ganho se realiza sobretudo no custo do alarme, e não no risco. As aprovações indevidas caem seis componentes ao longo de toda a sprint, ao passo que as reprovações desnecessárias caem cinquenta e um. Em termos operacionais, o ganho aparece principalmente como reensaio evitado.

### 9.5 De onde vem cada parte da diferença

Cada alteração foi medida isoladamente, sob o mesmo protocolo, de modo que a soma das partes possa ser conferida contra o total observado.

| Alteração | Efeito no erro |
|---|---:|
| Codificação do perfil de perdas passa a treze categorias | +0,086, isto é, piora |
| Motivo declarado passa de seis indicadores a família agrupada | −0,245, isto é, melhora |
| Estimador escolhido por região, entre dois candidatos | −0,320, isto é, melhora |
| Soma das partes | −0,479 |
| Diferença observada | −0,472 |

A soma reproduz o total dentro do ruído entre sementes, o que sustenta a decomposição. Os 0,472 foram medidos sobre as 3.277 leituras da base que ainda continha o componente duplicado, que é a base sobre a qual as três alterações foram avaliadas na ocasião; sobre as 3.232 leituras atuais a mesma diferença mede 0,431. A leitura direta é que a troca de codificação, isolada, custa desempenho, e é o agrupamento do motivo que paga por ela e ainda deixa saldo.

A quarta alteração, que é a codificação das perdas escolhida por região, foi medida depois e sobre exatamente o mesmo conjunto de leituras que a formulação anterior, sem a ambiguidade de contagem que afeta a tabela da seção 9.3:

| Formulação | Erro |
|---|---:|
| Estimador por região, perdas detalhadas em todas | 6,107 |
| Estimador e perdas escolhidos por região | 5,980 |
| O mesmo, com o Extra Trees em Main Vent Sys | 5,961 |

### 9.6 O conjunto de teste reservado, e a contradição que ele expõe

| Métrica | Versão anterior | Floresta em todas | Estimador por região | Entrega atual |
|---|---:|---:|---:|---:|
| Erro médio absoluto | 4,37 | 5,15 | 5,17 | 5,154 |
| Predições dentro de dez por cento | 85,7% | 83,9% | 82,0% | 82,6% |
| Aprovações indevidas, margem de oito | 6 | — | 10 | 12 |

A entrega atual mede 5,154 no conjunto reservado, praticamente igual aos 5,17 da formulação que escolhia apenas o estimador. A triagem naquele conjunto não melhorou: as aprovações indevidas passam de dez para doze e a detecção cai de 84,1 para 81,0 por cento, ao passo que as reprovações desnecessárias caem de sessenta e seis para quarenta e sete.

Essa divergência entre erro médio e triagem dentro do mesmo conjunto decorre do tamanho dele. São apenas sessenta e três estouros, de modo que duas peças a mais ou a menos deslocam a detecção em três pontos percentuais.

#### A contradição não é geral, é de uma região

| Região | Versão anterior | Floresta em todas | Formulação com estimador por região |
|---|---:|---:|---:|
| CT Knobs | 2,98 | 2,27 | 2,27 |
| Oven HMI | 2,84 | 2,31 | 2,31 |
| IPC Cooling | 3,24 | 2,99 | 2,99 |
| Main Vent Sys | 3,44 | 3,72 | 3,45 |
| Mainback | 4,62 | 4,53 | 4,53 |
| Coil Temps | 8,19 | 7,97 | 7,59 |
| IPC Comp | 4,14 | 5,95 | 6,09 |
| Agregado | 4,37 | 5,15 | 5,17 |

Seis das sete regiões melhoram ou empatam em relação à versão anterior. A única que piora é IPC Comp, e ela piora 1,95. Como essa região responde por 363 das 717 leituras do conjunto reservado, ou seja, metade delas, a sua piora sozinha explica toda a diferença agregada.

#### O que investigamos sobre essa região

A escolha de estimador não é responsável. Comparando a formulação com estimador por região contra a de floresta em todas, o sistema de ventilação melhora 0,27, as bobinas melhoram 0,38 e os componentes da placa pioram 0,14, o que se compensa.

A primeira hipótese testada atribuía a piora ao agrupamento do motivo. O nível que reúne o caminho do ar junta alterações de duto e de bandeja, e metade dos ensaios reservados cai nesse nível, sendo dois de bandeja e três de duto. Como os componentes da placa ocupam o compartimento que essas duas peças delimitam, esperava-se que separá-las rendesse ali. A previsão foi medida e não se confirmou: com uma família de nove níveis, que separa soprador, duto, defletor e bandeja, a região piora 0,188 na validação, nas três sementes, e o agregado piora 0,111.

A segunda hipótese se sustenta, e depende de um conceito que convém explicar. Chama-se folga, aqui, a diferença entre o erro que uma região apresenta na validação cruzada e o erro que ela apresenta no conjunto reservado. Uma folga positiva significa que a região acerta melhor nos dez ensaios reservados do que na validação, o que é esperado em alguma medida, porque ali o modelo treina com mais ensaios.

| Região | Folga na versão anterior | Folga na quarta sprint |
|---|---:|---:|
| Coil Temps | 3,52 | 2,73 |
| IPC Comp | 3,16 | 1,02 |
| Main Vent Sys | 1,24 | 0,42 |
| Mainback | 1,06 | −0,03 |
| IPC Cooling | 0,80 | 1,01 |
| CT Knobs | 0,18 | 0,69 |
| Oven HMI | −0,42 | 0,07 |

As sete linhas foram calculadas sobre a formulação com estimador por região e perdas detalhadas, que é a que o conjunto reservado da seção 9.6 mede, de modo que a coluna seja internamente comparável.

Na versão anterior, IPC Comp acertava 3,16 melhor no conjunto reservado do que na validação, a segunda maior folga entre as sete regiões. Na quarta sprint essa folga cai para 1,02, em linha com as demais.

A leitura que isso autoriza é que a formulação nova não degradou aquela região, e sim que a formulação anterior obtinha ali um resultado excepcionalmente favorável naqueles dez ensaios. O valor de 4,14 da versão anterior é que se afasta do comportamento típico da própria formulação, e não o valor de 6,09 da quarta sprint.

Isso não demonstra que a formulação nova seja melhor naquela região. Demonstra que comparar os dois valores lado a lado, sem a folga ao lado deles, induz a uma conclusão que os números não sustentam.

#### Os limites deste conjunto

Um alerta metodológico precede os limites do conjunto. Ao comparar formulações naquele conjunto, convém olhar o viés restrito às leituras que se aproximam do limite, e não apenas o erro médio de todas. Numa das comparações feitas durante a sprint, a formulação obtida por busca de hiperparâmetros apresentava erro médio melhor e viés de menos 5,40 graus junto ao limite, contra menos 3,71 da formulação entregue, ou seja, subestimava mais justamente onde subestimar é caro. A ponderação por custo atuava sobre todas as leituras, e não sobre o regime próximo ao limite. Uma métrica restrita à vizinhança do limite fica registrada como refinamento seguinte.

Três fatos limitam o peso do conjunto reservado, e nenhum deles o anula. Ele possui dez ensaios, com metade das leituras concentradas numa única região. O tipo de ensaio broil c1 não tem representação alguma nele, e o tipo pyro comparece com um único caso entre os oito existentes. E ele já foi lido diversas vezes ao longo do projeto, de modo que a proteção estatística que oferecia foi sendo consumida a cada leitura.

A recomendação deste documento é tratar a diferença como não resolvida, e pedir à parceira ensaios que cubram broil c1 e mais pyro antes de fechar a comparação.

---

## 10. Todos os testes que fizemos

Esta seção existe para que os mesmos caminhos não sejam percorridos de novo. Cada teste foi medido sob o protocolo da seção 5, com três sementes e comparação pareada por leitura.

O resumo é que cerca de oitenta abordagens foram avaliadas e apenas uma foi adotada, a média entre Extra Trees e gradiente em Main Vent Sys, descrita na seção 7.6, com efeito de dois centésimos de grau no agregado. A margem de segurança calibrada por região rendeu e aguarda decisão. Os demais ganhos de modelagem da sprint vieram de corrigir o dado ou a sua codificação, descritos na seção 7.

### 10.1 Gerar dados artificiais

A base tem cinquenta e seis ensaios, o que é pouco. A primeira família de tentativas procurou aumentar esse número de forma artificial.

O SMOTE e as suas variantes para regressão criam exemplos novos interpolando entre exemplos existentes. A abordagem é inaplicável aqui, e a razão é conceitual e não técnica: as entradas do modelo são binárias, isto é, cada uma indica presença ou ausência de uma condição experimental. Interpolar entre dois ensaios produz valores fracionários, que descrevem configurações fisicamente inexistentes, como meio soprador ligado.

Dezesseis estratégias de aumento sintético foram testadas em seguida, por caminhos diferentes do SMOTE. Nenhuma produziu ganho.

Agrupar ensaios parecidos por k-médias e gerar novos exemplos a partir dos centroides esbarra no mesmo obstáculo: o centroide de um grupo de configurações binárias não é uma configuração.

A conclusão desta família é que dados sintéticos não resolvem o problema deste projeto, porque a limitação não é o número de linhas e sim o número de condições experimentais distintas, que é dezessete.

### 10.2 Ajustar os hiperparâmetros

Hiperparâmetros são os valores de configuração do próprio algoritmo, tais como o número de árvores, a profundidade máxima e o número mínimo de exemplos por folha.

Uma busca aleatória de quarenta configurações, sorteadas dentro de um espaço de mil setecentas e vinte e oito combinações, venceu na validação cruzada e perdeu no conjunto reservado. Uma grade exaustiva de quarenta e oito combinações venceu a busca aleatória, o que já é um indício de que sortear muito não ajuda.

A medição decisiva foi a validação aninhada, descrita na seção 5.4.

| Formulação | Erro | Ganho |
|---|---:|---:|
| Referência, floresta em todas as regiões | 6,474 | — |
| Busca escolhida dentro da amostra | 5,968 | +0,506 |
| Busca aninhada | 6,424 | +0,051 |

A diferença entre as duas últimas linhas, 0,455, é o que se chama otimismo da escolha: noventa por cento do ganho aparente vinha do próprio ato de escolher, e não da configuração escolhida. O intervalo de confiança do ganho aninhado vai de menos 0,108 a mais 0,203 e contém o zero.

Por região, a busca aninhada é pior que a referência em cinco das sete. Apenas Coil Temps ganha de forma apreciável, de 11,444 para 9,919.

Fica registrado que este resultado inverteu uma conclusão intermediária do projeto. Sobre a base já corrigida, a busca aparentava vencer também no conjunto reservado, com 4,473 contra 5,153. Aquele número foi obtido com uma configuração escolhida olhando as dobras, e herdou o otimismo medido aqui.

### 10.3 Escolher mais coisas por região

A escolha de estimador por região funcionou, conforme a seção 7.3. Era natural tentar estender a mesma ideia a outras dimensões, e três tentativas foram feitas.

A seleção entre três codificações por região rendeu inicialmente 0,037, valor indistinguível de ruído. Aquela medição usava a versão perfil da terceira sprint, que ainda codificava o motivo do ensaio pelos indicadores antigos e contava em dobro o sensor duplicado do Oven HMI, de modo que as codificações de perfil entravam em desvantagem. Refeita com a versão perfil gerada no colabs_S4, sobre o mesmo motivo da base de treze categorias, a seleção passou a render 0,229, com intervalo de confiança entre 0,123 e 0,330 e ganho nas três sementes. O número foi obtido pelo método aninhado aproximado e sem o peso próximo ao limite, e ainda não foi comparado com a formulação entregue nas mesmas condições.

A seleção entre cinco estimadores por região rendeu 0,122, ou seja, menos do que a seleção entre dois, que rendeu 0,320.

A seleção do tratamento do motivo por região, junto com o estimador, perdeu 0,426, com intervalo de confiança entre menos 0,523 e menos 0,332.

Esses três resultados, somados ao da seção 7.4, que foi positivo, levaram a uma lição que a seção 11 desenvolve.

### 10.4 Mudar a codificação das variáveis

Uma família de nove níveis para o motivo do ensaio, separando soprador, duto, defletor e bandeja, perdeu 0,155 no agregado. Ela foi testada especificamente porque se esperava que rendesse em IPC Comp, e naquela região piorou 0,188.

As quatro colunas que informam a ordem de acionamento das bobinas perderam 0,059 e apresentaram contribuição nula em cinco das sete regiões. Três medições independentes as apontam como prejudiciais. A auditoria por atribuição mostra que a participação dessas colunas é de 1,2 por cento em média, o que indica que elas ajudavam por diferenciar configurações, e não por conteúdo físico.

Cabe registrar aqui, por ser decisão desta sprint e não resultado de teste, o custo da própria codificação de treze categorias, adotada em substituição à codificação anterior, que agrupava os ensaios pelo perfil de potência.

| Métrica | Codificação anterior | Treze categorias |
|---|---:|---:|
| Erro na validação | 6,57 | 6,65 |
| Erro no conjunto reservado | 4,37 | 4,77 |
| Predições dentro de dez por cento, no reservado | 85,7% | 84,7% |
| Aprovações indevidas, margem de oito graus | 36 | 41 |
| Detecção | 81,3% | 78,8% |

A troca, isolada, custou desempenho, e a decisão foi tomada com esse número à vista. O que a compensa é o agrupamento do motivo do ensaio, descrito na seção 7.1, conforme a decomposição da seção 9.5 demonstra.

Duas evidências independentes confirmam que a codificação anterior era melhor no seu próprio mérito. A busca de hiperparâmetros, quando livre para escolher a codificação por região, escolhe a anterior em quatro das sete regiões. E a seleção por região, que rendia 0,219 sobre a base anterior, passa a perder 0,246 sobre a de treze categorias, porque parte do que ela rendia consistia justamente em escolher treze categorias nas regiões em que essa codificação ajuda.

### 10.5 Mudar a forma do alvo

Prever o logaritmo da temperatura em vez da temperatura reduziu o erro médio e piorou a segurança da triagem, o que é um mau negócio para este projeto: o logaritmo comprime os valores altos, que são exatamente os que importam para a decisão de limite.

O encolhimento em direção à média do componente consiste em misturar a previsão do modelo com a média histórica daquele componente, o que reduz variância ao custo de viés. Foi testado porque em Oven HMI a média histórica vence o modelo em erro quadrático. Perdeu 0,073 no agregado.

Prever o desvio em relação à média do componente, em vez da temperatura absoluta, foi testado porque a auditoria por SHAP mostrou que a média e a dispersão do componente carregam 52,7 por cento da atribuição do modelo. A ideia era liberar a capacidade gasta em aprender o nível de cada ponto. Perdeu 0,084, e foi pior em seis das sete regiões.

Um modelo em dois estágios, que prevê primeiro um valor por região e depois o desvio de cada componente, perdeu 0,495.

### 10.6 Agrupar os transistores da placa de potência

Esta subseção detalha um teste pedido em orientação, cuja conclusão é útil mesmo sendo negativa.

A proposta era substituir os dezesseis transistores da placa de potência por um único alvo, calculado pela média deles. O motivo é razoável: eles são dezesseis dos trinta e sete componentes de IPC Comp e respondem por 896 leituras, ou seja, quarenta e cinco por cento daquela região e vinte e três por cento do projeto inteiro. Se fossem medições redundantes do mesmo ponto, mantê-los separados custaria complexidade sem acrescentar informação.

O teste foi feito em duas granularidades, porque a primeira falhou de forma que sugeriu a segunda.

#### Agrupar os dezesseis num só

Três perguntas foram respondidas em separado, porque a resposta não é a mesma em cada uma.

| Pergunta | Dezesseis alvos | Um alvo médio | Diferença |
|---|---:|---:|---:|
| Prever a média dos dezesseis | 6,839 °C | 9,718 °C | −2,879 |
| Prever cada transistor | 7,729 °C | 10,866 °C | −3,137 |
| Prever os outros vinte e um componentes | 5,685 °C | 5,887 °C | −0,202 |

O primeiro resultado surpreende e tem explicação. Mesmo para prever a própria média, agrupar é pior. Treinando nos dezesseis alvos, o modelo dispõe de 896 linhas; treinando na média, dispõe de 56. Além disso, promediar dezesseis previsões é em si uma forma de conjunto, em que os erros independentes de cada uma se cancelam parcialmente. O agrupamento abre mão das duas vantagens ao mesmo tempo.

O terceiro resultado mostra que o dano não fica contido nos transistores: retirar quinze alvos do treino também piora os demais componentes da região.

A objeção decisiva, porém, não é de precisão e sim de segurança. A triagem compara a previsão de cada componente contra o limite dele, que para os transistores é de 110 °C. Se os dezesseis virarem um, um transistor quente pode ser mascarado pela média dos demais. Contando diretamente no dado medido, sem modelo algum, isso ocorre em quatro dos treze ensaios que têm ao menos um transistor no limite.

| Ensaio | Transistores acima do limite | O mais quente | Média dos dezesseis |
|---|---:|---:|---:|
| Run 12 | 7 | 113,61 °C | 109,76 °C |
| Run 23 | 4 | 115,01 °C | 101,68 °C |
| Run 29 | 1 | 110,09 °C | 97,92 °C |
| Run 31 | 8 | 118,94 °C | 108,96 °C |

O Run 23 é o caso mais claro: quatro transistores acima do limite e uma média treze graus abaixo dele. A triagem aprovaria o conjunto.

#### Agrupar em quatro grupos de quatro

A dispersão de 15,82 °C entre os dezesseis mostrou que eles não são réplicas do mesmo ponto, mas as médias históricas sugeriam blocos de quatro. A hipótese foi verificada antes de ser usada, conforme a seção 8.5, e confirmou-se: a aglomeração hierárquica recuperou exatamente os blocos 1 a 4, 5 a 8, 9 a 12 e 13 a 16, sem que nome ou ordem fossem informados.

| Pergunta | Dezesseis alvos | Quatro grupos | Diferença |
|---|---:|---:|---:|
| Prever a média de cada grupo | 7,639 °C | 8,585 °C | −0,946 |
| Prever cada transistor | 7,729 °C | 8,714 °C | −0,985 |
| Prever os outros vinte e um componentes | 5,685 °C | 5,812 °C | −0,127 |

O intervalo de confiança da segunda linha vai de menos 1,189 a menos 0,787, e o teste de Wilcoxon rejeita com folga.

A segurança melhora muito em relação ao agrupamento único, embora não chegue a zero. São três casos mascarados entre trinta e oito grupos que têm ao menos um transistor no limite, e nos três o mais quente está a pouco mais de um grau do limite, de modo que a margem de oito graus os cobriria.

| Ensaio | Grupo | O mais quente | Média do grupo |
|---|---|---:|---:|
| Run 6 | IGBT 1 a 4 | 110,48 °C | 109,34 °C |
| Run 8 | IGBT 1 a 4 | 110,81 °C | 109,67 °C |
| Run 29 | IGBT 9 a 12 | 110,09 °C | 109,34 °C |

#### O que se aprendeu com os dois testes

A hipótese física estava correta na segunda granularidade, e ainda assim o agrupamento não compensa. A razão é importante e vale registrar, porque contraria a intuição.

Dentro de um grupo, os quatro transistores diferem em 2,05 °C na mediana, valor inferior ao piso de ruído da região, que é de 3,52 °C. Não há, portanto, informação a perder ao agrupá-los. A perda de 0,985 °C não vem de informação descartada, e sim de volume de treino: cada alvo agrupado passa de 224 linhas para 56.

A conclusão é que, nesta base, reduzir o número de alvos custa mais em quantidade de exemplos do que economiza em complexidade, mesmo quando os alvos reunidos são fisicamente equivalentes. O agrupamento não foi adotado em nenhuma das duas granularidades.

### 10.7 Complementar com simulação física

Um estudo por elementos finitos foi conduzido sobre os botões e a tampa traseira, com o objetivo de complementar o modelo estatístico com física de primeiros princípios. O veredito foi negativo, por a geometria interna necessária não estar disponível.

O estudo deixou, porém, um resultado aproveitável: ele apontou o caminho do ar de exaustão como mecanismo dominante em Mainback, o que é coerente com o fato de essa ser a região que mais ganha com o agrupamento do motivo do ensaio.

### 10.8 Combinar modelos com pesos aprendidos

A formulação entregue usa, em duas regiões, a média aritmética entre a floresta e o gradiente. Uma extensão natural é substituir essa média fixa por pesos aprendidos, e permitir mais modelos de base. Esse procedimento é chamado de empilhamento.

O cuidado central é não deixar o combinador aprender com previsões que os modelos de base fizeram sobre dados que eles mesmos viram, o que inflaria o peso do modelo que mais decora. Por isso, dentro de cada dobra externa, as previsões que alimentam o combinador foram geradas por uma validação interna, também agrupada por configuração experimental.

O teste cobriu as duas regiões em que a mescla é usada, com quatro modelos de base, que são floresta, gradiente, árvores extremamente aleatórias e regressão regularizada, e dois combinadores.

| Região | Floresta | Mescla fixa | Empilhamento linear | Empilhamento com pesos não negativos |
|---|---:|---:|---:|---:|
| IPC Comp | 7,503 | 7,105 | 8,090 | 7,668 |
| Coil Temps | 11,444 | 10,365 | 13,293 | 12,515 |
| Agregado | 8,195 | 7,677 | 9,003 | 8,519 |

A mescla fixa vence as duas formas de peso aprendido, por margem grande. O empilhamento linear perde 1,326 e o de pesos não negativos perde 0,842, ambos com intervalo de confiança que exclui o zero e com o teste de Wilcoxon de acordo.

Os pesos estimados revelam o mecanismo da falha.

| Região | Floresta | Gradiente | Árvores extremamente aleatórias | Regularizada |
|---|---:|---:|---:|---:|
| IPC Comp | 0,014 | 0,587 | 0,264 | 0,106 |
| Coil Temps | 0,397 | 0,532 | 0,081 | 0,053 |

Em IPC Comp o combinador praticamente anulou a floresta, que é justamente o modelo que a regra adota naquela região por vencer ali. Ele aprendeu o contrário do que a validação externa mostra.

A causa é de tamanho de amostra, e não de implementação. Para estimar os pesos sem trapacear é preciso uma validação interna dentro de cada dobra externa, e ali restam dezesseis configurações, divididas em quatro blocos. Quatro pesos são estimados a partir de quatro pontos de observação, com modelos treinados sobre menos dados do que os que de fato farão a previsão. A média fixa não estima nada, e por isso não erra.

Este resultado repete, numa forma nova, a lição da seção 11: toda camada adicional de escolha ajustada nesta base custa mais do que devolve.

### 10.9 A varredura sistemática do fim da sprint

Ao fim do trabalho foi conduzida uma varredura organizada em quatro ondas, com cerca de sessenta variantes, para responder de forma defensável se havia melhoria disponível por método. Todas usaram o protocolo da seção 5 e a formulação entregue como referência.

#### Onda 1: transformações aplicadas depois da previsão

Vinte e nove variantes, entre expansão e encolhimento em torno do patamar e da média, recalibração linear e isotônica, corte na faixa histórica do componente, deslocamento global e por componente, e combinações. O cálculo das previsões foi feito uma vez e reaproveitado, de modo que as vinte e nove avaliações custaram segundos.

A expansão da previsão em torno do patamar apareceu como a melhor, com ganho de 0,045 e intervalo excluindo o zero para um fator de 1,05. Era, porém, um fator escolhido olhando o resultado. Refeita a escolha de forma aninhada, pelo erro absoluto nas demais dobras, o ganho desapareceu: menos 0,009 com intervalo contendo o zero na escolha global, e menos 0,067 na escolha por região.

O detalhe que torna esse resultado instrutivo é que a seleção global acertou o valor, escolhendo 1,05 em quarenta e duas das cinquenta e uma dobras. As nove dobras discordantes bastaram para consumir o ganho inteiro. É a lição da seção 11 aplicada a um parâmetro contínuo em lugar de a um modelo.

#### Onda 1b: de onde estimar um fator de calibração

Tendo surgido a questão de usar validação interna nos dados de treino, foram comparadas três origens para estimar o fator, com dois estimadores cada. O resultado é de interesse metodológico independente do fator.

A validação interna por sorteio de leituras subestima o fator em todas as sete regiões, quando comparada à validação interna que remove configurações. Em IPC Comp, por exemplo, 1,065 contra 1,663. O mecanismo é o mesmo já medido na seção 5.1: previsões internas obtidas por sorteio são artificialmente boas, de modo que o modelo parece comprimir menos a faixa prevista do que de fato comprime, e a correção sai subdimensionada.

Registre-se ainda que nenhum dos dois estimadores clássicos do fator aponta para a faixa que a onda 1 havia indicado. Igualar a dispersão devolve fatores entre 1,05 e 2,46, que superexpandem; os mínimos quadrados devolvem entre 0,115 e 1,10, que mandam encolher. Nenhum dos dois mira o erro absoluto, que é a métrica reportada.

#### Onda 2: alvo, variáveis e composição da amostra

Dez variantes que exigem reajuste do modelo. Três confirmaram com três sementes e uma caiu ao passar de uma semente para três.

| Variante | Ganho | Intervalo de confiança |
|---|---:|---|
| Patamar e escala robustos, por mediana e amplitude interquartílica | +0,087 | [+0,052, +0,125] |
| Limite do componente como variável de entrada | +0,051 | [+0,026, +0,077] |
| Alvo em raiz quadrada | +0,046 | [+0,006, +0,086] |
| Contagem de fatores ativos do ensaio | +0,007 | [−0,012, +0,025] |

As demais perderam: alvo padronizado por componente, interações entre pares de configuração, remoção de discrepantes do treino, peso por raridade do componente e mais estatísticas do componente.

As três confirmadas não são aditivas. A soma dos ganhos individuais é 0,191 e a combinação das quatro rende 0,110, ou cinquenta e oito por cento. Todas atacam o mesmo problema, que é a sensibilidade a leituras extremas em Coil Temps, região onde cada uma delas isoladamente derruba o erro de 10,32 para perto de 9,85.

Mais importante, as três degradam a triagem. A combinação das quatro leva as aprovações indevidas de 23,3 para 29,0 e a detecção de 87,9 para 85,0 por cento, o que devolve integralmente o ganho de segurança obtido com o peso da seção 7.5. O mecanismo aparece no viés, que passa de mais 0,152 para menos 0,190: subestimar mais significa alarmar menos.

A exceção é o par formado pelo limite do componente e pela contagem de fatores, que são acréscimos de variável e não alterações do alvo, e por isso preservam o perfil de viés.

#### Onda 3: a estrutura do modelo

Quatro alternativas à estrutura atual de sete modelos em formato longo, todas com perda grande.

| Estrutura | Erro | Diferença |
|---|---:|---:|
| Sete modelos, formato longo, que é a atual | 5,884 | — |
| Um modelo único, com a região como variável | 6,799 | −0,916 |
| O mesmo, com interações entre região e configuração | 6,824 | −0,940 |
| Um modelo por componente | 6,864 | −0,980 |
| Modelo multi-saída por região | 6,983 | −1,099 |

A causa é comum às quatro e já apareceu três vezes neste documento. Todas reduzem o número de linhas efetivas de treino: o formato longo oferece mais de mil e quinhentas linhas por dobra, ao passo que as estruturas por componente e multi-saída oferecem quarenta e seis. É o mesmo mecanismo que derrubou o agrupamento dos transistores, o empilhamento e a fusão de ensaios.

#### Onda 4: os estimadores restantes

Onze variantes de estimador, nenhuma superando a formulação entregue. Entre elas, mil árvores em lugar de trezentas, trinta por cento das variáveis por divisão, folha mínima de dois, profundidade limitada, árvores podadas por custo-complexidade, mescla de floresta com árvores extremas, mescla tripla, regressão de núcleo gaussiano, rede neural rasa e floresta com critério de erro absoluto.

Duas conclusões merecem registro.

As famílias não baseadas em árvores perdem por categoria, e não por margem. O núcleo gaussiano erra 25,8 graus e detecta doze por cento dos estouros; a rede rasa erra 14,4. Somadas ao modelo linear e à máquina de vetores de suporte, são quatro famílias testadas e quatro derrotas amplas, o que é coerente com entradas binárias e esparsas, terreno em que árvores levam vantagem estrutural.

Casar a função de perda com a métrica reportada piora. A floresta com critério de erro absoluto perde 0,835 e o gradiente com perda absoluta perde 0,895, embora sejam os únicos estimadores que otimizam diretamente o erro absoluto. A explicação provável é de variância: o critério absoluto usa a mediana dos resíduos, que é robusta porém menos eficiente, e com folhas pequenas a mediana de poucos pontos oscila.

Uma limitação desta onda deve ser declarada. As variantes de estimador único substituem a regra por região inteira, de modo que as duas regiões que usam a mescla perdem o gradiente junto. Esse efeito foi quantificado em 0,134 no agregado. Para as variantes que perdem quatro décimos ou mais, a conclusão sobrevive com folga; para mil árvores, que perdeu 0,143, a conclusão correta é que trezentas e mil árvores são indistinguíveis.

#### Os dois candidatos que restaram

Nenhuma das sessenta variantes foi adotada. Duas permanecem como candidatas medidas, à espera de decisão, e são registradas aqui com os seus números para que a decisão possa ser tomada sem refazer o trabalho.

| Candidato | Erro | Ganho | Aprovações indevidas | Detecção |
|---|---:|---:|---:|---:|
| Formulação entregue | 5,884 | — | 23,3 | 87,9% |
| Limite e contagem como variáveis, com a regra fixa | 5,842 | +0,041 | 24,0 | 87,6% |
| Patamar e escala robustos, com a regra fixa | 5,796 | +0,087 | 26,0 | 86,5% |

O primeiro rende metade do segundo e custa quase nada em segurança, sete décimos de uma aprovação indevida. O segundo rende o dobro e custa 2,7 aprovações indevidas, isto é, mais de dez por cento do total. Ambos foram confirmados com três sementes e ambos têm o teste de Wilcoxon rejeitando, o que indica melhora distribuída pelas leituras.

A qualificação com a regra fixa, acrescentada às duas linhas, não é detalhe de redação. Ela é o assunto da subseção seguinte.

#### Uma melhoria sob regra fixa pode ser prejudicial através da seleção

O primeiro candidato foi implementado na entrega e o caderno foi reexecutado, o que permitiu descobrir algo que as medições anteriores não podiam mostrar.

| Indicador | Entrega | Com limite e contagem |
|---|---:|---:|
| Erro médio absoluto | 5,980 | 6,045 |
| Reprovações desnecessárias | 157,0 | 183,0 |
| Aprovações indevidas | 23,3 | 23,3 |
| Detecção | 87,9% | 87,9% |

O resultado é pior, e contradiz o ganho de 0,041 medido com três sementes. A contradição é aparente, e a sua explicação é de método.

As medições de triagem comparam variantes com a regra por região mantida fixa, porque é assim que se isola o efeito de uma variável. A entrega, porém, não tem regra fixa por decreto: ela a redescobre a cada execução, por seleção aninhada. E as duas variáveis novas mudaram o que a seleção escolhe em duas regiões, de perdas detalhadas para agrupadas em CT Knobs e de floresta para floresta com gradiente em IPC Comp.

O motivo da troca é que as variáveis aproximaram os candidatos entre si.

| Região | Candidatos disputando | Diferença |
|---|---|---:|
| IPC Comp | 6,591 contra 6,607 | 0,016 |
| CT Knobs | 2,956 contra 2,967 | 0,011 |

Com candidatos a menos de dois centésimos um do outro, a seleção deixou de ser quase unânime e passou a oscilar, trinta e quatro contra dezesseis em IPC Comp e trinta e quatro contra quatorze em CT Knobs. O resultado realizado ficou pior do que qualquer um dos candidatos isoladamente: IPC Comp entregou 6,978 dispondo de candidatos de 6,591 e 6,607.

O mecanismo é o mesmo que a seção 11 descreve e que já custara 0,426 na tentativa de escolher o tratamento do motivo por região. A novidade aqui é a origem do empate: ele não estava no dado, foi criado pelo próprio acréscimo, que beneficiou os dois candidatos por igual e assim apagou a distância entre eles.

As duas variáveis foram, portanto, revertidas. O ganho de 0,041 sob regra fixa permanece medido e válido; o que não se sustenta é a sua transferência para uma entrega que seleciona.

Disso decorre uma exigência de método para trabalhos futuros: qualquer melhoria candidata deve ser medida também sob a seleção aninhada, e não apenas com a regra congelada. Uma variável que ajude todos os candidatos por igual não produz ganho algum e ainda desestabiliza a escolha.

A escolha entre os dois candidatos que restam não é técnica e sim de prioridade entre precisão e risco, e ambos precisam passar por essa verificação adicional antes de serem adotados. Por isso ficam registrados em lugar de decididos.

#### O que a varredura estabelece

O maior ganho confirmado em sessenta variantes é de 0,087 grau, ou um vírgula cinco por cento do erro atual. A dispersão do próprio erro entre agrupamentos diferentes dos dados é de 0,813 grau, conforme a seção 12.2. A varredura, portanto, mediu efeitos quase dez vezes menores do que a incerteza do protocolo de medição, e só os distinguiu porque as comparações são pareadas leitura a leitura.

Isso não os torna falsos, mas situa a sua importância. O documento registra na seção 8.3 que cinquenta e sete por cento do erro atual está acima do piso de ruído experimental, e na seção 15 as oito perguntas cuja resposta destravaria esse espaço. A fronteira deste projeto está no dado, e não no método.

#### O gradiente ajustado, e o que ele revelou sobre o próprio método

O caderno de comparação de modelos mostrou o gradiente com hiperparâmetros ajustados vencendo em cinco das sete áreas. A configuração, porém, fora escolhida pela mesma validação que a avaliava, e por isso a hipótese foi testada dentro da entrega, com escolha aninhada.

Aplicado de forma forçada, o gradiente ajustado perdeu em todas as variantes: menos 0,106 dentro da mescla, menos 0,135 sozinho e menos 0,263 numa mescla em todas as regiões, com otimismo de seleção entre 0,139 e 0,382.

Oferecido como alternativa à entrega, com a escolha por região também aninhada pelo método aproximado, o resultado pareceu promissor: ganho de 0,107, com intervalo entre mais 0,018 e mais 0,197, dezesseis aprovações indevidas em vez de vinte e três e detecção de 91,7 por cento.

Refeito com o método estrito, o ganho se converteu em perda de 0,448, com intervalo entre menos 0,584 e menos 0,316. O gradiente ajustado continua melhor em Mainback e em Coil Temps sob o método estrito, mas a validação interna não consegue identificar onde ele ajuda, e o escolhe também em IPC Comp, onde erra quase um grau a mais.

Dois fatos deste teste merecem registro além do resultado. A diferença entre o método aproximado e o estrito foi de 0,555 grau, maior do que o otimismo da busca de hiperparâmetros medido na seção 10.2. E, pela primeira vez no projeto, uma escolha unânime enganou: em CT Knobs o método aproximado escolheu o gradiente em dezessete de dezessete dobras, e ele errou mais nas dobras julgadas. Foi este teste que motivou a medição da própria entrega pelo método estrito, descrita na seção 5.7.

### 10.10 Resumo de todos os testes

| Abordagem | Por que foi tentada | Resultado |
|---|---|---|
| SMOTE e variantes para regressão | Gerar exemplos sintéticos | Inaplicável, entradas binárias |
| Dezesseis estratégias de aumento sintético | O mesmo objetivo | Nenhum ganho |
| Agrupar ensaios por k-médias | O mesmo objetivo | Inaplicável, mesmo motivo |
| Busca aleatória de hiperparâmetros | Ajustar o algoritmo aos dados | Ganho de 0,051 sob validação aninhada, com intervalo contendo o zero |
| Grade exaustiva de hiperparâmetros | O mesmo, de forma sistemática | Melhor que a busca, ainda assim descartada |
| Seleção entre três codificações por região | Estender a ideia do estimador | Ganho de 0,037 com a base perfil antiga; refeita, 0,229, ainda sem comparação com a entrega |
| Seleção entre cinco estimadores por região | Ampliar a grade que funcionou com dois | Ganho de 0,122, menor que o de dois |
| Seleção do tratamento do motivo por região | Explorar a heterogeneidade do ganho | Perda de 0,426 |
| Família de nove níveis para o motivo | Separar soprador, duto, defletor e bandeja | Perda de 0,155 |
| Colunas de ordem de chaveamento | Informar a ordem das bobinas | Perda de 0,059 |
| Alvo em logaritmo | Estabilizar a variância nas regiões quentes | Ganho em erro, perda em segurança |
| Encolhimento para a média do componente | Reduzir variância onde o modelo acrescenta ruído | Perda de 0,073 |
| Prever o desvio em relação à média | Liberar capacidade gasta no nível de cada ponto | Perda de 0,084 |
| Modelo em dois estágios | Prever região, depois componente | Perda de 0,495 |
| Agrupar as perdas em todas as regiões | Aplicar em bloco o que rendeu em três | Ganho de 0,042, indistinguível de ruído |
| Agrupar os dezesseis transistores num só | Reduzir dimensão onde pareciam redundantes | Perda de 3,137 e esconde estouros |
| Agrupar os transistores em quatro grupos | O mesmo, respeitando a estrutura física | Perda de 0,985 |
| Conjuntos de estimadores adicionais | Combinar mais de dois algoritmos | Sem ganho |
| Elementos finitos nos botões e na tampa traseira | Complementar com física | Veredito negativo, geometria desconhecida |
| Empilhamento com pesos aprendidos | Substituir a média fixa da mescla por pesos ótimos | Perda de 0,842 a 1,326 |
| Fundir ensaios de configuração idêntica pela média | Reduzir ruído reunindo repetições | Perda de 0,353 a 0,407 em Mainback |
| Expansão da previsão em torno do patamar | Desfazer a compressão da média de árvores | Ganho de 0,045 com fator escolhido olhando, nulo com escolha aninhada |
| Limite do componente e contagem de fatores como variáveis | Informar ordem de grandeza e severidade da configuração | Ganho de 0,041 com a regra fixa, perda de 0,065 sob seleção aninhada |
| Recalibração linear, isotônica e por componente | Corrigir a previsão a partir das dobras de treino | Perda de 0,353 a 0,761 |
| Corte da previsão na faixa histórica do componente | Eliminar previsões implausíveis | Perda de 0,045 a 0,179 |
| Quatro estruturas alternativas de modelo | Agrupar regiões, multi-saída, um por componente | Perda de 0,916 a 1,099 |
| Onze variantes de estimador | Regularização, mesclas, núcleo, rede neural | Nenhuma supera a formulação entregue |
| Casar a função de perda com a métrica reportada | Otimizar o erro absoluto diretamente | Perda de 0,835 no critério e 0,895 na perda |
| Gradiente com hiperparâmetros ajustados na entrega | Aproveitar o vencedor do caderno de comparação | Ganho de 0,107 pelo método aproximado, perda de 0,448 pelo estrito |
| Gradiente da busca 13cat reexecutada, como candidato por região | Aproveitar os hiperparâmetros vencedores com o motivo do ensaio | Erro sem ganho demonstrável; triagem melhor pelo estrito, com mais reprovações; não adotado |
| Margem de segurança calibrada por região | Ajustar a folga ao erro típico de cada região | Ganho relevante em segurança, não adotado por falta de instrução |
| Retirar o motivo do ensaio no Oven HMI | Verificar se o motivo contribuía na região | Perda de 0,30 no erro médio |
| Mesclar floresta com regressão linear no Oven HMI | Somar a tendência linear à floresta | Perda de 0,71 |
| Mesclar floresta, gradiente e rede neural no Oven HMI | Reproduzir a abordagem de outro grupo | Perda de 0,26, com coeficiente de determinação menor |

---

## 11. A lição sobre seleção automática

Seis medições do projeto envolveram escolher automaticamente entre candidatos, e os seus resultados só fazem sentido quando lidos em conjunto.

| Grade da seleção | Candidatos | Ganho aninhado |
|---|---:|---:|
| Dois estimadores | 2 | +0,320 °C |
| Dois estimadores e duas codificações das perdas | 4 | +0,184 °C |
| Cinco estimadores e duas escalas do alvo | 10 | +0,122 °C |
| Três codificações, dois estimadores e duas escalas | 12 | +0,229 °C (+0,037 com a base perfil antiga) |
| Busca de hiperparâmetros | 41 | +0,051 °C |
| Dois estimadores e duas codificações do motivo | 4 | −0,426 °C |

A primeira leitura desta tabela, registrada durante a sprint e depois corrigida, foi a de que grades estreitas rendem mais do que largas. A segunda linha e a última desmentem essa leitura: ambas têm quatro candidatos e resultados de sinais opostos.

O que de fato decide é se os candidatos se separam com clareza. Quando a seleção aninhada escolhe o mesmo candidato em praticamente todas as dobras, ela transporta um ganho real. Quando os candidatos empatam, a seleção passa a oscilar de dobra em dobra, e essa oscilação é ruído puro, que custa.

O caso do motivo do ensaio ilustra bem, e vale registrá-lo porque contraria a intuição. A seleção não encontrou região alguma que preferisse os seis indicadores antigos: em todas as sete o tratamento agrupado domina. Ela apenas introduziu oscilação onde não havia decisão a tomar. Nas duas regiões em que foi unânime, o resultado não mudou em nada, exatamente zero. Em Coil Temps, onde a escolha se dividiu em vinte e seis contra vinte e cinco entre as dobras, a região perdeu 0,468 °C. Em IPC Comp, apenas três escolhas trocadas em cinquenta e uma bastaram para custar 0,714 °C.

Já no caso do perfil de perdas, a concordância vai de quarenta e quatro a cinquenta e uma seleções em cinquenta e uma, e o ganho se sustenta.

---

## 12. Resultados detalhados

### 12.1 Por região, na validação cruzada

A coluna sem modelo traz o erro que se obteria prevendo sempre a temperatura média histórica do componente, que é o que existiria se nenhum modelo fosse construído.

| Região | Sem modelo | Com modelo | Redução | Piso de ruído | Erro sobre piso |
|---|---:|---:|---:|---:|---:|
| Coil Temps | 31,049 | 10,612 | 66% | 5,07 | 2,1 |
| Mainback | 8,150 | 4,586 | 44% | 0,57 | 8,0 |
| Main Vent Sys | 5,790 | 3,739 | 35% | 1,19 | 3,1 |
| IPC Comp | 10,232 | 6,677 | 35% | 3,52 | 1,9 |
| CT Knobs | 4,066 | 3,051 | 25% | 0,92 | 3,3 |
| IPC Cooling | 4,524 | 4,066 | 10% | 0,87 | 4,7 |
| Oven HMI | 2,513 | 2,321 | 8% | 0,63 | 3,7 |

Todos os valores estão em graus Celsius. A última coluna indica quantas vezes o erro do modelo supera o ruído do próprio laboratório, de modo que valores próximos de um significam pouca folga para melhorar.

A coluna com modelo traz o erro com a seleção refeita dentro de cada dobra pelo método aproximado, e inclui o peso descrito na seção 7.5. Pelo método estrito os valores por região são maiores, e o agregado passa de 5,96 para 6,23, conforme a seção 5.7.

### 12.2 A estabilidade do número relatado

Todo erro citado neste documento é a média de três sementes sob um esquema fixo de dezessete dobras. Convém saber quanto esse número oscilaria sob outro agrupamento dos dados.

Uma validação cruzada agrupada de cinco dobras, repetida dez vezes com agrupamentos diferentes, mede desvio de 0,813 °C entre repetições para a formulação entregue e de 0,817 °C para a alternativa avaliada na ocasião.

A consequência prática é que, ao relatar desempenho a terceiros, convém apresentar uma faixa em lugar de um único número. Diferenças menores do que oito décimos de grau entre formulações não são distinguíveis por essa via, e é por isso que as comparações deste documento são sempre pareadas por leitura, com intervalo de confiança: o pareamento cancela a variação de agrupamento que este número mede.

### 12.3 Onde o modelo funciona bem, e por quê

Coil Temps, Mainback, Main Vent Sys, IPC Comp e CT Knobs são regiões em que a temperatura responde fortemente à configuração do ensaio. A potência dissipada, o tipo de ensaio e o caminho do ar explicam boa parte da variação, e essas três coisas estão entre as variáveis disponíveis. É por isso que o modelo reduz o erro entre vinte e sete e sessenta e cinco por cento em relação a não ter modelo algum.

Nas bobinas e nos componentes da placa o erro já está a cerca de duas vezes o piso de ruído. Resta pouca folga, e o que resta exige dado novo, não algoritmo novo.

### 12.4 Onde o modelo funciona pouco, e por quê

IPC Cooling e Oven HMI melhoram pouco em relação a não ter modelo, e a razão é a mesma nas duas: os seus componentes variam pouco entre si e pouco entre ensaios.

Em Oven HMI, os três componentes têm temperaturas médias de 58,3 °C, 55,1 °C e 59,7 °C, quase idênticas. Apenas vinte e quatro por cento da variação dos dados vem de qual componente está sendo medido, e o restante vem de diferenças entre ensaios que as variáveis disponíveis não explicam. A região tem o menor erro absoluto de todas, e ainda assim é a que menos ganha, porque havia pouco a ganhar.

O coeficiente de determinação do Oven HMI, próximo de zero, tem uma causa localizada, investigada na seção 24 do caderno de modelagem. Os ensaios 48 a 52 são todos do tipo pyro e têm exatamente a mesma configuração declarada, mas os três primeiros medem entre 59 e 62 °C e os dois últimos, 51 e 52, cerca de 46 °C. Como as entradas são idênticas, nenhum modelo pode distingui-los: a floresta prevê para os cinco o patamar dos três primeiros e erra os dois últimos em até 17 °C. As cinco maiores leituras respondem por 57 por cento do erro quadrático da região, e as dez maiores por 75 por cento. O coeficiente de determinação, que pesa o quadrado dos erros, é a métrica mais afetada.

| Leituras avaliadas, mesmo modelo e mesmas previsões | Erro absoluto médio | Raiz do erro quadrático | Coeficiente de determinação |
|---|---:|---:|---:|
| Todas as 135 | 2,31 °C | 3,87 °C | 0,04 |
| Sem os ensaios 51 e 52 (129) | 1,74 °C | 2,38 °C | 0,43 |

A segunda linha é apenas diagnóstico. Os dois ensaios são medições reais, e retirá-los para elevar a métrica seria escolher o resultado; a pergunta sobre o que mudou neles consta da seção 15.

Foram testadas também abordagens alternativas para a região, sob o mesmo protocolo e com as mesmas 135 leituras, e nenhuma supera a formulação entregue.

| Abordagem, com perdas agrupadas e peso | Erro absoluto médio | Raiz do erro quadrático | Coeficiente de determinação |
|---|---:|---:|---:|
| Floresta, com o motivo do ensaio (entregue) | 2,32 °C | 3,87 °C | 0,04 |
| Floresta, sem o motivo do ensaio | 2,62 °C | 4,19 °C | −0,13 |
| Floresta mesclada com regressão linear | 3,03 °C | 4,73 °C | −0,44 |
| Floresta mesclada com ridge | 2,84 °C | 4,51 °C | −0,31 |
| Floresta, gradiente e rede neural mesclados | 2,57 °C | 4,20 °C | −0,14 |
| Floresta mesclada com rede neural | 2,49 °C | 4,04 °C | −0,06 |
| Média histórica do componente, sem modelo | 2,51 °C | 3,56 °C | 0,19 |

O motivo do ensaio ajuda, e retirá-lo piora o erro em cerca de 0,3 °C, também com as perdas detalhadas. Os modelos lineares não captam a resposta da região e puxam a mescla para baixo. A mescla de floresta, gradiente e rede neural, usada por outro grupo da turma, piora o erro médio e o coeficiente. A média histórica tem o maior coeficiente porque, ao prever o mesmo valor para todo ensaio pyro, erra menos nos dois ensaios frios, embora erre mais nos demais. Coeficientes mais altos relatados por outros grupos só são comparáveis a estes se medidos com a mesma validação por configuração: numa divisão aleatória das leituras, o ensaio 51 fica no treino quando o 52 é previsto, e o modelo passa a acertar exatamente o caso que aqui não tem como ser acertado.

### 12.5 A triagem de segurança

Sob a margem de oito graus, que é a faixa acordada, o modelo detecta 87,9 por cento dos estouros na validação cruzada. Sem modelo, prevendo pela média histórica, a detecção seria de 1,6 por cento.

Duas fraquezas permanecem e devem ser declaradas. Escapam 12,1 por cento das peças que ultrapassam o limite, isto é, cerca de uma em cada oito. E metade das reprovações é desnecessária, 48,1 por cento delas, o que significa reensaio evitável. Ambas decorrem da quantidade de dados disponível, e não da forma do modelo.

Uma melhoria disponível fica registrada e não foi adotada por falta de instrução. A margem é hoje única, de oito graus para todas as regiões, embora o erro típico varie de 2,4 graus em Oven HMI a 10,8 em Coil Temps. Calibrar a margem por região foi medido e rende ganho relevante em segurança, ao custo de a regra deixar de ser um número só.

### 12.6 O conjunto de teste reservado

Aplicado uma única vez ao modelo pronto, o conjunto reservado mede 5,154 °C de erro médio, com 82,6 por cento das previsões dentro de dez por cento do valor real. A leitura completa desse resultado, incluindo a piora da triagem, está na seção 9.6.

---

## 13. Defeitos encontrados no próprio código, e as travas criadas

Três defeitos da mesma família apareceram durante o trabalho. Todos eram silenciosos, no sentido de que o caderno executava até o fim e produzia um número plausível, sem erro visível.

O primeiro foi a grade de comparação da seção 21 do caderno de modelagem comparando duas cópias da mesma tabela, porque a codificação chamada perfil passou a ser derivada do conjunto carregado com o sufixo configurado. O segundo foi o prefixo do motivo não declarado na lista de entradas, o que fez as seis colunas novas serem classificadas como colunas de alvo. O terceiro foi o descarte das colunas de ordem de chaveamento deixando de casar após o renome para inglês, o que as reintroduziu em todo o caderno.

Quatro travas foram criadas em resposta, e cada uma foi verificada contra o dado real.

Todas as seções citadas nesta seção são seções do caderno de modelagem, e não deste documento.

A conferência inicial passa a rejeitar qualquer coluna de alvo com valor não positivo, já que temperatura absoluta é sempre positiva, e nomeia a coluna que causou a rejeição. O formato longo passa a afirmar que nenhuma coluna de ordem sobreviveu ao descarte. A seção 22 do caderno passa a conferir a sua transcrição contra a seção 21 executada na mesma sessão, adotando a desta e relatando a divergência em vez de interromper a execução. E a seção 23, que é a da entrega, escreve a regra por região como constante e a confere contra a seleção aninhada da mesma execução; na execução atual, as duas coincidem.

---

## 14. Estado dos cadernos

Cada alteração foi revista quanto a poder ser justificada dentro do próprio caderno, por quem o lê sem acesso a este documento.

| Caderno | Alteração | Justificativa registrada |
|---|---|---|
| Preparação | Família do motivo | Sim, com o ganho de 0,524 medido na mescla e o intervalo; na floresta, que é o estimador de cinco regiões, o ganho é de 0,245 |
| Preparação | Ordem de chaveamento | Sim, com a piora de 6,646 para 6,705 |
| Preparação | Marcador do planejamento | Sim, com os pisos de 6,36 para 5,07 e de 1,33 para 0,57 |
| Preparação | Remoção do componente duplicado | Sim, com os dois nomes registrados na saída |
| Tratamento de treze categorias | Lista de atributos extras | Sim, com a medição das duas famílias |
| Tratamento de nulos | Conferência entre versões | Sim, com a consequência de −0,057 |
| Modelagem | Pasta da versão de perfil | Sim, com o ganho falso de −0,246 |
| Modelagem | Codificação adotada | Sim, com o empate de 7,543 contra 7,560 |
| Modelagem | Transcrição da seção 22 do caderno | Sim, com a inversão das escolhas |
| Modelagem | Codificação das perdas por região | Sim, com a tabela dos quatro candidatos por região |

As saídas gravadas na seção 23 do caderno de modelagem correspondem ao código que está no arquivo, e foram produzidas sobre a base já sem o componente duplicado.

---

## 15. O que é necessário para o próximo ganho

Nove perguntas dependem da parceira e nenhuma delas pode ser respondida pela equipe a partir do dado existente. Estão ordenadas por retorno esperado.

Primeira. Confirmação de que o rótulo de perdas atribuído a simone corresponde ao perfil de duzentos e quarenta, cento e quarenta e cinco, cento e oitenta e cento e oitenta watts. Isso transformaria um rótulo textual em potência numérica por bobina para trinta e dois dos cinquenta e seis ensaios, hoje rotulados apenas por nome. É a única mudança disponível que acrescentaria uma grandeza física à base, em vez de recodificar o que já existe.

Segunda. Confirmação de que os dezesseis transistores da placa de potência se dividem em quatro grupos de quatro, correspondendo a uma bobina cada, e de qual bobina corresponde a qual grupo. A estrutura em quatro grupos já foi recuperada do próprio dado, conforme a seção 8.5, mas o mapeamento para as bobinas não pode ser deduzido. Se ele for confirmado, o perfil de potência declarado no ensaio poderá ser ligado a cada grupo de transistores como potência por bobina. Esta pergunta e a primeira se reforçam.

Terceira. Identificação das duas linhas numéricas sem rótulo presentes nos dezoito primeiros ensaios. Se uma delas for a temperatura ambiente do laboratório, trata-se da variável que falta a qualquer ensaio térmico e que hoje está inteiramente ausente da base.

Quarta. Ensaios de broil c1, hoje ausentes do conjunto reservado, e mais ensaios de pyro, hoje representados por um único caso. Sem eles, a divergência entre a validação cruzada e o conjunto reservado não se resolve.

Quinta. Confirmação de que os dois ensaios chamados Run 43 são de fato a mesma configuração repetida. Dessa resposta depende saber se o piso de ruído do projeto é 2,617 °C ou 2,140 °C, e portanto quanto ainda há a ganhar.

Sexta. Esclarecimento sobre os ensaios DoE Run 7 e DoE Run 8, que a planilha declara diferentes e descreve de forma idêntica.

Sétima. Um ensaio de pyro com perdas declaradas, ou um de broil sem perdas, que é o que desfaria a confusão perfeita descrita na seção 8.2.

Oitava. Confirmação de qual dos dois nomes duplicados em Oven HMI corresponde ao termopar realmente instalado.

Nona. Esclarecimento sobre os ensaios 51 e 52, do tipo pyro, que têm a mesma configuração declarada dos ensaios 48 a 50 e medem cerca de 15 °C menos no Oven HMI. Se houve alteração de procedimento, de duração do ciclo ou de posição do sensor não registrada na planilha, ela explicaria a maior parte do erro quadrático da região e poderia ser incorporada como variável.

Quatro perguntas adicionais foram levantadas em sprints anteriores e permanecem sem resposta. Qual a posição do soprador nos ensaios de números quinze a dezessete do delineamento de experimentos. Qual o perfil de perdas dos ensaios de dezoito a vinte e três, hoje identificados apenas como nova linha de base com variantes de bandeja. Qual a semântica exata da ordem de acionamento das bobinas, cuja contribuição medida é próxima de zero. E se a ordem das colunas na planilha corresponde à ordem de execução dos ensaios, o que validaria em definitivo a análise cronológica da seção 5.6.

Além dessas, permanece disponível uma frente que não depende da parceira: quarenta e seis por cento dos pares de níveis de fatores diferentes nunca foram observados juntos na base. Ensaios dirigidos a essas células vazias acrescentariam informação que nenhuma recodificação pode criar.

---

## 16. Recomendação

O modelo da quarta sprint deve ser adotado, com base na validação cruzada, onde ele melhora erro, ajuste e custo de alarme ao mesmo tempo. A decisão deve ser acompanhada do registro de que o conjunto reservado melhora em erro médio e piora em triagem, conforme a seção 9.6.

A camada de seleção automática deve ser mantida na forma atual, isto é, estimador e codificação das perdas escolhidos por região. Ela só deve ser alargada quando houver evidência de que os candidatos acrescentados se separam dos existentes.

As quatro colunas de ordem de chaveamento devem ser removidas, por três medições independentes as apontarem como prejudiciais. A decisão fica pendente de instrução.

A família de seis níveis do motivo deve ser mantida, por a de nove níveis ter sido medida e ter piorado tanto o agregado quanto a própria região que motivou o teste.

Os dezesseis transistores da placa de potência devem permanecer como alvos separados, pelas razões da seção 10.6.

Dois candidatos medidos permanecem à espera de decisão, e estão descritos no fim da seção 10.9. O primeiro, acrescentar o limite do componente e a contagem de fatores como variáveis, rende 0,041 com a regra fixa, mas foi implementado e revertido por custar 0,065 quando a seleção aninhada é refeita. O segundo, substituir média e desvio por mediana e amplitude interquartílica, rende 0,087 ao custo de 2,7 aprovações indevidas e ainda não passou por essa verificação.

Nenhum dos dois deve ser adotado sem antes ser medido sob a seleção aninhada, e não apenas com a regra congelada.

O peso do ajuste por proximidade ao limite deve ser mantido, por reduzir as aprovações indevidas em vinte e um por cento sem custo apreciável no erro médio, com o registro de que o efeito não se reproduziu no conjunto de teste reservado.

Devem ser pedidos à parceira ensaios de broil c1 e de pyro, que são os regimes ausentes ou quase ausentes do conjunto reservado. Com dez ensaios, e com metade das leituras concentradas numa única região, o conjunto não distingue mérito de sorte.

---

## 17. Onde encontrar cada coisa no repositório

| Assunto | Local |
|---|---|
| Preparação dos conjuntos por área, codificação do motivo e do perfil de perdas, remoção de duplicatas | notebooks/colabs_S4/preparacao_datasets.ipynb |
| Tratamento dos atributos extras | notebooks/colabs_S4/tratamento_datasets_13cat.ipynb |
| Tratamento de valores ausentes | notebooks/colabs_S4/tratamento_nulos_pos_revisao.ipynb |
| Modelagem, todas as formulações avaliadas, e a entrega na seção 23 do caderno | notebooks/colabs_S4/modelagem.ipynb |
| Comparação entre floresta, gradiente, Extra Trees e a mescla, com busca de hiperparâmetros, explicabilidade SHAP e gráficos | notebooks/colabs_S4/comparacao_modelos_final.ipynb |
| Versão original da comparação, sem o Extra Trees e sem os gráficos, mantida como registro | notebooks/colabs_S4/comparacao_modelos.ipynb |
| Grade ampla por região, bootstrap, AutoML com FLAML e PyCaret, e contagem dupla no Oven HMI | notebooks/colabs_S4/analises_complementares.ipynb |
| Partição entre desenvolvimento e teste reservado, e a trava que a protege | notebooks/colabs_S3/preparacao_testes/split_treino_teste.ipynb |
| Verificação de ausência de vazamento | notebooks/colabs_S3/preparacao_testes/verificacao_vazamento.ipynb |
| Definição das métricas | notebooks/colabs_S3/preparacao_testes/metricas.ipynb |
| Análise exploratória do conjunto | notebooks/colabs_S3/analise_dataset/analise_completa.ipynb |

A formulação entregue está na seção 23 do caderno de modelagem. As seções 19 a 22 daquele caderno contêm as formulações de referência e as alternativas avaliadas, e existem para que as decisões possam ser conferidas, não para serem executadas em produção.
