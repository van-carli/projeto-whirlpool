"""Menu de navegação: seções, itens simples, itens compostos, menus suspensos e filtros.

O menu é uma árvore. ItemNav é folha; ItemComposto tem filhos (sem `pagina` vira
seção com título, como "TELAS"); MenuSuspenso é um ItemComposto que recolhe.

    menu = Menu(
        itens=[
            ItemComposto("telas", "Telas", filhos=[
                ItemNav("aceitacao", "Aceitação", icone="ph-shield-check"),
                ItemNav("diagnostico", "Diagnóstico", icone="ph-magnifying-glass"),
            ]),
            MenuSuspenso("config", "Configurações", filhos=[
                ItemNav("parametros", "Parâmetros", icone="ph-sliders-horizontal"),
            ]),
        ],
        filtros=desenharFiltros,       # função que desenha os campos da seção "Filtros"
    )

Ícones: "ph-<nome>" usa Phosphor (o mesmo conjunto do guia, seção 03).
Emoji ou ":material/<nome>:" também funcionam, desenhados pelo próprio st.button.
"""
from __future__ import annotations

import base64
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from html import escape
from pathlib import Path

import streamlit as st

from .tipografia import Estilo, Tipografia
from .tokens import chaveSegura

# medidas do item (px) — múltiplos/meios do grid de 8
recuoIcone = 12        # da borda do item até o ícone
larguraIcone = 20      # (guia) Phosphor 20px
respiroIcone = 8       # entre ícone e rótulo
recuoNivel = 16        # por nível de aninhamento


def _ehPhosphor(icone: str | None) -> bool:
    return bool(icone) and icone.startswith("ph-")


# ---------------------------------------------------------------- itens
@dataclass(eq=False)
class ItemBase:
    chave: str
    rotulo: str
    icone: str | None = None            # "ph-<nome>", emoji ou ":material/<nome>:"
    visivel: bool = True
    desabilitado: bool = False
    distintivo: str | None = None       # badge à direita: "3", "novo", ...

    # preenchidos pelo Menu ao indexar a árvore
    nivel: int = field(default=0, init=False)
    recuo: int = field(default=0, init=False)
    pai: ItemBase | None = field(default=None, init=False, repr=False)

    @property
    def navegavel(self) -> bool:
        return False

    def subitens(self) -> list[ItemBase]:
        return []

    def trilha(self) -> list[str]:
        """['Telas', 'Aceitação'] — usado pelo cabeçalho."""
        return (self.pai.trilha() if self.pai else []) + [self.rotulo]

    def descendentes(self) -> Iterator[ItemBase]:
        for filho in self.subitens():
            yield filho
            yield from filho.descendentes()

    def renderizar(self, menu: Menu) -> None:
        raise NotImplementedError


def _botaoNav(item: ItemBase, menu: Menu) -> None:
    """Um item = contêiner com [ícone Phosphor] [badge] e o st.button por baixo.
    Ícone e badge são posicionados por CSS sobre o botão e não recebem clique."""
    chave = chaveSegura(item.chave)
    phosphor = _ehPhosphor(item.icone)
    with st.container(key=f"navItem-{chave}", gap=None):
        if phosphor:
            st.markdown(f'<i class="ph {item.icone} ig-nav__icone"></i>',
                        unsafe_allow_html=True)
        if item.distintivo:
            st.markdown(f'<span class="ig-nav__distintivo">{escape(item.distintivo)}</span>',
                        unsafe_allow_html=True)
        st.button(item.rotulo, key=f"nav-{chave}",
                  icon=None if phosphor else item.icone,
                  width="stretch", disabled=item.desabilitado,
                  on_click=menu.selecionar, args=(item.chave,))


@dataclass(eq=False, kw_only=True)
class ItemNav(ItemBase):
    """Item simples: leva a uma página do dashboard."""
    titulo: str | None = None           # título exibido no topo; padrão = rótulo
    subtitulo: str | None = None
    pagina: Callable[[], None] | None = None

    @property
    def navegavel(self) -> bool:
        return not self.desabilitado

    def renderizar(self, menu: Menu) -> None:
        _botaoNav(self, menu)


