"""Botões (guia, seção 04).

    if Botao("Prever", Variante.PRIMARIO).renderizar():
        ...
    acoes = BarraBotoes([Botao("Prever"),
                         Botao("Salvar cenário", Variante.SECUNDARIO),
                         Botao("Limpar", Variante.TERCIARIO)]).renderizar()
    if acoes["limpar"]: ...
"""
from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum

import streamlit as st

from .tokens import chaveSegura


class Variante(Enum):
    PRIMARIO   = "primario"     # sólido — ação principal da tela
    SECUNDARIO = "secundario"   # contornado — ação de apoio
    TERCIARIO  = "terciario"    # só texto — ação descartável ("Limpar")
    PERIGO     = "perigo"       # destrutivo / fora de faixa


def _slug(rotulo: str) -> str:
    """'Salvar cenário' -> 'salvar-cenario' (tira o acento antes, senão vira 'cen-rio')."""
    semAcento = unicodedata.normalize("NFKD", rotulo).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", semAcento.lower()).strip("-")


@dataclass
class Botao:
    rotulo: str
    variante: Variante = Variante.PRIMARIO
    icone: str | None = None            # emoji ou ":material/nome:" (limite do st.button)
    chave: str | None = None
    larguraTotal: bool = False
    desabilitado: bool = False
    dica: str | None = None
    aoClicar: Callable | None = None
    args: tuple = ()

    def __post_init__(self):
        self.chave = chaveSegura(self.chave or _slug(self.rotulo))

    @property
    def idWidget(self) -> str:
        return f"btn-{self.variante.value}-{self.chave}"

    def renderizar(self, larguraTotal: bool | None = None) -> bool:
        cheio = self.larguraTotal if larguraTotal is None else larguraTotal
        return st.button(self.rotulo, key=self.idWidget, help=self.dica,
                         icon=self.icone, disabled=self.desabilitado,
                         width="stretch" if cheio else "content",
                         on_click=self.aoClicar, args=self.args)


@dataclass
class BarraBotoes:
    """Linha de ações. Devolve {chave: clicado}."""
    botoes: list[Botao] = field(default_factory=list)
    alinhamento: str = "esquerda"       # "esquerda" | "direita" | "justificado"

    def renderizar(self) -> dict[str, bool]:
        # contêiner horizontal: cada botão ocupa a largura do próprio rótulo
        alinhamento = {"esquerda": "left", "direita": "right",
                       "justificado": "distribute"}[self.alinhamento]
        with st.container(horizontal=True, horizontal_alignment=alinhamento,
                          vertical_alignment="center", gap="small"):
            return {botao.chave: botao.renderizar() for botao in self.botoes}


def _importante(declaracoes: str) -> str:
    """'a:b;c:d' -> 'a:b!important;c:d!important' (vence o :focus do Streamlit)."""
    return ";".join(f"{d}!important" for d in declaracoes.split(";") if d)


def regrasCss(tema) -> str:
    comum = """
div[class*="st-key-btn-"] button{
  font-family:var(--ig-fonte-titulo);font-weight:700;font-size:14px;
  border-radius:var(--ig-raio);padding:var(--ig-e1) var(--ig-e3);min-height:40px;
  box-shadow:var(--ig-sombra);transition:background var(--ig-duracao),
  border-color var(--ig-duracao),color var(--ig-duracao)}
div[class*="st-key-btn-"] button:focus-visible{
  outline:2px solid var(--ig-primaria-texto);outline-offset:2px}
div[class*="st-key-btn-"] button:disabled{opacity:.45}
"""
    variantes = {
        "primario": ("background:var(--ig-primaria);color:var(--ig-primaria-sobre);"
                     "border:1px solid var(--ig-primaria)",
                     "background:var(--ig-primaria-hover);color:var(--ig-primaria-sobre);"
                     "border-color:var(--ig-primaria-hover)"),
        "secundario": ("background:var(--ig-superficie);color:var(--ig-primaria-texto);"
                       "border:1px solid var(--ig-primaria-texto)",
                       "background:var(--ig-acento-claro);color:var(--ig-primaria-texto)"),
        "terciario": ("background:transparent;color:var(--ig-texto-apoio);"
                      "border:1px solid transparent",
                      "background:transparent;color:var(--ig-primaria-texto)"),
        "perigo": ("background:var(--ig-superficie);color:var(--ig-critico-texto);"
                   "border:1px solid var(--ig-critico-borda)",
                   "background:var(--ig-critico-fundo);color:var(--ig-critico-texto)"),
    }
    regras = [comum]
    for nome, (normal, hover) in variantes.items():
        seletor = f'div[class*="st-key-btn-{nome}-"] button'
        regras += [f"{seletor},{seletor}:focus,{seletor}:active{{{_importante(normal)}}}",
                   f"{seletor}:hover{{{_importante(hover)}}}",
                   # o <p> interno do Streamlit fixa peso 400: sem isto o CTA não fica Bold
                   f"{seletor} p{{color:inherit!important;font-weight:inherit!important;"
                   f"font-family:inherit!important}}"]
    return "\n".join(regras)
