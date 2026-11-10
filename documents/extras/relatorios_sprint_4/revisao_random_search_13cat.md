# Revisão do caderno de busca aleatória de hiperparâmetros

## 1. Objeto e método

Este documento registra a revisão do caderno random_search_13cat.ipynb e do relatório random_search_13cat_resultados.md, incorporados à branch Develop nos commits 735d745 e c7cf6f9.

A revisão foi conduzida em três etapas. O código foi lido célula a célula, com atenção a vazamento de dados, à definição das variáveis de entrada e ao protocolo de validação. As saídas gravadas foram confrontadas com o código que as produziu. E os números do relatório foram reproduzidos de forma independente, a partir do pipeline do caderno de modelagem, para localizar a origem de uma divergência entre as duas frentes de comparação de modelos que vinha sendo observada sem explicação.

Os valores de temperatura estão em graus Celsius.

## 2. O que está correto

Vários cuidados de método estão presentes e merecem registro, porque são exatamente os que costumam faltar em trabalhos desta natureza.

O patamar e a escala de cada componente são calculados por um transformador próprio, inserido num pipeline, de modo que são ajustados apenas com as linhas de treino de cada dobra e somente aplicados às linhas de validação. O vazamento de informação do alvo para as variáveis de entrada fica impedido por construção, e não por disciplina de quem escreve o código.

A validação retira uma configuração experimental inteira por vez, com as dezessete configurações do conjunto de desenvolvimento, que é o mesmo protocolo adotado no caderno de modelagem. Há uma asserção verificando que nenhuma configuração aparece em duas dobras.

Os valores ausentes do alvo são descartados, e não imputados, o que evita avaliar o modelo sobre temperaturas inventadas.

Há uma asserção que compara o número de previsões com o tamanho de cada conjunto, e que protege contra resultados antigos guardados em disco.

O texto do caderno reconhece que o erro do candidato vencedor é otimista, por ser escolhido e avaliado pela mesma validação, e estabelece um limiar de meio grau abaixo do qual nenhum ganho deve ser tratado como real.

## 3. Problema grave: o motivo do ensaio estava sendo descartado

A lista de prefixos que define as variáveis de entrada declarava cfg_, nome que as colunas do motivo do ensaio tinham até a terceira sprint. Na quarta sprint essas colunas foram substituídas por seis níveis mutuamente exclusivos, com o prefixo reason_. O prefixo novo não constava da lista, e as seis colunas eram, portanto, descartadas em todas as sete áreas.

O próprio caderno registrava o fato na saída da célula de execução, com a mensagem de colunas ignoradas para cada área. A mensagem era um aviso impresso, e não uma interrupção, de modo que a execução seguia até o fim e produzia números plausíveis.

A hipótese foi verificada reproduzindo os resultados da configuração de referência do caderno a partir do pipeline do caderno de modelagem, com as colunas do motivo retiradas.

| Área | Reprodução, sem o motivo | Caderno revisado | Reprodução, com o motivo |
|---|---:|---:|---:|
| Oven HMI | 2,763 | 2,76 | 2,393 |
| CT Knobs | 3,008 | 3,01 | 2,979 |
| IPC Cooling | 4,862 | 4,86 | 3,994 |
| Main Vent Sys | 4,248 | 4,25 | 4,170 |
| Mainback | 5,991 | 5,99 | 4,503 |
| IPC Comp | 8,775 | 8,77 | 7,503 |
| Coil Temps | 11,503 | 11,50 | 11,444 |
| Agregado | 7,399 | 7,40 | 6,474 |

A reprodução coincide em todas as áreas até a segunda casa decimal, o que estabelece a causa. A diferença entre as duas frentes de comparação, que chegava a 1,49 grau em Mainback e que não se explicava por semente, por protocolo de validação nem por codificação das perdas, decorre inteiramente da ausência dessas seis colunas.

A consequência é que todos os números do caderno e do relatório de resultados descrevem um modelo privado da principal melhoria de codificação da sprint, cujo efeito medido chega a 1,17 grau em Mainback e a 0,245 grau no agregado.

Registre-se que este defeito pertence à mesma família de outro, encontrado no caderno de modelagem durante a sprint e descrito na seção 13 do relatório da quarta sprint: uma mudança de nome de coluna que faz variáveis desaparecerem sem erro visível.

## 4. Problema grave: otimismo de seleção na comparação principal

