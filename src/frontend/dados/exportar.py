"""Exporta os arquivos de dados do dashboard Ignis a partir dos notebooks.

    python src/frontend/dados/exportar.py            # a partir da raiz do repositório

Reproduz o modelo entregue na Sprint 4, definido na Seção 23 de
notebooks/colabs_S4/modelagem.ipynb: um modelo por área, no formato longo, com o
estimador e a codificação das perdas da regra por área, o peso próximo ao limite e
validação Leave-One-Group-Out com a partição lida de arquivo. As funções de montagem
e de treino e a regra por área são lidas do próprio caderno, e não copiadas, de modo
que uma mudança na Seção 23 chega ao dashboard na próxima exportação. As métricas
vêm da função canônica `avaliar`/`consolidar` de notebooks/colabs_S3/preparacao_testes/metricas.ipynb.

A exportação usa a regra fixa e uma semente (42). Os valores oficiais da documentação
são médias de três sementes com a escolha refeita dentro das dobras; pequenas
diferenças são esperadas. O conjunto de teste reservado não é lido.

Saídas (todas em src/frontend/dados/):
    componentes.csv            catálogo de componentes (limite, monitorado, leituras, veredito,
                               código mascarado para o histórico)
    metricas_areas.json        métricas por área + critério de viabilidade + métricas por dobra
    metricas_componentes.json  métricas por componente (com falso aprovado / reprovado)
    predicoes.json             predições de validação por área {real, previsto, dobra, ensaio, componente}
    importancias.json          importância das variáveis (MDI) por área
    ensaios.json               uma entrada por ensaio × área (coordenadas paralelas, comparação)
    geometria_3d.json          regiões, vetores de explosão e posições (mm) dos componentes
    parametros.json            margem do TAPI, alvo de viabilidade, versão do modelo, linhas
    modelos/modelos.joblib     modelos finais das sete áreas, para a previsão sob demanda (fora do git)

Os arquivos .csv ficam fora do git (.gitignore do projeto).
"""
from __future__ import annotations

import csv
import json
import os
import sys
import time
import unicodedata
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import ast
import re

from sklearn.ensemble import ExtraTreesRegressor, GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import StandardScaler

import hashlib

import joblib

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mascara                                                  # código mascarado dos componentes

# Os oito campos de entrada do modelo, na ordem em que o dashboard os oferece: primeiro
# os componentes do fogão, depois a condição do ensaio.
CAMPOS_CONFIGURACAO = ("blower_direction", "housing", "board_position", "deflector_hole",
                       "material_coil_support", "run_case", "losses", "reason")

RAIZ = Path(__file__).resolve().parents[3]
# Pastas do teste em exportação. Sem variáveis de ambiente, vale o teste 1 (dataset
# original da parceria); defina-as para exportar a partir da pasta de outro teste.
PASTA_NB = Path(os.environ.get("IGNIS_PASTA_NB") or RAIZ / "notebooks" / "colabs_S4")
CADERNO_MODELO = PASTA_NB / "modelagem.ipynb"                  # Seção 23: modelo entregue
PASTA_PARTICAO = Path(os.environ.get("IGNIS_PASTA_PARTICAO") or RAIZ / "notebooks" / "colabs_S3" / "preparacao_testes")
PASTA_METRICAS = RAIZ / "notebooks" / "colabs_S3" / "preparacao_testes"      # célula canônica de métricas
SAIDA = Path(os.environ.get("IGNIS_SAIDA") or Path(__file__).resolve().parent)
# A conferência contra os valores de referência só vale para o dataset original; um
# teste novo tem números próprios e não pode ser comparado com eles.
CONFERIR = os.environ.get("IGNIS_CONFERIR", "1") != "0"
TESTE_ID = os.environ.get("IGNIS_TESTE_ID", "teste-1")
TESTE_NOME = os.environ.get("IGNIS_TESTE_NOME", "Teste 1")
TESTE_DESCRICAO = os.environ.get("IGNIS_TESTE_DESCRICAO",
                                 "Dataset original da parceria Whirlpool x Inteli.")
