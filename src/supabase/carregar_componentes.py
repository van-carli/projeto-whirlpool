"""Carrega no Supabase o catálogo mascarado de componentes do histórico.

    python src/supabase/carregar_componentes.py      # a partir da raiz do repositório

Lê o src/frontend/dados/componentes.csv gerado pelo exportar.py com a variável
IGNIS_CHAVE_MASCARA definida, e envia ao banco só o código mascarado, a área e o limite
de cada componente. O nome real fica no CSV local e não sai da máquina. Rodar de novo
atualiza os registros existentes, sem duplicá-los.

A conexão usa SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, do ambiente ou do .env da raiz.
"""
import csv
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "src" / "frontend"))
import historico  # noqa: E402

CATALOGO = RAIZ / "src" / "frontend" / "dados" / "componentes.csv"

if __name__ == "__main__":
    if not CATALOGO.exists():
        sys.exit(f"{CATALOGO} não encontrado; rode antes python src/frontend/dados/exportar.py")
    with open(CATALOGO, encoding="utf-8") as f:
        linhas = list(csv.DictReader(f))
    try:
        n = historico.carregar_componentes(linhas)
    except historico.ErroHistorico as erro:
        sys.exit(f"falha: {erro}")
    print(f"{n} componentes carregados no Supabase")
