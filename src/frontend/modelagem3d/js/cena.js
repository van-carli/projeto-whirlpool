/* Cena 3D: monta o fogão com three.js e responde ao estado da aplicação.

   Peças de contexto (chassis, porta, cavidade, vidro, burner box) usam a área
   "ctx": aparecem em cinza, não entram na lista e o clique as atravessa.

   Medidas em centímetros, origem no chão, eixo Z apontando para a frente.

   criarCena(viewer, estado, aoSelecionar) -> {atualizar, focar, resetarVista} */
(function () {
  const Modelo3D = window.Modelo3D = window.Modelo3D || {};
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  Modelo3D.criarCena = function (viewer, estado, aoSelecionar) {
    const AREAS = Modelo3D.AREAS;

    /* ---------- cena, câmera e luzes ---------- */
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    viewer.insertBefore(renderer.domElement, viewer.firstChild);
    const camera = new THREE.PerspectiveCamera(34, 1, 1, 3000);
    const INICIAL = {pos:new THREE.Vector3(150,135,185), alvo:new THREE.Vector3(0,58,0)};
    camera.position.copy(INICIAL.pos);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(INICIAL.alvo); controls.enableDamping = true;
    controls.minDistance = 50; controls.maxDistance = 520; controls.maxPolarAngle = Math.PI*0.54;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6470, 0.85));
    const luzPrincipal = new THREE.DirectionalLight(0xffffff, 0.75);
    luzPrincipal.position.set(90,180,140); scene.add(luzPrincipal);
    const luzPreenchimento = new THREE.DirectionalLight(0xffffff, 0.35);
    luzPreenchimento.position.set(-140,60,-80); scene.add(luzPreenchimento);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(150,64),
                                 new THREE.MeshStandardMaterial({color:0xcccccc, roughness:1}));
    floor.rotation.x = -Math.PI/2; floor.position.y = -0.05; scene.add(floor);

    /* fundo e piso saem dos tokens, então acompanham o tema claro/escuro */
    function aplicarTema(){
      scene.background = new THREE.Color(css('--ig-superficie-alt'));
      floor.material.color.set(css('--ig-contorno'));
    }
    aplicarTema();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);
    new MutationObserver(aplicarTema).observe(document.documentElement,
      {attributes:true, attributeFilter:['data-theme']});

    /* ---------- helpers ---------- */
    const W=76, D=64, PI=Math.PI;
    const meshes=[], movers=[], anchors={};
    const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c, roughness:.5, metalness:.15},o));
    const steel=()=>mat(0xc6ccd3,{metalness:.35, roughness:.3});
    const dark=()=>mat(0x23282e,{roughness:.25, metalness:.2});
    const glassy=(c,op)=>mat(c,{transparent:true, opacity:op, depthWrite:false, side:THREE.DoubleSide});
    const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
    const cyl=(r,h,s=40)=>new THREE.CylinderGeometry(r,r,h,s);
    function reg(obj, area, shell){
      obj.userData.area=area; obj.userData.shell=!!shell;
      const m=obj.material;
      m.userData.base={opacity:m.opacity, transparent:m.transparent, depthWrite:m.depthWrite, emissive:m.emissive?m.emissive.clone():null};
      meshes.push(obj); return obj;
    }
    function add(parent, geo, material, area, pos, o={}){
      const m=new THREE.Mesh(geo, material);
      if(pos) m.position.set(pos[0],pos[1],pos[2]);
      if(o.rot) m.rotation.set(o.rot[0],o.rot[1],o.rot[2]);
      parent.add(m); return reg(m, area, o.shell);
    }
    function edges(parent, geo, color, area, pos){
      const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color, transparent:true, opacity:.85}));
      l.position.set(pos[0],pos[1],pos[2]); parent.add(l); return reg(l, area);
    }
    function arrow(parent, area, color, pos, dir){ // dir: 'x-' | 'z+'
      const rot = dir==='x-' ? [0,0,PI/2] : [PI/2,0,0];
      return add(parent, new THREE.ConeGeometry(.9,2.4,16), mat(color,{emissive:color, emissiveIntensity:.35}), area, pos, {rot});
    }
    function mover(parent, ex){
      const g=new THREE.Group(); g.userData.explode=new THREE.Vector3(ex[0],ex[1],ex[2]);
      parent.add(g); movers.push(g); return g;
    }
    function anchor(area, parent, pos){
      const o=new THREE.Object3D(); o.position.set(pos[0],pos[1],pos[2]); parent.add(o);
      (anchors[area] = anchors[area]||[]).push(o); return o;
    }
    const C=k=>new THREE.Color(AREAS[k].cor).getHex();
    const root=new THREE.Group(); scene.add(root);

    /* ---------- contexto: chassis, cavidade, porta, rodapé ---------- */
    const sideL=mover(root,[-18,0,0]), sideR=mover(root,[18,0,0]), baseG=mover(root,[0,-5,0]), front=mover(root,[0,0,10]);
    add(sideL, box(1.2,89,D), steel(),'ctx',[-W/2+.6,44.5,0],{shell:true});
    add(sideR, box(1.2,89,D), steel(),'ctx',[W/2-.6,44.5,0],{shell:true});
    add(baseG, box(W-2.4,1.2,D), steel(),'ctx',[0,1.4,0],{shell:true});
    [-33,33].forEach(x=>[-28,28].forEach(z=>add(baseG, cyl(1.5,1.4,16), mat(0x2b2f33),'ctx',[x,.7,z])));
    add(front, box(W-2.4,2.6,1.2), steel(),'ctx',[0,88.4,31.4],{shell:true});
    const band=add(front, box(W-2.4,9,2.5), steel(),'ctx',[0,79.5,33.25],{shell:true});
    add(front, box(W-2.4,15,2.5), steel(),'ctx',[0,9.8,33.25],{shell:true});
    add(front, box(W-2.4,4,1.6), mat(0x2b3036),'ctx',[0,3.4,32.4]);

    const cw=60, ch=48, cd=56, cy=45, cz=2;
    add(root, box(cw+5,ch+5,cd+3), glassy(0xd8c690,.10),'ctx',[0,cy,cz-1]);
    add(root, box(cw,ch,cd), glassy(0xb9a98a,.12),'ctx',[0,cy,cz]);
    edges(root, box(cw,ch,cd), 0x9a8f7a,'ctx',[0,cy,cz]);
    function heater(y){
      const p=[];
      [-24,-12,0,12,24].forEach((x,i)=>{ const a=i%2?22:-20, b=i%2?-20:22; p.push(new THREE.Vector3(x,y,a), new THREE.Vector3(x,y,b)); });
      add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p,false,'catmullrom',.08),260,.55,8,false),
          mat(0x7a3a24,{emissive:0xc2410c, emissiveIntensity:.35, roughness:.4}),'ctx',[0,0,cz]);
    }
    heater(cy+ch/2-3); heater(cy-ch/2+2.5);

    const door=mover(root,[0,0,24]);
    add(door, box(W-2.4,54,2.6), steel(),'ctx',[0,45,33.3],{shell:true});
    add(door, box(50,30,.4), mat(0x1b222b,{roughness:.08, metalness:.25, transparent:true, opacity:.9}),'ctx',[0,46,34.8],{shell:true});
    add(door, cyl(.9,62,20), steel(),'ctx',[0,67.5,37.8],{rot:[0,0,PI/2]});
    [-28,28].forEach(x=>add(door, box(1.4,1.4,3.4), steel(),'ctx',[x,67.5,36]));

    /* ---------- Main Vent Sys ---------- */
    const vent=new THREE.Group(); root.add(vent);
    add(vent, box(W-14,3.2,cd), glassy(C('mainvent'),.2),'mainvent',[0,75.2,cz]);
    edges(vent, box(W-14,3.2,cd), C('mainvent'),'mainvent',[0,75.2,cz]);
    add(vent, cyl(2.3,44,32), mat(0x5f3dc4,{roughness:.45}),'mainvent',[0,75.2,-23],{rot:[0,0,PI/2]});
    add(vent, cyl(2.8,6,24), mat(0x343a40,{metalness:.3}),'mainvent',[25,75.2,-23],{rot:[0,0,PI/2]});
    [-12,2,16].forEach(z=>[-16,0,16].forEach(x=>arrow(vent,'mainvent',C('mainvent'),[x,75.2,z],'z+')));
    [72.6,73.4,74.2].forEach(y=>add(vent, box(W-8,.45,.8), mat(0x2b2440),'mainvent',[0,y,33.6]));
    anchor('mainvent', vent, [W/2-8,75.2,-16]);

    /* ---------- console: Oven HMI + CT Knobs ---------- */
    const conF=mover(root,[0,0,18]);
    add(conF, box(W-2.4,9,2.5), dark(),'ctx',[0,79.5,33.25],{shell:true});
    add(conF, box(16,4.4,.3), mat(0x0a1628,{emissive:0x2f8cff, emissiveIntensity:.6}),'ovenhmi',[0,79.5,34.6]);
    [-13,-10.5,10.5,13].forEach(x=>[78,81].forEach(y=>add(conF, box(1.8,1.8,.3), mat(0x9fb6d1),'ovenhmi',[x,y,34.6])));
    add(conF, box(30,6,.4), mat(0x2f9e44,{roughness:.6}),'ovenhmi',[0,79.5,30.6]);
    [-31,-24.5,24.5,31].forEach(x=>{
      add(conF, cyl(2.3,2.6,32), mat(0xd9dde2,{metalness:.45, roughness:.3}),'ctknobs',[x,79.5,35.8],{rot:[PI/2,0,0]});
      add(conF, box(.4,1.8,.2), mat(0x23282e),'ctknobs',[x,80.3,37.15]);
    });
    anchor('ovenhmi', conF, [0,84.5,35]);
    anchor('ctknobs', conF, [W/2-4,84.5,36]);

    const conB=mover(root,[0,14,-8]);
    add(conB, box(W,14,5), dark(),'ctx',[0,98,-29.5],{shell:true});
    add(conB, box(18,5,.3), mat(0x0a1628,{emissive:0x2f8cff, emissiveIntensity:.6}),'ovenhmi',[0,98.5,-26.85]);
    [-14,-11.5,11.5,14].forEach(x=>[97,100].forEach(y=>add(conB, box(1.8,1.8,.3), mat(0x9fb6d1),'ovenhmi',[x,y,-26.85])));
    add(conB, box(32,8,.4), mat(0x2f9e44,{roughness:.6}),'ovenhmi',[0,98,-30.2]);
    [-31,-24.5,24.5,31].forEach(x=>{
      add(conB, cyl(2.3,2.6,32), mat(0xd9dde2,{metalness:.45, roughness:.3}),'ctknobs',[x,98,-25.7],{rot:[PI/2,0,0]});
      add(conB, box(.4,1.8,.2), mat(0x23282e),'ctknobs',[x,98.8,-24.35]);
    });
    anchor('ovenhmi', conB, [0,106,-28]);
    anchor('ctknobs', conB, [W/2-4,106,-28]);

    /* ---------- cooktop: burner box, IPC, bobinas, vidro ---------- */
    const sBox=mover(root,[0,8,0]), sIpc=mover(root,[0,19,0]), sCoil=mover(root,[0,30,0]), sGlass=mover(root,[0,41,0]);
    const tray=()=>mat(0x9aa3ac,{metalness:.35, roughness:.4});
    add(sBox, box(W-3,.6,D-2), tray(),'ctx',[0,84.3,0]);
    [-(D/2-1.3),D/2-1.3].forEach(z=>add(sBox, box(W-3,3.4,.6), tray(),'ctx',[0,86,z]));
    [-(W/2-1.8),W/2-1.8].forEach(x=>add(sBox, box(.6,3.4,D-2), tray(),'ctx',[x,86,0]));

    // IPC Comp
    add(sIpc, box(34,.4,22), mat(0x2f9e44,{roughness:.6}),'ipccomp',[0,85.2,-2]);
    [-10,-6,-2].forEach(x=>add(sIpc, box(2.4,.9,1.8), mat(0x1f2933),'ipccomp',[x,85.85,-3]));
    [[6,4],[9,4],[12,4],[6,7]].forEach(([x,z])=>add(sIpc, cyl(1,2.2,16), mat(0x1f2933),'ipccomp',[x,86.5,z]));
    add(sIpc, new THREE.TorusGeometry(2,.8,10,24), mat(0xb87333,{metalness:.5}),'ipccomp',[-4,86.4,5],{rot:[PI/2,0,0]});
    anchor('ipccomp', sIpc, [-W/2+4,85.6,6]);

    // IPC Cooling
    add(sIpc, box(12,.8,7), mat(0x9aa3ac,{metalness:.5}),'ipccool',[-6,85.8,-8.5]);
    for(let i=0;i<7;i++) add(sIpc, box(12,2,.3), mat(0xb5bdc5,{metalness:.5}),'ipccool',[-6,87.2,-11.7+i*1.05]);
    add(sIpc, cyl(4,2.8,32), mat(0x0b7285),'ipccool',[24,86.6,-8.5]);
    add(sIpc, cyl(2.6,2.9,24), mat(0x66d9e8),'ipccool',[24,86.65,-8.5]);
    add(sIpc, box(12,2.6,7), glassy(C('ipccool'),.25),'ipccool',[14,86.6,-8.5]);
    edges(sIpc, box(12,2.6,7), C('ipccool'),'ipccool',[14,86.6,-8.5]);
    [16,10,4].forEach(x=>arrow(sIpc,'ipccool',C('ipccool'),[x,86.6,-8.5],'x-'));
    anchor('ipccool', sIpc, [W/2-6,87,-12]);

    // Coil Temps
    add(sCoil, box(W-6,.3,D-6), mat(0xe9dfc4,{roughness:.8}),'coil',[0,87.6,0]);
    const COILS=[[-18,13,9],[18,13,10],[-18,-13,8],[18,-13,9]];
    COILS.forEach(([x,z,r])=>{
      add(sCoil, cyl(r+.8,.3,48), mat(0xf4f5f6,{roughness:.7}),'coil',[x,87.9,z]);
      add(sCoil, cyl(r,.5,48), mat(0xb87333,{metalness:.55, roughness:.35}),'coil',[x,88.2,z]);
      add(sCoil, cyl(r*.28,.56,24), mat(0xf1f3f5),'coil',[x,88.24,z]);
      [.45,.65,.85].forEach(f=>add(sCoil, new THREE.TorusGeometry(r*f,.12,6,48), mat(0x7a4219),'coil',[x,88.47,z],{rot:[PI/2,0,0]}));
    });
    anchor('coil', sCoil, [-W/2+4,88.6,-D/2+6]);

    // vidro
    add(sGlass, box(W,.8,D), mat(0x0d1015,{roughness:.06, metalness:.15, transparent:true, opacity:.9}),'ctx',[0,90.6,0],{shell:true});
    COILS.forEach(([x,z,r])=>add(sGlass, new THREE.RingGeometry(r-.3,r,64), new THREE.MeshBasicMaterial({color:0x9aa4ae}),'ctx',[x,91.03,z],{rot:[-PI/2,0,0]}));

    /* ---------- Mainback ---------- */
    const mb=mover(root,[0,0,-26]);
    add(mb, box(W,89,1.2), mat(0x8a8f96,{metalness:.3, roughness:.4}),'mainback',[0,44.5,-32.6]);
    for(let i=0;i<8;i++) add(mb, box(5.5,.9,.4), mat(0x1e2227),'mainback',[-24.5+i*7,86,-33.3]);
    add(mb, box(4,60,1.6), mat(0x5c646c),'mainback',[-28,40,-34]);
    add(mb, cyl(.7,30,12), mat(0x1e2227),'mainback',[-28,8,-35]);
    add(mb, box(10,8,1),mat(0x6c737b),'mainback',[25,75,-33.7]);
    anchor('mainback', mb, [-W/2+6,70,-34]);

    /* ---------- estado -> cena ---------- */
    function visivel(o){ for(; o; o = o.parent) if(!o.visible) return false; return true; }

    function atualizar(){
      conF.visible = estado.console === 'br';
      conB.visible = estado.console === 'us';
      band.visible = estado.console === 'us';
      meshes.forEach(m => {
        const b = m.material.userData.base, area = m.userData.area;
        let op = b.opacity;
        if (estado.xray && m.userData.shell) op *= .14;
        if (estado.sel && area !== estado.sel) op *= area === 'ctx' ? .18 : .12;
        m.material.transparent = b.transparent || op < .999;
        m.material.opacity = op;
        m.material.depthWrite = op > .6 ? b.depthWrite : false;
        if (b.emissive){
          if (estado.sel === area && b.emissive.getHex() === 0)
            m.material.emissive.set(AREAS[area].cor).multiplyScalar(.3);
          else m.material.emissive.copy(b.emissive);
        }
        m.material.needsUpdate = true;
      });
    }

    /* ---------- câmera ---------- */
    let transicao = null;
    const tmp = new THREE.Vector3();
    const ancoraAtiva = k => (anchors[k] || []).find(visivel);

    function irPara(alvo, pos){
      if (reduzido){ controls.target.copy(alvo); if(pos) camera.position.copy(pos); return; }
      transicao = {t0:performance.now(), deAlvo:controls.target.clone(), paraAlvo:alvo.clone(),
                   dePos:camera.position.clone(), paraPos:pos ? pos.clone() : null};
    }
    function focar(k){
      const a = ancoraAtiva(k);
      if (!a) return;
      a.getWorldPosition(tmp);
      irPara(tmp.clone().lerp(INICIAL.alvo, .4));
    }
    function resetarVista(){ irPara(INICIAL.alvo, INICIAL.pos); }

    /* ---------- clique: atravessa o contexto e devolve a área ---------- */
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let inicioClique = null;
    const clicaveis = () => meshes.filter(m => m.isMesh && m.userData.area !== 'ctx');
    renderer.domElement.addEventListener('pointerdown', e => {
      inicioClique = {x:e.clientX, y:e.clientY};
    });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!inicioClique || Math.hypot(e.clientX - inicioClique.x, e.clientY - inicioClique.y) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const acertos = ray.intersectObjects(clicaveis(), false).filter(h => visivel(h.object));
      const alvo = acertos.find(h => h.object.material.opacity > .3) || acertos[0];
      aoSelecionar(alvo ? alvo.object.userData.area : null);
    });

    /* ---------- laço de desenho ---------- */
    function redimensionar(){
      const w = viewer.clientWidth, h = viewer.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    new ResizeObserver(redimensionar).observe(viewer); redimensionar();

    let explosao = estado.explode;
    function desenhar(agora){
      explosao += (estado.explode - explosao) * (reduzido ? 1 : .14);
      movers.forEach(g => g.position.copy(g.userData.explode).multiplyScalar(explosao));
      if (transicao){
        const t = Math.min(1, (agora - transicao.t0) / 550);
        const s = t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
        controls.target.lerpVectors(transicao.deAlvo, transicao.paraAlvo, s);
        if (transicao.paraPos) camera.position.lerpVectors(transicao.dePos, transicao.paraPos, s);
        if (t >= 1) transicao = null;
      }
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(desenhar);
    }
    requestAnimationFrame(desenhar);

    return {atualizar, focar, resetarVista};
  };
})();
