"""Baixa para src/frontend/assets/vendor as bibliotecas e fontes que o dashboard carregava de CDNs.

    python src/frontend/tools/baixarVendor.py

Com os arquivos servidos pela própria pasta do frontend, abrir o dashboard não envia o IP
do usuário a Google Fonts, jsDelivr, unpkg ou cdn.plot.ly (Seção 4.1.8 da documentação).
As versões são fixas; para atualizar uma biblioteca, troque a versão aqui e rode de novo.
Só a biblioteca padrão é usada.
"""
import re
import urllib.request
from pathlib import Path

VENDOR = Path(__file__).resolve().parents[1] / "assets" / "vendor"
NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

ARQUIVOS = {
    "three/three.min.js": "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js",
    "three/OrbitControls.js": "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
    "plotly/plotly-2.35.2.min.js": "https://cdn.plot.ly/plotly-2.35.2.min.js",
    "phosphor/Phosphor.woff2": "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/Phosphor.woff2",
    "phosphor/Phosphor.woff": "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/Phosphor.woff",
}
PHOSPHOR_CSS = "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"
FONTES_CSS = ("https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700"
              "&family=Open+Sans:wght@400;600;700&display=swap")
SUBCONJUNTOS = ("latin", "latin-ext")          # português e espanhol


def baixar(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": NAVEGADOR})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def gravar(relativo: str, conteudo: bytes) -> None:
    destino = VENDOR / relativo
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(conteudo)
    print(f"  {relativo:<32} {len(conteudo) / 1024:8.1f} KB")


def main() -> None:
    for relativo, url in ARQUIVOS.items():
        gravar(relativo, baixar(url))

    # ícones: só woff2 e woff, que todo navegador atual lê
    css = baixar(PHOSPHOR_CSS).decode("utf-8")
    css = re.sub(r'src:\s*url\("\./Phosphor\.woff2"\)[^;]*;',
                 'src: url("./Phosphor.woff2") format("woff2"), url("./Phosphor.woff") format("woff");', css, count=1)
    assert "Phosphor.ttf" not in css, "o CSS dos ícones mudou de formato"
    gravar("phosphor/style.css", css.encode("utf-8"))

    # fontes: blocos latin e latin-ext, com os woff2 baixados e os endereços trocados
    css = baixar(FONTES_CSS).decode("utf-8")
    blocos = re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S)
    saida = []
    for subconjunto, bloco in blocos:
        if subconjunto not in SUBCONJUNTOS:
            continue
        url = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", bloco).group(1)
        nome = url.rsplit("/", 1)[1]
        if not (VENDOR / "fontes" / nome).exists():
            gravar(f"fontes/{nome}", baixar(url))
        saida.append(f"/* {subconjunto} */\n" + bloco.replace(url, f"./{nome}"))
    assert len(saida) == 2 * 7, f"esperados 14 blocos (7 pesos x 2 subconjuntos), vieram {len(saida)}"
    gravar("fontes/fontes.css", ("\n".join(saida) + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
