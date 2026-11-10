"""Verifica os pares de cor dos temas contra WCAG 2.1 (4,5:1 texto · 3:1 UI)
e as paletas de daltonismo na simulação de dicromacia (Viénot 1999).

    python tools/contraste.py      # exit 1 se houver falha
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from css.base.tokens import PALETAS_DALTONISMO, Tema  # noqa: E402


def _linear(canal: int) -> float:
    c = canal / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminancia(hexa: str) -> float:
    h = hexa.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def razao(frente: str, fundo: str) -> float:
    a, b = luminancia(frente), luminancia(fundo)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


# (papel, token da frente, token do fundo, alvo)
pares = [
    ("corpo/tabela", "texto", "superficie", 4.5),
    ("corpo sobre fundo", "texto", "fundo", 4.5),
    ("corpo sobre superficieAlt", "texto", "superficieAlt", 4.5),
    ("nota 12px", "textoApoio", "superficie", 4.5),
    ("nota sobre fundo", "textoApoio", "fundo", 4.5),
    ("headline/secao/metrica", "primariaTexto", "superficie", 4.5),
    ("headline sobre fundo", "primariaTexto", "fundo", 4.5),
    ("titulo na faixa", "faixaTexto", "faixa", 4.5),
    ("kicker na faixa", "faixaApoio", "faixa", 4.5),
    ("subtitulo na faixa", "faixaApoio", "faixa", 4.5),
    ("botao primario", "primariaSobre", "primaria", 4.5),
    ("botao primario hover", "primariaSobre", "primariaHover", 4.5),
    ("botao secundario", "primariaTexto", "superficie", 4.5),
    ("botao secundario hover", "primariaTexto", "acentoClaro", 4.5),
    ("botao terciario", "textoApoio", "superficie", 4.5),
    ("botao perigo", "criticoTexto", "superficie", 4.5),
    ("botao perigo hover", "criticoTexto", "criticoFundo", 4.5),
    ("item de menu", "texto", "superficie", 4.5),
    ("item ativo do menu", "primariaTexto", "acentoClaro", 4.5),
    ("nome da marca", "primariaTexto", "superficie", 4.5),
    ("seguro em card", "seguroTexto", "superficie", 4.5),
    ("seguro em faixa", "seguroTexto", "seguroFundo", 4.5),
    ("atencao em card", "atencaoTexto", "superficie", 4.5),
    ("atencao em faixa", "atencaoTexto", "atencaoFundo", 4.5),
    ("critico em card", "criticoTexto", "superficie", 4.5),
    ("critico em faixa", "criticoTexto", "criticoFundo", 4.5),
    ("neutro em card", "neutroTexto", "superficie", 4.5),
    ("neutro em faixa", "neutroTexto", "neutroFundo", 4.5),
    ("detalhe na faixa seguro", "texto", "seguroFundo", 4.5),
    ("detalhe na faixa atencao", "texto", "atencaoFundo", 4.5),
    ("detalhe na faixa critico", "texto", "criticoFundo", 4.5),
    ("icone seguro", "seguro", "superficie", 3.0),
    ("icone seguro/faixa", "seguro", "seguroFundo", 3.0),
    ("icone atencao", "atencao", "superficie", 3.0),
    ("icone atencao/faixa", "atencao", "atencaoFundo", 3.0),
    ("icone critico", "critico", "superficie", 3.0),
    ("icone critico/faixa", "critico", "criticoFundo", 3.0),
    ("borda critica do card", "criticoBorda", "superficie", 3.0),
    ("foco (outline)", "primariaTexto", "fundo", 3.0),
    ("icone do menu", "primariaTexto", "superficie", 3.0),
    ("borda de campo", "contornoCampo", "superficie", 3.0),
    ("medidor: barra", "primariaTexto", "superficieAlt", 3.0),
    ("medidor: barra critica", "critico", "superficieAlt", 3.0),
    ("medidor: limite e erro", "texto", "superficieAlt", 3.0),
    ("badge do menu", "texto", "superficieAlt", 4.5),
    ("apoio na tabela", "textoApoio", "superficie", 4.5),
    ("apoio sobre superficieAlt", "textoApoio", "superficieAlt", 4.5),
    ("icone do estado vazio", "primariaTexto", "superficie", 3.0),
    ("preenchimento do botao", "primaria", "fundo", 3.0),
    ("acento como cor de dado", "acento", "superficie", 3.0),
    ("regua da faixa", "faixaRegua", "fundo", 3.0),
]

# contornos decorativos: reportados, sem alvo (o guia usa 1,27:1 de propósito)
informativos = [
    ("faixa vs fundo", "faixa", "fundo"),
    ("contorno de card", "contorno", "superficie"),
    ("regua/divisoria", "contorno", "superficie"),
]


REGIOES = ["Coil Temps", "CT Knobs", "IPC Comp", "IPC Cooling",
           "Main Vent Sys", "Mainback", "Oven HMI"]


def checar(nome: str, tema: Tema) -> int:
    cores = vars(tema.cores)
    print(f"\n=== {nome} " + "=" * (58 - len(nome)))
    falhas = 0
    for papel, frente, fundo, alvo in pares:
        r = razao(cores[frente], cores[fundo])
        ok = r >= alvo
        falhas += not ok
        print(f"  {'ok ' if ok else 'X  '} {papel:26s} {cores[frente]} / {cores[fundo]}"
              f"  {r:5.2f}:1  (alvo {alvo})")
    # cores de identidade das regiões: elementos gráficos, alvo de 3:1
    for i, cor in enumerate(tema.cores.regiao):
        r = razao(cor, cores["superficie"])
        ok = r >= 3.0
        falhas += not ok
        print(f"  {'ok ' if ok else 'X  '} {('regiao ' + REGIOES[i]):26s} {cor} / {cores['superficie']}"
              f"  {r:5.2f}:1  (alvo 3.0)")
    print("  -- informativo --")
    for papel, frente, fundo in informativos:
        print(f"      {papel:26s} {cores[frente]} / {cores[fundo]}"
              f"  {razao(cores[frente], cores[fundo]):5.2f}:1")
    print(f"  >>> {falhas} falha(s) em {len(pares) + len(REGIOES)} pares")
    return falhas


# --- daltonismo: as paletas alternativas continuam separadas? ---------------
# Simulação de dicromacia de Viénot, Brettel e Mollon (1999): matrizes aplicadas
# em RGB linear. A distância entre as cores simuladas sai em CIELAB (ΔE76);
# abaixo de 15 duas categorias vizinhas começam a se confundir na tela.
MATRIZES = {
    "protanopia": ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216),
                   (-0.003882, -0.048116, 1.051998)),
    "deuteranopia": ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413),
                     (-0.011820, 0.042940, 0.968881)),
    "tritanopia": ((1.255528, -0.076749, -0.178779), (-0.078411, 0.930809, 0.147602),
                   (0.004733, 0.691367, 0.303900)),
}
# qual visão cada paleta precisa atender, e sobre qual fundo ela é desenhada
ALVOS = {"verde-vermelho": ("protanopia", "deuteranopia"),
         "azul-amarelo": ("tritanopia",),
         "sem-cor": ("acromatopsia",)}
# No modo sem cor sobra só a luminosidade: com 3:1 contra o fundo cabem sete
# degraus de ΔE ~9, bem menos folga que nas outras paletas. Ali a cor apenas
# ordena as regiões — quem diz qual é qual é o rótulo escrito, sempre presente.
DE_MINIMO = {"verde-vermelho": 15.0, "azul-amarelo": 15.0, "sem-cor": 6.0}


def _sRGB(canal: float) -> float:
    return 12.92 * canal if canal <= 0.0031308 else 1.055 * canal ** (1 / 2.4) - 0.055


def simular(hexa: str, visao: str) -> tuple[float, float, float]:
    h = hexa.lstrip("#")
    lin = [_linear(int(h[i:i + 2], 16)) for i in (0, 2, 4)]
    if visao == "acromatopsia":
        y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
        lin = [y, y, y]
    else:
        m = MATRIZES[visao]
        lin = [min(1.0, max(0.0, sum(m[i][j] * lin[j] for j in range(3)))) for i in range(3)]
    return tuple(min(1.0, max(0.0, _sRGB(c))) for c in lin)


def lab(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    """CIELAB de uma cor em sRGB (canais 0..1). O sinal é linearizado antes do
    XYZ — sem isso a distância sai num espaço com gama e não é ΔE."""
    r, g, b = (_linear(round(c * 255)) for c in rgb)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116   # noqa: E731
    return (116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z)))


def distancia(a: str, b: str, visoes: tuple[str, ...]) -> float:
    return min(math.dist(lab(simular(a, v)), lab(simular(b, v))) for v in visoes)


def checarDaltonismo() -> int:
    """Cada paleta alternativa precisa passar no contraste como a padrão E manter
    separadas, na visão simulada, todas as cores que carregam sentido: os quatro
    estados (ícone e texto), as sete regiões e as pontas das escalas de dado."""
    print("\n=== PALETAS DE DALTONISMO " + "=" * 33)
    falhas = 0
    for modo, temas in PALETAS_DALTONISMO.items():
        visoes, piso = ALVOS[modo], DE_MINIMO[modo]
        for tema, cor in temas.items():
            base = vars(Tema().cores if tema == "claro" else Tema.escuro().cores)
            c = dict(base) | {k: v for k, v in cor.items() if isinstance(v, str)}
            rotulo = f"{modo}/{tema}"

            # 1. contraste: os mesmos papéis da paleta padrão, com as cores trocadas
            for papel, frente, fundo, alvo in pares:
                r = razao(c[frente], c[fundo])
                if r < alvo:
                    falhas += 1
                    print(f"  X   {rotulo} {papel:24s} {c[frente]} / {c[fundo]}  {r:5.2f}:1  (alvo {alvo})")
            # 2. contraste das cores gráficas próprias da paleta
            graficas = list(cor["regiao"]) + [cor[e] for e in ("seguro", "atencao", "critico")]
            pior = min(razao(x, c["superficie"]) for x in graficas)
            ok = pior >= 3.0
            falhas += not ok
            print(f"  {'ok ' if ok else 'X  '} {rotulo:26s} contraste minimo {pior:5.2f}:1  (alvo 3.0)")

            # 3. separação na visão simulada
            trio = ("seguro", "atencao", "critico")
            grupos = {
                "regioes": (list(cor["regiao"]), True),
                # o cinza de "monitorar" entra na conta: nenhum estado pode encostar nele
                "estados": ([cor[e] for e in trio] + [c["neutro"]], len({cor[e] for e in trio}) == 3),
                "textos": ([cor[e + "Texto"] for e in trio] + [c["neutroTexto"]],
                           len({cor[e + "Texto"] for e in trio}) == 3),
                "faixas": ([cor[e + "Fundo"] for e in trio], len({cor[e + "Fundo"] for e in trio}) == 3),
                # par usado nos gráficos: azul para o que está dentro, vermelho para o que escapa
                "dado dentro/fora": ([c["acento"], cor["critico"], c["neutro"]], True),
            }
            for nome, (cores_, distintas) in grupos.items():
                if not distintas:     # no modo sem cor os três são um tom só, de propósito
                    print(f"  ok  {rotulo} {nome:20s} cor unica: quem separa e o rotulo escrito")
                    continue
                de = min(distancia(a, b, visoes)
                         for i, a in enumerate(cores_) for b in cores_[i + 1:])
                alvo = piso if nome != "faixas" else piso / 3
                ok = de >= alvo
                falhas += not ok
                print(f"  {'ok ' if ok else 'X  '} {rotulo + ' ' + nome:26s} menor dE entre pares "
                      f"{de:5.1f}  (alvo {alvo:.0f}) · {'/'.join(visoes)}")
            # 4. escalas de dado: as pontas precisam se distinguir, e o mapa de calor
            #    precisa de passos legíveis do começo ao fim
            escalas = {"divergente": cor.get("divergente", base["divergente"]),
                       "temperatura": cor.get("temperatura", base["temperatura"]),
                       "mapa de calor": cor.get("mapaCalor", base["mapaCalor"])}
            for nome, ramp in escalas.items():
                pontas = distancia(ramp[0], ramp[-1], visoes)
                passo = min(distancia(ramp[i], ramp[i + 1], visoes) for i in range(len(ramp) - 1))
                ok = pontas >= 25.0 and passo >= piso / 2.5
                falhas += not ok
                print(f"  {'ok ' if ok else 'X  '} {rotulo + ' ' + nome:26s} pontas dE {pontas:5.1f} "
                      f"(alvo 25) · menor passo {passo:5.1f} (alvo {piso / 2.5:.0f})")
    print(f"  >>> {falhas} falha(s)")
    return falhas

if __name__ == "__main__":
    total = (checar("TEMA CLARO", Tema()) + checar("TEMA ESCURO", Tema.escuro())
             + checarDaltonismo())
    sys.exit(1 if total else 0)
