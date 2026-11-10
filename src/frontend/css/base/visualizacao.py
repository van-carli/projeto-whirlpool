"""Mostrar o dado em vez de descrevê-lo: Medidor (valor x limite) e Tabela.

    Medidor(118, limite=109, incerteza=6.2, estado=Estado.CRITICO).renderizar()

    Tabela(
        colunas=[Coluna("Ponto", "ponto"),
                 Coluna("Temperatura", "temp", numerica=True, casas=1, unidade="°C")],
        linhas=[{"ponto": "PCB inverter", "temp": 92.4}],
    ).renderizar()
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from html import escape

import streamlit as st

from .estados import Estado, Rotulo
from .tipografia import formatarNumero


@dataclass
class Medidor:
    """Barra horizontal: valor, limite (traço vertical) e incerteza (barra de erro).

    A cor só muda quando importa: primária em qualquer estado, vermelho no crítico.
    """
    valor: float
    limite: float
    incerteza: float = 0.0
    unidade: str = "°C"
    estado: Estado | None = None
    minimo: float = 0.0
    maximo: float | None = None         # None = limite + folga visual
    casas: int = 0
    compacto: bool = False              # versão de linha de tabela, sem legenda

    def _pos(self, v: float, fim: float) -> float:
        return max(0.0, min(100.0, (v - self.minimo) / (fim - self.minimo) * 100))

    def html(self) -> str:
        fim = self.maximo or max(self.limite, self.valor + self.incerteza) * 1.12
        pValor, pLimite = self._pos(self.valor, fim), self._pos(self.limite, fim)
        pErroIni = self._pos(self.valor - self.incerteza, fim)
        pErroFim = self._pos(self.valor + self.incerteza, fim)
        critico = " ig-medidor--critico" if self.estado is Estado.CRITICO else ""
        compacto = " ig-medidor--compacto" if self.compacto else ""

        texto = (f"{formatarNumero(self.valor, self.casas, self.unidade)}, "
                 f"limite {formatarNumero(self.limite, self.casas, self.unidade)}")
        if self.incerteza:
            texto += f", incerteza de mais ou menos {formatarNumero(self.incerteza, 1, self.unidade)}"
        erro = (f'<span class="ig-medidor__erro" style="left:{pErroIni:.1f}%;'
                f'width:{pErroFim - pErroIni:.1f}%"></span>' if self.incerteza else "")
        legenda = ("" if self.compacto else
                   f'<div class="ig-medidor__legenda"><span style="left:{pLimite:.1f}%">'
                   f'limite {escape(formatarNumero(self.limite, self.casas, self.unidade))}'
                   f'</span></div>')
        return (f'<div class="ig-medidor{critico}{compacto}" role="img" aria-label="{escape(texto)}">'
                f'<div class="ig-medidor__trilho">'
                f'<span class="ig-medidor__valor" style="width:{pValor:.1f}%"></span>{erro}'
                f'<span class="ig-medidor__limite" style="left:{pLimite:.1f}%"></span>'
                f'</div>{legenda}</div>')

    def renderizar(self) -> None:
        st.markdown(self.html(), unsafe_allow_html=True)


@dataclass
class Coluna:
    titulo: str
    campo: str
    numerica: bool = False              # alinha à direita, numerais tabulares
    casas: int = 0
    unidade: str = ""
    sinal: bool = False                 # mostra "+" nos positivos (folga)
    formato: Callable[[dict], str] | None = None   # HTML próprio da célula (linha inteira)
    largura: str | None = None          # "30%", "120px"
    quebrar: bool = True                # False = célula numa linha só (nomes curtos)


@dataclass
class Tabela:
    """Tabela técnica: réguas finas entre linhas, sem zebra, números alinhados.

    - a unidade vai no cabeçalho, numa segunda linha, e não se repete em cada célula;
    - um valor do tipo Estado vira automaticamente o rótulo com ícone;
    - densa=True aperta as linhas para listas curtas de apoio.
    """
    colunas: list[Coluna]
    linhas: list[dict]
    ordenarPor: str | None = None
    decrescente: bool = False
    legenda: str | None = None          # <caption>: o que a tabela mostra
    destacar: Callable[[dict], bool] | None = None   # barra lateral na linha
    densa: bool = False
    unidadeNoCabecalho: bool = True

    def _celula(self, coluna: Coluna, linha: dict) -> str:
        if coluna.formato:
            return coluna.formato(linha)
        valor = linha.get(coluna.campo, "")
        if isinstance(valor, Estado):
            return Rotulo(valor).html()
        if coluna.numerica and isinstance(valor, (int, float)):
            unidade = "" if self.unidadeNoCabecalho else coluna.unidade
            return escape(formatarNumero(valor, coluna.casas, unidade, coluna.sinal))
        return escape(str(valor))

    def _titulo(self, coluna: Coluna) -> str:
        if self.unidadeNoCabecalho and coluna.unidade:
            # unidade numa segunda linha fixa: todos os cabeçalhos numéricos ficam iguais
            return f'{escape(coluna.titulo)}<span class="ig-tabela__unidade">{escape(coluna.unidade)}</span>'
        return escape(coluna.titulo)

    def html(self) -> str:
        linhas = self.linhas
        if self.ordenarPor:
            linhas = sorted(linhas, key=lambda l: l[self.ordenarPor], reverse=self.decrescente)
        largura = lambda c: f' style="width:{c.largura}"' if c.largura else ""
        classe = lambda c: (f' class="{" ".join(n for n, ativo in (("ig-tabela__num", c.numerica), ("ig-tabela__semquebra", not c.quebrar)) if ativo)}"' if (c.numerica or not c.quebrar) else "")
        cabeca = "".join(f"<th{classe(c)}{largura(c)} scope=\"col\">{self._titulo(c)}</th>"
                         for c in self.colunas)
        corpo = ""
        for linha in linhas:
            destaque = ' class="ig-tabela__destaque"' if (self.destacar and self.destacar(linha)) else ""
            celulas = "".join(f"<td{classe(c)}>{self._celula(c, linha)}</td>" for c in self.colunas)
            corpo += f"<tr{destaque}>{celulas}</tr>"
        legenda = f"<caption>{escape(self.legenda)}</caption>" if self.legenda else ""
        densa = " ig-tabela--densa" if self.densa else ""
        return (f'<div class="ig-tabela__rolagem"><table class="ig-tabela{densa}">{legenda}'
                f"<thead><tr>{cabeca}</tr></thead><tbody>{corpo}</tbody></table></div>")

    def renderizar(self) -> None:
        st.markdown(self.html(), unsafe_allow_html=True)


def barra(valor: float, maximo: float) -> str:
    """Barra proporcional para ranking/peso, sem eixo: barra(0.41, 0.41)."""
    largura = 0 if not maximo else max(0.0, min(100.0, valor / maximo * 100))
    return f'<span class="ig-barra" aria-hidden="true"><span style="width:{largura:.1f}%"></span></span>'


@dataclass
class FichaTecnica:
    """Parâmetros como numa ficha de ensaio: rótulo à esquerda, valor à direita.

        FichaTecnica([("Potência", "2.400 W"), ("Ventilação", "Forçada")]).renderizar()
    """
    pares: list[tuple[str, str]]

    def html(self) -> str:
        linhas = "".join(f"<div><dt>{escape(r)}</dt><dd>{escape(v)}</dd></div>"
                         for r, v in self.pares)
        return f'<dl class="ig-ficha">{linhas}</dl>'

    def renderizar(self) -> None:
        st.markdown(self.html(), unsafe_allow_html=True)


def regrasCss(tema) -> str:
    return """
