// Coordenadas paralelas (SVG, sem biblioteca): brush por eixo, reordenar arrastando o título,
// inverter no clique do título, hover, clique, teclado nos eixos. Cor pelo estado do ensaio.
import { numero, escapar } from './formato.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, pai = null) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (pai) pai.appendChild(e);
  return e;
};

/**
 * eixos: [{chave, titulo, tipo: 'cat'|'num', categorias?: [], unidade?, marca?: número (linha de referência), formato?}]
 * linhas: objetos com as chaves dos eixos e `estado` (seguro|atencao|critico|monitorar) e `id`
 * eventos: aoFiltrar(idsVisiveis), aoPassar(linha|null), aoClicar(linha)
 */
export function coordenadasParalelas(container, { eixos, linhas, aoFiltrar = () => {}, aoPassar = () => {}, aoClicar = () => {}, amostraMax = 300 }) {
  container.classList.add('ig-pc');
  container.innerHTML = '';
  const svg = el('svg', { viewBox: '0 0 1000 440', preserveAspectRatio: 'none', role: 'img' }, container);
  const largura = 1000, altura = 440, topo = 56, base = 400, margem = 60;

  // amostragem declarada acima do máximo (determinística: passo constante)
  let amostradas = linhas;
  if (linhas.length > amostraMax) {
    const passo = linhas.length / amostraMax;
    amostradas = Array.from({ length: amostraMax }, (_, i) => linhas[Math.floor(i * passo)]);
  }

  let ordem = eixos.map(e => e.chave);
  const invertido = {};
  const brushes = {};     // chave -> [y0, y1] em pixels
  const gLinhas = el('g', { class: 'linhas' }, svg);
  const gEixos = el('g', { class: 'eixos' }, svg);
  const escalas = {};

  function xDe(i) { return margem + (i * (largura - 2 * margem)) / Math.max(1, ordem.length - 1); }

  function construirEscalas() {
    eixos.forEach(e => {
      if (e.tipo === 'cat') {
        const cats = e.categorias ?? [...new Set(amostradas.map(l => l[e.chave]))];
        escalas[e.chave] = { cats, y: v => { const i = cats.indexOf(v); const n = cats.length; const t = n === 1 ? .5 : i / (n - 1); return posY(t, e.chave); } };
      } else {
        let vals = amostradas.map(l => Number(l[e.chave])).filter(Number.isFinite);
        if (e.marca !== undefined) vals.push(e.marca);
        if (e.incluirZero) vals.push(0);
        let min = Math.min(...vals), max = Math.max(...vals);
        if (min === max) { min -= 1; max += 1; }
        const folga = (max - min) * .05; min -= folga; max += folga;
        escalas[e.chave] = { min, max, y: v => posY((Number(v) - min) / (max - min), e.chave), inv: p => min + p * (max - min) };
      }
    });
  }
  function posY(t, chave) { const tt = invertido[chave] ? 1 - t : t; return base - tt * (base - topo); }

  // dispersão horizontal leve nos eixos categóricos (determinística pelo id)
  function jitter(l, i) { const h = String(l.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0); return ((h * 7919 + i * 31) % 17 - 8) * .8; }

  function caminho(l) {
    return ordem.map((chave, i) => {
      const e = eixos.find(x => x.chave === chave);
      const x = xDe(i) + (e.tipo === 'cat' ? jitter(l, i) : 0);
      const y = escalas[chave].y(l[chave]);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${(Number.isFinite(y) ? y : base).toFixed(1)}`;
    }).join(' ');
  }

  function passaFiltro(l) {
    return ordem.every(chave => {
      const b = brushes[chave]; if (!b) return true;
      const y = escalas[chave].y(l[chave]);
      return y >= Math.min(...b) && y <= Math.max(...b);
    });
  }

  const paths = new Map();
  function desenharLinhas() {
    gLinhas.innerHTML = ''; paths.clear();
    // primeiro as fora do filtro (cinza), depois as visíveis, por cima
    const ordenadas = [...amostradas].sort((a, b) => Number(passaFiltro(a)) - Number(passaFiltro(b)));
    ordenadas.forEach(l => {
      const p = el('path', { d: caminho(l), class: `linha ${l.estado}${passaFiltro(l) ? '' : ' fora'}`, 'data-id': l.id }, gLinhas);
      p.addEventListener('pointerenter', () => { p.classList.add('sob'); gLinhas.appendChild(p); aoPassar(l); });
      p.addEventListener('pointerleave', () => { p.classList.remove('sob'); aoPassar(null); });
      p.addEventListener('click', () => aoClicar(l));
      paths.set(l.id, p);
    });
  }

  function desenharEixos() {
    gEixos.innerHTML = '';
    ordem.forEach((chave, i) => {
      const e = eixos.find(x => x.chave === chave);
      const x = xDe(i);
      const g = el('g', { class: 'eixo', transform: `translate(${x},0)`, tabindex: '0', role: 'group', 'aria-label': `Eixo ${e.titulo}. Setas ajustam o filtro, I inverte, Esc limpa.` }, gEixos);
      el('line', { class: 'tronco', y1: topo, y2: base }, g);
      // títulos alternam de altura: com muitos eixos, dois nomes longos deixam de colidir
      const alto = i % 2 === 1;
      const titulo = el('text', { class: 'titulo', y: topo - (alto ? 44 : 30), 'text-anchor': 'middle' }, g);
      titulo.textContent = e.titulo + (invertido[chave] ? ' ↓' : '');
      const sub = el('text', { y: topo - (alto ? 32 : 18), 'text-anchor': 'middle', fill: 'currentColor' }, g);
      sub.textContent = e.unidade ?? '';
      sub.setAttribute('font-size', '10');
      // marcações
      if (e.tipo === 'cat') {
        escalas[chave].cats.forEach(c => {
          const y = escalas[chave].y(c);
          el('line', { class: 'marca', x1: -4, x2: 4, y1: y, y2: y }, g);
          const t = el('text', { x: i === ordem.length - 1 ? -8 : 8, y: y + 4, 'text-anchor': i === ordem.length - 1 ? 'end' : 'start' }, g);
          t.textContent = e.formato ? e.formato(c) : c;
        });
      } else {
        const { min, max } = escalas[chave];
        for (let k = 0; k <= 4; k++) {
          const v = min + (k / 4) * (max - min), y = escalas[chave].y(v);
          el('line', { class: 'marca', x1: -4, x2: 4, y1: y, y2: y }, g);
          const t = el('text', { x: i === ordem.length - 1 ? -8 : 8, y: y + 4, 'text-anchor': i === ordem.length - 1 ? 'end' : 'start' }, g);
          t.textContent = numero(v, e.casas ?? 0);
        }
        if (e.marca !== undefined) {
          const y = escalas[chave].y(e.marca);
          el('line', { class: 'margem', x1: -14, x2: 14, y1: y, y2: y }, g);
          const ultimo = i === ordem.length - 1;
          const t = el('text', { x: ultimo ? -16 : 16, y: y - 3, 'font-size': '10', 'text-anchor': ultimo ? 'end' : 'start' }, g);
          t.textContent = e.marcaRotulo ?? '';
        }
      }
      // brush: o retângulo é atualizado no arrasto sem reconstruir o eixo (senão o pointer capture se perde)
      const b = brushes[chave];
      const rect = el('rect', { class: 'brush', x: -8, width: 16, y: b ? Math.min(...b) : topo, height: b ? Math.abs(b[1] - b[0]) : 0 }, g);
      const alvo = el('rect', { class: 'alvo', x: -12, width: 24, y: topo, height: base - topo }, g);
      let inicio = null;
      const pintarBrush = () => { const v = brushes[chave]; rect.setAttribute('y', v ? Math.min(...v) : topo); rect.setAttribute('height', v ? Math.abs(v[1] - v[0]) : 0); };
      alvo.addEventListener('pointerdown', ev => { inicio = yDoEvento(ev); brushes[chave] = [inicio, inicio]; alvo.setPointerCapture(ev.pointerId); ev.preventDefault(); });
      alvo.addEventListener('pointermove', ev => { if (inicio === null) return; brushes[chave] = [inicio, Math.max(topo, Math.min(base, yDoEvento(ev)))]; pintarBrush(); desenharLinhas(); });
      alvo.addEventListener('pointerup', ev => { if (inicio === null) return; const fim = yDoEvento(ev); if (Math.abs(fim - inicio) < 3) delete brushes[chave]; inicio = null; atualizar(true); });
      alvo.addEventListener('pointercancel', () => { inicio = null; atualizar(true); });
      // título: clique inverte, arrastar reordena
      let arrastando = null;
      titulo.addEventListener('pointerdown', ev => { arrastando = { x0: ev.clientX, moveu: false }; titulo.setPointerCapture(ev.pointerId); });
      titulo.addEventListener('pointermove', ev => {
        if (!arrastando) return;
        const dx = ev.clientX - arrastando.x0;
        if (Math.abs(dx) > 30) {
          arrastando.moveu = true;
          const de = ordem.indexOf(chave), para = Math.max(0, Math.min(ordem.length - 1, de + Math.sign(dx)));
          if (para !== de) { ordem.splice(de, 1); ordem.splice(para, 0, chave); arrastando.x0 = ev.clientX; atualizar(true); }
        }
      });
      titulo.addEventListener('pointerup', () => { if (arrastando && !arrastando.moveu) { invertido[chave] = !invertido[chave]; atualizar(true); } arrastando = null; });
      // teclado: setas movem o brush (passo de 5% do eixo), I inverte, Esc limpa
      g.addEventListener('focus', () => g.classList.add('foco'));
      g.addEventListener('blur', () => g.classList.remove('foco'));
      g.addEventListener('keydown', ev => {
        const passo = (base - topo) * .05;
        if (ev.key === 'Escape') { delete brushes[chave]; atualizar(true); }
        else if (ev.key.toLowerCase() === 'i') { invertido[chave] = !invertido[chave]; atualizar(true); }
        else if (['ArrowUp', 'ArrowDown'].includes(ev.key)) {
          ev.preventDefault();
          const cur = brushes[chave] ?? [base - passo * 4, base];
          const d = ev.key === 'ArrowUp' ? -passo : passo;
          brushes[chave] = ev.shiftKey ? [cur[0], Math.max(topo, Math.min(base, cur[1] + d))] : [Math.max(topo, Math.min(base, cur[0] + d)), Math.max(topo, Math.min(base, cur[1] + d))];
          atualizar(true);
        } else if (['ArrowLeft', 'ArrowRight'].includes(ev.key)) {
          ev.preventDefault();
          const de = ordem.indexOf(chave), para = Math.max(0, Math.min(ordem.length - 1, de + (ev.key === 'ArrowRight' ? 1 : -1)));
          if (para !== de) { ordem.splice(de, 1); ordem.splice(para, 0, chave); atualizar(true); gEixos.children[para]?.focus(); }
        }
      });
    });
  }

  function yDoEvento(ev) {
    const r = svg.getBoundingClientRect();
    return ((ev.clientY - r.top) / r.height) * altura;
  }

  function atualizar(notificar) {
    desenharEixos(); desenharLinhas();
    if (notificar) aoFiltrar(linhas.filter(passaFiltro).map(l => l.id));
  }

  construirEscalas(); atualizar(true);

  return {
    limpar() { Object.keys(brushes).forEach(k => delete brushes[k]); atualizar(true); },
    destacar(id) { paths.forEach((p, k) => p.classList.toggle('sob', k === id)); },
    filtrados() { return linhas.filter(passaFiltro); },
    amostradas: amostradas.length, total: linhas.length,
    temFiltro() { return Object.keys(brushes).length > 0; },
    definirAria(t) { svg.setAttribute('aria-label', t); },
  };
}