A conclusão central do relatório de resultados é a de que vinte e seis de vinte e oito pares de área e algoritmo melhoraram com a busca aleatória. A comparação que a sustenta confronta uma configuração fixa, definida antes da busca, com o melhor de quarenta candidatos, escolhido pela mesma validação que depois o avalia.

O relatório reconhece o viés, mas afirma que ele afeta igualmente as duas buscas. Isso é correto para comparar a busca nova com a busca anterior, em que ambos os lados foram escolhidos da mesma forma. Não é correto para comparar a busca com a configuração fixa, em que o viés está presente de um lado só.

O tamanho desse efeito foi medido no caderno de modelagem. Uma busca de hiperparâmetros aparentava render 0,506 grau quando escolhida olhando as mesmas dobras em que era avaliada, e rendeu 0,051 grau quando a escolha foi feita de forma aninhada, isto é, escolhendo em cada dobra pelo erro nas demais dobras. O intervalo de confiança do ganho aninhado continha o zero. Noventa por cento do ganho aparente era o próprio ato de escolher.

Não há razão para supor que a proporção seja muito diferente aqui, e por isso a maior parte das melhorias das tabelas 1 e 2 do relatório de resultados deve ser tratada como otimismo até que seja medida de forma aninhada.

## 5. Problemas menores

O caderno espera uma pasta chamada dados, com a partição em formato CSV, ao lado do próprio arquivo. No repositório, a partição está em formato JSON na pasta preparacao_testes, e os conjuntos estão na pasta colabs_S4, de modo que o caderno não executa a partir de uma cópia do repositório sem preparação manual.

O texto da última célula menciona uma coluna chamada supera_sprint3, que o código não cria.

A constante TOTAL_ESPERADO vale 3.277, número de leituras da base anterior à remoção de um componente duplicado. A base atual tem 3.232 leituras. A constante não é usada em nenhum ponto do código.

A escala de um componente com uma única leitura é preenchida com zero, ao passo que o caderno de modelagem a preenche com um. O efeito é desprezível, porque só atinge componentes com uma leitura no treino.

A mescla entre floresta aleatória e gradiente não figura entre os candidatos, embora a orientação do Artefato 7 a trate como modelo por direito próprio.

## 6. Correção aplicada

Duas alterações foram feitas no caderno, nas células 2 e 4.

A lista de prefixos passou a declarar reason_ além de cfg_, com um comentário explicando a mudança de nome, de modo que o caderno leia tanto a base da terceira sprint quanto a da quarta.

O aviso de colunas ignoradas foi substituído por uma asserção. Toda coluna precisa agora ser entrada, alvo ou exclusão deliberada, e as exclusões deliberadas ficam declaradas numa constante própria. A única exclusão declarada é a das colunas de ordem de acionamento das bobinas, medidas como prejudiciais no caderno de modelagem. Qualquer coluna que não se enquadre interrompe a execução e informa o nome da coluna e o que fazer.

A correção foi validada executando as duas células alteradas contra os conjuntos reais, fora do repositório. As seis colunas do motivo passaram a integrar as entradas nas sete áreas, as colunas de ordem de acionamento permaneceram excluídas, e o total de leituras permaneceu em 3.232. A asserção foi testada também no caso negativo, retirando-se o prefixo novo, e interrompeu a execução como previsto.

Uma pendência precisa ser registrada. A busca não foi reexecutada, porque leva horas com os valores atuais de número de candidatos. As saídas gravadas no caderno ainda são as da execução anterior à correção e não correspondem mais ao código. Enquanto a reexecução não for feita, nenhum número do caderno nem do relatório de resultados deve ser citado.

## 7. Consequências para o relatório de resultados

Três conclusões do relatório de resultados dependiam do problema da seção 3 e precisavam ser revistas.

A de que o gradiente vence em cinco das sete áreas. Havia razão para suspeitar que ela mudasse, porque o agrupamento do motivo beneficia os estimadores de forma desigual. A verificação foi feita no caderno comparacao_modelos.ipynb, que reexecuta o mesmo método de busca sobre a base corrigida, e a conclusão se manteve: com o motivo presente, o gradiente ajustado vence em cinco das sete áreas, a floresta em Oven HMI e a mescla em IPC Cooling. A conclusão do relatório de resultados estava certa, ainda que obtida sobre a base incompleta.

A atribuição da Tabela 6, segundo a qual a busca anterior obteve menor erro por efeito da base e não da busca. O efeito é da coluna ausente, e não da base.

A comparação com a busca anterior, que foi feita sobre a base de perfil e portanto com o motivo presente. As duas buscas não eram comparáveis entre si.