@dataclass(eq=False, kw_only=True)
class ItemComposto(ItemBase):
    """Item que agrupa outros itens ou menus suspensos.

    - sem `pagina`: é uma SEÇÃO — título em caixa alta ("TELAS") e filhos sem recuo;
    - com `pagina`: é navegável E mostra os filhos recuados abaixo dele.
    """
    filhos: list[ItemBase] = field(default_factory=list)
    titulo: str | None = None
    subtitulo: str | None = None
    pagina: Callable[[], None] | None = None

    @property
    def navegavel(self) -> bool:
        return self.pagina is not None and not self.desabilitado

    @property
    def ehSecao(self) -> bool:
        return not self.navegavel

    @property
    def recuaFilhos(self) -> bool:
        return not self.ehSecao

    def subitens(self) -> list[ItemBase]:
        return [f for f in self.filhos if f.visivel]

    def adicionar(self, item: ItemBase) -> ItemComposto:
        self.filhos.append(item)
        return self

    def contemAtivo(self, rota: str) -> bool:
        return any(d.chave == rota for d in self.descendentes())

    def _renderizarConteudo(self, menu: Menu) -> None:
        if self.navegavel:
            _botaoNav(self, menu)
        for filho in self.subitens():
            filho.renderizar(menu)

    def renderizar(self, menu: Menu) -> None:
        if self.ehSecao:
            Tipografia.escrever(self.rotulo, Estilo.ROTULO, classes="ig-nav__grupo")
        self._renderizarConteudo(menu)


@dataclass(eq=False, kw_only=True)
class MenuSuspenso(ItemComposto):
    """Item composto que recolhe/expande os filhos. Abre sozinho se contiver a aba ativa."""
    aberto: bool = False

    @property
    def ehSecao(self) -> bool:
        return False

    @property
    def recuaFilhos(self) -> bool:
        return True

    def renderizar(self, menu: Menu) -> None:
        expandido = self.aberto or self.contemAtivo(menu.ativo)
        icone = None if _ehPhosphor(self.icone) else self.icone   # expander não aceita Phosphor
        with st.expander(self.rotulo, expanded=expandido, icon=icone):
            self._renderizarConteudo(menu)


