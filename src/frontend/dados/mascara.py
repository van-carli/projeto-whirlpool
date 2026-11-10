"""Código mascarado dos componentes, usado no histórico de configurações do Supabase.

O nome real de um componente não vai para o banco, porque parte dos nomes da planilha da
parceira traz o codinome do produto. No lugar dele, o banco guarda um código formado pelo
prefixo da área e por seis caracteres de um HMAC-SHA256 do nome:

    IPC-3F9A2C   COIL-0B71DE   HMI-9C4E10

O mesmo nome gera sempre o mesmo código em qualquer máquina que tenha a chave do grupo,
sem arquivo de correspondência para distribuir, e a entrada ou saída de componentes não
altera os códigos dos demais. Sem a chave, o nome não pode ser descoberto testando
palpites. A chave é lida da variável de ambiente IGNIS_CHAVE_MASCARA, ou do .env da raiz
do repositório, e nunca é versionada.

    python src/frontend/dados/mascara.py          # confere a chave e a unicidade dos códigos
"""
from __future__ import annotations

import hashlib
import hmac
import os
from pathlib import Path

VARIAVEL_CHAVE = "IGNIS_CHAVE_MASCARA"
TAMANHO = 6                                   # caracteres hexadecimais após o prefixo

PREFIXO = {"coil_temps": "COIL", "ct_knobs": "CTK", "ipc_comp": "IPC", "ipc_cooling": "IPCC",
           "main_vent_sys": "MVS", "mainback": "MBK", "oven_hmi": "HMI"}


def chave(obrigatoria: bool = True) -> bytes | None:
    """Chave do grupo, lida do ambiente ou do .env da raiz. Sem ela, erro ou None."""
    valor = os.environ.get(VARIAVEL_CHAVE, "").strip()
    env = Path(__file__).resolve().parents[3] / ".env"
    if not valor and env.exists():
        for linha in env.read_text(encoding="utf-8").splitlines():
            nome, _, resto = linha.partition("=")
            if nome.strip() == VARIAVEL_CHAVE:
                valor = resto.strip().strip('"').strip("'")
    if not valor:
        if obrigatoria:
            raise RuntimeError(f"defina a variável de ambiente {VARIAVEL_CHAVE} com a chave do grupo")
        return None
    return valor.encode("utf-8")


def codigo(nome: str, area: str, segredo: bytes) -> str:
    """Código mascarado de um componente: prefixo da área, hífen e seis caracteres do HMAC."""
    if area not in PREFIXO:
        raise ValueError(f"área desconhecida: {area}")
    resumo = hmac.new(segredo, nome.strip().encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{PREFIXO[area]}-{resumo[:TAMANHO].upper()}"


def codigos(componentes: list[tuple[str, str]], segredo: bytes) -> dict[str, str]:
    """Códigos de uma lista de pares (nome, área), com a garantia de que não se repetem."""
    saida = {nome: codigo(nome, area, segredo) for nome, area in componentes}
    repetidos = {c for c in saida.values() if list(saida.values()).count(c) > 1}
    if repetidos:
        raise RuntimeError(f"códigos mascarados repetidos: {sorted(repetidos)}; troque a chave")
    return saida


if __name__ == "__main__":
    import csv
    from pathlib import Path

    arquivo = Path(__file__).resolve().parent / "componentes.csv"
    with open(arquivo, encoding="utf-8") as f:
        pares = [(l["componente"], l["area"]) for l in csv.DictReader(f)]
    mapa = codigos(pares, chave())
    print(f"{len(mapa)} componentes, {len(set(mapa.values()))} códigos distintos")
