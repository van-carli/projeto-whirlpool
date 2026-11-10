"""Compõe a folha de estilo a partir dos tokens + das regras de cada módulo."""
from __future__ import annotations

import streamlit as st

from . import botoes, estados, layout, navegacao, tipografia, visualizacao


def _raiz(tema) -> str:
    return ":root{" + ";".join(f"{k}:{v}" for k, v in tema.variaveis().items()) + "}"


def _base(tema) -> str:
    return """
html,body,[class*="css"]{font-family:var(--ig-fonte-corpo)}
.stApp{background:var(--ig-fundo);color:var(--ig-texto)}
.block-container{padding-top:var(--ig-e4);padding-bottom:var(--ig-e4);max-width:MAXpx}
#MainMenu,footer{visibility:hidden}
header[data-testid="stHeader"]{background:transparent}
hr{border-color:var(--ig-contorno)}
::selection{background:var(--ig-acento-claro)}
:focus-visible{outline:2px solid var(--ig-primaria-texto);outline-offset:2px}
label,.stMarkdown p{font-family:var(--ig-fonte-corpo);color:var(--ig-texto)}
/* o Streamlit põe margin-bottom:-16px no markdown para compensar a margem dos
   parágrafos; os blocos do design base não usam parágrafo, então isso comia 16px */
.stApp [data-testid="stMarkdownContainer"]:has(> [class*="ig-"]){margin-bottom:0!important}
/* campos em qualquer lugar da tela: rótulo pequeno, borda com 3:1, sem fundo cinza */
.stApp [data-testid="stWidgetLabel"] p{font-family:var(--ig-fonte-corpo);font-size:12px;
  color:var(--ig-texto-apoio)}
.stApp [data-testid="stMain"] div:has(> input){background:var(--ig-superficie)!important;
  min-height:40px;border:1px solid var(--ig-contorno-campo)!important;
  border-radius:var(--ig-raio)!important}
.stApp [data-testid="stMain"] div:has(> input):focus-within{
  border-color:var(--ig-primaria-texto)!important;box-shadow:0 0 0 1px var(--ig-primaria-texto)!important}
.stApp [data-testid="stMain"] input{background:transparent!important;border:none!important;
  box-shadow:none!important;font-family:var(--ig-fonte-corpo)!important;font-size:15px!important;
  color:var(--ig-texto)!important;font-variant-numeric:tabular-nums}
div[data-testid="stMetricValue"]{font-family:var(--ig-fonte-titulo);
  font-weight:300;color:var(--ig-primaria-texto)}
""".replace("MAX", str(tema.escala.larguraMaxima))


def folha(tema) -> str:
    texto = _compor(tema)
    # o st.html sanitiza o conteúdo: um "<" dentro do CSS (até num comentário)
    # faz o <style> inteiro ser descartado sem erro nenhum na tela
    if "<" in texto:
        raise ValueError('CSS do design base contém "<": o st.html descartaria a folha inteira')
    return texto


def _compor(tema) -> str:
    return "\n".join([
        f'@import url("{tema.fontes.web}");',
        f'@import url("{tema.fontes.icones}");',
        _raiz(tema),
        _base(tema),
        tipografia.regrasCss(tema),
        estados.regrasCss(tema),
        botoes.regrasCss(tema),
        navegacao.regrasCss(tema),
        layout.regrasCss(tema),
        visualizacao.regrasCss(tema),
    ])


def aplicar(tema) -> None:
    # st.html com só <style> vai para um contêiner invisível: não abre espaço na tela
    st.html(f"<style>{folha(tema)}</style>")


def html(fragmento: str) -> None:
    """Atalho para markup próprio, mantendo a mesma porta de saída."""
    st.markdown(fragmento, unsafe_allow_html=True)