Uma conclusão depende do problema da seção 4 e deve ser reformulada independentemente da reexecução: a de que a busca melhorou vinte e seis de vinte e oito pares. Essa afirmação só se sustenta se medida de forma aninhada.

## 8. O que pode ser aproveitado no modelo entregue

A revisão procurou também o que o caderno revisado faz melhor do que o caderno de modelagem.

A contribuição de maior valor é de engenharia, e não de desempenho. A Seção 23 do caderno de modelagem, que contém a formulação entregue, tem carregador próprio e sofre da mesma vulnerabilidade, numa forma mais grave. Nela, uma coluna cujo prefixo não esteja declarado não é descartada, e sim classificada como alvo, de modo que o modelo passaria a prever como temperatura uma coluna binária de configuração. A proteção existente contra esse caso está na seção 3 daquele caderno e não alcança a Seção 23.

Uma verificação equivalente à introduzida no caderno revisado foi testada sobre os dados atuais do caderno de modelagem, exigindo que toda coluna classificada como alvo seja um termopar da tabela de limites. Ela passa hoje nas sete áreas, e, simulada a retirada do prefixo do motivo, aponta corretamente as seis colunas que teriam sido tomadas como alvo. A sua inclusão na Seção 23 não altera nenhum resultado e fecha a vulnerabilidade.

Três outros elementos do caderno revisado podem ser aproveitados na documentação do Artefato 7, embora não alterem o desempenho. O transformador de patamar e escala em forma de pipeline é mais legível do que a construção manual do caderno de modelagem e se integra diretamente às ferramentas de busca da biblioteca, o que atende ao critério de clareza entre texto e código do barema. A asserção de que nenhuma configuração aparece em duas dobras pode ser acrescentada à Seção 23 a custo nulo. E o relato das aprovações indevidas em várias margens de segurança, zero, quatro e oito graus, mostra o compromisso entre precisão e risco de forma mais completa do que uma margem só.

Dois parâmetros do espaço de busca do caderno revisado não foram testados na varredura do caderno de modelagem: a perda de Huber no gradiente e a subamostragem das árvores na floresta. A expectativa de ganho é baixa, dado que a varredura de sessenta variantes não encontrou melhoria adotável, e ambos precisariam ser medidos sob seleção aninhada, conforme a exigência de método registrada na seção 10.9 do relatório da quarta sprint.

O que não deve ser aproveitado é a busca de hiperparâmetros como forma de ganho de desempenho, pelas razões da seção 4.

## 9. Recomendações

A busca do caderno revisado deve ser reexecutada com a correção antes de qualquer número ser citado na documentação do Artefato 7. Essa reexecução foi feita em 24 de setembro de 2026 e está descrita na seção 10.

A comparação entre a configuração fixa e a melhor da busca deve ser refeita de forma aninhada, ou, na impossibilidade, reportada explicitamente como estimativa otimista, sem ser apresentada como melhoria.

A verificação de classificação das colunas deve ser incorporada à Seção 23 do caderno de modelagem.

As duas frentes de comparação devem convergir para o mesmo conjunto de variáveis de entrada antes da redação da seção 4.4, sob pena de a documentação apresentar dois desempenhos diferentes para o mesmo modelo.

## 10. Reexecução com a correção

O caderno foi reexecutado do início em 24 de setembro de 2026, com as seis colunas do motivo do ensaio entre as entradas, lendo apenas os arquivos da pasta colabs_S4 e com o cálculo da escala do componente alinhado ao do caderno de modelagem. Nenhum resultado da execução anterior foi reaproveitado.

Com o motivo presente, o gradiente buscado tem o menor erro nas sete áreas. O caso que motivava a dúvida, Main Vent Sys, não se sustenta: o Extra Trees, que aparecia com 3,77 graus sem o motivo, mede 3,89 com ele, atrás do gradiente, com 3,87. A formulação entregue naquela área, média entre Extra Trees e gradiente com valores fixos e o peso próximo ao limite, mede 3,74 pela escolha aninhada da Seção 23 do caderno de modelagem.

Somadas as sete áreas, o gradiente buscado mede 5,87 graus, praticamente o mesmo que a formulação entregue medida pela regra fixa, 5,86, mas com 31 aprovações indevidas contra 24. Como o número do gradiente é o melhor de quarenta candidatos avaliado nas mesmas dobras em que foi escolhido, a comparação favorece a busca, e ainda assim a triagem da entrega é melhor. A conclusão da seção 4 se mantém.