# ----------------------------------------------------------------- menu
@dataclass(eq=False)
class Menu:
    itens: list[ItemBase] = field(default_factory=list)
    chaveEstado: str = "rota"
    largura: int | None = None          # None = tokens.Escala.larguraMenu
    oculto: bool = False                # esconde o menu inteiro
    recolhido: bool = False             # inicia colapsado
    mostrarMarca: bool = True
    filtros: Callable[[], None] | None = None   # desenha os campos da seção de filtros
    tituloFiltros: str = "Filtros"
    rodape: str | None = None
    _ouvintes: list[Callable[[str, str], None]] = field(default_factory=list, init=False, repr=False)
    _indice: dict[str, ItemBase] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self):
        self._indexar(self.itens, 0, None)
        estado = st.session_state
        rota = estado.get(self.chaveEstado)
        if rota not in self._indice or not self._indice[rota].navegavel:
            estado[self.chaveEstado] = self.primeiraRota
        # a flag é gravada no callback (antes do rerun) e consumida aqui
        self._trocou = estado.pop(f"{self.chaveEstado}Trocou", False)

    def _indexar(self, itens: list[ItemBase], nivel: int, pai: ItemBase | None) -> None:
        for item in itens:
            item.nivel, item.pai = nivel, pai
            item.recuo = 0 if pai is None else pai.recuo + int(pai.recuaFilhos)
            self._indice[item.chave] = item
            self._indexar(item.subitens(), nivel + 1, item)

    # -- consulta --------------------------------------------------------
    @property
    def primeiraRota(self) -> str:
        return next((i.chave for i in self._indice.values() if i.navegavel), "")

    @property
    def ativo(self) -> str:
        return st.session_state.get(self.chaveEstado, self.primeiraRota)

    @property
    def itemAtivo(self) -> ItemBase | None:
        return self._indice.get(self.ativo)

    def item(self, chave: str) -> ItemBase | None:
        return self._indice.get(chave)

    # -- mudança de aba --------------------------------------------------
    def assinar(self, callback: Callable[[str, str], None]) -> None:
        """Registra função chamada a cada troca de aba: callback(anterior, nova)."""
        self._ouvintes.append(callback)

    def selecionar(self, chave: str) -> None:
        anterior = self.ativo
        if chave == anterior:
            return
        estado = st.session_state
        estado[self.chaveEstado] = chave
        estado[f"{self.chaveEstado}Anterior"] = anterior
        estado[f"{self.chaveEstado}Trocou"] = True
        for ouvinte in self._ouvintes:
            ouvinte(anterior, chave)

    def mudou(self) -> bool:
        """True apenas na execução logo após uma troca de aba."""
        return self._trocou

    # -- render ------------------------------------------------------------
    @staticmethod
    def _divisor() -> None:
        st.markdown('<div class="ig-nav__divisor"></div>', unsafe_allow_html=True)

    def renderizar(self, tema) -> str:
        if self.oculto:
            st.html('<style>section[data-testid="stSidebar"],'
                    '[data-testid="stSidebarCollapsedControl"]{display:none}</style>')
            return self.ativo
        with st.sidebar:
            st.html(self._cssDinamico(tema))    # só <style>: o st.html não ocupa espaço
            if self.mostrarMarca:
                st.markdown(cartaoMarca(tema.marca), unsafe_allow_html=True)
            visiveis = [i for i in self.itens if i.visivel]
            for posicao, item in enumerate(visiveis):
                if posicao and getattr(item, "ehSecao", False):
                    self._divisor()                     # linha antes de cada nova seção
                item.renderizar(self)
            if self.filtros:
                self._divisor()
                Tipografia.escrever(self.tituloFiltros, Estilo.ROTULO, classes="ig-nav__grupo")
                with st.container(key="navFiltros"):
                    self.filtros()
            if self.rodape:
                Tipografia.escrever(self.rodape, Estilo.NOTA, classes="ig-nav__rodape")
        return self.ativo

    def _cssDinamico(self, tema) -> str:
        """Largura, recuo por nível e destaque do item ativo, calculados da árvore."""
        largura = self.largura or tema.escala.larguraMenu

        def item(chave: str) -> str:
            # classe repetida de propósito: este <style> fica na sidebar, ANTES do
            # CSS global no DOM, então precisa ganhar por especificidade, não por ordem
            classe = f"st-key-navItem-{chaveSegura(chave)}"
            return f'section[data-testid="stSidebar"] div.{classe}.{classe}'

        regras = [f'section[data-testid="stSidebar"]{{width:{largura}px!important;'
                  f'min-width:{largura}px!important}}']
        for chave, i in self._indice.items():
            if not i.recuo:
                continue
            deslocamento = recuoNivel * i.recuo
            texto = deslocamento + recuoIcone + (
                larguraIcone + respiroIcone if _ehPhosphor(i.icone) else 0)
            regras += [f"{item(chave)} button{{padding-left:{texto}px!important}}",
                       f'{item(chave)} [data-testid="stElementContainer"]:has(.ig-nav__icone)'
                       f"{{left:{deslocamento + recuoIcone}px!important}}"]
        if self.ativo in self._indice:
            regras += [f"{item(self.ativo)} button{{"
                       "background:var(--ig-acento-claro)!important;"
                       "color:var(--ig-primaria-texto)!important;"
                       "font-weight:600!important;"
                       "border-left-color:var(--ig-primaria-texto)!important}",
                       f"{item(self.ativo)} .ig-nav__icone{{color:var(--ig-primaria-texto)}}"]
        return "<style>" + "\n".join(regras) + "</style>"


# ------------------------------------------------------------ logo/marca
def _logoEmbutida(caminho: str) -> str | None:
    arquivo = Path(caminho)
    if arquivo.exists():
        tipo = "svg+xml" if arquivo.suffix == ".svg" else arquivo.suffix.lstrip(".")
        dados = base64.b64encode(arquivo.read_bytes()).decode()
        return f"data:image/{tipo};base64,{dados}"
    return caminho if caminho.startswith("http") else None


