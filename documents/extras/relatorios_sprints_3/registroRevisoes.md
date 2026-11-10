# Registro das revisões atendidas

Este registro consolida os apontamentos de revisão recebidos ao longo do projeto e indica, para cada um, onde a correção correspondente foi implementada e por qual registro de alteração ela pode ser verificada. Ele existe para que a conferência do atendimento não dependa de percorrer o histórico inteiro do repositório.

Três origens de apontamento são distinguidas: as revisões dos professores, registradas como issues no repositório; a revisão interna conduzida entre integrantes do grupo antes da aprovação de uma solicitação de incorporação; e as revisões de redação conduzidas em frentes paralelas do grupo e depois conciliadas na documentação.

## Revisões dos professores

### Reestruturação da base em sete conjuntos, issue #176

O apontamento do professor de computação indicou que o problema não deveria ser tratado como uma base única com a região térmica como variável de entrada, e sim como sete conjuntos independentes, um por região.

A reestruturação foi executada e está descrita em relatorio_mudancas_dataset1.md, que confronta o planejamento anterior com o novo e indica quais decisões dos notebooks das sprints 1 e 2 permaneceram válidas e quais precisaram ser refeitas. Os notebooks anteriores foram preservados na pasta colabs_S1_S2, de modo que o processo anterior continua auditável, e os novos foram escritos em colabs_S3. A separação está justificada no item b da Seção 4.3 pela heterogeneidade entre regiões, e a região térmica deixou de figurar como variável de entrada, passando a critério de separação dos arquivos.

Registros de alteração: 67d5133, 2be4fe5 e b6253e6.

### Atualização dos notebooks, issue #155

O apontamento resultou na correção do tipo da coluna de identificação do termopar, que passou a inteiro, e na inclusão dos histogramas escalonados que faltavam. As alterações constam dos notebooks das sprints 1 e 2 e do anexo de análise exploratória da documentação.

Registros de alteração: d2a151b, 32b9818 e 3d50abb.

### Hipóteses e imagens, issue #150

O apontamento resultou na revisão das hipóteses, na inclusão da tabela de medianas por caso de ensaio, na análise dos dois gráficos que haviam ficado sem comentário, na correção da numeração das imagens e na correção dos caminhos das imagens. As hipóteses revisadas constam da Seção 4.2.

Registros de alteração: 33732be, 0a56077, 76b191c, 922b40f e 1d18dff.

### Codificação binária e revisão do tratamento, issues #184, #188 e #189

O apontamento resultou na correção da codificação das variáveis categóricas, que passou a produzir zero e um em lugar de valores booleanos, na revisão das escolhas tomadas nos notebooks de preparação e de tratamento e na regeração dos conjuntos corrigidos. O relatório das mudanças feitas após a revisão consta da pasta de extras.

Registros de alteração: d5a40d5, 32715e9, 0413998, b357ecf, a109aed e e86f6ea.

### Tratamento dos valores ausentes, issue #185

O apontamento resultou na implementação do tratamento dos ausentes, acompanhada do notebook que mapeia os boxplots dos valores ausentes. As regras adotadas, as duas condições impostas a elas e a ressalva sobre a estatística de imputação constam do item a da Seção 4.3, na subseção sobre a ordem das operações, e a implementação está em tratamento_nulos_pos_revisao.ipynb.

Registros de alteração: 491dcd1, 603b2ea e bb86759.

### Correções dos artefatos anteriores

As correções dos artefatos 3 e 4 encontram-se nas branches fix/correcaoArt3, fix/ART3, fix/revisãoArtefato4, fix/datasetsRevisao2, fix/revisaoPreProcessamento e docs/revisaoJornadaUsuario, todas já integradas, e alcançam as seções de análise exploratória, de hipóteses, de jornada do usuário e de pré-processamento.

## Revisão interna da decisão de divisão dos dados

A solicitação de incorporação da decisão de divisão dos dados recebeu revisão interna com nove apontamentos. Todos foram atendidos na reescrita do item a da Seção 4.3, e são listados a seguir com a localização da correção.

| Apontamento | Onde foi atendido |
|---|---|
| O arquivo de partição contradiz o texto quanto ao número de configurações de treino | Subseção Composição da partição, com as 17 configurações e 46 ensaios de treino contra 8 configurações e 10 ensaios de teste, e a explicação de por que 32 por cento das configurações correspondem a 18 por cento dos ensaios |
| A justificativa do leave-one-group-out parte do cenário da base inteira | Subseção Desenho de validação, que esclarece que a simulação tomou as 25 configurações como universo e que a implementação resulta em 17 dobras sobre as configurações de treino |
| A estratificação descrita não se aplica ao método escolhido | Subseção Estratificação por tipo de ensaio, que delimita a providência à alternativa de cinco dobras e registra que no leave-one-group-out não há composição de dobra a equilibrar |
| Falta documentar que o conjunto de teste ficou sem o modo broil c1 | Subseção Cobertura do conjunto de teste reservado, que declara a ausência, sua causa aritmética e a consequência para a leitura dos resultados |
| As transformações precisam ser ajustadas dentro de cada dobra | Subseção Ordem das operações, que declara a regra, distingue vazamento entre conjuntos de vazamento entre dobras e registra a exceção conhecida da estatística de imputação |
| Sobraram itens do modelo de documento | A Seção 4.3 passou a ter como estrutura os quatro itens do enunciado, sem sobras |
| A pasta citada não é aquela em que o notebook se encontra | Abertura da Seção 4.3, que cita colabs_S3 e preparacao_testes |
| O argumento do conjunto de teste comum às sete áreas precisa de ressalva | Subseção Partição única para as sete áreas, que registra que a partição garante que nenhuma configuração de teste apareça no treino, e não que as sete áreas sejam avaliadas sobre as mesmas leituras |
| Ajustes de redação | O item a foi reescrito na íntegra |

## Revisões conciliadas de outras frentes do grupo

O item c da Seção 4.3 incorpora a redação das métricas conduzida na branch feat/implementaçãoDasMétricas, e o item d preserva os resultados do Ridge, do Random Forest por componente e do Extra Trees ali documentados. O item b incorpora a redação conduzida na branch docs/secao4.3B, conciliada com a solução entregue nas passagens em que o texto ainda descrevia o estado anterior à adoção do modelo por área e à extração dos atributos do motivo do ensaio. A Seção 3 incorpora a redação sobre o CRISP-DM conduzida na branch docs/referenciasCrispDm.

A conciliação foi verificada parágrafo a parágrafo contra a branch de integração, de modo a assegurar que nenhuma contribuição fosse perdida na resolução dos conflitos.
