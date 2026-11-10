/* Painel lateral e barra de ferramentas.

   criarInterface(estado, acoes) -> {renderizar}
   acoes: {selecionar, explodir, definirConsole, definirRaioX, resetar} */
(function () {
  const Modelo3D = window.Modelo3D = window.Modelo3D || {};

  const escapar = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  Modelo3D.criarInterface = function (estado, acoes) {
    const {ORDER, AREAS} = Modelo3D;
    const lista = document.getElementById('list');
    const detalhe = document.getElementById('detail');
    const itens = {};

    ORDER.forEach(k => {
      const b = document.createElement('button');
      b.className = 'item'; b.type = 'button';
      b.style.setProperty('--c', AREAS[k].cor);
      b.addEventListener('click', () => acoes.selecionar(k));
      lista.appendChild(b); itens[k] = b;
    });

    function renderizar(){
      ORDER.forEach(k => {
        itens[k].innerHTML = `<i></i><b>${AREAS[k].nome}</b><small>${AREAS[k].onde(estado)}</small>`;
        itens[k].setAttribute('aria-pressed', String(estado.sel === k));
      });
      const k = estado.sel;
      if (!k){
        detalhe.style.removeProperty('--c');
        detalhe.innerHTML = `<h2>Escolha uma área</h2>
          <p>Clique numa área no modelo ou na lista acima para destacá-la e ver o que ela abrange.</p>
          <div><h3>Dica</h3><p>Use <b>Explodir</b> para separar as camadas do cooktop
            (vidro, Coil Temps, IPC, burner box) e <b>Raio-X</b> para ver dentro da estrutura.
            Chassis, porta e cavidade aparecem em cinza só como referência.</p></div>
          <div><h3>Run cases (glossário)</h3><p>Pyro, Broil C1, Broil C2 e Broil qualitativo:
            as condições de teste em que as temperaturas das áreas são avaliadas.</p></div>`;
        return;
      }
      const a = AREAS[k];
      detalhe.style.setProperty('--c', a.cor);
      detalhe.innerHTML = `<h2><i></i>${a.titulo}</h2>
        <div><h3>Onde fica</h3><p>${a.local(estado)}</p></div>
        <div><h3>O que abrange</h3><ul>${a.tem.map(t => `<li>${t}</li>`).join('')}</ul></div>
        <div><h3>Componentes <span class="count">(${a.comp.length})</span></h3>
          <ul class="comps">${a.comp.map(t => `<li>${escapar(t)}</li>`).join('')}</ul></div>
        <p class="src">Base: ${a.fonte}</p>`;
    }

    /* barra de ferramentas */
    document.getElementById('explode')
      .addEventListener('input', e => acoes.explodir(e.target.value / 100));

    const seg = document.getElementById('segConsole');
    seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      acoes.definirConsole(b.dataset.v);
    }));

    document.getElementById('xray')
      .addEventListener('change', e => acoes.definirRaioX(e.target.checked));
    document.getElementById('reset')
      .addEventListener('click', () => acoes.resetar());

    return {renderizar};
  };
})();
