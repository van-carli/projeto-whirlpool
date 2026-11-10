/* Áreas-chave do fogão e seus componentes.
   ORDER define a ordem de exibição; cada área traz onde fica, o que abrange,
   a lista de componentes e a fonte da informação. As funções onde() e local()
   recebem o estado porque o texto muda conforme a posição do console. */
(function () {
  const Modelo3D = window.Modelo3D = window.Modelo3D || {};

  const ORDER = ['ctknobs','coil','ipccomp','ipccool','mainvent','mainback','ovenhmi'];
  const AREAS = {
    ctknobs:{nome:'CT Knobs', cor:'#B3251F', onde:(estado)=>estado.console==='br'?'painel frontal, laterais':'backguard, laterais',
      titulo:'CT Knobs',
      local:(estado)=> estado.console==='br'
        ? 'Os knobs do cooktop (CT = cooktop), nas laterais do painel frontal, entre o tampo e a porta do forno. Um knob por zona de indução.'
        : 'Os knobs do cooktop (CT = cooktop), nas laterais do backguard, o painel elevado atrás do tampo.',
      tem:['Knobs de comando das zonas de indução'],
      critico:'O usuário toca nos knobs, então eles seguem limites de temperatura de toque (UL / IEC). No painel frontal ficam logo acima da porta e da saída de ar quente.',
      fatores:['Deflector hole (Console Region): aberto / fechado'],
      fonte:'Kickoff, slides 9 e 14 · Glossário, slide 3'},
    coil:{nome:'Coil Temps', cor:'#ED6925', onde:(estado)=>'sob o vidro',
      titulo:'Coil Temps',
      local:(estado)=>'As bobinas de indução, logo abaixo do vidro cerâmico e acima da IPC. São 4 bobinas, uma por zona.',
      tem:['Bobina de cobre','Mica (isolamento) acima e abaixo da bobina','Ferrites','Placa de suporte (alumínio ou plástico)'],
      critico:'As bobinas concentram altíssima densidade de potência. Se não forem resfriadas, o vidro ou a eletrônica falham.',
      fatores:['Material Coil Support: alumínio / plástico'],
      fonte:'Kickoff, slides 9–10 · Glossário, slide 3'},
    ipccomp:{nome:'IPC Comp', cor:'#0E7C66', onde:(estado)=>'sob as bobinas',
      titulo:'IPC Comp',
      local:(estado)=>'Os componentes da IPC, a placa inversora de potência, dentro do burner box, logo abaixo das bobinas.',
      tem:['Semicondutores de potência (IGBTs)','Capacitores','Indutores','Placa de circuito'],
      critico:'É onde ficam as perdas (losses): o calor dissipado na placa, em W. Elas mudam com a ordem de montagem das bobinas e o modo de operação. No caso Pyro a perda é zero.',
      fatores:['Board Position: central / direita'],
      fonte:'Kickoff, slide 10 · Glossário, slides 2 e 4'},
    ipccool:{nome:'IPC Cooling', cor:'#00A0DD', onde:(estado)=>'no burner box',
      titulo:'IPC Cooling',
      local:(estado)=>'O sistema que resfria a IPC, no mesmo nível da placa: o ventilador (blower), o housing que direciona o ar e o dissipador (heatsink).',
      tem:['Blower da placa','Housing / duto de ar','Dissipador (heatsink)'],
      critico:'A eletrônica de potência gera muito calor concentrado num ponto. Esse calor precisa sair rápido, senão a placa queima.',
      fatores:['Blower Position','Blower Direction: para a frente / para trás','Housing: aberto / fechado'],
      fonte:'Kickoff, slide 10 · Glossário, slide 2'},
    mainvent:{nome:'Main Vent Sys', cor:'#9B4A91', onde:(estado)=>'acima da cavidade',
      titulo:'Main Vent Sys',
      local:(estado)=>'O sistema principal de ventilação, entre o teto da cavidade e o burner box. Um blower na traseira puxa o ar por um duto sobre o forno e o solta pela frente, logo abaixo do console.',
      tem:['Blower principal (tangencial) e motor','Duto sobre a cavidade','Saída de ar frontal'],
      critico:'Tira o calor que sobe da cavidade antes que ele chegue ao console, aos knobs e à HMI.',
      fatores:['Deflector hole (Console Region): aberto / fechado'],
      fonte:'Kickoff, slides 8–9 · Glossário, slide 3'},
    mainback:{nome:'Mainback', cor:'#C58F40', onde:(estado)=>'traseira',
      titulo:'Mainback',
      local:(estado)=>'O painel estrutural traseiro, voltado para a parede.',
      tem:['Exaustão','Cabeamento de potência','Fixação dos motores dos ventiladores'],
      critico:'Concentra a saída de ar quente e a passagem dos cabos de potência.',
      fatores:[],
      fonte:'Kickoff, slide 8'},
    ovenhmi:{nome:'Oven HMI', cor:'#1E6FB0', onde:(estado)=>estado.console==='br'?'painel frontal, centro':'backguard, centro',
      titulo:'Oven HMI',
      local:(estado)=> estado.console==='br'
        ? 'A interface do forno, no centro do painel frontal: display, teclas e a placa de controle logo atrás.'
        : 'A interface do forno, no centro do backguard: display, teclas e a placa de controle logo atrás.',
      tem:['Display / tela touch','Teclas do forno','Placa de controle (PCB)'],
      critico:'É o “cérebro” do fogão. A eletrônica é muito sensível ao calor radiante que vem da cavidade.',
      fatores:['Deflector hole (Console Region): aberto / fechado'],
      fonte:'Kickoff, slide 9 · Glossário, slide 3'}
  };

  const COMPONENTES = {
   "coil": [
    "Aluminium Plate FL",
    "Aluminium Plate FR",
    "Aluminium Plate RL",
    "Aluminium Plate RR",
    "Coil FL",
    "Coil FR",
    "Coil RL",
    "Coil RR"
   ],
   "ctknobs": [
    "Ambient Between Left Encoders",
    "Ambient Between Right Encoders",
    "Left Center Encoder",
    "Left Encoder",
    "Right Center Encoder",
    "Right Encoder"
   ],
   "ipccomp": [
    "Beatrice Micro",
    "Bridge",
    "CMC 1",
    "CMC 2",
    "DCBUS Cap 1",
    "DCBUS Cap 2",
    "DCBUS Cap 3",
    "DCBUS Cap 4",
    "DMC",
    "Heat Sink (Point/Probe)",
    "IGBT 1",
    "IGBT 10",
    "IGBT 11",
    "IGBT 12",
    "IGBT 13",
    "IGBT 14",
    "IGBT 15",
    "IGBT 16",
    "IGBT 2",
    "IGBT 3",
    "IGBT 4",
    "IGBT 5",
    "IGBT 6",
    "IGBT 7",
    "IGBT 8",
    "IGBT 9",
    "IPC Blower (Air Outlet Temp)",
    "IPC Blower Housing",
    "Micro (Below Board)",
    "Reso Cap 1",
    "Reso Cap 2",
    "Reso Cap 3",
    "Reso Cap 4",
    "Reso Cap 5",
    "Reso Cap 6",
    "Reso Cap 7",
    "Reso Cap 8"
   ],
   "ipccool": [
    "IPC Horizontal Duct Oulet (Inlet IPC Fan)",
    "IPC Housing Outlet",
    "IPC Housing Surface",
    "IPC Vertical Duct Inlet (Bottom)"
   ],
   "mainvent": [
    "AC Blower HES Connector",
    "AC Blower Housing",
    "AC Blower Windings",
    "Top Duct Inlet",
    "Turbo Duct / AC Blower Outlet"
   ],
   "mainback": [
    "ACU Ambient (Hill Only) Top",
    "ACU K8 Housing / Double Line Break",
    "Ambient Below Terminal Block",
    "Convect Motor Winding",
    "Door Lock Microswitch Body",
    "Door Lock Motor Ambient 1/2\" Below",
    "Hot Surface Indicator Body",
    "L2, Wire, Power Cord",
    "Power On Indicator Body",
    "Storage Drawer (Metal Above)"
   ],
   "ovenhmi": [
    "A33/Bellatrix Microchip",
    "A33/Bellatrix UI LCD Screen",
    "A33/Bellatrix UI Wifi"
   ]
  };
  ORDER.forEach(k=>AREAS[k].comp=COMPONENTES[k]);

  Modelo3D.ORDER = ORDER;
  Modelo3D.AREAS = AREAS;
})();
