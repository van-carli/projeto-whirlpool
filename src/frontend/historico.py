"""Acesso ao histórico de configurações no Supabase, usado pelas rotas /api/historico do servir.py.

O navegador nunca fala com o Supabase: as rotas do servidor local chamam a API REST do
projeto com a chave service_role, que ignora o RLS. As tabelas ficam fechadas para a
chave pública (src/supabase/migrations). A conexão vem de duas variáveis de ambiente,
lidas também de um arquivo .env na raiz do repositório, que não é versionado:

    SUPABASE_URL                 https://<ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY    chave service_role do projeto

Só a biblioteca padrão é usada.
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
TEMPO_LIMITE = 15                                  # segundos por requisição

# Os oito campos de entrada do modelo, com os valores válidos da base 13cat. O banco
# confere os mesmos valores; a conferência aqui só devolve uma mensagem mais clara.
CAMPOS = {
    "blower_direction": {"to back", "to front"},
    "housing": {"closed", "open"},
    "board_position": {"center", "right"},
    "deflector_hole": {"closed", "open"},
    "material_coil_support": {"aluminium", "plastic"},
    "run_case": {"broil c1", "broil c2", "broil qualitative", "pyro"},
    "losses": {"broil c2 simone - 240/145/180/180", "broil c2 simone - front order", "broil miro - front order",
               "c1 simone - 240/145/180/180", "miro", "miro - front order", "miro qualitative - back order",
               "miro qualitative - front order", "no losses", "qual simone - front order", "simone",
               "simone losses", "simone modified - back order", None},
    "reason": {"air_path", "heatsink_cover", "plate", "position_study", "other", "not_declared"},
}
FORMATO_COMPONENTE = re.compile(r"^(COIL|CTK|IPCC|IPC|MVS|MBK|HMI)-[0-9A-F]{6}$")
FORMATO_CODIGO = re.compile(r"^WH(BR|MX)\d{4}$")
SELECAO = ",".join(["codigo", "nome", "linha", *CAMPOS, "versao_modelo", "criado_em",
                    "historico_componentes(componente_codigo)"])


class ErroHistorico(Exception):
    """Falha com mensagem para o dashboard; status é o código HTTP a devolver."""

    def __init__(self, mensagem: str, status: int = 400):
        super().__init__(mensagem)
        self.status = status


def _ler_env() -> None:
    """Carrega o .env da raiz sem sobrescrever variáveis já definidas no ambiente."""
    arq = RAIZ / ".env"
    if not arq.exists():
        return
    for linha in arq.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if linha and not linha.startswith("#") and "=" in linha:
            nome, valor = linha.split("=", 1)
            os.environ.setdefault(nome.strip(), valor.strip().strip('"').strip("'"))


def _conexao() -> tuple[str, str]:
    _ler_env()
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    chave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not chave:
        raise ErroHistorico("histórico indisponível: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY", 503)
    return url, chave


def _pedir(metodo: str, caminho: str, corpo=None, extras: dict | None = None):
    url, chave = _conexao()
    dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(f"{url}/rest/v1/{caminho}", data=dados, method=metodo, headers={
        "apikey": chave, "Authorization": f"Bearer {chave}",
        "Content-Type": "application/json", "Accept": "application/json", **(extras or {})})
    try:
        with urllib.request.urlopen(req, timeout=TEMPO_LIMITE) as resp:
            texto = resp.read().decode("utf-8")
    except urllib.error.HTTPError as erro:
        try:
            detalhe = json.loads(erro.read().decode("utf-8")).get("message", "")
        except (ValueError, AttributeError):
            detalhe = ""
        raise ErroHistorico(detalhe or f"o Supabase recusou a requisição ({erro.code})",
                            400 if erro.code < 500 else 502) from erro
    except urllib.error.URLError as erro:
        raise ErroHistorico(f"sem conexão com o Supabase: {erro.reason}", 502) from erro
    return json.loads(texto) if texto else None


def _achatar(registro: dict) -> dict:
    """Troca a lista aninhada de componentes por uma lista simples de códigos."""
    comps = registro.pop("historico_componentes", None) or []
    registro["componentes"] = sorted(c["componente_codigo"] for c in comps)
    return registro


def listar(busca: str = "", limite: int = 200) -> list[dict]:
    """Configurações salvas, das mais recentes às mais antigas, filtradas por código ou nome."""
    params = {"select": SELECAO, "order": "criado_em.desc", "limit": str(limite)}
    termo = re.sub(r"[^\w\s\-]", " ", busca or "", flags=re.UNICODE).strip()
    if termo:
        params["or"] = f'(codigo.ilike."*{termo}*",nome.ilike."*{termo}*")'
    return [_achatar(r) for r in _pedir("GET", "historico_configuracoes?" + urllib.parse.urlencode(params))]


def abrir(codigo: str) -> dict:
    """Uma configuração salva, pelo código (WHBR0001)."""
    codigo = (codigo or "").strip().upper()
    if not FORMATO_CODIGO.match(codigo):
        raise ErroHistorico(f"código inválido: {codigo}")
    params = {"select": SELECAO, "codigo": f"eq.{codigo}", "limit": "1"}
    achados = _pedir("GET", "historico_configuracoes?" + urllib.parse.urlencode(params))
    if not achados:
        raise ErroHistorico(f"configuração não encontrada: {codigo}", 404)
    return _achatar(achados[0])


def salvar(pedido: dict) -> dict:
    """Grava uma configuração e os seus componentes; devolve o código gerado pelo banco.

    Corpo esperado: {"nome", "linha", "configuracao": {os oito campos},
                     "componentes": [códigos mascarados], "versao_modelo"}
    """
    nome = str(pedido.get("nome", "")).strip()
    linha = str(pedido.get("linha", "")).strip().lower()
    config = pedido.get("configuracao") or {}
    comps = pedido.get("componentes") or []
    versao = str(pedido.get("versao_modelo", "")).strip()
    if not nome or len(nome) > 100:
        raise ErroHistorico("informe um nome de até 100 caracteres")
    if linha not in ("br", "mx"):
        raise ErroHistorico("a linha deve ser br ou mx")
    for campo, validos in CAMPOS.items():
        if config.get(campo) not in validos:
            raise ErroHistorico(f"valor inválido para {campo}: {config.get(campo)!r}")
    if not comps or not all(isinstance(c, str) and FORMATO_COMPONENTE.match(c) for c in comps):
        raise ErroHistorico("informe os componentes pelos códigos mascarados do componentes.csv")
    if not versao or len(versao) > 40:
        raise ErroHistorico("informe a versão do modelo, com até 40 caracteres")
    criado = _pedir("POST", "rpc/salvar_configuracao", {
        "p_nome": nome, "p_linha": linha, "p_configuracao": {c: config.get(c) for c in CAMPOS},
        "p_componentes": sorted(set(comps)), "p_versao_modelo": versao})
    return abrir(criado[0]["codigo"])


def carregar_componentes(linhas: list[dict]) -> int:
    """Insere ou atualiza o catálogo mascarado: só código, área e limite de cada componente."""
    registros = []
    for l in linhas:
        if not FORMATO_COMPONENTE.match(l.get("codigo") or ""):
            raise ErroHistorico(f"componente sem código mascarado válido na área {l.get('area')}; "
                                "rode o exportar.py com IGNIS_CHAVE_MASCARA definida")
        limite = str(l.get("limite_c") or "").strip()
        registros.append({"codigo": l["codigo"], "area": l["area"],
                          "limite_ativo": str(l.get("limite_ativo") or "").strip() or "Monitor",
                          "limite_c": int(float(limite)) if limite else None})
    _pedir("POST", "componentes?on_conflict=codigo", registros,
           {"Prefer": "resolution=merge-duplicates,return=minimal"})
    return len(registros)
