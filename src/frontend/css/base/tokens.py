"""Tokens de design. Fonte única da verdade: nenhuma cor, fonte ou medida
literal deve aparecer fora deste arquivo.

Base: guia corporativo Whirlpool (style.whirlpoolcorp.com) + guia do projeto
(documents/assets/guiaEstilos). Onde os dois divergem, vale o da Whirlpool, com uma exceção
documentada: as cores de estado (ver bloco "estados").

Nomes em camelCase no Python; no CSS viram kebab-case via cssVar():
    cssVar("primariaTexto")  ->  "var(--ig-primaria-texto)"

Contrastes verificados por tools/contraste.py: 0 falhas nos dois temas.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, replace

prefixoCss = "ig"

# sufixo de cada região no CSS (--ig-regiao-<sufixo>), na ordem de `Cores.regiao`
REGIOES_CSS = ("coil-temps", "ct-knobs", "ipc-comp", "ipc-cooling",
               "main-vent-sys", "mainback", "oven-hmi")


def paraKebab(nome: str) -> str:
    """primariaTexto -> primaria-texto"""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", nome).lower()


def cssVar(nome: str) -> str:
    """Referência CSS de um token: cssVar("textoApoio") -> var(--ig-texto-apoio)"""
    return f"var(--{prefixoCss}-{paraKebab(nome)})"


def chaveSegura(texto: str) -> str:
    """Mesma limpeza que o Streamlit aplica ao gerar a classe st-key-<key>."""
    return re.sub(r"[^a-zA-Z0-9_-]", "-", str(texto).strip())


@dataclass(frozen=True)
class Cores:
    # --- marca: só cores oficiais Whirlpool ------------------------------
    primaria: str = "#0D436B"            # Accomplished Blue (core)
    primariaTexto: str = "#0D436B"       # headline, métrica, ícones, kicker
    primariaSobre: str = "#FFFFFF"       # texto POR CIMA da primária
    primariaHover: str = "#0A3557"       # extensão: hover do botão primário
    # Accent Blue oficial (#00A0DD) dá 2,97:1 no branco e reprova até para elemento
    # gráfico; no claro entra o tom escuro do guia, que passa e serve como cor de dado.
    acento: str = "#0077A5"
    acentoClaro: str = "#EDF4FC"         # Light Accent Blue — fundo de apoio, item ativo

    # --- faixa do cabeçalho (variante opcional; o padrão é branco) -------
    faixa: str = "#0D436B"
    faixaTexto: str = "#FFFFFF"
    faixaApoio: str = "#EDF4FC"          # kicker e subtítulo na faixa · 9,32:1
    faixaRegua: str = "#0D436B"          # sem régua no claro (= fundo da faixa)

    # --- neutros (Whirlpool) ----------------------------------------------
    texto: str = "#484948"               # Black
    textoApoio: str = "#505863"          # Charcoal Gray (página de tipografia) — 7,2:1
    # o Dark Gray #767777 dá 4,49:1 no branco: reprova para texto, serve para traço
    contorno: str = "#DEE0E3"            # Light Gray — réguas, divisórias, cards
    contornoCampo: str = "#767777"       # Dark Gray — borda de campo precisa de 3:1
    fundo: str = "#FFFFFF"               # "white should occupy the most space"
    superficie: str = "#FFFFFF"
    superficieAlt: str = "#F5F6F7"       # Extra Light Gray — trilho, hover, zebra

    # --- estados: EXCEÇÃO FUNCIONAL ---------------------------------------
    # A paleta Whirlpool não tem vermelho, e o verde/amarelo/laranja dela reprovam
    # contraste (o próprio guia proíbe usá-los em texto). As cores de estado vêm do
    # guia do projeto; os FUNDOS usam os tons claros oficiais da Whirlpool.
    seguro: str = "#0E7C66"
    seguroTexto: str = "#0A5A4A"
    seguroBorda: str = "#0E7C66"
    seguroFundo: str = "#F6F9ED"         # Light Accent Green
    atencao: str = "#B26A00"
    atencaoTexto: str = "#804C00"
    atencaoBorda: str = "#C58F40"
    atencaoFundo: str = "#FDF7E4"        # Light Accent Yellow
    critico: str = "#B3251F"
    criticoTexto: str = "#7E1915"
    criticoBorda: str = "#BD413B"
    criticoFundo: str = "#FCF6ED"        # Light Accent Orange
    neutro: str = "#767777"
    neutroTexto: str = "#484948"
    neutroBorda: str = "#DEE0E3"
    neutroFundo: str = "#F5F6F7"

    # --- escalas de dado (amostradas do guia do projeto, seção 01) --------
    mapaCalor: tuple[str, ...] = ("#000004", "#320A5E", "#781C6D",
                                  "#BC3754", "#ED6925", "#FCFFA4")
    divergente: tuple[str, ...] = ("#0E7C66", "#6FA79A", "#C7CDD4",
                                   "#C97B76", "#B3251F")

    # mapa de calor do modelo 3D: azul intenso (mais frio) a vermelho intenso (mais quente)
    temperatura: tuple[str, ...] = ("#0B3C8C", "#3F7BD1", "#E6E3DE", "#D2553B", "#A5140F")

    # --- cena do modelo 3D --------------------------------------------------
    # Neutros próprios do 3D: fundo, chão e os dois tons de aço das peças sem cor.
    cenaFundo: str = "#F5F6F7"
    cenaChao: str = "#E9EBEE"
    cenaAco: str = "#DEE0E3"
    cenaAcoEscuro: str = "#767777"

    # --- identidade das sete regiões térmicas ------------------------------
    # Extensão: o guia não define paleta categórica. As cores saem da paleta
    # oficial e das escalas de dado, escolhidas com matizes distintos entre si.
    # Ordem: Coil Temps, CT Knobs, IPC Comp, IPC Cooling, Main Vent Sys,
    # Mainback, Oven HMI (a mesma de ORDEM_AREAS no dashboard).
    regiao: tuple[str, ...] = ("#B3251F", "#B26A00", "#0E7C66", "#0077A5",
                               "#0D436B", "#781C6D", "#505863")


# --- paletas para daltonismo (extensão de acessibilidade) -----------------
# A paleta padrão separa bem as sete regiões para quem enxerga as três faixas de
# cor. Para quem não enxerga, estas paletas trocam as cores gráficas por outras
# que continuam distinguíveis na simulação de dicromacia. Cada paleta cobre TUDO
# que carrega sentido pela cor: estados (cor do ícone, do texto e da faixa),
# identidade das sete regiões e as escalas de dado — divergente sempre, e mapa
# de calor e escala de temperatura quando as padrão não servem (Viénot 1999, distância
# em CIELAB); a verificação está em tools/contraste.py. A cor nunca é o único
# sinal na interface: todo estado também vem escrito.
#
# Ordem de `regiao`: Coil Temps, CT Knobs, IPC Comp, IPC Cooling, Main Vent Sys,
# Mainback, Oven HMI — a mesma de ORDEM_AREAS no dashboard.
PALETAS_DALTONISMO: dict[str, dict[str, dict[str, object]]] = {
    # protanopia e deuteranopia: sem oposição verde/vermelho. O estado seguro vira
    # azul porque o verde-azulado encosta no cinza de "monitorar" nessas visões.
    "verde-vermelho": {
        "claro": {
            "seguro": "#1A5FA8",
            "seguroTexto": "#1A5FA8",
            "seguroFundo": "#D9E3ED",
            "atencao": "#A8760F",
            "atencaoTexto": "#8C630D",
            "atencaoFundo": "#F0EBE0",
            "critico": "#6B0D08",
            "criticoTexto": "#6D0D08",
            "criticoFundo": "#EDDAD9",
            "regiao": ("#CD751D", "#62300E", "#279B78", "#1D87CD",
                        "#1D1DCD", "#0E0E62", "#1F4251"),
            "divergente": ("#1A5FA8", "#B5BFD4", "#F5F6F7", "#C0B5B6", "#6B0D08"),
        },
        "escuro": {
            "seguro": "#6FB4F2",
            "seguroTexto": "#6EB3F2",
            "seguroFundo": "#243442",
            "atencao": "#E0A13A",
            "atencaoTexto": "#E0A039",
            "atencaoFundo": "#423724",
            "critico": "#D4655C",
            "criticoTexto": "#D9766E",
            "criticoFundo": "#3F2422",
            "regiao": ("#E04E29", "#E0E029", "#C2E79D", "#94F0F0",
                        "#6B87C7", "#7A5CEE", "#BC4E64"),
            "divergente": ("#6FB4F2", "#5386B4", "#22272E", "#9D4E49", "#D4655C"),
        },
    },
    # tritanopia: sem oposição azul/amarelo
    "azul-amarelo": {
        "claro": {
            "seguro": "#0E7C66",
            "seguroTexto": "#0D735E",
            "seguroFundo": "#D9EDE9",
            "atencao": "#8A5A00",
            "atencaoTexto": "#8A5A00",
            "atencaoFundo": "#EDE6D9",
            "critico": "#C1152C",
            "criticoTexto": "#C1152C",
            "criticoFundo": "#EDD9DC",
            "regiao": ("#CD1D1D", "#8F9B27", "#18AA18", "#16165A",
                        "#981DCD", "#620E0E", "#CD1DAA"),
            "divergente": ("#0E7C66", "#B4C6C1", "#F5F6F7", "#DDB5B8", "#C1152C"),
        },
        "escuro": {
            "seguro": "#57D46B",
            "seguroTexto": "#59D46C",
            "seguroFundo": "#244229",
            "atencao": "#D9A24A",
            "atencaoTexto": "#D9A24A",
            "atencaoFundo": "#423724",
            "critico": "#F2554B",
            "criticoTexto": "#F46B62",
            "criticoFundo": "#422624",
            "regiao": ("#E02929", "#D4F094", "#70EBEB", "#4E6FBC",
                        "#994CE6", "#F0AF94", "#E029CE"),
            "divergente": ("#57D46B", "#439D53", "#22272E", "#B3433E", "#F2554B"),
        },
    },
    # acromatopsia: só luminosidade, inclusive o azul da marca — senão sobraria
    # matiz justamente nos gráficos (foco x contexto). Sete degraus de L* com 3:1
    # contra o fundo, um tom único para os três textos de estado (sem matiz não há
    # como separá-los: ali quem diz o estado é a palavra escrita).
    "sem-cor": {
        "claro": {
            "primaria": "#2B2B2B",
            "primariaTexto": "#2B2B2B",
            "primariaHover": "#141414",
            "acento": "#5C5C5C",
            "acentoClaro": "#ECECEC",
            "seguro": "#313131",
            "seguroTexto": "#484948",
            "seguroFundo": "#F5F6F7",
            "atencao": "#606060",
            "atencaoTexto": "#484948",
            "atencaoFundo": "#F5F6F7",
            "critico": "#000000",
            "criticoTexto": "#484948",
            "criticoFundo": "#F5F6F7",
            "regiao": ("#000000", "#1C1C1C", "#313131", "#484848",
                        "#606060", "#7A7A7A", "#949494"),
            "divergente": ("#000000", "#262626", "#484848", "#6D6D6D", "#949494"),
            "mapaCalor": ("#000000", "#202020", "#3A3A3A", "#575757",
                        "#757575", "#949494"),
            "temperatura": ("#000000", "#262626", "#484848", "#6D6D6D", "#949494"),
        },
        "escuro": {
            "primaria": "#6B6B6B",
            "primariaTexto": "#C0C0C0",
            "primariaHover": "#5E5E5E",
            "acento": "#757575",
            "acentoClaro": "#2E2E2E",
            "seguro": "#CACACA",
            "seguroTexto": "#F2F4F6",
            "seguroFundo": "#22272E",
            "atencao": "#989898",
            "atencaoTexto": "#F2F4F6",
            "atencaoFundo": "#22272E",
            "critico": "#FFFFFF",
            "criticoTexto": "#F2F4F6",
            "criticoFundo": "#22272E",
            "regiao": ("#FFFFFF", "#E4E4E4", "#CACACA", "#B1B1B1",
                        "#989898", "#808080", "#696969"),
            "divergente": ("#FFFFFF", "#D7D7D7", "#B1B1B1", "#8C8C8C", "#696969"),
            "mapaCalor": ("#FFFFFF", "#DFDFDF", "#C0C0C0", "#A2A2A2",
                        "#858585", "#696969"),
            "temperatura": ("#FFFFFF", "#D7D7D7", "#B1B1B1", "#8C8C8C", "#696969"),
        },
    },
}


@dataclass(frozen=True)
class Fontes:
    # Whirlpool: Nunito Sans (nunca "Nunito") + Open Sans; Noto Sans de reserva
    titulo: str = "'Nunito Sans', 'Noto Sans', sans-serif"
    corpo: str = "'Open Sans', 'Noto Sans', sans-serif"
    web: str = ("https://fonts.googleapis.com/css2?"
                "family=Nunito+Sans:wght@300;400;600;700"
                "&family=Open+Sans:wght@400;600;700&display=swap")
    icones: str = "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
    tamanhoIcone: int = 20               # Phosphor regular (traço, sem preenchimento)


@dataclass(frozen=True)
class Escala:
    """Grid de 8px · raio 4px · sem sombra (guia do projeto)."""
    grade: int = 8
    raio: int = 4
    sombra: str = "none"
    larguraMenu: int = 288               # 36 × 8
    larguraMaxima: int = 1440
    alturaTopo: int = 56                 # barra superior
    duracao: str = "120ms"               # extensão: hover e troca de estado
    duracaoEntrada: str = "200ms"        # extensão: elemento que aparece (tela, card, selo)
    atrasoSequencia: str = "40ms"        # extensão: intervalo entre itens que entram em sequência
    curva: str = "cubic-bezier(0.2, 0, 0, 1)"   # extensão: desaceleração, sem repique

    def esp(self, n: int) -> int:
        """Espaçamento no grid: esp(2) -> 16px."""
        return n * self.grade


@dataclass(frozen=True)
class Marca:
    """Lockup de sistema interno (Whirlpool): [logo] | nome do sistema.

    O logo oficial só existe na biblioteca da Whirlpool (exige Whirlpool ID):
    sem o arquivo, aparece apenas o nome do sistema — nunca um logo improvisado.
    """
    nome: str = "Ignis"                  # Nunito Sans Light, sem caixa alta
    subsistema: str = "Divisão Fogões"   # metade do tamanho do nome
    logo: str | None = None              # caminho/URL do logo oficial
    alturaLogo: int = 90                 # Whirlpool: mínimo de 90px de altura na web
    favicon: str = "assets/favicon.svg"


@dataclass(frozen=True)
class Tema:
    cores: Cores = field(default_factory=Cores)
    fontes: Fontes = field(default_factory=Fontes)
    escala: Escala = field(default_factory=Escala)
    marca: Marca = field(default_factory=Marca)
    modo: str = "claro"

    def com(self, **campos) -> Tema:
        return replace(self, **campos)

    @staticmethod
    def escuro(**campos) -> Tema:
        """Extensão: o guia Whirlpool pede base branca; o escuro fica fora dele.
        Contrastes verificados (0 falhas)."""
        return Tema(
            cores=Cores(
                primaria="#1E6FB0", primariaTexto="#7FC1EF",
                primariaSobre="#FFFFFF", primariaHover="#2A7AB8",
                acento="#00A0DD",            # no escuro o Accent Blue oficial passa (5,5:1)
                acentoClaro="#16303F",
                faixa="#0D436B", faixaTexto="#FFFFFF",
                faixaApoio="#EDF4FC", faixaRegua="#00A0DD",
                texto="#F2F4F6", textoApoio="#A8ADB4",
                contorno="#2A3038", contornoCampo="#767777",
                fundo="#15181C", superficie="#1B1F25", superficieAlt="#20252C",
                seguro="#3FBF9E", seguroTexto="#5FD6B6",
                seguroBorda="#3FBF9E", seguroFundo="#11302A",
                atencao="#E0A13A", atencaoTexto="#F0BC64",
                atencaoBorda="#C58F40", atencaoFundo="#33260F",
                critico="#E06A62", criticoTexto="#F08981",
                criticoBorda="#BD413B", criticoFundo="#341A19",
                neutro="#A8ADB4", neutroTexto="#C7CCD2",
                neutroBorda="#333B45", neutroFundo="#22272E",
                mapaCalor=("#320A5E", "#781C6D", "#BC3754", "#ED6925", "#FCFFA4"),
                divergente=("#3FBF9E", "#6FA79A", "#3A424B", "#C97B76", "#E06A62"),
                temperatura=("#2F6FE0", "#5AA9F5", "#3A424B", "#E0745F", "#F2352B"),
                regiao=("#E06A62", "#E0A13A", "#3FBF9E", "#00A0DD",
                        "#7FC1EF", "#B07BC9", "#C7CCD2"),
                cenaFundo="#20252C", cenaChao="#262C34",
                cenaAco="#7B838C", cenaAcoEscuro="#3A424B",
            ),
            modo="escuro", **campos)

    def variaveis(self) -> dict[str, str]:
        """Custom properties do :root, já em kebab-case.

        É daqui que sai o css/tokens.css (veja css/gerarTokens.py): as cores simples
        pelo nome do campo, as escalas de dado numeradas e as sete regiões pelo nome
        da área. Medidas de texto entram multiplicadas por --ig-escala, o ajuste de
        tamanho das configurações de exibição.
        """
        p = f"--{prefixoCss}"
        v = {f"{p}-{paraKebab(k)}": u for k, u in vars(self.cores).items()
             if isinstance(u, str)}
        v |= {f"{p}-calor-{i}": c for i, c in enumerate(self.cores.mapaCalor)}
        v |= {f"{p}-div-{i}": c for i, c in enumerate(self.cores.divergente)}
        v |= {f"{p}-temp-{i}": c for i, c in enumerate(self.cores.temperatura)}
        v |= {f"{p}-regiao-{n}": c for n, c in zip(REGIOES_CSS, self.cores.regiao)}
        e = self.escala
        v |= {f"{p}-fonte-titulo": self.fontes.titulo,
              f"{p}-fonte-corpo": self.fontes.corpo,
              f"{p}-icone": f"calc({self.fontes.tamanhoIcone}px * var(--{prefixoCss}-escala))",
              f"{p}-raio": f"{e.raio}px",
              f"{p}-sombra": e.sombra,
              f"{p}-menu": f"{e.larguraMenu}px",
              f"{p}-max": f"{e.larguraMaxima}px",
              f"{p}-topo": f"calc({e.alturaTopo}px * var(--{prefixoCss}-escala))",
              f"{p}-duracao": e.duracao,
              f"{p}-duracao-entrada": e.duracaoEntrada,
              f"{p}-atraso-sequencia": e.atrasoSequencia,
              f"{p}-curva": e.curva,
              f"{p}-escala": "1"}
        v |= {f"{p}-e{n}": f"{e.esp(n)}px" for n in (1, 2, 3, 4)}
        return v


temaPadrao = Tema()