TESTE_ORIGEM = os.environ.get("IGNIS_TESTE_ORIGEM", "reais")
sys.path.insert(0, str(SAIDA))

SUFIXO = "_13cat"
COLUNAS_AUXILIARES = ["run_idx"]
SEMENTE = 42
# Erro de cada candidato da regra, média de três sementes, registrado na Seção 23 de
# notebooks/colabs_S4/modelagem.ipynb (tabela "Erro medio absoluto de cada candidato"):
# (leituras, MAE). Esta exportação usa uma semente, e a tolerância cobre a variação entre
# sementes, que nesta base fica abaixo de 0,1 grau por área.
REFERENCIA = {"oven_hmi": (135, 2.321), "ct_knobs": (270, 2.952), "main_vent_sys": (230, 3.739),
              "ipc_cooling": (179, 3.833), "mainback": (458, 4.586), "ipc_comp": (1616, 6.606),
              "coil_temps": (344, 10.316)}
TOLERANCIA_MAE = 0.10

# Parâmetros de leitura do dashboard (decisões registradas na Seção 12 do prompt)
ALVO_DENTRO_10 = 70.0          # % de predições dentro da margem para a área ser viável
MAX_FALSO_APROVADO_PCT = 5.0   # falso aprovado acima disto (em % das predições) invalida a área
FOLGA_ATENCAO_PCT = 10.0       # atenção quando a folga é menor que 10 % do limite (folga de segurança)

ROTULOS_AREA = {
    "coil_temps": "Coil Temps", "ct_knobs": "CT Knobs", "ipc_comp": "IPC Comp",
    "ipc_cooling": "IPC Cooling", "main_vent_sys": "Main Vent Sys", "mainback": "Mainback",
    "oven_hmi": "Oven HMI",
}
AREA_DO_LIMITE = {"Mainback": "mainback", "Coil Temps": "coil_temps", "Main Vent Sys": "main_vent_sys",
                  "IPC Cooling": "ipc_cooling", "IPC Comp": "ipc_comp", "Oven HMI": "oven_hmi",
                  "CT Knobs": "ct_knobs"}


def slug(nome: str) -> str:
    """Regra do prompt: minúsculas, sem acento, espaços e barras viram _, o resto sai."""
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().lower()
    s = s.replace("/", "_").replace(" ", "_")
    s = "".join(ch for ch in s if ch.isalnum() or ch == "_")
    while "__" in s:
        s = s.replace("__", "_")
    return "comp_" + s.strip("_")


def carregar_funcao_canonica():
    """Executa a célula do notebook de métricas que define avaliar/consolidar."""
    nb = json.loads((PASTA_METRICAS / "metricas.ipynb").read_text(encoding="utf-8"))
    for cel in nb["cells"]:
        fonte = "".join(cel["source"])
        if cel["cell_type"] == "code" and "def avaliar" in fonte:
            escopo: dict = {}
            exec(compile(fonte, "metricas.ipynb", "exec"), escopo)
            return escopo["avaliar"], escopo["consolidar"], escopo["MARGEM_KPI"]
    raise RuntimeError("célula com `def avaliar` não encontrada em metricas.ipynb")


