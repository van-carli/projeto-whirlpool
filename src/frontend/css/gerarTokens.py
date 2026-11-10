"""Gera css/tokens.css a partir de css/base/tokens.py.

    python css/gerarTokens.py            # reescreve css/tokens.css
    python css/gerarTokens.py --conferir # sai 1 se o arquivo estiver desatualizado

O design base em Python é a fonte única: as mesmas cores alimentam o app Streamlit
(css/base) e o dashboard no navegador. Antes as duas cópias eram mantidas na mão, e
foi assim que o Accent Blue do tema claro ficou divergente por um tempo.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from css.base.tokens import (PALETAS_DALTONISMO, REGIOES_CSS, Tema,  # noqa: E402
                             prefixoCss)

DESTINO = Path(__file__).resolve().parent / "tokens.css"
CABECALHO = """/* Tokens do Ignis. GERADO por css/gerarTokens.py a partir de css/base/tokens.py.
   Não edite à mão: mude o Python e rode `python css/gerarTokens.py`.
   Nenhuma cor, fonte ou medida literal deve aparecer fora deste arquivo. */"""

# ordem e comentários das seções do :root, para o arquivo continuar legível
SECOES = [
    ("marca (Whirlpool)", ("primaria", "primaria-texto", "primaria-sobre", "primaria-hover",
                           "acento", "acento-claro")),
    ("faixa opcional do cabeçalho", ("faixa", "faixa-texto", "faixa-apoio", "faixa-regua")),
    ("neutros", ("texto", "texto-apoio", "contorno", "contorno-campo",
                 "fundo", "superficie", "superficie-alt")),
    ("estados (exceção funcional documentada)",
     tuple(f"{e}{s}" for e in ("seguro", "atencao", "critico", "neutro")
           for s in ("", "-texto", "-borda", "-fundo"))),
    ("escalas de dado", tuple(f"calor-{i}" for i in range(6)) + tuple(f"div-{i}" for i in range(5))),
    ("mapa de calor do 3D: azul intenso (frio) a vermelho intenso (quente)",
     tuple(f"temp-{i}" for i in range(5))),
    ("identidade das sete regiões térmicas", tuple(f"regiao-{n}" for n in REGIOES_CSS)),
    ("cena 3D", ("cena-fundo", "cena-chao", "cena-aco", "cena-aco-escuro")),
    ("tipografia", ("fonte-titulo", "fonte-corpo", "icone")),
    ("medidas", ("raio", "sombra", "menu", "max", "topo", "duracao", "escala",
                 "e1", "e2", "e3", "e4")),
    ("movimento", ("duracao-entrada", "atraso-sequencia", "curva")),
]


def bloco(seletor: str, variaveis: dict[str, str], secoes=None, extra: str = "") -> str:
    p = f"--{prefixoCss}-"
    linhas, usadas = [], set()
    for titulo, campos in (secoes or []):
        presentes = [c for c in campos if p + c in variaveis]
        if not presentes:
            continue
        linhas.append(f"  /* {titulo} */")
        linhas += [f"  {p}{c}: {variaveis[p + c]};" for c in presentes]
        usadas |= {p + c for c in presentes}
    linhas += [f"  {k}: {v};" for k, v in variaveis.items() if k not in usadas]
    if extra:
        linhas.append(f"  {extra}")
    return f"{seletor} {{\n" + "\n".join(linhas) + "\n}"


def daltonismo() -> list[str]:
    """Um bloco por paleta e tema. Só as variáveis que a paleta troca."""
    saida = []
    escalas = {"divergente": "div", "mapaCalor": "calor", "temperatura": "temp"}
    for modo, temas in PALETAS_DALTONISMO.items():
        for tema, cor in temas.items():
            sel = (f':root[data-theme="dark"][data-daltonismo="{modo}"]' if tema == "escuro"
                   else f':root:not([data-theme="dark"])[data-daltonismo="{modo}"]')
            v = {}
            for chave, valor in cor.items():
                if chave == "regiao":
                    v |= {f"regiao-{n}": c for n, c in zip(REGIOES_CSS, valor)}
                elif chave in escalas:
                    v |= {f"{escalas[chave]}-{i}": c for i, c in enumerate(valor)}
                else:
                    nome = "".join("-" + x.lower() if x.isupper() else x for x in chave)
                    v[nome] = valor
            # a borda de cada estado acompanha a cor do ícone
            v |= {f"{e}-borda": cor[e] for e in ("seguro", "atencao", "critico")}
            saida.append(f"{sel} {{\n"
                         + "\n".join(f"  --{prefixoCss}-{k}: {u};" for k, u in sorted(v.items()))
                         + "\n}")
    return saida


def gerar() -> str:
    partes = [CABECALHO,
              bloco(":root", Tema().variaveis(), SECOES, "color-scheme: light;"),
              bloco(':root[data-theme="dark"]', Tema.escuro().variaveis(), SECOES,
                    "color-scheme: dark;"),
              """/* ---------- ajustes de cor para daltonismo ----------
   Trocam tudo que carrega sentido pela cor: estados (ícone, texto e faixa),
   identidade das regiões e escalas de dado. Escolhem cores que continuam
   separadas na visão simulada, em vez de banir uma matiz; só o modo sem cor
   deixa a tela em tons de cinza. Verificados em tools/contraste.py. */"""]
    partes += daltonismo()
    return "\n\n".join(partes) + "\n"


if __name__ == "__main__":
    css = gerar()
    if "--conferir" in sys.argv:
        atual = DESTINO.read_text(encoding="utf-8") if DESTINO.exists() else ""
        if atual != css:
            print(f"X  {DESTINO.name} está desatualizado: rode python css/gerarTokens.py")
            sys.exit(1)
        print(f"ok {DESTINO.name} em dia com base/tokens.py")
    else:
        DESTINO.write_text(css, encoding="utf-8")
        print(f"gerado {DESTINO} ({len(css.splitlines())} linhas)")
