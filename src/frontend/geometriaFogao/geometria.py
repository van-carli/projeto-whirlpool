"""Posições aproximadas (mm) dos componentes no fogão de piso por indução.

Eixos: X largura (+ direita), Y altura (+ cima), Z profundidade (+ frente do usuário).
Origem no centro da base, no chão. Estas posições são inferidas dos nomes dos
componentes e do manual de um fogão de piso por indução (Slide-In Induction Range
Owner's Manual W11477340A); devem ser substituídas pelas do CAD quando ele existir
(o JSON marca origem "aproximada" e o dashboard mostra o selo correspondente).

O cooktop é de indução, com quatro zonas (FL, FR, RL, RR), coerentes com os
componentes medidos: Coil FL/FR/RL/RR e Aluminium Plate FL/FR/RL/RR. Cada zona é
marcada no vidro e ligada à bobina que fica logo abaixo dela.

Formas: box [x,y,z] · cyl [raio, comprimento] com eixo x|y|z · sphere [raio] ·
torus [raio, espessura] · marker [raio] (sonda de ar: esfera pequena, estilo distinto)
"""
from __future__ import annotations

# Zonas de indução: chave -> (x, z) do centro, em mm
BOCAS = {"FL": (-260, 120), "FR": (260, 120), "RL": (-260, -120), "RR": (260, -120)}

MODELO = {"largura_mm": 914, "profundidade_mm": 660, "altura_mm": 915,
          "console_y": [795, 900], "porta": {"largura": 560, "altura": 520, "z": 330},
          "kick_plate_y": 90, "cavidade": {"dims": [600, 480, 560], "centro": [0, 490, -20]},
          "cooktop": "inducao",
          "zonas": [{"chave": k, "x": x, "z": z, "raio_mm": 105, "coil": f"Coil {k}",
                     "placa": f"Aluminium Plate {k}"} for k, (x, z) in BOCAS.items()],
          "fonte": "Fogão de piso por indução · Owner's Manual W11477340A",
          "origem": "aproximada"}

REGIOES = {
    "coil_temps":    {"rotulo": "Coil Temps",    "explode_mm": [0, 300, 0],  "camera": "topo"},
    "ct_knobs":      {"rotulo": "CT Knobs",      "explode_mm": [0, 0, 260],  "camera": "frente"},
    "ipc_comp":      {"rotulo": "IPC Comp",      "explode_mm": [0, 180, 0],  "camera": "topo"},
    "ipc_cooling":   {"rotulo": "IPC Cooling",   "explode_mm": [0, 180, 0],  "camera": "topo"},
    "main_vent_sys": {"rotulo": "Main Vent Sys", "explode_mm": [0, 90, 0],   "camera": "traseira"},
    "mainback":      {"rotulo": "Mainback",      "explode_mm": [0, 0, -260], "camera": "traseira"},
    "oven_hmi":      {"rotulo": "Oven HMI",      "explode_mm": [0, 0, 260],  "camera": "frente"},
}

# Peças de apoio de cada região (sem temperatura): placa da IPC, duto, motor da trava…
# IPC Comp ocupa a metade direita do burner box; IPC Cooling, o caminho de ar à
# esquerda. Os dois não se interpenetram: a placa vai de X -80 a 280 e o caminho
# de ar, de X -370 a -126.
SUPORTES = {
    "ipc_comp":      [{"forma": "box", "dims": [360, 3, 200], "pos": [100, 795, -40], "cor": "placa"},
                      {"forma": "box", "dims": [170, 14, 70], "pos": [24, 818, -70], "cor": "metal"}],
    "ipc_cooling":   [],
    "main_vent_sys": [{"forma": "box", "dims": [320, 26, 520], "pos": [0, 757, 0], "cor": "ar"}],
    "oven_hmi":      [{"forma": "box", "dims": [240, 70, 3], "pos": [0, 848, 298], "cor": "placa"}],
    "mainback":      [{"forma": "box", "dims": [80, 40, 20], "pos": [-300, 340, -318], "cor": "metal"},
                      {"forma": "box", "dims": [60, 20, 25], "pos": [0, 775, 300], "cor": "metal"}],
    "ct_knobs":      [],
    "coil_temps":    [],
}

COMPONENTES: dict[str, dict] = {}
for pos, (x, z) in BOCAS.items():
    COMPONENTES[f"Coil {pos}"] = {"forma": "torus", "dims": [78, 12], "eixo": "y", "pos": [x, 882, z],
                                  "zona": pos}
    COMPONENTES[f"Aluminium Plate {pos}"] = {"forma": "cyl", "dims": [100, 6], "eixo": "y",
                                             "pos": [x, 864, z], "zona": pos}

