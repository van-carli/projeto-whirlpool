/* Ponto de entrada: guarda o estado e liga a cena 3D ao painel lateral. */
(function () {
  const Modelo3D = window.Modelo3D;
  const viewer = document.getElementById('viewer');

  if (!window.THREE || !THREE.OrbitControls){
    const aviso = document.createElement('div');
    aviso.className = 'err';
    aviso.textContent = 'Não foi possível carregar o three.js. Verifique a conexão e recarregue a página.';
    viewer.appendChild(aviso);
    return;
  }

  const estado = {sel:null, console:'br', xray:false, explode:.5};
  let cena, painel;

  function selecionar(area){
    estado.sel = area === estado.sel ? null : area;
    cena.atualizar();
    painel.renderizar();
    if (estado.sel) cena.focar(estado.sel);
  }

  cena = Modelo3D.criarCena(viewer, estado, selecionar);
  painel = Modelo3D.criarInterface(estado, {
    selecionar,
    explodir(valor){ estado.explode = valor; },
    definirConsole(valor){ estado.console = valor; cena.atualizar(); painel.renderizar(); },
    definirRaioX(ligado){ estado.xray = ligado; cena.atualizar(); },
    resetar(){ estado.sel = null; cena.atualizar(); painel.renderizar(); cena.resetarVista(); }
  });

  cena.atualizar();
  painel.renderizar();
})();
