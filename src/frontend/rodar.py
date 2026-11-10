"""Roda o app Streamlit com um dos temas da pasta temas/.

    python rodar.py                              # tema claro, app.py
    python rodar.py escuro                       # tema escuro, app.py
    python rodar.py escuro outro.py              # outro arquivo de app
    python rodar.py claro app.py --server.port 8502   # flags extras vão direto ao Streamlit

Por que existe: o Streamlit só lê tema de .streamlit/config.toml. Os temas ficam em
temas/, e este script converte o arquivo escolhido em flags (--theme.base=dark ...).
Também define a variável de ambiente TEMA ("claro" ou "escuro"), para o app escolher
Tema() ou Tema.escuro() do design base e os dois lados ficarem com o mesmo tema.
"""
import os
import subprocess
import sys
import tomllib
from pathlib import Path

pasta = Path(__file__).resolve().parent
temas = {"claro": pasta / "temas" / "config.toml",
         "escuro": pasta / "temas" / "configEscuro.toml"}
uso = "Uso: python rodar.py [claro|escuro] [arquivo.py] [flags do Streamlit]"


def paraFlags(config: dict, prefixo: str = "") -> list[str]:
    """{"theme": {"base": "dark"}} -> ["--theme.base=dark"] (tabelas aninhadas viram a.b.c)."""
    flags = []
    for chave, valor in config.items():
        caminho = f"{prefixo}.{chave}" if prefixo else chave
        if isinstance(valor, dict):
            flags += paraFlags(valor, caminho)
        else:
            texto = str(valor).lower() if isinstance(valor, bool) else str(valor)
            flags.append(f"--{caminho}={texto}")
    return flags


def localizarApp(nome: str) -> Path | None:
    """Aceita caminho absoluto, relativo à pasta atual ou relativo a src/frontend/."""
    for candidato in (Path(nome), pasta / nome):
        if candidato.is_file():
            return candidato.resolve()
    return None


def main(argumentos: list[str]) -> int:
    nomeTema = "claro"
    if argumentos and argumentos[0] in temas:
        nomeTema = argumentos.pop(0)
    elif argumentos and not argumentos[0].startswith("--") and not argumentos[0].endswith(".py"):
        print(f'Tema desconhecido: "{argumentos[0]}". Use claro ou escuro.\n{uso}', file=sys.stderr)
        return 2

    nomeApp = argumentos.pop(0) if argumentos and not argumentos[0].startswith("--") else "app.py"
    app = localizarApp(nomeApp)
    if app is None:
        print(f'App não encontrado: "{nomeApp}" (procurei na pasta atual e em {pasta}).\n{uso}',
              file=sys.stderr)
        return 2

    with open(temas[nomeTema], "rb") as arquivo:
        flags = paraFlags(tomllib.load(arquivo))

    comando = [sys.executable, "-m", "streamlit", "run", str(app), *flags, *argumentos]
    ambiente = {**os.environ, "TEMA": nomeTema}
    print(f"Tema {nomeTema} ({temas[nomeTema].name}) -> {app.name}")
    try:
        return subprocess.call(comando, cwd=pasta, env=ambiente)
    except KeyboardInterrupt:           # Ctrl+C encerra o Streamlit sem despejar traceback
        return 130


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
