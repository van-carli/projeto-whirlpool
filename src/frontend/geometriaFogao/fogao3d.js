// Modelo 3D do fogão (Three.js, geometria paramétrica em mm, eixos X largura / Y altura / Z frente).
// Contexto (casca, porta, cavidade, tampo com bocas e grelhas) construído a partir de geo.modelo;
// regiões e componentes construídos a partir de geo.regioes / geo.componentes (nada chumbado aqui).
import { token } from '../js/graficos.js';
import { movimentoReduzido } from '../js/estado.js';

const PI = Math.PI;

export class Fogao3D {
  constructor(container, geo, { aoPassar = () => {}, aoClicar = () => {} } = {}) {
    if (!window.THREE || !THREE.OrbitControls) throw new Error('three.js não carregou');
    this.container = container; this.geo = geo; this.aoPassar = aoPassar; this.aoClicar = aoClicar;
    this.descartaveis = []; this.componentes = new Map(); this.meshesComp = []; this.cascas = []; this.movers = [];
    this.contexto = []; this.zonas = []; this.ctxAtenuado = false; this.arestasCasca = [];
    this.explodeAlvo = 0; this.explodeAtual = 0; this.tween = null; this.sob = null; this.regiaoSob = null; this.vivo = true;

    const m = geo.modelo;
    this.W = m.largura_mm; this.D = m.profundidade_mm; this.H = m.altura_mm;

    this.scene = new THREE.Scene();
    // fundo transparente (o degradê de estúdio vem do CSS de .ig-cena), saída em sRGB com
    // tone mapping fotográfico e sombras suaves: é o que dá ao aço cara de aço.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(32, 1, 10, 20000);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !movimentoReduzido();
    this.controls.minDistance = 700; this.controls.maxDistance = 6000; this.controls.maxPolarAngle = PI * 0.52;
    this.controls.target.set(0, 470, 0);
    this.vista('padrao', true);

    // iluminação de estúdio: luz principal com sombra, preenchimento e contraluz; o
    // ambiente refletido (construirAmbiente) faz o resto do trabalho nos metais.
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, 0.35));
    // a luz principal vem da frente-esquerda, para a sombra cair no chão à direita, onde a câmera padrão enxerga
    const chave = new THREE.DirectionalLight(0xffffff, 0.95); chave.position.set(-700, 3200, 1100); this.scene.add(chave);
    chave.castShadow = true; chave.shadow.mapSize.set(1024, 1024);   // mapa menor = borda mais macia chave.shadow.bias = -0.0004; chave.shadow.normalBias = 3;
    Object.assign(chave.shadow.camera, { left: -1700, right: 1700, top: 1700, bottom: -1700, near: 200, far: 6000 });
    chave.shadow.camera.updateProjectionMatrix();
    const preench = new THREE.DirectionalLight(0xffffff, 0.4); preench.position.set(1600, 700, 1000); this.scene.add(preench);
    const contra = new THREE.DirectionalLight(0xffffff, 0.3); contra.position.set(0, 900, -1600); this.scene.add(contra);

    // o chão só recebe a sombra: o degradê por trás do canvas faz as vezes de piso
    this.chao = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.ShadowMaterial({ opacity: .2 }));
    this.chao.rotation.x = -PI / 2; this.chao.position.y = -0.5; this.chao.receiveShadow = true; this.scene.add(this.chao);
    this.descartaveis.push(this.chao.geometry, this.chao.material);

    this.raiz = new THREE.Group(); this.scene.add(this.raiz);
    this.construirAmbiente();
    this.construirContexto();
    this.construirRegioes();
    this.tema();

    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.ligarEventos();
    this.observador = new ResizeObserver(() => this.redimensionar()); this.observador.observe(container);
    this.redimensionar();
    this.loop = (t) => { if (!this.vivo) return; this.passo(t); requestAnimationFrame(this.loop); };
    requestAnimationFrame(this.loop);
  }

  /* ---------- ambiente refletido ---------- */
  /**
   * Estúdio fotográfico em miniatura (sala escura com quatro softboxes), convertido em
   * mapa de ambiente: é ele que aparece refletido no aço e no vidro. Procedural, sem
   * imagem HDR para baixar.
   */
  construirAmbiente() {
    const estudio = new THREE.Scene();
    const descartar = [];
    const parede = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x1a1d22, side: THREE.BackSide }));
    estudio.add(parede); descartar.push(parede.geometry, parede.material);
    const softbox = (w, h, pos, rot, brilho) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(brilho) }));
      m.position.set(...pos); m.rotation.set(...rot); estudio.add(m); descartar.push(m.geometry, m.material);
    };
    softbox(4.5, 3, [0, 4.9, 0.5], [PI / 2, 0, 0], 8);      // teto: o reflexo principal no tampo
    softbox(1.6, 4.5, [-4.9, 2.2, 1], [0, PI / 2, 0], 5);   // lateral esquerda: faixa vertical de luz
    softbox(1.6, 4.5, [4.9, 2.2, -1], [0, -PI / 2, 0], 3);  // lateral direita, mais fraca
    softbox(7, 0.6, [0, 1.6, -4.9], [0, 0, 0], 2.5);        // faixa ao fundo: linha de luz nas laterais
    softbox(7, 0.5, [0, 3.2, 4.9], [0, PI, 0], 1.5);        // faixa na frente: brilho na porta e no console
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(estudio, .04).texture;
    this.descartaveis.push(this.scene.environment);
    pmrem.dispose(); descartar.forEach(d => d.dispose());
  }

  /* ---------- materiais ---------- */
  /** Cor CSS ou hexadecimal no espaço linear: com a saída em sRGB, é assim que ela aparece como escrita. */
  cor(x) { return new THREE.Color(x).convertSRGBToLinear(); }
  mat(cor, o = {}) {
    const Material = o.fisico ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    delete o.fisico;
    const m = new Material(Object.assign({ color: this.cor(cor), roughness: .5, metalness: .2, envMapIntensity: .9 }, o));
    this.descartaveis.push(m); return m;
  }
  geoBox(w, h, d) { const g = new THREE.BoxGeometry(w, h, d); this.descartaveis.push(g); return g; }
  geoCyl(r, h, s = 32) { const g = new THREE.CylinderGeometry(r, r, h, s); this.descartaveis.push(g); return g; }
  /** Caixa de cantos arredondados (perfil em X/Z, altura em Y): deixa a carcaça com cara de fogão. */
  geoCaixaArred(w, h, d, r = 16) {
    const hw = w / 2, hd = d / 2, rr = Math.max(1, Math.min(r, hw - 1, hd - 1));
    const s = new THREE.Shape();
    s.moveTo(-hw + rr, -hd);
    s.lineTo(hw - rr, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + rr);
    s.lineTo(hw, hd - rr); s.quadraticCurveTo(hw, hd, hw - rr, hd);
    s.lineTo(-hw + rr, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - rr);
    s.lineTo(-hw, -hd + rr); s.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2, curveSegments: 10 });
    g.rotateX(-PI / 2); g.translate(0, -h / 2, 0);
    this.descartaveis.push(g); return g;
  }
  malha(parent, geo, mat, pos, { rot = null, casca = false, papel = 'ctx' } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = !mat.transparent; m.receiveShadow = true;
    m.userData.papel = papel;
    if (casca) {
      m.userData.casca = true; this.cascas.push(m);
      // contorno fino nas arestas, como num desenho de engenharia: define a silhueta
      // mesmo quando o aço e o fundo têm quase o mesmo tom
      const ar = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: .22 }));
      m.add(ar); this.descartaveis.push(ar.geometry, ar.material); m.userData.arestasCasca = ar; this.arestasCasca.push(ar.material);
    }
    if (papel === 'ctx') this.contexto.push(m);
    parent.add(m); return m;
  }
  mover(parent, vetor) {
    const g = new THREE.Group(); g.userData.explode = new THREE.Vector3(...vetor); parent.add(g); this.movers.push(g); return g;
  }

  /* ---------- contexto: casca, porta, cavidade, tampo do manual ---------- */
  construirContexto() {
    const { W, D, H } = this, m = this.geo.modelo, esp = 14, kick = m.kick_plate_y ?? 90;
    this.acos = []; this.acosEscuros = []; this.vidros = [];
    // aço inox escovado e detalhes em grafite: metal de verdade, que reflete o ambiente
    const aco = () => { const x = this.mat(0xdee0e3, { metalness: .85, roughness: .28, envMapIntensity: 1.1 }); this.acos.push(x); return x; };
    const escuro = () => { const x = this.mat(0x767777, { metalness: .6, roughness: .42 }); this.acosEscuros.push(x); return x; };

    const latE = this.mover(this.raiz, [-240, 0, 0]), latD = this.mover(this.raiz, [240, 0, 0]);
    this.malha(latE, this.geoBox(esp, H - kick, D), aco(), [-W / 2 + esp / 2, kick + (H - kick) / 2, 0], { casca: true });
    this.malha(latD, this.geoBox(esp, H - kick, D), aco(), [W / 2 - esp / 2, kick + (H - kick) / 2, 0], { casca: true });

    const tras = this.mover(this.raiz, [0, 0, -260]);
    this.malha(tras, this.geoBox(W - 2 * esp, H - kick, esp), aco(), [0, kick + (H - kick) / 2, -D / 2 + esp / 2], { casca: true });
    for (let i = 0; i < 10; i++) this.malha(tras, this.geoBox(60, 8, 4), escuro(), [-300 + i * 66, H - 60, -D / 2 - 1]);
    // caixa de ligação elétrica e o cabo de força com plugue 14-50R (manual, instalação elétrica)
    this.malha(tras, this.geoBox(150, 120, 10), aco(), [W / 2 - 200, 260, -D / 2 - 4], { casca: true });
    const cabo = this.mat(0x23282e, { roughness: .8 }); this.acosEscuros.push(cabo);
    this.malha(tras, this.geoCyl(11, 150, 12), cabo, [W / 2 - 200, 130, -D / 2 - 30], { rot: [PI / 2.6, 0, 0] });
    this.malha(tras, this.geoBox(70, 90, 40), cabo, [W / 2 - 200, 48, -D / 2 - 76]);

    const base = this.mover(this.raiz, [0, -80, 0]);
    this.malha(base, this.geoBox(W - 2 * esp, esp, D - 2 * esp), aco(), [0, kick + esp / 2, 0], { casca: true });
    this.malha(base, this.geoBox(W - 60, kick, esp), escuro(), [0, kick / 2, D / 2 - 50], { casca: true });
    // pés niveladores (4) e o suporte antitombamento, ambos listados no manual
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
      const x = sx * (W / 2 - 60), z = sz * (D / 2 - 60);
      this.malha(base, this.geoCyl(10, kick - 18, 16), escuro(), [x, (kick - 18) / 2 + 18, z]);
      this.malha(base, this.geoCyl(18, 18, 20), escuro(), [x, 9, z]);
    }));
    const antitombo = this.mat(0x8a9099, { metalness: .5, roughness: .4 }); this.acosEscuros.push(antitombo);
    this.malha(base, this.geoBox(150, 6, 70), antitombo, [0, 8, -D / 2 + 50]);
    this.malha(base, this.geoBox(150, 55, 6), antitombo, [0, 33, -D / 2 + 18]);
    // frisos laterais (Side Trim Kit, 1,7 cm): acabamento entre o fogão e o armário
    [-1, 1].forEach(s => this.malha(this.raiz, this.geoBox(17, 700, 10), aco(),
      [s * (W / 2 - 9), kick + 350, D / 2 - 6], { casca: true }));

    // tampo de indução: moldura, vidro cerâmico e a marcação das zonas de cozimento.
    // Cada zona fica sobre a bobina correspondente (Coil FL/FR/RL/RR) e é clicável.
    const tampo = this.mover(this.raiz, [0, 460, 0]);
    this.malha(tampo, this.geoCaixaArred(W, 12, D, 26), aco(), [0, H - 6, 0], { casca: true });
    const vidroTampo = this.mat(0x0b0e13, { fisico: true, roughness: .05, metalness: .1, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .96 });
    this.vidros.push(vidroTampo);
    this.malha(tampo, this.geoCaixaArred(W - 40, 6, D - 40, 20), vidroTampo, [0, H + 3, 0], { casca: true });
    const zonas = m.zonas ?? [];
    zonas.forEach(z => {
      const r = z.raio_mm ?? 105;
      const anelGeo = new THREE.TorusGeometry(r, 2.5, 8, 64); this.descartaveis.push(anelGeo);
      const anelMat = this.mat(0xc7cdd4, { roughness: .4, emissive: 0x000000 });
      const anel = this.malha(tampo, anelGeo, anelMat, [z.x, H + 7, z.z], { rot: [PI / 2, 0, 0], papel: 'zona' });
      anel.userData.nome = z.coil; anel.userData.regiao = 'coil_temps'; anel.userData.zona = z.chave;
      anel.userData.baseOpacidade = 1;
      this.zonas.push({ chave: z.chave, coil: z.coil, placa: z.placa, mesh: anel });
      this.meshesComp.push(anel);           // clicável: leva à bobina de baixo
    });
    // fundo do burner box (bandeja sob o tampo) fica com a estrutura
    this.malha(this.raiz, this.geoBox(W - 40, 4, D - 40), aco(), [0, 780, 0]);

    // console frontal: painel. Os knobs são componentes medidos (CT Knobs) e vêm do JSON.
    const [cy0, cy1] = m.console_y ?? [795, 900];
    const cons = this.mover(this.raiz, [0, 0, 260]); this.console = cons;
    this.malha(cons, this.geoCaixaArred(W - 2 * esp, cy1 - cy0, 20, 8), aco(), [0, (cy0 + cy1) / 2, D / 2 - 10], { casca: true });

    // porta do forno (560 × 520, frente em Z 330), vidro, puxador e frente da gaveta
    const p = m.porta ?? { largura: 560, altura: 520, z: 330 };
    const porta = this.mover(this.raiz, [0, 0, 380]);
    const py = cy0 - p.altura / 2;
    this.malha(porta, this.geoCaixaArred(p.largura, 24, p.altura, 22), aco(), [0, py, p.z - 12], { rot: [PI / 2, 0, 0], casca: true });
    const vidro = this.mat(0x0b0e13, { fisico: true, roughness: .06, metalness: .1, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .94 }); this.vidros.push(vidro);
    this.malha(porta, this.geoBox(p.largura - 160, 220, 4), vidro, [0, py + 20, p.z + 1], { casca: true });
    this.malha(porta, this.geoCyl(12, p.largura + 40, 24), escuro(), [0, cy0 - 40, p.z + 40], { rot: [0, 0, PI / 2] });
    [-1, 1].forEach(s => this.malha(porta, this.geoBox(16, 16, 40), escuro(), [s * (p.largura / 2 - 20), cy0 - 40, p.z + 18]));
    // gaveta de armazenamento: frente, puxador, caixa e trilhos laterais (manual, "Remove/Replace Drawer")
    const gaveta = this.mover(this.raiz, [0, 0, 300]);
    this.malha(gaveta, this.geoCaixaArred(p.largura, 14, 150, 16), aco(), [0, kick + 92, p.z - 7], { rot: [PI / 2, 0, 0], casca: true });
    this.malha(gaveta, this.geoCyl(9, p.largura - 120, 20), escuro(), [0, kick + 130, p.z + 16], { rot: [0, 0, PI / 2] });
    [-1, 1].forEach(s => this.malha(gaveta, this.geoBox(14, 14, 26), escuro(), [s * (p.largura / 2 - 70), kick + 130, p.z + 4]));
    const caixa = this.mat(0x9aa3ac, { metalness: .3, roughness: .6, transparent: true, opacity: .5 });
    const fundoGaveta = (m.cavidade?.dims?.[2] ?? 560) - 120, zGaveta = (m.cavidade?.centro?.[2] ?? -20) + 20;
    this.malha(gaveta, this.geoBox(p.largura - 60, 120, fundoGaveta), caixa, [0, kick + 90, zGaveta]);
    [-1, 1].forEach(s => this.malha(gaveta, this.geoBox(12, 22, fundoGaveta - 20), escuro(), [s * (p.largura / 2 - 24), kick + 150, zGaveta]));
    // junta de vedação da porta, em volta da boca do forno (manual: "door gasket")
    const junta = this.mat(0x3a4048, { roughness: .9, metalness: 0 }); this.acosEscuros.push(junta);
    const bocaL = 600, bocaA = 470, zJunta = p.z - 34;
    [-1, 1].forEach(s => this.malha(this.raiz, this.geoBox(bocaL, 12, 12), junta, [0, cy0 - 30 + s * (bocaA / 2) - bocaA / 2 + 30, zJunta]));
    [-1, 1].forEach(s => this.malha(this.raiz, this.geoBox(12, bocaA, 12), junta, [s * (bocaL / 2), cy0 - 30 - bocaA / 2 + 30, zJunta]));
    // dobradiças da porta: dois braços na base, como no encaixe descrito no manual
    [-1, 1].forEach(s => {
      const x = s * (p.largura / 2 - 90);
      this.malha(this.raiz, this.geoBox(26, 70, 36), escuro(), [x, py - p.altura / 2 + 26, p.z - 48]);
      this.malha(this.raiz, this.geoBox(14, 20, 60), escuro(), [x, py - p.altura / 2 + 44, p.z - 24]);
    });

    // chapas frontais entre a porta e as laterais (fecham a frente do corpo)
    const lado = (W / 2 - esp - p.largura / 2), altFrente = cy0 - kick - esp;
    [-1, 1].forEach(s => this.malha(this.raiz, this.geoBox(lado, altFrente, 14), aco(), [s * (p.largura / 2 + lado / 2), kick + esp + altFrente / 2, p.z - 7], { casca: true }));

    // cavidade: volume translúcido, arestas, elementos de bake/broil e ventilador de convecção
    const cav = m.cavidade ?? { dims: [600, 480, 560], centro: [0, 490, -20] };
    const [cw, ch, cd] = cav.dims, [cx, cyc, cz] = cav.centro;
    const vidroCav = this.mat(0xb9a98a, { transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide });
    this.malha(this.raiz, this.geoBox(cw, ch, cd), vidroCav, [cx, cyc, cz]);
    const arestas = new THREE.LineSegments(new THREE.EdgesGeometry(this.geoBox(cw, ch, cd)), new THREE.LineBasicMaterial({ color: 0x9a8f7a, transparent: true, opacity: .7 }));
    arestas.position.set(cx, cyc, cz); this.raiz.add(arestas); this.descartaveis.push(arestas.geometry, arestas.material);
    const elemento = (y) => {
      const pts = [];
      [-200, -100, 0, 100, 200].forEach((x, i) => { const a = i % 2 ? cd / 2 - 40 : -cd / 2 + 40, b = -a; pts.push(new THREE.Vector3(x, y, cz + a), new THREE.Vector3(x, y, cz + b)); });
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .06), 200, 5, 8, false);
      this.descartaveis.push(g);
      this.malha(this.raiz, g, this.mat(0x7a3a24, { emissive: 0xc2410c, emissiveIntensity: .25 }), [0, 0, 0]);
    };
    elemento(cyc - ch / 2 + 20); elemento(cyc + ch / 2 - 25);
    this.malha(this.raiz, this.geoCyl(90, 8, 40), escuro(), [cx, cyc, cz - cd / 2 + 8], { rot: [PI / 2, 0, 0] });

    // três grades de forno e os trilhos laterais que as sustentam (manual: "Oven racks (3)")
    const arame = this.mat(0xb8bec6, { metalness: .55, roughness: .35 }); this.acosEscuros.push(arame);
    const larguraGrade = cw - 60, fundoGrade = cd - 90;
    const fio = this.geoCyl(3, fundoGrade, 8), travessa = this.geoCyl(4, larguraGrade, 8);
    const alturasGrade = [cyc - 150, cyc - 20, cyc + 110];
    alturasGrade.forEach(y => {
      for (let i = 0; i < 9; i++) {
        const x = cx - larguraGrade / 2 + (i * larguraGrade) / 8;
        this.malha(this.raiz, fio, arame, [x, y, cz], { rot: [PI / 2, 0, 0] });
      }
      [-1, 1].forEach(s => this.malha(this.raiz, travessa, arame, [cx, y, cz + s * (fundoGrade / 2 - 10)], { rot: [0, 0, PI / 2] }));
      [-1, 1].forEach(s => this.malha(this.raiz, this.geoBox(10, 8, fundoGrade + 20), escuro(),
        [cx + s * (cw / 2 - 6), y - 8, cz]));   // trilho de apoio na parede da cavidade
    });
  }

  /* ---------- regiões e componentes (do geometria_3d.json) ---------- */
  construirRegioes() {
    const g = this.geo;
    this.grupos = {};           // regiao -> { chaveVetor -> Group }
    const grupoDe = (regiao, vetor) => {
      const k = vetor.join(',');
      this.grupos[regiao] = this.grupos[regiao] || {};
      if (!this.grupos[regiao][k]) { this.grupos[regiao][k] = this.mover(this.raiz, vetor); this.grupos[regiao][k].userData.regiao = regiao; }
      return this.grupos[regiao][k];
    };
    // suportes (placa, duto…) por região: neutros, não clicáveis
    Object.entries(g.regioes).forEach(([regiao, r]) => {
      (r.suportes ?? []).forEach(s => {
        const cor = { placa: 0x2f9e44, metal: 0x9aa3ac, ar: 0xc7cdd4 }[s.cor] ?? 0x9aa3ac;
        const mat = s.cor === 'ar' ? this.mat(cor, { transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide }) : this.mat(cor, { roughness: .6 });
        const m = this.malha(grupoDe(regiao, r.explode_mm), this.geoBox(...s.dims), mat, s.pos, { papel: 'suporte' });
        m.userData.regiao = regiao; m.userData.baseOpacidade = mat.opacity;
      });
    });
    // componentes repetidos viram InstancedMesh (mesma forma, dimensões, eixo, região e vetor)
    const lotes = {};
    Object.entries(g.componentes).forEach(([nome, c]) => {
      const vetor = c.explode_mm ?? g.regioes[c.regiao]?.explode_mm ?? [0, 0, 0];
      const chave = `${c.regiao}|${vetor.join(',')}|${c.forma}|${(c.dims ?? []).join(',')}|${c.eixo ?? ''}|${c.ar ? 'ar' : ''}|${c.casca ? 'casca' : ''}`;
      (lotes[chave] = lotes[chave] || { c, vetor, nomes: [] }).nomes.push(nome);
    });
    Object.values(lotes).forEach(({ c, vetor, nomes }) => {
      const grupo = grupoDe(c.regiao, vetor);
      if (nomes.length >= 3 && !c.ar && c.forma !== 'marker') this.instanciar(grupo, c, nomes);
      else nomes.forEach(n => this.componente(grupo, g.componentes[n], n));
    });
  }

  geometriaDe(c) {
    const d = c.dims ?? [10];
    switch (c.forma) {
      case 'box': return this.geoBox(d[0], d[1], d[2]);
      case 'cyl': return this.geoCyl(d[0], d[1], 32);
      case 'sphere': case 'marker': { const g = new THREE.SphereGeometry(d[0], 20, 16); this.descartaveis.push(g); return g; }
      case 'torus': { const g = new THREE.TorusGeometry(d[0], d[1], 12, 48); this.descartaveis.push(g); return g; }
      default: return this.geoBox(10, 10, 10);
    }
  }
  rotacaoDe(c) {
    if (c.forma === 'cyl') return { x: [0, 0, PI / 2], y: [0, 0, 0], z: [PI / 2, 0, 0] }[c.eixo ?? 'y'];
    if (c.forma === 'torus') return { x: [0, PI / 2, 0], y: [PI / 2, 0, 0], z: [0, 0, 0] }[c.eixo ?? 'y'];
    return null;
  }

  componente(grupo, c, nome) {
    const geo = this.geometriaDe(c);
    let mat, m;
    if (c.ar) {
      mat = this.mat(0xc7cdd4, { transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide, roughness: .8 });
      m = this.malha(grupo, geo, mat, c.posicao_mm, { papel: 'comp' });
      const ar = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x767777, transparent: true, opacity: .8 }));
      m.add(ar); this.descartaveis.push(ar.geometry, ar.material); m.userData.arestas = ar;
      if (c.fluxo && !c.casca) this.setas(m, c);
    } else if (c.forma === 'marker') {
      mat = this.mat(0xc7cdd4, { roughness: .3, metalness: 0, transparent: true, opacity: .95 });
      m = this.malha(grupo, geo, mat, c.posicao_mm, { papel: 'comp' });
      const halo = new THREE.Mesh(new THREE.IcosahedronGeometry((c.dims?.[0] ?? 8) * 1.9, 1), new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: .45, color: 0x767777 }));
      m.add(halo); this.descartaveis.push(halo.geometry, halo.material); m.userData.halo = halo;
    } else {
      mat = this.mat(0xc7cdd4, { roughness: .45, metalness: .25 });
      m = this.malha(grupo, geo, mat, c.posicao_mm, { rot: this.rotacaoDe(c), papel: 'comp' });
    }
    m.userData.baseOpacidade = mat.opacity; m.userData.nome = nome; m.userData.regiao = c.regiao; m.userData.ar = !!c.ar; m.userData.marker = c.forma === 'marker';
    this.componentes.set(nome, { mesh: m }); this.meshesComp.push(m);
  }

  setas(m, c) {
    const eixo = c.fluxo.replace('-', ''), sinal = c.fluxo.startsWith('-') ? -1 : 1;
    const d = c.dims, comp = { x: d[0], y: d[1], z: d[2] }[eixo];
    const cone = new THREE.ConeGeometry(6, 16, 12); this.descartaveis.push(cone);
    const mat = this.mat(0x767777, { emissive: 0x767777, emissiveIntensity: .3 }); m.userData.setasMat = mat;
    [-.3, 0, .3].forEach(f => {
      const s = new THREE.Mesh(cone, mat);
      s.position.set(eixo === 'x' ? f * comp : 0, eixo === 'y' ? f * comp : 0, eixo === 'z' ? f * comp : 0);
      if (eixo === 'x') s.rotation.z = -sinal * PI / 2; else if (eixo === 'z') s.rotation.x = sinal * PI / 2; else if (sinal < 0) s.rotation.x = PI;
      m.add(s);
    });
  }

  instanciar(grupo, c, nomes) {
    const geo = this.geometriaDe(c);
    const mat = this.mat(0xc7cdd4, { roughness: .45, metalness: .25 });
    const im = new THREE.InstancedMesh(geo, mat, nomes.length);
    const rot = this.rotacaoDe(c), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    if (rot) { e.set(...rot); q.setFromEuler(e); }
    nomes.forEach((n, i) => {
      const p = this.geo.componentes[n].posicao_mm;
      mtx.compose(new THREE.Vector3(...p), q, new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, mtx); im.setColorAt(i, this.cor(0xc7cdd4));
      this.componentes.set(n, { mesh: im, indice: i });
    });
    im.userData = { papel: 'comp', regiao: c.regiao, instancias: nomes, baseOpacidade: 1 };
    im.castShadow = true; im.receiveShadow = true;
    grupo.add(im); this.meshesComp.push(im);
  }

  /* ---------- aparência ---------- */
  tema() {
    const cor = n => this.cor(token(n));
    this.scene.background = null;             // o degradê de .ig-cena aparece por trás
    this.acos.forEach(m => m.color.copy(cor('--ig-cena-aco')));
    this.arestasCasca.forEach(m => m.color.copy(cor('--ig-cena-aco-escuro')));
    this.acosEscuros.forEach(m => m.color.copy(cor('--ig-cena-aco-escuro')));
  }

  /**
   * Colore os componentes. fn(nome, regiao) -> { cor: css | null, opacidade: 0..1, ativa: bool }
   * Região inativa: neutra e a ~20 %.
   */
  colorir(fn) {
    const neutro = this.cor(token('--ig-cena-aco-escuro'));
    this.zonas.forEach(z => {
      const r = fn(z.coil, 'coil_temps');
      z.mesh.material.color.copy(r.cor ? this.cor(r.cor) : neutro);
      this.opacidade(z.mesh, r.ativa ? 1 : .25);
    });
    this.meshesComp.filter(m => m.userData.papel !== 'zona').forEach(m => {
      const ud = m.userData;
      if (m.isInstancedMesh) {
        let ativa = false;
        ud.instancias.forEach((n, i) => {
          const r = fn(n, ud.regiao); ativa = ativa || r.ativa;
          m.setColorAt(i, r.cor ? this.cor(r.cor) : neutro);
        });
        m.instanceColor.needsUpdate = true;
        this.opacidade(m, ativa ? 1 : .2);
      } else {
        const r = fn(ud.nome, ud.regiao);
        m.material.color.copy(r.cor ? this.cor(r.cor) : neutro);
        if (ud.halo) ud.halo.material.color.copy(r.cor ? this.cor(r.cor) : neutro);
        if (ud.setasMat) { ud.setasMat.color.copy(r.cor ? this.cor(r.cor) : neutro); ud.setasMat.emissive.copy(ud.setasMat.color); }
        this.opacidade(m, r.ativa ? 1 : .2);
      }
    });
    Object.entries(this.grupos).forEach(([regiao, gs]) => Object.values(gs).forEach(g => g.children.forEach(ch => {
      if (ch.userData.papel === 'suporte') { const ativa = fn(null, regiao).ativa; this.opacidade(ch, ativa ? 1 : .2); }
    })));
  }
  opacidade(m, fator) {
    const base = m.userData.baseOpacidade ?? 1, op = base * fator;
    m.material.opacity = op; m.material.transparent = op < .999 || m.userData.ar || m.userData.marker;
    m.material.depthWrite = op > .6 && !m.userData.ar;
    if (m.userData.arestas) m.userData.arestas.material.opacity = .8 * fator;
    if (m.userData.halo) m.userData.halo.material.opacity = .45 * fator;
    m.material.needsUpdate = true;
  }
  raioX(ligado) {
    this.raioXLigado = ligado;
    this.aplicarContexto();
  }

  /**
   * Atenua o contexto (carcaça, porta, cavidade, tampo): ligado quando o usuário
   * isola regiões, para que nenhuma peça sem área esconda o que está selecionado.
   */
  atenuarContexto(ligado) {
    this.ctxAtenuado = ligado;
    this.aplicarContexto();
  }

  aplicarContexto() {
    const fator = this.raioXLigado ? .12 : this.ctxAtenuado ? .18 : 1;
    this.contexto.forEach(m => {
      const base = m.material.userData.opBase ?? (m.material.userData.opBase = m.material.opacity);
      const op = base * fator;
      m.material.transparent = op < .999;
      m.material.opacity = op;
      m.material.depthWrite = op > .6;
      m.castShadow = op > .99;                // carcaça apagada não projeta sombra
      if (m.userData.arestasCasca) m.userData.arestasCasca.material.opacity = .22 * fator;
      m.material.needsUpdate = true;
    });
  }
  explodir(t) { this.explodeAlvo = Math.max(0, Math.min(1, t)); }
  destacarRegiao(regiao) {
    this.regiaoSob = regiao;
    this.meshesComp.forEach(m => { if (!m.isInstancedMesh && m.material.emissive) { const sob = regiao && m.userData.regiao === regiao; m.material.emissive.set(sob ? 0x333333 : 0x000000); } });
  }

  /* ---------- câmera ---------- */
  vista(nome, imediato = false) {
    const c = this.geo.cameras?.[nome] ?? this.geo.cameras?.padrao ?? { pos: [1500, 1150, 1900], alvo: [0, 470, 0] };
    const pos = new THREE.Vector3(...c.pos), alvo = new THREE.Vector3(...c.alvo);
    if (imediato || movimentoReduzido()) { this.camera.position.copy(pos); this.controls.target.copy(alvo); this.tween = null; return; }
    this.tween = { t0: performance.now(), deP: this.camera.position.clone(), paraP: pos, deA: this.controls.target.clone(), paraA: alvo };
  }

  /* ---------- interação ---------- */
  ligarEventos() {
    const cv = this.renderer.domElement;
    let baixo = null;
    cv.addEventListener('pointerdown', e => { baixo = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', e => {
      if (!baixo || Math.hypot(e.clientX - baixo.x, e.clientY - baixo.y) > 5) return;
      const h = this.acertar(e);
      this.aoClicar(h ? h.nome : null, h ? h.regiao : null);
    });
    cv.addEventListener('pointermove', e => {
      const h = this.acertar(e);
      const chave = h ? h.nome : null;
      if (chave !== this.sob) { this.sob = chave; this.aoPassar(h, e); } else if (h) this.aoPassar(h, e);
    });
    cv.addEventListener('pointerleave', () => { this.sob = null; this.aoPassar(null); });
  }
  acertar(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObjects(this.meshesComp, false).filter(h => h.object.material.opacity > .25 || h.object.userData.ar);
    const h = hits.find(x => !x.object.userData.ar) ?? hits[0];
    if (!h) return null;
    const o = h.object;
    const nome = o.isInstancedMesh ? o.userData.instancias[h.instanceId] : o.userData.nome;
    return { nome, regiao: o.userData.regiao, x: e.clientX, y: e.clientY };
  }

  /* ---------- laço ---------- */
  redimensionar() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  passo(agora) {
    const k = movimentoReduzido() ? 1 : .15;
    this.explodeAtual += (this.explodeAlvo - this.explodeAtual) * k;
    if (Math.abs(this.explodeAlvo - this.explodeAtual) < .002) this.explodeAtual = this.explodeAlvo;
    this.movers.forEach(g => g.position.copy(g.userData.explode).multiplyScalar(this.explodeAtual));
    if (this.tween) {
      const t = Math.min(1, (agora - this.tween.t0) / 550), s = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.camera.position.lerpVectors(this.tween.deP, this.tween.paraP, s);
      this.controls.target.lerpVectors(this.tween.deA, this.tween.paraA, s);
      if (t >= 1) this.tween = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.vivo = false; this.observador.disconnect(); this.controls.dispose();
    this.descartaveis.forEach(d => { try { d.dispose(); } catch (e) { /* já descartado */ } });
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
