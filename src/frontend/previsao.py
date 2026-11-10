"""Previsão sob demanda de uma configuração do fogão, usada pela rota /api/prever do servir.py.

Os sete modelos finais são gravados pelo src/frontend/dados/exportar.py em
src/frontend/dados/modelos/modelos.joblib, cada um com o escalador, o patamar e a escala de
cada componente e a lista de colunas de entrada da sua área. A montagem das entradas
repete a da Seção 23 de notebooks/colabs_S4/modelagem.ipynb: os oito campos viram os
indicadores do conjunto 13cat, as perdas são agrupadas nas áreas em que a regra as
agrupa, e cada componente recebe o seu patamar e a sua escala.

O veredito usa a mesma folga de atenção do catálogo exportado (parametros.json), e a
incerteza de cada componente é o erro médio absoluto dele na validação cruzada.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import historico

PASTA_DADOS = Path(__file__).resolve().parent / "dados"
ARQUIVO_MODELOS = PASTA_DADOS / "modelos" / "modelos.joblib"

_cache: dict = {}


def _carregar() -> dict:
    """Modelos, catálogo e parâmetros, relidos só quando os arquivos mudam."""
    if not ARQUIVO_MODELOS.exists():
        raise historico.ErroHistorico(
            "modelos não encontrados: rode python src/frontend/dados/exportar.py para gravá-los", 503)
    marca = tuple(p.stat().st_mtime for p in (ARQUIVO_MODELOS, PASTA_DADOS / "componentes.csv",
                                               PASTA_DADOS / "parametros.json") if p.exists())
    if _cache.get("marca") != marca:
        import joblib                      # só aqui: o restante do servidor dispensa o scikit-learn
        with open(PASTA_DADOS / "componentes.csv", encoding="utf-8") as f:
            catalogo = {l["componente"]: l for l in csv.DictReader(f)}
        parametros = json.loads((PASTA_DADOS / "parametros.json").read_text(encoding="utf-8"))
        _cache.update(marca=marca, pacote=joblib.load(ARQUIVO_MODELOS), catalogo=catalogo,
                      atencao_pct=float(parametros.get("folga_atencao_pct", 10)))
    return _cache


def _entrada(area: dict, config: dict) -> list[float]:
    """Vetor de configuração de uma área, na ordem de colunas usada no treino."""
    ligadas = {f"{campo}_{valor}" for campo, valor in config.items() if valor is not None}
    if area["perdas"] == "detalhado":
        return [1.0 if c in ligadas else 0.0 for c in area["colunas"]]
    outras = [c for c in area["colunas"] if c not in area["colunas_perdas"]]
    perda = next((c for c in area["colunas_perdas"] if c in ligadas), None)
    nivel = area["familia"][perda] if perda else "not_declared"
    return [1.0 if c in ligadas else 0.0 for c in outras] + [1.0 if n == nivel else 0.0 for n in area["niveis"]]


def _veredito(folga: float | None, limite: float | None, atencao_pct: float) -> str:
    if limite is None:
        return "monitorar"
    if folga < 0:
        return "critico"
    return "atencao" if folga < atencao_pct / 100 * limite else "seguro"


def prever(pedido: dict) -> dict:
    """Temperatura prevista de todos os componentes para uma configuração.

    Corpo esperado: {"configuracao": {os oito campos}}. Devolve a versão do modelo e,
    por componente, previsto, incerteza, limite, folga e veredito.
    """
    import numpy as np

    config = pedido.get("configuracao") or {}
    for campo, validos in historico.CAMPOS.items():
        if config.get(campo) not in validos:
            raise historico.ErroHistorico(f"valor inválido para {campo}: {config.get(campo)!r}")
    config = {c: config.get(c) for c in historico.CAMPOS}
    dados = _carregar()
    pacote, catalogo = dados["pacote"], dados["catalogo"]

    saida = []
    for nome_area, area in pacote["areas"].items():
        comps = [c for c in area["patamar"] if c in catalogo]
        x = _entrada(area, config)
        M = np.array([x + [area["patamar"][c], area["escala"][c]] for c in comps])
        Mt = area["escalador"].transform(M)
        previsto = np.mean([m.predict(Mt) for m in area["modelos"]], axis=0)
        for comp, p in zip(comps, previsto):
            linha = catalogo[comp]
            limite = float(linha["limite_c"]) if linha.get("limite_c") else None
            folga = round(limite - float(p), 2) if limite is not None else None
            saida.append({
                "componente": comp, "codigo": linha.get("codigo") or None, "area": nome_area,
                "previsto": round(float(p), 2),
                "incerteza": float(linha["incerteza"]) if linha.get("incerteza") else None,
                "limite_c": limite, "folga": folga,
                "veredito": _veredito(folga, limite, dados["atencao_pct"]),
            })
    return {"versao_modelo": pacote["versao"], "configuracao": config, "componentes": saida}
