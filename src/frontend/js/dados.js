// Carrega os arquivos de src/frontend/dados/. Ausência de arquivo vira `null` (estado vazio na tela).
// Cada teste tem a sua pasta: o teste 1 fica na raiz dos dados e os demais em testes/<id>/.
const BASE = 'dados/';
const caminho = (pasta, nome) => `${BASE}${pasta && pasta !== '.' ? `${pasta}/` : ''}${nome}`;

async function json(nome, pasta = '.') {
  try {
    const r = await fetch(caminho(pasta, nome), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

function csv(texto) {
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...corpo] = linhas.filter(l => l.length > 1 || l[0] !== '');
  return corpo.map(l => Object.fromEntries(cab.map((k, i) => [k, l[i] ?? ''])));
}

async function componentes(pasta = '.') {
  try {
    const r = await fetch(caminho(pasta, 'componentes.csv'), { cache: 'no-store' });
    if (!r.ok) return null;
    const num = v => (v === '' || v === undefined ? null : Number(v));
    return csv(await r.text()).map(l => ({
      area: l.area, componente: l.componente, limite_ativo: l.limite_ativo, limite_c: num(l.limite_c),
      monitorado: l.monitorado === 'True', no: l.no, ultima_leitura: num(l.ultima_leitura), folga: num(l.folga),
      veredito: l.veredito, t_max_prevista: num(l.t_max_prevista), folga_min: num(l.folga_min),
      ensaio_ultimo: num(l.ensaio_ultimo), ensaio_max: num(l.ensaio_max), incerteza: num(l.incerteza),
      n_predicoes: num(l.n_predicoes) ?? 0,
      codigo: l.codigo || null,   // código mascarado usado pelo histórico (mascara.py)
    }));
  } catch (e) { return null; }
}

export const ORDEM_AREAS = ['coil_temps', 'ct_knobs', 'ipc_comp', 'ipc_cooling', 'main_vent_sys', 'mainback', 'oven_hmi'];
export const ROTULO_AREA = {
  coil_temps: 'Coil Temps', ct_knobs: 'CT Knobs', ipc_comp: 'IPC Comp', ipc_cooling: 'IPC Cooling',
  main_vent_sys: 'Main Vent Sys', mainback: 'Mainback', oven_hmi: 'Oven HMI',
};
export const DESCRICAO_AREA = {
  coil_temps: 'bobinas e placas do cooktop', ct_knobs: 'knobs do cooktop', ipc_comp: 'placa de potência',
  ipc_cooling: 'refrigeração da placa', main_vent_sys: 'ventilação principal', mainback: 'traseira e periferia elétrica',
  oven_hmi: 'interface do forno',
};

/** Registro de testes: quais existem e qual está ativo. Sem o arquivo, assume o teste 1. */
export async function carregarRegistro() {
  const r = await json('testes.json');
  if (r?.testes?.length) return r;
  return { ativo: 'teste-1', testes: [{ id: 'teste-1', nome: 'Teste 1', descricao: 'Dataset original da parceria.', pasta: '.' }] };
}

export async function carregarTudo(pasta = '.') {
  const [parametros, metricasAreas, metricasComponentes, predicoes, importancias, ensaios, geometria, catalogo] =
    await Promise.all([json('parametros.json', pasta), json('metricas_areas.json', pasta), json('metricas_componentes.json', pasta),
      json('predicoes.json', pasta), json('importancias.json', pasta), json('ensaios.json', pasta),
      json('geometria_3d.json', pasta), componentes(pasta)]);
  const porArea = {};
  (metricasAreas?.areas ?? []).forEach(a => { porArea[a.area] = a; });
  return { parametros, metricasAreas, porArea, metricasComponentes, predicoes, importancias, ensaios, geometria, catalogo };
}