def cartaoMarca(marca, comLogo: bool = False) -> str:
    """Lockup de sistema interno (Whirlpool): [logo oficial] | nome + subsistema.

    Na sidebar vai só o nome (o logo pede 90px de altura e fundo claro amplo);
    com comLogo=True e marca.logo definido, desenha o lockup completo.
    """
    nome = escape(marca.nome)
    texto = (f'<div class="ig-marca__texto"><div class="ig-marca__nome">{nome}</div>'
             f'<div class="ig-marca__sub">{escape(marca.subsistema)}</div></div>')
    fonte = _logoEmbutida(marca.logo) if (comLogo and marca.logo) else None
    if not fonte:
        return f'<div class="ig-marca">{texto}</div>'
    return (f'<div class="ig-marca ig-marca--lockup">'
            f'<img src="{fonte}" alt="Whirlpool Corporation" class="ig-marca__logo" '
            f'style="height:{marca.alturaLogo}px">'
            f'<span class="ig-marca__linha" style="height:{round(marca.alturaLogo * 0.6)}px"></span>'
            f'{texto}</div>')


def regrasCss(tema) -> str:
    textoComIcone = recuoIcone + larguraIcone + respiroIcone
    return f"""
section[data-testid="stSidebar"]{{background:var(--ig-superficie);
  border-right:1px solid var(--ig-contorno)}}
/* itens colados, como no protótipo: o Streamlit põe 16px entre elementos */
section[data-testid="stSidebar"] [data-testid="stVerticalBlock"]{{gap:4px}}

/* --- item: contêiner + botão ----------------------------------------- */
section[data-testid="stSidebar"] div[class*="st-key-navItem-"]{{position:relative}}
section[data-testid="stSidebar"] div[class*="st-key-nav-"] button,
section[data-testid="stSidebar"] div[class*="st-key-nav-"] button:focus,
section[data-testid="stSidebar"] div[class*="st-key-nav-"] button:active{{
  justify-content:flex-start!important;text-align:left;
  background:transparent!important;border:1px solid transparent!important;
  border-left:3px solid transparent!important;
  border-radius:var(--ig-raio);color:var(--ig-texto)!important;
  font-family:var(--ig-fonte-corpo);font-weight:400;font-size:14px;
  min-height:40px;padding:0 {recuoIcone}px;box-shadow:none}}
section[data-testid="stSidebar"] div[class*="st-key-navItem-"]:has(.ig-nav__icone) button{{
  padding-left:{textoComIcone}px}}
section[data-testid="stSidebar"] div[class*="st-key-navItem-"]:has(.ig-nav__distintivo) button{{
  padding-right:40px}}
section[data-testid="stSidebar"] div[class*="st-key-nav-"] button:hover{{
  background:var(--ig-superficie-alt)!important;color:var(--ig-primaria-texto)!important}}
section[data-testid="stSidebar"] div[class*="st-key-nav-"] button p{{
  color:inherit!important;font-weight:inherit}}
section[data-testid="stSidebar"] div[class*="st-key-nav-"] button>div{{
  justify-content:flex-start!important}}

/* ícone e badge ficam por cima do botão e deixam o clique passar */
section[data-testid="stSidebar"] div[class*="st-key-navItem-"] [data-testid="stElementContainer"]:has(.ig-nav__icone),
section[data-testid="stSidebar"] div[class*="st-key-navItem-"] [data-testid="stElementContainer"]:has(.ig-nav__distintivo){{
  position:absolute;top:0;bottom:0;z-index:1;display:flex;align-items:center;
  width:auto!important;pointer-events:none}}
section[data-testid="stSidebar"] div[class*="st-key-navItem-"] [data-testid="stElementContainer"]:has(.ig-nav__icone){{
  left:{recuoIcone}px}}
section[data-testid="stSidebar"] div[class*="st-key-navItem-"] [data-testid="stElementContainer"]:has(.ig-nav__distintivo){{
  right:{recuoIcone}px}}
/* Whirlpool: ícone em traço, só na cor principal */
.ig-nav__icone{{font-size:{larguraIcone}px;line-height:1;color:var(--ig-primaria-texto);
  transition:color var(--ig-duracao)}}
section[data-testid="stSidebar"] div[class*="st-key-navItem-"]:hover .ig-nav__icone{{
  color:var(--ig-primaria-texto)}}
.ig-nav__distintivo{{display:inline-block;min-width:20px;height:20px;padding:0 6px;
  box-sizing:border-box;border-radius:10px;background:var(--ig-superficie-alt);
  color:var(--ig-texto);font:600 11px/20px var(--ig-fonte-corpo);text-align:center}}

/* --- seções, divisor e filtros --------------------------------------- */
/* respiro no contêiner: 12 (acima) + 16 (linha) + 4 (abaixo) = 32px, no grid */
section[data-testid="stSidebar"] [data-testid="stElementContainer"]:has(.ig-nav__grupo){{
  padding:12px 0 4px;flex-shrink:0}}
section[data-testid="stSidebar"] [data-testid="stElementContainer"]:has(.ig-nav__rodape){{
  margin-top:var(--ig-e1);padding-top:var(--ig-e2);border-top:1px solid var(--ig-contorno);
  flex-shrink:0}}
.stApp .ig-nav__grupo{{margin:0!important;padding:0 0 0 {recuoIcone}px!important;
  line-height:16px!important;color:var(--ig-texto-apoio)!important}}
.ig-nav__divisor{{border-top:1px solid var(--ig-contorno);margin:var(--ig-e1) 0 0}}
section[data-testid="stSidebar"] .st-key-navFiltros{{gap:12px!important;
  padding:0 {recuoIcone}px}}
section[data-testid="stSidebar"] .st-key-navFiltros [data-testid="stWidgetLabel"] p{{
  font-family:var(--ig-fonte-corpo);font-size:12px;color:var(--ig-texto-apoio)}}
/* campo (select, texto, número): a moldura é a div que contém o input */
section[data-testid="stSidebar"] .st-key-navFiltros div:has(> input){{
  background:var(--ig-superficie)!important;min-height:40px;
  border:1px solid var(--ig-contorno-campo)!important;border-radius:var(--ig-raio)!important}}
section[data-testid="stSidebar"] .st-key-navFiltros div:has(> input):focus-within{{
  border-color:var(--ig-primaria-texto)!important;box-shadow:0 0 0 1px var(--ig-primaria-texto)!important}}
section[data-testid="stSidebar"] .st-key-navFiltros input{{
  background:transparent!important;border:none!important;box-shadow:none!important;
  font-family:var(--ig-fonte-corpo)!important;font-size:15px!important;color:var(--ig-texto)!important}}
section[data-testid="stSidebar"] .st-key-navFiltros div:has(> input) button{{
  color:var(--ig-texto-apoio)}}
.stApp .ig-nav__rodape{{margin:0!important;padding:0 0 0 {recuoIcone}px!important}}

/* --- menu suspenso ----------------------------------------------------- */
section[data-testid="stSidebar"] details{{border:none!important;
  background:transparent!important;padding:0!important}}
section[data-testid="stSidebar"] summary{{font-family:var(--ig-fonte-corpo);
  font-size:14px;font-weight:400;color:var(--ig-texto);min-height:40px;
  padding:0 {recuoIcone}px!important;border-radius:var(--ig-raio);
  background:transparent!important}}
section[data-testid="stSidebar"] summary:hover{{background:var(--ig-superficie-alt)!important;
  color:var(--ig-primaria-texto)}}
section[data-testid="stSidebar"] summary svg{{color:var(--ig-texto-apoio)}}
section[data-testid="stSidebar"] [data-testid="stExpanderDetails"]{{padding:0!important;
  border:none!important}}

/* --- marca: lockup de sistema (Whirlpool) --------------------------- */
.ig-marca{{display:flex;align-items:center;gap:var(--ig-e2);
  padding:0 0 var(--ig-e2) {recuoIcone}px;border-bottom:1px solid var(--ig-contorno);
  margin-bottom:var(--ig-e1)}}
.ig-marca--lockup{{border:none;padding:0;margin:0}}
.ig-marca__logo{{width:auto;object-fit:contain}}
.ig-marca__linha{{width:1px;background:var(--ig-texto)}}
.ig-marca__nome{{font-family:var(--ig-fonte-titulo);font-weight:300;font-size:24px;
  line-height:1.1;color:var(--ig-primaria-texto)}}
.ig-marca__sub{{font-family:var(--ig-fonte-titulo);font-weight:300;font-size:12px;
  line-height:1.3;color:var(--ig-texto-apoio)}}
"""
