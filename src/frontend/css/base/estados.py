"""Labels de estado (guia, seção 01 · ESTADOS e seção 04).

Regra do guia: estado sempre com ícone + rótulo + número.
    Rotulo(Estado.CRITICO, detalhe="9 °C acima").renderizar()
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from html import escape

import streamlit as st

from .tokens import cssVar


@dataclass(frozen=True)
class EspecEstado:
    rotulo: str
    token: str            # identidade: ícone e preenchimento
    tokenTexto: str       # variante escurecida — é esta que vai no texto
    tokenBorda: str
    tokenFundo: str
    icone: str            # Phosphor


class Estado(Enum):
    SEGURO  = EspecEstado("Seguro", "seguro", "seguroTexto",
                          "seguroBorda", "seguroFundo", "ph-shield-check")
    ATENCAO = EspecEstado("Atenção", "atencao", "atencaoTexto",
                          "atencaoBorda", "atencaoFundo", "ph-warning")
    CRITICO = EspecEstado("Crítico", "critico", "criticoTexto",
                          "criticoBorda", "criticoFundo", "ph-warning-circle")
    NEUTRO  = EspecEstado("Indefinido", "neutro", "neutroTexto",
                          "neutroBorda", "neutroFundo", "ph-minus-circle")

    @property
    def classe(self) -> str:
        return f"ig-estado--{self.name.lower()}"

    @classmethod
    def porFolga(cls, folga: float, limiteAtencao: float = 10.0) -> Estado:
        """Mapeia folga numérica -> estado. Ajuste o corte por domínio."""
        if folga < 0:
            return cls.CRITICO
        return cls.ATENCAO if folga < limiteAtencao else cls.SEGURO


def corMetrica(estado: Estado | None) -> str | None:
    """Guia seção 04: o número do card só muda de cor quando está crítico
    (92 °C seguro e 78 °C atenção aparecem os dois em #0D436B)."""
    return "criticoTexto" if estado is Estado.CRITICO else None


@dataclass
class Rotulo:
    """Três formatos: 'linha' (card), 'faixa' (bloco) e 'chip' (rastreabilidade)."""
    estado: Estado
    texto: str | None = None
    detalhe: str | None = None
    formato: str = "linha"
    preenchido: bool = True       # faixa: fundo tingido (seção 01) ou branco (seção 04)

    def html(self) -> str:
        spec: EspecEstado = self.estado.value
        titulo = escape(self.texto or spec.rotulo)
        # o "· " separador vem do CSS: na faixa o detalhe desce de linha e não leva ponto
        detalhe = (f'<span class="ig-estado__det">{escape(self.detalhe)}</span>'
                   if self.detalhe else "")
        vazio = "" if self.preenchido else " ig-estado--vazio"
        return (f'<div class="ig-estado ig-estado--{self.formato}{vazio} '
                f'{self.estado.classe}"><i class="ph {spec.icone}"></i>'
                f'<b>{titulo}</b>{detalhe}</div>')

    def renderizar(self) -> None:
        st.markdown(self.html(), unsafe_allow_html=True)

    @classmethod
    def seguro(cls, detalhe=None, **kw) -> Rotulo:
        return cls(Estado.SEGURO, detalhe=detalhe, **kw)

    @classmethod
    def atencao(cls, detalhe=None, **kw) -> Rotulo:
        return cls(Estado.ATENCAO, detalhe=detalhe, **kw)

    @classmethod
    def critico(cls, detalhe=None, **kw) -> Rotulo:
        return cls(Estado.CRITICO, detalhe=detalhe, **kw)


def regrasCss(tema) -> str:
    base = """
.ig-estado{display:inline-flex;align-items:center;gap:var(--ig-e1);
  font-family:var(--ig-fonte-corpo);font-weight:600;font-size:13px;line-height:1}
.ig-estado i{font-size:var(--ig-icone)}
.ig-estado__det{font-weight:400}
.ig-estado--linha .ig-estado__det::before{content:"· "}
.ig-estado--linha{padding:0}
.ig-estado--faixa{display:grid;grid-template-columns:auto 1fr;align-items:center;
  column-gap:var(--ig-e1);row-gap:var(--ig-e1);width:100%;box-sizing:border-box;
  padding:var(--ig-e2);border-radius:var(--ig-raio);box-shadow:var(--ig-sombra);
  line-height:1.3}
.ig-estado--faixa .ig-estado__det{grid-column:2;color:var(--ig-texto)}
/* textoApoio sobre atencaoFundo daria 4,46:1 — abaixo do 4,5:1; texto passa em todos */
.ig-estado--vazio{background:var(--ig-superficie)!important}
.ig-estado--chip{padding:var(--ig-e1);border-radius:var(--ig-raio);
  border:1px solid var(--ig-contorno);background:var(--ig-superficie);
  color:var(--ig-texto)!important;font-weight:400}
.ig-estado--chip i{display:none}
"""
    cores = []
    for estado in Estado:
        s: EspecEstado = estado.value
        cores += [f".{estado.classe}{{color:{cssVar(s.tokenTexto)}}}",
                  f".{estado.classe} i{{color:{cssVar(s.token)}}}",
                  f".ig-estado--faixa.{estado.classe}{{"
                  f"background:{cssVar(s.tokenFundo)};"
                  f"border:1px solid {cssVar(s.tokenBorda)}}}"]
    return base + "\n".join(cores)