.ig-medidor{position:relative;padding-bottom:20px}
.ig-medidor--compacto{padding-bottom:0;min-width:96px}
.ig-medidor__trilho{position:relative;height:8px;border-radius:var(--ig-raio);
  background:var(--ig-superficie-alt)}
.ig-medidor--compacto .ig-medidor__trilho{height:6px}
.ig-medidor__valor{position:absolute;left:0;top:0;bottom:0;border-radius:var(--ig-raio);
  background:var(--ig-primaria-texto)}
.ig-medidor--critico .ig-medidor__valor{background:var(--ig-critico)}
.ig-medidor__erro{position:absolute;top:50%;height:2px;margin-top:-1px;
  background:var(--ig-texto);border-left:2px solid var(--ig-texto);border-right:2px solid var(--ig-texto);
  box-sizing:border-box}
.ig-medidor__erro::before,.ig-medidor__erro::after{content:"";position:absolute;top:-5px;
  height:12px;width:2px;background:var(--ig-texto)}
.ig-medidor__erro::before{left:-2px}
.ig-medidor__erro::after{right:-2px}
.ig-medidor__limite{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;
  background:var(--ig-texto)}
.ig-medidor__legenda{position:relative;height:16px;margin-top:4px}
.ig-medidor__legenda span{position:absolute;transform:translateX(-50%);white-space:nowrap;
  font-family:var(--ig-fonte-corpo);font-size:12px;color:var(--ig-texto-apoio)}

