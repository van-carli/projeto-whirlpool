"""Serve o dashboard Ignis (src/frontend/), os dados (src/frontend/dados) e a API de testes.

    python src/frontend/servir.py            # abre http://localhost:8765/ no navegador
    python src/frontend/servir.py 8080       # outra porta

O app usa fetch() para ler os arquivos de dados; abrir o index.html direto do disco
(file://) não funciona nos navegadores. Antes, gere os dados com src/frontend/dados/exportar.py.

API local (só escuta em 127.0.0.1, para uso na própria máquina):

    GET  /api/glossario         termos que o time cadastrou (dados/glossario.json)
    POST /api/glossario         grava um termo: corpo {"termo", "definicao", "secao"}; o arquivo é
                                versionado, por isso nenhum dado pessoal, como o autor, é gravado
    GET  /api/testes            lista os testes registrados (mesmo conteúdo de dados/testes.json)
    POST /api/testes/ativo      corpo {"id": "..."}: troca o teste ativo
    POST /api/prever            prevê todos os componentes para uma configuração: corpo
                                {"configuracao": {os oito campos}} (src/frontend/previsao.py)
    GET  /api/historico         configurações salvas no Supabase; ?busca= filtra por código ou nome
    GET  /api/historico/<cod>   uma configuração salva, pelo código (WHBR0001)
    POST /api/historico         salva uma configuração: corpo {"nome", "linha", "configuracao",
                                "componentes", "versao_modelo"}; devolve o registro com o código

As rotas do histórico chamam o Supabase com a chave service_role (src/frontend/historico.py),
lida de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ou do .env da raiz do repositório.
"""
import http.server
import json
import socketserver
import sys
from datetime import date
import threading
import urllib.parse
import webbrowser
from functools import partial
from pathlib import Path

import historico
import previsao

RAIZ = Path(__file__).resolve().parent          # src/frontend/
PASTA_DADOS = RAIZ / "dados"
porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
sys.path.insert(0, str(PASTA_DADOS))

LIMITE_ENVIO = 1024 * 1024                      # 1 MB: os corpos que restam são JSON pequenos


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, formato, *args):        # só erros no terminal
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(formato, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ---------- API ----------
    def responder(self, dados, status=200):
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def corpo(self) -> bytes:
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho <= 0:
            raise ValueError("nenhum arquivo foi enviado")
        if tamanho > LIMITE_ENVIO:
            raise ValueError(f"arquivo acima do limite de {LIMITE_ENVIO // (1024 * 1024)} MB")
        return self.rfile.read(tamanho)

    def glossario(self) -> dict:
        arq = PASTA_DADOS / "glossario.json"
        if not arq.exists():
            return {"termos": []}
        try:
            return json.loads(arq.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {"termos": []}

    def rota_api(self, operacao, *args):
        """Executa uma operação da API (histórico ou previsão) e devolve o erro com o status adequado."""
        try:
            return self.responder(operacao(*args))
        except historico.ErroHistorico as erro:
            return self.responder({"erro": str(erro)}, erro.status)

    def do_GET(self):                             # noqa: N802 - assinatura da biblioteca
        partes = urllib.parse.urlsplit(self.path)
        caminho = partes.path.rstrip("/")
        if caminho == "/api/historico":
            busca = urllib.parse.parse_qs(partes.query).get("busca", [""])[0]
            return self.rota_api(historico.listar, busca)
        if caminho.startswith("/api/historico/"):
            return self.rota_api(historico.abrir, urllib.parse.unquote(caminho.rsplit("/", 1)[1]))
        if caminho == "/api/testes":
            arq = PASTA_DADOS / "testes.json"
            if not arq.exists():
                return self.responder({"ativo": None, "testes": []})
            return self.responder(json.loads(arq.read_text(encoding="utf-8")))
        if caminho == "/api/glossario":
            return self.responder(self.glossario())
        return super().do_GET()

    def do_POST(self):                            # noqa: N802 - assinatura da biblioteca
        caminho = urllib.parse.urlsplit(self.path).path.rstrip("/")
        try:
            if caminho == "/api/prever":
                return self.rota_api(previsao.prever, json.loads(self.corpo().decode("utf-8")))
            if caminho == "/api/historico":
                return self.rota_api(historico.salvar, json.loads(self.corpo().decode("utf-8")))

            if caminho == "/api/glossario":
                pedido = json.loads(self.corpo().decode("utf-8"))
                termo = str(pedido.get("termo", "")).strip()
                definicao = str(pedido.get("definicao", "")).strip()
                if not termo or not definicao:
                    return self.responder({"erro": "informe o termo e a definição"}, 400)
                registro = self.glossario()
                termos = [t for t in registro.get("termos", [])
                          if t.get("termo", "").lower() != termo.lower()]   # regravar substitui
                termos.append({"termo": termo, "definicao": definicao,
                               "secao": str(pedido.get("secao", "")).strip() or "Termos do time",
                               "adicionado_em": date.today().isoformat()})
                registro["termos"] = sorted(termos, key=lambda t: t["termo"].lower())
                (PASTA_DADOS / "glossario.json").write_text(
                    json.dumps(registro, ensure_ascii=False, indent=1), encoding="utf-8")
                return self.responder({"ok": True, "glossario": registro})

            if caminho == "/api/testes/ativo":
                pedido = json.loads(self.corpo().decode("utf-8"))
                arq = PASTA_DADOS / "testes.json"
                registro = json.loads(arq.read_text(encoding="utf-8"))
                ids = {t["id"] for t in registro.get("testes", [])}
                if pedido.get("id") not in ids:
                    return self.responder({"erro": f"teste desconhecido: {pedido.get('id')}"}, 400)
                registro["ativo"] = pedido["id"]
                arq.write_text(json.dumps(registro, ensure_ascii=False, indent=1), encoding="utf-8")
                return self.responder(registro)

        except Exception as erro:                  # noqa: BLE001 - devolve a causa ao dashboard
            return self.responder({"erro": str(erro)}, 400)

        self.send_error(404, "rota desconhecida")


if __name__ == "__main__":
    handler = partial(Silencioso, directory=str(RAIZ))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", porta), handler) as servidor:
        servidor.daemon_threads = True
        url = f"http://localhost:{porta}/"
        print(f"Ignis em {url}  (Ctrl+C para parar)")
        if "--sem-navegador" not in sys.argv:
            threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            pass