def carregar_modelo_s4():
    """Lê da Seção 23 do caderno de modelagem as funções do modelo e a regra por área.

    A célula das funções termina com o treino de três sementes, que não é executado:
    a leitura para antes da linha que o inicia. A célula da regra também avalia o
    conjunto de teste reservado, e por isso dela só a constante _REGRA é extraída,
    sem execução. As células são localizadas pelo conteúdo, e não pela posição.
    """
    nb = json.loads(CADERNO_MODELO.read_text(encoding="utf-8"))
    fontes = ["".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"]
    funcoes = next(f for f in fontes if "def _fora_da_dobra" in f and "def _ajusta" in f)
    regra = next(f for f in fontes if "_REGRA = {" in f)
    escopo: dict = {}
    aqui = os.getcwd()
    os.chdir(PASTA_NB)                     # a Seção 23 lê os arquivos da própria pasta
    try:
        exec(compile(funcoes.split("_ndet = ")[0], "modelagem.ipynb, Seção 23", "exec"), escopo)
    finally:
        os.chdir(aqui)
    escopo["_REGRA"] = ast.literal_eval(re.search(r"_REGRA = (\{.*?\})\n", regra, re.S).group(1))
    return escopo


def limpo(v):
    """NaN -> None para o JSON."""
    if v is None:
        return None
    if isinstance(v, (np.floating, float)):
        return None if not np.isfinite(v) else round(float(v), 4)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


def inteiro(v):
    return int(v) if v is not None and pd.notna(v) else 0


def registrar_teste(metricas_areas: dict, particao: dict) -> None:
    """Mantém src/frontend/dados/testes.json: a lista de testes que o dashboard oferece.

    O teste 1 é o dataset original da parceria e fica na própria pasta de dados; os
    demais ficam em dados/testes/<id>/. O registro guarda nome, descrição e origem,
    informados por quem sobe o arquivo.
    """
    registro_arq = Path(__file__).resolve().parent / "testes.json"
    registro = {"ativo": TESTE_ID, "testes": []}
    if registro_arq.exists():
        try:
            registro = json.loads(registro_arq.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    pasta = "." if SAIDA == registro_arq.parent else SAIDA.name if SAIDA.parent.name != "testes" \
        else f"testes/{SAIDA.name}"
    entrada = {
        "id": TESTE_ID, "nome": TESTE_NOME, "descricao": TESTE_DESCRICAO, "origem": TESTE_ORIGEM,
        "pasta": pasta, "gerado_em": date.today().isoformat(),
        "ensaios": int(particao.get("n_ensaios", 0)),
        "componentes": sum(a["componentes"] for a in metricas_areas["areas"]),
        "areas_viaveis": sum(1 for a in metricas_areas["areas"] if a["viavel"]),
        "areas": len(metricas_areas["areas"]),
    }
    outros = [t for t in registro.get("testes", []) if t.get("id") != TESTE_ID]
    registro["testes"] = sorted(outros + [entrada], key=lambda t: t["id"])
    registro["ativo"] = registro.get("ativo") or TESTE_ID
    registro_arq.write_text(json.dumps(registro, ensure_ascii=False, indent=1), encoding="utf-8")


def main() -> int:
    avaliar, consolidar, MARGEM_KPI = carregar_funcao_canonica()

    s23 = carregar_modelo_s4()
    regra = s23["_REGRA"]
    areas = list(regra)
    datasets = {n: pd.read_csv(PASTA_NB / f"dataset_{n}{SUFIXO}.csv") for n in areas}
    brutos = {n: pd.read_csv(PASTA_NB / f"dataset_{n}.csv") for n in areas}
    limites = pd.read_csv(PASTA_NB / "limites_ativos.csv")
    particao = json.loads((PASTA_PARTICAO / "particao_treino_teste.json").read_text(encoding="utf-8"))
    dobra_de = {int(k): v for k, v in particao["dobra_por_run_idx"].items()}
    dobras = sorted({d for d in dobra_de.values() if d is not None})
    assert len(datasets) == 7, f"esperadas 7 areas, encontradas {len(datasets)}"
    assert dobras, "nenhuma dobra de validacao na particao"

    lim_num = {r.tc_name: (float(r.limite_num) if pd.notna(r.limite_num) else None)
               for r in limites.itertuples()}

    # ---- 1. reprodução do modelo entregue na Sprint 4 (LOGO) ------------------------
    print("Reproduzindo o modelo da Sprint 4 (Seção 23, 7 áreas x 17 dobras)...")
    for a, (est, trat) in regra.items():
        print(f"  {a:<15} {est:<6} perdas {trat}")
    t0 = time.perf_counter()
    blocos, importancias, modelos_finais = [], {}, {}
    aqui = os.getcwd()
    os.chdir(PASTA_NB)                     # as funções da Seção 23 leem os CSV da própria pasta
    try:
        for nome, (est, trat) in regra.items():
            # previsões fora da dobra, exatamente como a Seção 23: patamar e escala no
            # treino de cada dobra, peso próximo ao limite e o estimador da regra
            fora = s23["_fora_da_dobra"](nome, (est, trat), SEMENTE)
            bloco = pd.DataFrame([{"componente": comp, "ensaio": run, "real": real,
                                   "previsto": real + erro, "dobra": dobra_de[run]}
                                  for (run, comp), (erro, real, _) in fora.items()])
            bloco["dataset"] = nome
            blocos.append(bloco)

            # modelo final da área, com todos os ensaios de desenvolvimento, só para a
            # importância das variáveis e para medir o tempo de treino
            d, _, _ = s23["_entradas"](nome, trat)
            cols = [c for c in d.columns if c.startswith(s23["_PREF"]) and not c.startswith(s23["_ORDEM"])]
            perdas = [c for c in cols if c.startswith(s23["_PERDAS"])]
            if trat == "detalhado":
                nomes = cols
            else:
                _, niveis = s23["_bloco_agrupado"](d, perdas)
                nomes = [c for c in cols if c not in perdas] + [f"perdas_{n}" for n in niveis]
            Xl, yl, cl, gl, rl, comps = s23["_carrega"](nome, trat)
            pat = pd.Series(yl).groupby(cl).mean()
            dsv = pd.Series(yl).groupby(cl).std().fillna(1.0).replace(0, 1.0)
            M = np.hstack([Xl, pd.Series(cl).map(pat).to_numpy().reshape(-1, 1),
                           pd.Series(cl).map(dsv).to_numpy().reshape(-1, 1)])
            escalador = StandardScaler()
            Mt = escalador.fit_transform(M)
            w = s23["_peso_perto_do_limite"](yl, comps)
            t2 = time.perf_counter()
            base = (ExtraTreesRegressor if est.startswith("et") else RandomForestRegressor)(
                n_estimators=300, random_state=SEMENTE, n_jobs=-1).fit(Mt, yl, sample_weight=w)
            imp = base.feature_importances_
            estimadores = [base]
            if est.endswith("+gb"):
                gb = GradientBoostingRegressor(n_estimators=300, random_state=SEMENTE).fit(Mt, yl, sample_weight=w)
                imp = (imp + gb.feature_importances_) / 2          # média das duas importâncias
                estimadores.append(gb)
            tempo_treino = time.perf_counter() - t2
            # O modelo final é guardado para a previsão sob demanda (src/frontend/previsao.py):
            # a mesma montagem das entradas da Seção 23, com patamar e escala de cada
            # componente calculados sobre todos os ensaios de desenvolvimento.
            nome_de = dict(zip(cl.tolist(), comps))
            modelos_finais[nome] = {
                "estimador": est, "perdas": trat, "colunas": cols, "colunas_perdas": perdas,
                "familia": {c: s23["_familia_de_perdas"](c) for c in perdas},
                "niveis": niveis if trat != "detalhado" else None,
                "escalador": escalador, "modelos": estimadores,
                "patamar": {nome_de[j]: float(v) for j, v in pat.items()},
                "escala": {nome_de[j]: float(v) for j, v in dsv.items()},
                "leituras": int(len(yl)),
            }
            importancias[nome] = {"tempo_treino_s": tempo_treino,
                                  "variaveis": [{"variavel": v, "importancia": float(i)} for v, i in
                                                zip(nomes + ["patamar do componente", "escala do componente"], imp)]}
    finally:
        os.chdir(aqui)
    pred = pd.concat(blocos, ignore_index=True)
    pred["dobra"] = pred["dobra"].astype(int)

    # ---- modelos finais para a previsão sob demanda ----------------------------------
    # A versão identifica a formulação e os dados de treino; é gravada em cada
    # configuração salva no histórico, para acusar previsões feitas com outro modelo.
    # O arquivo guarda árvores ajustadas sobre as temperaturas da parceira e por isso
    # não é versionado (src/frontend/dados/modelos/ está no .gitignore).
    versao_modelo = "S4-" + hashlib.sha1(json.dumps(
        {"regra": regra, "semente": SEMENTE, "leituras": {a: m["leituras"] for a, m in modelos_finais.items()}},
        sort_keys=True).encode("utf-8")).hexdigest()[:8]
    (SAIDA / "modelos").mkdir(exist_ok=True)
    joblib.dump({"versao": versao_modelo, "gerado_em": date.today().isoformat(), "areas": modelos_finais},
                SAIDA / "modelos" / "modelos.joblib", compress=3)
    opcoes = {campo: sorted({c[len(campo) + 1:] for df in datasets.values() for c in df.columns
                             if c.startswith(campo + "_")})
              for campo in CAMPOS_CONFIGURACAO}
    print(f"  modelos finais gravados em modelos/modelos.joblib, versão {versao_modelo}")
    print(f"  componentes cobertos: {pred['componente'].nunique()} - predicoes: {len(pred)} "
          f"- {time.perf_counter() - t0:.0f}s")

    # conferência contra o erro de cada candidato registrado na Seção 23
    if CONFERIR:
        for nome, g in pred.groupby("dataset"):
            m = avaliar(g["real"], g["previsto"])
            n, mae = REFERENCIA[nome]
            assert m["n"] == n and abs(m["MAE"] - mae) <= TOLERANCIA_MAE, \
                f"{nome} diverge da referencia: {m['n']} leituras, MAE {m['MAE']:.3f} contra {mae:.3f}"
            print(f"  {nome:<15} n {m['n']:>5} | MAE {m['MAE']:.3f} (Seção 23: {mae:.3f}) | "
                  f"dentro de 10% {m['dentro_10_%']:.1f}")
        print("  reproducao conferida contra a Seção 23 do caderno de modelagem")

    # ---- 2. métricas por componente e por área (função canônica) ------------------
    linhas_comp = []
    for (nome, comp), g in pred.groupby(["dataset", "componente"]):
        m = avaliar(g["real"], g["previsto"], limite=lim_num.get(comp))
        linhas_comp.append({"dataset": nome, "componente": comp, **m})
    tab_comp = pd.DataFrame(linhas_comp)
    tab_area = consolidar(tab_comp, grupo="dataset").set_index("dataset")
    decisao = tab_comp.groupby("dataset")[["n_reprova_real", "falso_aprovado", "falso_reprovado"]].sum(min_count=1)

    metricas_areas = {"criterio": {"margem_kpi": MARGEM_KPI, "alvo_dentro_10": ALVO_DENTRO_10,
                                   "max_falso_aprovado_pct": MAX_FALSO_APROVADO_PCT,
                                   "regra": "viável se dentro_10 >= alvo e falso aprovado <= máximo"},
                      "validacao": {"esquema": "Leave-One-Group-Out", "dobras": len(dobras),
                                    "ensaios_treino": len(particao["run_idx_treino"]),
                                    "ensaios_teste_reservado": len(particao["run_idx_teste"])},
                      "areas": []}
    for nome in sorted(datasets):
        g = pred[pred["dataset"] == nome]
        m = avaliar(g["real"], g["previsto"])           # micro: predições empilhadas (valor registrado)
        fa = inteiro(decisao.loc[nome, "falso_aprovado"])
        fa_pct = 100.0 * fa / m["n"]
        viavel = bool(m["dentro_10_%"] >= ALVO_DENTRO_10 and fa_pct <= MAX_FALSO_APROVADO_PCT)
        por_dobra = []
        for d, gd in g.groupby("dobra"):
            md = avaliar(gd["real"], gd["previsto"])
            por_dobra.append({"dobra": int(d), "n": md["n"], "mae": limpo(md["MAE"]),
                              "dentro_10": limpo(md["dentro_10_%"])})
        # faixa confiável: maior temperatura real até a qual a proporção acumulada
        # dentro da margem ainda atinge o alvo (varredura por temperatura crescente)
        ordem = g.sort_values("real")
        dentro = (np.abs(ordem["previsto"] - ordem["real"]) / ordem["real"] <= MARGEM_KPI).to_numpy()
        acumulado = np.cumsum(dentro) / np.arange(1, len(dentro) + 1) * 100
        ok = np.where(acumulado >= ALVO_DENTRO_10)[0]
        faixa = float(ordem["real"].to_numpy()[ok[-1]]) if len(ok) else None
        metricas_areas["areas"].append({
            "area": nome, "rotulo": ROTULOS_AREA[nome],
            "componentes": int(tab_area.loc[nome, "componentes"]),
            "n": m["n"], "mae": limpo(m["MAE"]), "rmse": limpo(m["RMSE"]), "dentro_10": limpo(m["dentro_10_%"]),
            "vies": limpo(m["vies"]), "mape": limpo(m["MAPE_%"]), "wape": limpo(m["WAPE_%"]), "r2": limpo(m["R2"]),
            "mae_macro": limpo(tab_area.loc[nome, "MAE_macro"]),
            "dentro_10_macro": limpo(tab_area.loc[nome, "dentro_10_%_macro"]),
            "n_reprova_real": inteiro(decisao.loc[nome, "n_reprova_real"]),
            "falso_aprovado": fa, "falso_aprovado_pct": limpo(fa_pct),
            "falso_reprovado": inteiro(decisao.loc[nome, "falso_reprovado"]),
            "viavel": viavel, "faixa_confiavel_c": limpo(faixa), "por_dobra": por_dobra,
        })
    (SAIDA / "metricas_areas.json").write_text(json.dumps(metricas_areas, ensure_ascii=False, indent=1), encoding="utf-8")

    metricas_comp = []
    for r in tab_comp.to_dict("records"):
        metricas_comp.append({"componente": r["componente"], "area": r["dataset"], "n": int(r["n"]),
                              "mae": limpo(r["MAE"]), "rmse": limpo(r["RMSE"]), "vies": limpo(r["vies"]),
                              "mape": limpo(r["MAPE_%"]), "r2": limpo(r["R2"]), "dentro_10": limpo(r["dentro_10_%"]),
                              "limite_c": limpo(r.get("limite_C")),
                              "n_reprova_real": limpo(r.get("n_reprova_real")),
                              "falso_aprovado": limpo(r.get("falso_aprovado")),
                              "falso_reprovado": limpo(r.get("falso_reprovado"))})
    (SAIDA / "metricas_componentes.json").write_text(json.dumps(metricas_comp, ensure_ascii=False, indent=1), encoding="utf-8")

    # ---- 3. predições de validação -------------------------------------------------
    predicoes = {nome: [{"real": round(float(r.real), 2), "previsto": round(float(r.previsto), 2),
                         "dobra": int(r.dobra), "ensaio": int(r.ensaio), "componente": r.componente}
                        for r in g.itertuples()]
                 for nome, g in pred.groupby("dataset")}
    (SAIDA / "predicoes.json").write_text(json.dumps(predicoes, ensure_ascii=False), encoding="utf-8")

    # ---- 4. importâncias -------------------------------------------------------------
    (SAIDA / "importancias.json").write_text(json.dumps(
        {"metrica": "importância das variáveis por redução de impureza, em cada área",
         "areas": {n: sorted(v["variaveis"], key=lambda x: -x["importancia"]) for n, v in importancias.items()}},
        ensure_ascii=False, indent=1), encoding="utf-8")

    # ---- 5. ensaios (uma entrada por ensaio × área) ----------------------------------
    ensaios = []
    for nome in sorted(datasets):
        bruto = brutos[nome].set_index("run_idx")
        for run, g in pred[pred["dataset"] == nome].groupby("ensaio"):
            g = g.assign(limite=g["componente"].map(lim_num))
            g["folga"] = g["limite"] - g["previsto"]
            com_limite = g[g["limite"].notna()]
            crit = com_limite.sort_values("folga").iloc[0] if len(com_limite) else g.sort_values("previsto").iloc[-1]
            tem_limite = pd.notna(crit["limite"])
            folga = limpo(crit["folga"]) if tem_limite else None
            erro = abs(float(crit["previsto"]) - float(crit["real"]))
            dentro = bool(erro / float(crit["real"]) <= MARGEM_KPI)
            if folga is None:
                ver = "monitorar"
            elif folga < 0:
                ver = "critico"
            elif folga < FOLGA_ATENCAO_PCT / 100 * float(crit["limite"]):
                ver = "atencao"
            else:
                ver = "seguro"
            b = bruto.loc[run]
            texto = lambda v: None if pd.isna(v) else str(v)      # categoria ausente vira null (não NaN)
            ensaios.append({"id_ensaio": int(run), "area": nome, "dobra": int(crit["dobra"]),
                            "run_case": texto(b["run_case"]), "losses": texto(b["losses"]),
                            "material": texto(b["material_coil_support"]), "housing": texto(b["housing"]),
                            "blower_direction": texto(b["blower_direction"]), "board_position": texto(b["board_position"]),
                            "deflector_hole": texto(b["deflector_hole"]),
                            "componente_critico": crit["componente"],
                            "t_max_prevista": limpo(g["previsto"].max()),
                            "t_critico_prevista": limpo(crit["previsto"]), "t_critico_real": limpo(crit["real"]),
                            "limite_c": limpo(crit["limite"]) if tem_limite else None,
                            "folga_c": folga, "erro_abs_c": round(erro, 3), "dentro_10": dentro,
                            "veredito": ver, "run_origem": f"Run {int(run)}",
                            "n_componentes": int(len(g))})
    (SAIDA / "ensaios.json").write_text(json.dumps(ensaios, ensure_ascii=False), encoding="utf-8")

    # ---- 6. catálogo de componentes -------------------------------------------------
    mae_comp = tab_comp.set_index("componente")["MAE"].to_dict()
    n_comp = tab_comp.set_index("componente")["n"].to_dict()
    # Só os componentes que constam dos conjuntos de dados. O limites_ativos.csv ainda
    # traz o Thermistor do Oven HMI, descartado na preparação por ser cópia exata do
    # Microchip; sem este filtro ele apareceria no catálogo e no 3D sem previsão.
    nos_dados = {c for df in datasets.values() for c in df.columns}
    linhas = []
    for r in limites.itertuples():
        if r.tc_name not in nos_dados:
            continue
        area = AREA_DO_LIMITE[r.key_area.strip()]
        g = pred[pred["componente"] == r.tc_name]
        lim = lim_num[r.tc_name]
        if len(g):
            ultimo = g.sort_values("ensaio").iloc[-1]
            pior = g.sort_values("previsto").iloc[-1]
            ultima = round(float(ultimo["previsto"]), 2)
            tmax = round(float(pior["previsto"]), 2)
            folga = round(lim - ultima, 2) if lim is not None else ""
            folga_min = round(lim - tmax, 2) if lim is not None else ""
            if lim is None:
                ver = "monitorar"
            elif folga_min < 0:
                ver = "critico"
            elif folga_min < FOLGA_ATENCAO_PCT / 100 * lim:
                ver = "atencao"
            else:
                ver = "seguro"
            extra = dict(ultima_leitura=ultima, folga=folga, veredito=ver, t_max_prevista=tmax,
                         folga_min=folga_min, ensaio_ultimo=int(ultimo["ensaio"]), ensaio_max=int(pior["ensaio"]),
                         incerteza=round(float(mae_comp[r.tc_name]), 2), n_predicoes=int(n_comp[r.tc_name]))
        else:
            extra = dict(ultima_leitura="", folga="", veredito="sem_predicao", t_max_prevista="", folga_min="",
                         ensaio_ultimo="", ensaio_max="", incerteza="", n_predicoes=0)
        linhas.append({"area": area, "componente": r.tc_name, "limite_ativo": str(r.active_limit).strip(),
                       "limite_c": lim if lim is not None else "",
                       "monitorado": bool(r.apenas_monitorar), "no": slug(r.tc_name), **extra})
    # Código mascarado de cada componente, usado pelo histórico no Supabase no lugar do
    # nome real (mascara.py). Sem a chave do grupo, a coluna sai vazia e o histórico
    # não consegue salvar configurações a partir deste catálogo.
    segredo = mascara.chave(obrigatoria=False)
    if segredo is None:
        print(f"  aviso: {mascara.VARIAVEL_CHAVE} não definida; componentes.csv sai sem código mascarado")
    mapa = mascara.codigos([(l["componente"], l["area"]) for l in linhas], segredo) if segredo else {}
    for l in linhas:
        l["codigo"] = mapa.get(l["componente"], "")
    with open(SAIDA / "componentes.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()))
        w.writeheader()
        w.writerows(linhas)

    # ---- 7. parâmetros ---------------------------------------------------------------
    (SAIDA / "parametros.json").write_text(json.dumps({
        "gerado_em": date.today().isoformat(), "dados": TESTE_ORIGEM,
        "teste": {"id": TESTE_ID, "nome": TESTE_NOME, "descricao": TESTE_DESCRICAO, "origem": TESTE_ORIGEM},
        "validacao_rotulo": "validação cruzada por configuração de ensaio",
        "margem_kpi": MARGEM_KPI, "alvo_dentro_10": ALVO_DENTRO_10,
        "max_falso_aprovado_pct": MAX_FALSO_APROVADO_PCT, "folga_atencao_pct": FOLGA_ATENCAO_PCT,
        "linhas": {"br": {"rotulo": "Brasil", "disponivel": True},
                   "mx": {"rotulo": "México", "disponivel": False,
                          "motivo": "nenhum ensaio da linha do México foi exportado dos notebooks"}},
        "fonte": "notebooks/colabs_S4/modelagem.ipynb, Seção 23 · colabs_S3/preparacao_testes/metricas.ipynb",
        "modelo": {"descricao": "formulação entregue na Sprint 4, regra fixa, semente 42",
                   "nota": ("Os números vêm de uma exportação com a regra fixa e uma semente (42); "
                            "a documentação (Seção 4.3) apresenta a média de três sementes, por isso "
                            "os valores podem diferir em décimos."),
                   "regra": {a: {"estimador": e, "perdas": t} for a, (e, t) in regra.items()},
                   "versao": versao_modelo},
        # valores que a tela de visão geral oferece para montar uma configuração
        "configuracao": {"campos": list(CAMPOS_CONFIGURACAO), "opcoes": opcoes},
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    # ---- 8. geometria 3D --------------------------------------------------------------
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "geometriaFogao"))
    from geometria import gerar_geometria   # posições em mm, de geometriaFogao/
    geo = gerar_geometria([l["componente"] for l in linhas], {l["componente"]: l["area"] for l in linhas}, slug)
    (SAIDA / "geometria_3d.json").write_text(json.dumps(geo, ensure_ascii=False, indent=1), encoding="utf-8")

    registrar_teste(metricas_areas, particao)

    print(f"Arquivos gravados em {SAIDA}")
    for a in metricas_areas["areas"]:
        print(f"  {a['area']:<14} n={a['n']:>5} MAE={a['mae']:>6.2f} dentro10={a['dentro_10']:>6.2f} "
              f"FA={a['falso_aprovado']:>3} ({a['falso_aprovado_pct']:.1f}%) viavel={a['viavel']}")
    print(f"  treino dos modelos finais {sum(v['tempo_treino_s'] for v in importancias.values()):.1f}s")
    sem = [l["componente"] for l in linhas if l["veredito"] == "sem_predicao"]
    print(f"  componentes no catalogo: {len(linhas)} - com predicao: {len(linhas)-len(sem)} - sem: {sem}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
