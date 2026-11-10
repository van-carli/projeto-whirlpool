"""Fachada do design base. Uma tela só precisa disto:

    app = AplicacaoBase(menu=Menu(itens=[...]))
    app.iniciar()          # page_config + CSS + menu + cabeçalho
    app.despachar()        # chama a função da aba ativa
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import streamlit as st

from . import css
from .layout import Cabecalho, EstadoVazio
from .navegacao import Menu
from .tokens import Tema, temaPadrao


@dataclass(eq=False)
class AplicacaoBase:
    menu: Menu
    tema: Tema = temaPadrao
    layout: str = "wide"
    varianteCabecalho: str = "limpo"      # Whirlpool: base branca
    cabecalho: Cabecalho | None = field(default=None, init=False)

    def configurarPagina(self) -> None:
        estadoMenu = "collapsed" if (self.menu.recolhido or self.menu.oculto) else "expanded"
        favicon = self.tema.marca.favicon
        st.set_page_config(page_title=self.tema.marca.nome,
                           page_icon=favicon if Path(favicon).exists() else None,
                           layout=self.layout,
                           initial_sidebar_state=estadoMenu)

    def iniciar(self, **opcoesCabecalho) -> str:
        """page_config + CSS + menu + cabeçalho. Devolve a rota ativa."""
        self.configurarPagina()
        css.aplicar(self.tema)
        rota = self.menu.renderizar(self.tema)
        self.cabecalho = Cabecalho(self.menu, self.tema, variante=self.varianteCabecalho)
        self.cabecalho.renderizar(**opcoesCabecalho)
        return rota

    def despachar(self) -> None:
        """Executa a função `pagina` do item ativo, se houver."""
        pagina = getattr(self.menu.itemAtivo, "pagina", None)
        if callable(pagina):
            pagina()
        else:
            EstadoVazio("Esta aba ainda não tem conteúdo",
                        "Defina pagina= no item de navegação correspondente.").renderizar()

    def aoMudarAba(self, callback: Callable[[str, str], None]) -> None:
        """callback(anterior, nova) é chamado a cada troca de aba."""
        self.menu.assinar(callback)
