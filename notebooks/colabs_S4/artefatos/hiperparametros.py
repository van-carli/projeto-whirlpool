"""Leitura dos hiperparametros ajustados por random search (Sprint 4).

Uso nos notebooks de mesclagem:

    import sys; sys.path.append("../artefatos")
    from hiperparametros import carrega, modelo

    arte = carrega()
    reg = modelo("coil_temps", "random_forest")      # estimador pronto para .fit
"""
import json
import os

from sklearn.ensemble import (ExtraTreesRegressor, GradientBoostingRegressor,
                              RandomForestRegressor)
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

PADRAO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hiperparametros.json")

CLASSES = {"random_forest": RandomForestRegressor,
           "extra_trees": ExtraTreesRegressor,
           "gradient_boosting": GradientBoostingRegressor}


def carrega(caminho=PADRAO):
    """Devolve o artefato inteiro."""
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def params(area, algoritmo, caminho=PADRAO):
    """Devolve apenas os hiperparametros do par, ja com os valores fixos."""
    arte = carrega(caminho)
    if area not in arte["areas"]:
        raise KeyError(f"area desconhecida: {area}")
    if algoritmo not in arte["areas"][area]:
        raise KeyError(f"algoritmo desconhecido: {algoritmo}")
    return arte["areas"][area][algoritmo]["params"]


def modelo(area, algoritmo, caminho=PADRAO):
    """Instancia o estimador do par. Ridge sai como pipeline com escalonador."""
    p = params(area, algoritmo, caminho)
    if algoritmo == "ridge":
        return make_pipeline(StandardScaler(), Ridge(**p))
    return CLASSES[algoritmo](**p)
