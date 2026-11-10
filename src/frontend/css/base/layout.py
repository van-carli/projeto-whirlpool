"""Cabeçalho, cartões, seções e estado vazio — a moldura de toda tela."""
from __future__ import annotations

from dataclasses import dataclass, field
from html import escape

import streamlit as st

from .botoes import BarraBotoes, Botao
from .estados import Estado, Rotulo
from .navegacao import Menu, cartaoMarca
from .tipografia import Estilo, Tipografia
from .tokens import chaveSegura, cssVar


@dataclass(eq=False)
class Cabecalho:
    """Topo da página. O título vem sempre da aba ativa do menu.

    Padrão "limpo" (fundo branco, como pede a Whirlpool); "faixa" é o bloco azul
    do guia do projeto, opcional.
    """
    menu: Menu
    tema: object
    variante: str = "limpo"             # "limpo" | "faixa"
    mostrarLogo: bool = True            # lockup Whirlpool, só se marca.logo existir
    mostrarSecao: bool = True           # kicker com a seção de origem da aba
    titularNavegador: bool = True
    acoes: list[Botao] = field(default_factory=list)

    def renderizar(self, *, titulo: str | None = None,
                   subtitulo: str | None = None,
                   estado: Rotulo | None = None) -> None:
        item = self.menu.itemAtivo
        titulo = titulo or getattr(item, "titulo", None) or (item.rotulo if item else "")
        subtitulo = subtitulo or getattr(item, "subtitulo", None) or ""
        # só a seção de origem: uma trilha inteira em caixa alta pesa e não informa mais
        secao = item.pai.rotulo if (item and item.pai and self.mostrarSecao) else ""

        # lockup só em fundo claro (regra do logo Whirlpool)
        marca = self.tema.marca
        lockup = (cartaoMarca(marca, comLogo=True)
                  if (self.mostrarLogo and marca.logo and self.variante == "limpo") else "")
        kicker = Tipografia.html(secao, Estilo.KICKER) if secao else ""
        sub = Tipografia.html(subtitulo, Estilo.CORPO, classes="ig-cab__sub") if subtitulo else ""
        selo = estado.html() if estado else ""

        st.markdown(f'<header class="ig-cab ig-cab--{self.variante}">'
                    f'{f"<div class=ig-cab__lockup>{lockup}</div>" if lockup else ""}'
                    f'<div class="ig-cab__linha"><div class="ig-cab__texto">{kicker}'
                    f'{Tipografia.html(titulo, Estilo.HEADLINE)}{sub}</div>'
                    f'<div class="ig-cab__lado">{selo}</div></div></header>',
                    unsafe_allow_html=True)

        if self.acoes:
            BarraBotoes(self.acoes).renderizar()
        if self.titularNavegador:
            self._titular(f"{titulo} | {marca.nome}")

    @staticmethod
    def _titular(texto: str) -> None:
        # set_page_config e não <script>: o script só roda quando o elemento é
        # montado, e numa execução sem troca de aba o título voltava ao padrão
        st.set_page_config(page_title=texto)


class Cartao:
    """Contêiner com contorno. Use como gerenciador de contexto:

        with Cartao("pcb", titulo="PCB inverter", estado=Estado.SEGURO):
            Tipografia.metrica("92 °C", cor=corMetrica(Estado.SEGURO))
    """

    def __init__(self, chave: str, titulo: str | None = None,
                 estado: Estado | None = None,
                 bordaEstado: str | bool = "auto", compacto: bool = False):
        self.chave = chaveSegura(chave)
        self.titulo, self.estado = titulo, estado
        self.bordaEstado, self.compacto = bordaEstado, compacto
        self._contexto = None

    @property
    def idWidget(self) -> str:
        return f"{'cartaoCompacto' if self.compacto else 'cartao'}-{self.chave}"

    def _pintaBorda(self) -> bool:
        # "auto" segue o guia: borda neutra, colorida só no crítico
        if self.estado is None or self.bordaEstado is False:
            return False
        if self.bordaEstado == "auto":
            return self.estado is Estado.CRITICO
        return True

    def __enter__(self):
        if self._pintaBorda():
            # fora do contêiner e via st.html: não desalinha o card dos vizinhos
            st.html(f"<style>div.st-key-{self.idWidget}"
                    f"{{border-color:{cssVar(self.estado.value.tokenBorda)}!important}}"
                    f"</style>")
        self._contexto = st.container(key=self.idWidget)
        self._contexto.__enter__()
        if self.titulo:
            Tipografia.escrever(self.titulo, Estilo.ROTULO)
        return self._contexto

    def __exit__(self, *excecao):
        return self._contexto.__exit__(*excecao)


