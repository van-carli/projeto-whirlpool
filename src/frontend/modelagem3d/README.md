# Modelo 3D das áreas-chave do fogão

Página em HTML que mostra, num fogão de piso com cooktop de indução, onde fica
cada uma das sete áreas-chave do projeto: CT Knobs, Coil Temps, IPC Comp,
IPC Cooling, Main Vent Sys, Mainback e Oven HMI.

## Como abrir

A página usa três.js via CDN e carrega os arquivos `js/` por caminho relativo,
então precisa ser servida por HTTP (abrir o `index.html` direto do disco não
funciona em todos os navegadores):

```
python -m http.server 8790 --directory src/frontend/modelagem3d
```

Depois abra <http://localhost:8790/>. É preciso ter conexão com a internet para
baixar o three.js e as fontes.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| `index.html` | Marcação da página: cabeçalho, barra de ferramentas, visor e painel lateral |
| `estilos.css` | Folha de estilo com os tokens de `base/tokens.py` e a tipografia de `base/tipografia.py` |
| `js/dados.js` | As sete áreas: onde ficam, o que abrangem, componentes e fontes |
| `js/cena.js` | Monta o fogão em three.js, trata clique, câmera e explosão das camadas |
| `js/interface.js` | Lista das áreas, painel de detalhe e barra de ferramentas |
| `js/aplicacao.js` | Estado da tela e ligação entre a cena e o painel |

## Design

As cores, fontes e medidas vêm de `src/frontend/css/base/tokens.py` e
`src/frontend/css/base/tipografia.py`. Como esta página é HTML puro, fora do Streamlit,
os tokens estão **copiados à mão** no bloco `:root` de `estilos.css`: ao alterar
`tokens.py`, atualize esse bloco.

O guia não define uma paleta categórica, ou seja, um conjunto de cores para
diferenciar itens lado a lado. As sete áreas usam cores oficiais do guia
(estados e escala `mapaCalor`), o que é uma extensão a confirmar com o time de
design, porque reaproveita cores que no resto do sistema significam
"crítico", "atenção" e "seguro".

## Limites do modelo

A geometria é esquemática (aproximadamente 76 × 64 × 91 cm) e foi desenhada à
mão em três.js, não é o CAD do produto. A posição de cada área e o que ela
abrange são interpretação dos slides do Kickoff e do Glossário da parceria, e
**precisam ser confirmados com o time da Whirlpool** — em especial o caminho do
ar do Main Vent Sys e a posição do blower do IPC Cooling.
