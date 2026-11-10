"""Tipografia: hierarquia da Whirlpool + tamanhos do guia do projeto.

Whirlpool: kicker = 1/2 do headline (mínimo 12pt), subhead = 2/3 do headline,
tracking de 50 no kicker e 30 no subhead, alinhamento à esquerda, caixa alta
nunca em parágrafo. O desenvolvedor só diz o tipo:

    Tipografia.escrever("Dois pontos exigem revisão", Estilo.HEADLINE)
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from html import escape

import streamlit as st

from .tokens import cssVar


@dataclass(frozen=True)
class EspecTexto:
    familia: str                  # "titulo" (Nunito Sans) | "corpo" (Open Sans)
    peso: int
    tamanho: int                  # px
    altura: float = 1.4
    espacamento: float = 0.0      # letter-spacing em em (tracking 50 = 0.05em)
    caixaAlta: bool = False
    cor: str = "texto"            # nome do token em Cores
    tabular: bool = False         # numerais de largura fixa
    nivel: int | None = None      # nível de título para leitores de tela


class Estilo(Enum):
    # --- hierarquia Whirlpool (headline 30 → kicker 16 · subhead 20) ------
    HEADLINE = EspecTexto("titulo", 300, 30, 1.2, cor="primariaTexto", nivel=1)
    KICKER   = EspecTexto("titulo", 700, 16, 1.2, 0.05, True, "primariaTexto")
    SUBHEAD  = EspecTexto("corpo", 600, 20, 1.2, 0.03, True, "texto", nivel=2)
    # --- guia do projeto --------------------------------------------------
    METRICA  = EspecTexto("titulo", 300, 30, 1.1, cor="primariaTexto", tabular=True)
    CORPO    = EspecTexto("corpo", 400, 16, 1.5)
    TABELA   = EspecTexto("corpo", 400, 14, 1.45, tabular=True)
    NOTA     = EspecTexto("corpo", 400, 12, 1.4, cor="textoApoio")
    # --- derivado: o estilo do subhead no tamanho mínimo, para rótulos de UI
    ROTULO   = EspecTexto("corpo", 600, 12, 1.3, 0.03, True, "textoApoio")

    @property
    def classe(self) -> str:
        return f"ig-txt ig-txt--{self.name.lower()}"


class Tipografia:
    """Fábrica de texto: html() devolve a string, escrever() desenha."""

    @staticmethod
    def html(texto: str, estilo: Estilo = Estilo.CORPO, *,
             cor: str | None = None, icone: str | None = None,
             classes: str = "", bruto: bool = False) -> str:
        spec: EspecTexto = estilo.value
        conteudo = texto if bruto else escape(str(texto))
        if icone:
            conteudo = f'<i class="ph {icone}"></i>{conteudo}'
        atributos = f' role="heading" aria-level="{spec.nivel}"' if spec.nivel else ""
        if cor:
            atributos += f' style="color:{cssVar(cor)}"'
        # <div> e não <h1>/<p>: o Streamlit estiliza h1/p do markdown por cima
        return f'<div class="{estilo.classe} {classes}"{atributos}>{conteudo}</div>'

    @classmethod
    def escrever(cls, texto: str, estilo: Estilo = Estilo.CORPO, **kw) -> None:
        st.markdown(cls.html(texto, estilo, **kw), unsafe_allow_html=True)

    # -- atalhos --------------------------------------------------------
    @classmethod
    def headline(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.HEADLINE, **kw)
    @classmethod
    def kicker(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.KICKER, **kw)
    @classmethod
    def subhead(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.SUBHEAD, **kw)
    @classmethod
    def metrica(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.METRICA, **kw)
    @classmethod
    def corpo(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.CORPO, **kw)
    @classmethod
    def tabela(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.TABELA, **kw)
    @classmethod
    def nota(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.NOTA, **kw)
    @classmethod
    def rotulo(cls, texto: str, **kw) -> None: cls.escrever(texto, Estilo.ROTULO, **kw)


def formatarNumero(valor: float, casas: int = 0, unidade: str = "",
                   sinal: bool = False) -> str:
    """Número no padrão brasileiro: formatarNumero(118.44, 1, "°C") -> "118,4 °C"."""
    texto = f"{valor:+,.{casas}f}" if sinal else f"{valor:,.{casas}f}"
    texto = texto.replace(",", "\0").replace(".", ",").replace("\0", ".")
    texto = texto.replace("-", "−")           # sinal de menos tipográfico
    return f"{texto} {unidade}".strip()


def regrasCss(tema) -> str:
    familias = {"titulo": "var(--ig-fonte-titulo)", "corpo": "var(--ig-fonte-corpo)"}
    regras = [".stApp .ig-txt{margin:0;padding:0;text-align:left}",
              ".stApp .ig-txt i{font-size:var(--ig-icone);margin-right:var(--ig-e1);"
              "vertical-align:-3px}"]
    for estilo in Estilo:
        s: EspecTexto = estilo.value
        regras.append(
            f".stApp .ig-txt--{estilo.name.lower()}{{"
            f"font-family:{familias[s.familia]};font-weight:{s.peso};"
            f"font-size:{s.tamanho}px;line-height:{s.altura};"
            f"letter-spacing:{s.espacamento}em;"
            f"text-transform:{'uppercase' if s.caixaAlta else 'none'};"
            f"color:{cssVar(s.cor)};"
            f"font-variant-numeric:{'tabular-nums' if s.tabular else 'normal'}}}")
    return "\n".join(regras)
