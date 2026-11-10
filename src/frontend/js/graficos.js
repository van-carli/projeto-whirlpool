// Gráficos 2D com Plotly, sempre com a paleta de tokens (nunca as cores padrão da biblioteca).
export function token(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

export function cores() {
  return {
    primaria: token('--ig-primaria'), acento: token('--ig-acento'), texto: token('--ig-texto'),
    apoio: token('--ig-texto-apoio'), contorno: token('--ig-contorno'), superficie: token('--ig-superficie'),
    seguro: token('--ig-seguro'), atencao: token('--ig-atencao'), critico: token('--ig-critico'), neutro: token('--ig-neutro'),
    campo: token('--ig-contorno-campo'), fundoSeguro: token('--ig-seguro-fundo'),
    calor: [0, 1, 2, 3, 4, 5].map(i => token(`--ig-calor-${i}`)),
    divergente: [0, 1, 2, 3, 4].map(i => token(`--ig-div-${i}`)),
    temperatura: [0, 1, 2, 3, 4].map(i => token(`--ig-temp-${i}`)),
  };
}

/** Multiplicador do tamanho do texto escolhido nas configurações (1 = padrão). */
export function escala() {
  return parseFloat(token('--ig-escala')) || 1;
}

export function layoutBase(extra = {}) {
  const c = cores();
  return {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: "'Open Sans', 'Noto Sans', sans-serif", size: 12 * escala(), color: c.texto },
    margin: { l: 56, r: 16, t: 8, b: 48 },
    separators: ',.',
    xaxis: { gridcolor: c.contorno, zerolinecolor: c.contorno, linecolor: c.contorno, tickfont: { color: c.apoio }, title: { font: { color: c.apoio } } },
    yaxis: { gridcolor: c.contorno, zerolinecolor: c.contorno, linecolor: c.contorno, tickfont: { color: c.apoio }, title: { font: { color: c.apoio } } },
    legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1.08, font: { size: 12 * escala() } },
    hoverlabel: { bgcolor: c.superficie, bordercolor: c.contorno, font: { color: c.texto, size: 12 * escala() } },
    ...extra,
  };
}

export const CONFIG = { displayModeBar: false, responsive: true, locale: 'pt-BR' };

const graficos = new WeakMap();
export function desenhar(el, data, layout, aria) {
  if (!el) return;
  if (aria) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', aria); }
  Plotly.react(el, data, layout, CONFIG);
  graficos.set(el, true);
}

export function limparGraficos(raiz) {
  raiz.querySelectorAll('.js-plotly-plot').forEach(el => { try { Plotly.purge(el); } catch (e) { /* já removido */ } });
}

/** Cinza de contexto: tudo que não é o ponto da história recua para este tom. */
export function corContexto() { return token('--ig-neutro'); }

/** Cor de destaque de uma série: só o que sustenta a conclusão recebe cor. */
export function corFoco(tipo = 'critico') {
  const c = cores();
  return { critico: c.critico, atencao: c.atencao, seguro: c.seguro, primaria: c.primaria }[tipo] ?? c.critico;
}

// cor do estado -> token
export function corEstado(estado) {
  const c = cores();
  return { seguro: c.seguro, atencao: c.atencao, critico: c.critico, monitorar: c.neutro }[estado] ?? c.neutro;
}

/**
 * Paleta categórica dos gráficos: são as mesmas sete cores das regiões térmicas,
 * na ordem canônica. Reaproveitá-las evita inventar uma paleta nova e faz os
 * filtros de daltonismo valerem aqui também — elas já são verificadas nos três.
 * Passa de sete, volta ao começo; quem identifica a barra é o rótulo do eixo.
 */
export function paletaSeries() {
  return ['coil-temps', 'ct-knobs', 'ipc-comp', 'ipc-cooling', 'main-vent-sys', 'mainback', 'oven-hmi']
    .map(n => token(`--ig-regiao-${n}`));
}
export function corSerie(i) {
  const p = paletaSeries();
  return p[((i % p.length) + p.length) % p.length];
}

/** Azul de apoio: o que está dentro do esperado, sem sumir no cinza. */
export function corNormal() { return token('--ig-acento'); }

// Escala sequencial (inferno) como colorscale do Plotly
export function escalaCalor() {
  const c = cores().calor;
  return c.map((cor, i) => [i / (c.length - 1), cor]);
}
export function escalaDivergente() {
  const c = cores().divergente;
  return c.map((cor, i) => [i / (c.length - 1), cor]);
}

/**
 * Escala azul ↔ vermelho para o Plotly, a mesma do mapa de calor do 3D.
 * Vermelho e azul continuam distinguíveis no daltonismo vermelho-verde, ao contrário
 * do par verde-vermelho. `invertida` põe o vermelho no valor baixo, para métricas em
 * que menos é pior (proporção dentro da margem, por exemplo).
 */
export function escalaTemperatura(invertida = false) {
  const c = [...cores().temperatura];
  if (invertida) c.reverse();
  return c.map((cor, i) => [i / (c.length - 1), cor]);
}

// Interpola a rampa de calor para um valor entre 0 e 1 (usado no 3D e nas legendas)
export function corCalor(t) { return interpolar(cores().calor, t); }

/** Escala divergente (verde → cinza → vermelho), usada nos gráficos de desempenho. */
export function corDivergente(t) { return interpolar(cores().divergente, t); }

/** Escala de temperatura do mapa de calor do 3D: azul intenso → vermelho intenso. */
export function corTemperatura(t) { return interpolar(cores().temperatura, t); }

function interpolar(paleta, t) {
  const c = paleta.map(hexParaRgb);
  const x = Math.max(0, Math.min(1, t)) * (c.length - 1);
  const i = Math.min(c.length - 2, Math.floor(x)), f = x - i;
  const m = c[i].map((v, k) => Math.round(v + (c[i + 1][k] - v) * f));
  return `rgb(${m.join(',')})`;
}

/** Cor de identidade de cada região térmica (tokens --ig-regiao-*). */
export function corRegiao(area) {
  return token(`--ig-regiao-${String(area).replace(/_/g, '-')}`) || token('--ig-neutro');
}

/** Rampa em CSS, para barras de escala nas legendas. */
export function rampaCss(paleta = 'temperatura') {
  const p = cores();
  const c = { calor: p.calor, divergente: p.divergente, temperatura: p.temperatura }[paleta] ?? p.temperatura;
  return `linear-gradient(90deg, ${c.join(', ')})`;
}
export function hexParaRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