KNOB_Y, KNOB_Z = 848, 340
COMPONENTES.update({
    "Left Encoder":          {"forma": "cyl", "dims": [24, 26], "eixo": "z", "pos": [-395, KNOB_Y, KNOB_Z]},
    "Left Center Encoder":   {"forma": "cyl", "dims": [24, 26], "eixo": "z", "pos": [-215, KNOB_Y, KNOB_Z]},
    "Right Center Encoder":  {"forma": "cyl", "dims": [24, 26], "eixo": "z", "pos": [215, KNOB_Y, KNOB_Z]},
    "Right Encoder":         {"forma": "cyl", "dims": [24, 26], "eixo": "z", "pos": [395, KNOB_Y, KNOB_Z]},
    "Ambient Between Left Encoders":  {"forma": "marker", "dims": [9], "pos": [-305, KNOB_Y, 300]},
    "Ambient Between Right Encoders": {"forma": "marker", "dims": [9], "pos": [305, KNOB_Y, 300]},
    "A33/Bellatrix UI LCD Screen": {"forma": "box", "dims": [170, 55, 4], "pos": [0, KNOB_Y, 333]},
    "A33/Bellatrix Microchip":     {"forma": "box", "dims": [22, 22, 4], "pos": [-70, KNOB_Y + 8, 295]},
    "A33/Bellatrix UI Wifi":       {"forma": "box", "dims": [30, 14, 4], "pos": [70, KNOB_Y + 8, 295]},
    "A33/Bellatrix Thermistor":    {"forma": "cyl", "dims": [4, 10], "eixo": "z", "pos": [0, KNOB_Y - 24, 295]},
})

# IPC Comp: placa em (100, 795, -40), 360 × 200 — X de -80 a 280, Z de -140 a 60.
# Duas fileiras de IGBT em Z -100 e -40, com o dissipador entre elas.
for i in range(16):
    fila, col = divmod(i, 8)
    COMPONENTES[f"IGBT {i+1}"] = {"forma": "box", "dims": [12, 8, 16], "pos": [-58 + col * 24, 802, -100 + fila * 60]}
for i in range(8):
    COMPONENTES[f"Reso Cap {i+1}"] = {"forma": "cyl", "dims": [9, 22], "eixo": "y", "pos": [-58 + i * 24, 808, 24]}
for i in range(4):
    COMPONENTES[f"DCBUS Cap {i+1}"] = {"forma": "cyl", "dims": [15, 36], "eixo": "y", "pos": [150 + i * 36, 815, -40]}
COMPONENTES.update({
    "Bridge":            {"forma": "box", "dims": [30, 14, 26], "pos": [150, 804, 22]},
    "CMC 1":             {"forma": "box", "dims": [28, 26, 28], "pos": [196, 810, 22]},
    "CMC 2":             {"forma": "box", "dims": [28, 26, 28], "pos": [232, 810, 22]},
    "DMC":               {"forma": "box", "dims": [28, 26, 28], "pos": [268, 810, 22]},
    "Beatrice Micro":    {"forma": "box", "dims": [20, 4, 20], "pos": [240, 802, -100]},
    "Micro (Below Board)": {"forma": "box", "dims": [18, 4, 18], "pos": [60, 790, -40]},
    "Heat Sink (Point/Probe)": {"forma": "marker", "dims": [7], "pos": [24, 828, -70]},
    "IPC Blower Housing": {"forma": "cyl", "dims": [44, 40], "eixo": "z", "pos": [-170, 812, -40]},
    "IPC Blower (Air Outlet Temp)": {"forma": "marker", "dims": [9], "pos": [-116, 812, -40]},
    # IPC Cooling: caminho do ar, à esquerda da placa (X de -370 a -126), sem
    # tocar a placa nem os componentes de IPC Comp
    "IPC Vertical Duct Inlet (Bottom)":          {"forma": "box", "dims": [70, 140, 90], "pos": [-350, 703, -40], "ar": True, "fluxo": "y"},
    "IPC Horizontal Duct Oulet (Inlet IPC Fan)": {"forma": "box", "dims": [80, 50, 90], "pos": [-278, 800, -40], "ar": True, "fluxo": "x"},
    "IPC Housing Surface": {"forma": "box", "dims": [8, 70, 140], "pos": [-226, 812, -40], "ar": True, "casca": True},
    "IPC Housing Outlet":  {"forma": "box", "dims": [60, 40, 80], "pos": [320, 812, -40], "ar": True, "fluxo": "x"},
    # Main Vent Sys: entre o teto da cavidade (Y 730) e o burner box (Y 780)
    "AC Blower Housing":       {"forma": "cyl", "dims": [24, 320], "eixo": "x", "pos": [0, 757, -285]},
    "AC Blower Windings":      {"forma": "cyl", "dims": [22, 60], "eixo": "x", "pos": [205, 757, -285]},
    "AC Blower HES Connector": {"forma": "box", "dims": [16, 14, 20], "pos": [250, 757, -285]},
    "Top Duct Inlet":              {"forma": "box", "dims": [300, 26, 80], "pos": [0, 757, -200], "ar": True, "fluxo": "z"},
    "Turbo Duct / AC Blower Outlet": {"forma": "box", "dims": [400, 18, 50], "pos": [0, 762, 300], "ar": True, "fluxo": "z"},
    # Mainback: traseira e periferia elétrica, cada peça onde fisicamente está
    "ACU Ambient (Hill Only) Top":        {"forma": "marker", "dims": [9], "pos": [300, 860, -300]},
    "ACU K8 Housing / Double Line Break": {"forma": "box", "dims": [120, 60, 28], "pos": [300, 805, -305]},
    "Ambient Below Terminal Block":       {"forma": "marker", "dims": [9], "pos": [-300, 300, -318]},
    "Convect Motor Winding":              {"forma": "cyl", "dims": [36, 50], "eixo": "z", "pos": [0, 490, -318]},
    "Door Lock Microswitch Body":         {"forma": "box", "dims": [18, 12, 12], "pos": [46, 782, 300], "explode_mm": [0, 0, 260]},
    "Door Lock Motor Ambient 1/2\" Below": {"forma": "marker", "dims": [8], "pos": [0, 738, 300], "explode_mm": [0, 0, 260]},
    "Hot Surface Indicator Body":         {"forma": "box", "dims": [14, 6, 4], "pos": [-150, 830, 333], "explode_mm": [0, 0, 260]},
    "Power On Indicator Body":            {"forma": "box", "dims": [14, 6, 4], "pos": [150, 830, 333], "explode_mm": [0, 0, 260]},
    "L2, Wire, Power Cord":               {"forma": "cyl", "dims": [5, 130], "eixo": "y", "pos": [380, 130, -322]},
    "Storage Drawer (Metal Above)":       {"forma": "box", "dims": [600, 4, 520], "pos": [0, 246, -20], "explode_mm": [0, -120, 0]},
})