.ig-tabela__rolagem{overflow-x:auto}
/* o markdown do Streamlit põe borda em toda célula: zera e redesenha só as réguas */
.stApp .ig-tabela,.stApp .ig-tabela tr,.stApp .ig-tabela th,.stApp .ig-tabela td{
  border:none!important;background:transparent}
.stApp .ig-tabela th{border-bottom:1px solid var(--ig-texto)!important}
.stApp .ig-tabela td{border-bottom:1px solid var(--ig-contorno)!important}
.ig-tabela{width:100%;border-collapse:collapse;font-family:var(--ig-fonte-corpo);
  font-size:14px;color:var(--ig-texto);font-variant-numeric:tabular-nums}
.ig-tabela caption{text-align:left;caption-side:bottom;padding-top:var(--ig-e1);
  font-size:12px;color:var(--ig-texto-apoio)}
.ig-tabela th{text-align:left;font-weight:600;font-size:12px;letter-spacing:.03em;
  text-transform:uppercase;color:var(--ig-texto-apoio);background:var(--ig-superficie);
  padding:var(--ig-e1) var(--ig-e2) var(--ig-e1) 0;border-bottom:1px solid var(--ig-texto)}
.ig-tabela td{padding:10px var(--ig-e2) 10px 0;border-bottom:1px solid var(--ig-contorno);
  vertical-align:middle}
.ig-tabela th:last-child,.ig-tabela td:last-child{padding-right:0}
.ig-tabela .ig-tabela__num{text-align:right}
.ig-tabela__apoio{font-size:12px;color:var(--ig-texto-apoio);margin-top:2px}
.ig-tabela__unidade{display:block;text-transform:none;letter-spacing:0;font-weight:400}
.stApp .ig-tabela th{vertical-align:bottom}
.ig-tabela .ig-tabela__semquebra{white-space:nowrap}
.stApp .ig-tabela--densa td{padding-top:6px;padding-bottom:6px}

.ig-barra{display:block;height:4px;border-radius:var(--ig-raio);
  background:var(--ig-superficie-alt);min-width:64px}
.ig-barra span{display:block;height:100%;border-radius:var(--ig-raio);
  background:var(--ig-primaria-texto)}

.ig-ficha{margin:0 0 var(--ig-e1);font-family:var(--ig-fonte-corpo);font-size:14px}
/* o markdown do Streamlit aumenta dt/dd: tamanho explícito */
.stApp .ig-ficha dt,.stApp .ig-ficha dd{font-size:14px!important;line-height:1.4!important;
  margin:0!important;padding:0!important}
.ig-ficha div{display:flex;justify-content:space-between;gap:var(--ig-e2);
  padding:6px 0;border-bottom:1px solid var(--ig-contorno)}
.ig-ficha dt{color:var(--ig-texto-apoio);font-weight:400}
.ig-ficha dd{margin:0;color:var(--ig-texto);text-align:right;font-variant-numeric:tabular-nums}
/* destaque com barra, não com fundo: cor só onde o estado importa */
.ig-tabela tbody tr.ig-tabela__destaque td:first-child{
  box-shadow:inset 3px 0 0 var(--ig-critico);padding-left:var(--ig-e2)}
.ig-tabela tbody tr td:first-child{padding-left:var(--ig-e2)}
.ig-tabela thead th:first-child{padding-left:var(--ig-e2)}
"""