@dataclass
class Secao:
    """Título de bloco no estilo subhead da Whirlpool. Sem numeração por padrão:
    "01 / 02 / 03" é diagramação de documento, não de tela."""
    titulo: str
    numero: str | None = None
    apoio: str | None = None            # linha curta de contexto abaixo do título

    def renderizar(self) -> None:
        numero = (f'<span class="ig-secao__num">{escape(self.numero)}</span>'
                  if self.numero else "")
        apoio = Tipografia.html(self.apoio, Estilo.NOTA) if self.apoio else ""
        st.markdown(f'<div class="ig-secao"><div class="ig-secao__titulo">{numero}'
                    f'{Tipografia.html(self.titulo, Estilo.SUBHEAD)}</div>{apoio}</div>',
                    unsafe_allow_html=True)


@dataclass
class EstadoVazio:
    """Tela ou bloco sem dados: diz o que falta e qual é o próximo passo.

        EstadoVazio("Nenhum ensaio acima de 2.000 W nesta área",
                    "Amplie a faixa de potência nos filtros.",
                    icone="ph-funnel").renderizar()
    """
    titulo: str
    proximoPasso: str | None = None
    icone: str = "ph-info"

    def html(self) -> str:
        passo = (f'<div class="ig-vazio__passo">{escape(self.proximoPasso)}</div>'
                 if self.proximoPasso else "")
        return (f'<div class="ig-vazio"><i class="ph {self.icone} ig-vazio__icone"></i>'
                f'<div><div class="ig-vazio__titulo">{escape(self.titulo)}</div>{passo}</div></div>')

    def renderizar(self) -> None:
        st.markdown(self.html(), unsafe_allow_html=True)


def regrasCss(tema) -> str:
    return """
.ig-cab{margin-bottom:var(--ig-e3)}
.ig-cab__lockup{margin-bottom:var(--ig-e3)}
.ig-cab__linha{display:flex;align-items:flex-end;gap:var(--ig-e3);flex-wrap:wrap}
.ig-cab__texto{flex:1;min-width:240px;display:flex;flex-direction:column;gap:var(--ig-e1)}
.ig-cab__lado{margin-left:auto}
.stApp .ig-cab__sub{color:var(--ig-texto);max-width:72ch}
.ig-cab--limpo{padding-bottom:var(--ig-e3);border-bottom:1px solid var(--ig-contorno)}
.ig-cab--faixa{background:var(--ig-faixa);border-radius:var(--ig-raio);
  border-left:4px solid var(--ig-faixa-regua);padding:var(--ig-e3)}
.stApp .ig-cab--faixa .ig-txt--headline{color:var(--ig-faixa-texto)}
.stApp .ig-cab--faixa .ig-txt--kicker,.stApp .ig-cab--faixa .ig-cab__sub{color:var(--ig-faixa-apoio)}
.ig-secao{display:flex;flex-direction:column;gap:4px;margin:var(--ig-e3) 0 var(--ig-e2)}
/* rótulo que abre um bloco secundário (coluna lateral, painéis) */
.stApp .ig-bloco{padding-top:var(--ig-e3)!important}
.ig-secao__titulo{display:flex;align-items:baseline;gap:var(--ig-e1)}
.ig-secao__num{font-family:var(--ig-fonte-corpo);font-weight:700;font-size:12px;
  color:var(--ig-primaria-texto)}
div[class*="st-key-cartao-"],div[class*="st-key-cartaoCompacto-"]{
  background:var(--ig-superficie);border:1px solid var(--ig-contorno);
  border-radius:var(--ig-raio);padding:var(--ig-e2);box-shadow:var(--ig-sombra)}
div[class*="st-key-cartaoCompacto-"]{padding:var(--ig-e1)}
.ig-vazio{display:flex;gap:var(--ig-e2);align-items:flex-start;padding:var(--ig-e1) 0;
  max-width:72ch}
.ig-vazio__icone{font-size:24px;color:var(--ig-primaria-texto);line-height:1}
.ig-vazio__titulo{font-family:var(--ig-fonte-corpo);font-weight:600;font-size:16px;
  color:var(--ig-texto);line-height:1.4}
.ig-vazio__passo{font-family:var(--ig-fonte-corpo);font-size:14px;color:var(--ig-texto);
  line-height:1.5;margin-top:4px}
"""