CAMERAS = {
    "padrao":   {"pos": [1500, 1150, 1900], "alvo": [0, 470, 0]},
    "frente":   {"pos": [0, 760, 2300], "alvo": [0, 520, 0]},
    "topo":     {"pos": [0, 2500, 250], "alvo": [0, 800, 0]},
    "traseira": {"pos": [0, 820, -2300], "alvo": [0, 520, 0]},
}


def caixa(g: dict) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    """Caixa envolvente (mínimo, máximo) de um componente, em mm."""
    forma, d, (x, y, z) = g["forma"], g.get("dims", [10]), g["pos"]
    if forma == "box":
        meia = (d[0] / 2, d[1] / 2, d[2] / 2)
    elif forma == "cyl":
        r, comp, eixo = d[0], d[1], g.get("eixo", "y")
        meia = {"x": (comp / 2, r, r), "y": (r, comp / 2, r), "z": (r, r, comp / 2)}[eixo]
    elif forma == "torus":
        r, tubo, eixo = d[0] + d[1], d[1], g.get("eixo", "y")
        meia = {"x": (tubo, r, r), "y": (r, tubo, r), "z": (r, r, tubo)}[eixo]
    else:                                   # sphere, marker
        meia = (d[0], d[0], d[0])
    return ((x - meia[0], y - meia[1], z - meia[2]), (x + meia[0], y + meia[1], z + meia[2]))


def conflitos(folga_mm: float = 0.0) -> list[tuple[str, str, float]]:
    """Pares de componentes cujas caixas envolventes se sobrepõem.

    Usado como conferência: dois sensores não podem ocupar o mesmo espaço, senão
    o clique no modelo 3D fica ambíguo. Devolve (nome A, nome B, folga que falta).
    """
    itens = [(n, caixa(g)) for n, g in COMPONENTES.items()]
    achados = []
    for i, (na, (amin, amax)) in enumerate(itens):
        for nb, (bmin, bmax) in itens[i + 1:]:
            vao = [min(amax[k], bmax[k]) - max(amin[k], bmin[k]) for k in range(3)]
            if all(v > -folga_mm for v in vao):
                achados.append((na, nb, round(min(vao), 1)))
    return achados


def gerar_geometria(componentes: list[str], area_de: dict[str, str], slug) -> dict:
    comps = {}
    for nome in componentes:
        g = COMPONENTES.get(nome)
        if g is None:
            continue                                  # fica marcado como "sem posição" no dashboard
        comps[nome] = {"regiao": area_de[nome], "no": slug(nome), "posicao_mm": g["pos"],
                       **{k: v for k, v in g.items() if k != "pos"}}
    return {"modelo": MODELO, "regioes": {r: {**v, "suportes": SUPORTES.get(r, [])} for r, v in REGIOES.items()},
            "cameras": CAMERAS, "componentes": comps}
