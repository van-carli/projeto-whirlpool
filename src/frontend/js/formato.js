// Números no padrão brasileiro: vírgula decimal, ponto de milhar, sinal de menos tipográfico.
const MENOS = '−';

export function numero(v, casas = 0, unidade = '', sinal = false) {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  let t = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  if (n < 0 && t !== (0).toFixed(casas).replace('.', ',')) t = MENOS + t;
  else if (sinal && n > 0) t = '+' + t;
  return unidade ? `${t} ${unidade}` : t;
}

export const graus = (v, casas = 1) => numero(v, casas, '°C');
export const pct = (v, casas = 1) => numero(v, casas, '%');
export const inteiro = (v) => numero(v, 0);

export function horas(h) {
  if (h === null || h === undefined) return '—';
  if (h < 1) return numero(h * 60, 0, 'min');
  return numero(h, h < 10 ? 1 : 0, 'h');
}

export function segundos(s) {
  if (s < 1) return numero(s * 1000, s * 1000 < 10 ? 2 : 0, 'ms');
  if (s < 60) return numero(s, 1, 's');
  return numero(s / 60, 1, 'min');
}

export function dataHora(d = new Date()) {
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function escapar(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Os valores das variáveis aparecem como no dataset, sem tradução: o significado de
// cada um está no Glossário. Os mapas abaixo só acertam a caixa alta dos rótulos.
export const ROTULO_RUN_CASE = { pyro: 'Pyro', 'broil c1': 'Broil C1', 'broil c2': 'Broil C2', 'broil qualitative': 'Broil Qualitative' };
export const ROTULO_MATERIAL = { aluminium: 'Aluminium', plastic: 'Plastic' };
export const ROTULO_HOUSING = { open: 'Open', closed: 'Closed' };
export const ROTULO_BLOWER = { 'to front': 'To Front', 'to back': 'To Back' };
export const ROTULO_BOARD = { center: 'Center', right: 'Right' };
export const ROTULO_REASON = { plate: 'Plate', air_path: 'Air Path', heatsink_cover: 'Heatsink Cover', position_study: 'Position Study', other: 'Other', not_declared: 'Not Declared' };
export const ROTULO_PERDAS = { miro: 'Miro', none: 'None', simone: 'Simone', not_declared: 'Not Declared' };
export const rotulo = (mapa, v) => mapa[v] ?? v;

// nome legível de uma variável one-hot do modelo ("run_case_broil c2" -> "Modo de operação: Broil C2")
export function variavelLegivel(v) {
  const grupos = [
    ['run_case_', 'Run Case', ROTULO_RUN_CASE], ['losses_', 'Losses', {}],
    ['material_coil_support_', 'Material Coil Support', ROTULO_MATERIAL], ['housing_', 'Housing', ROTULO_HOUSING],
    ['blower_direction_', 'Blower Direction', ROTULO_BLOWER], ['board_position_', 'Board Position', ROTULO_BOARD],
    ['deflector_hole_', 'Deflector Hole', ROTULO_HOUSING], ['cfg_', 'Reason', {}],
    ['reason_', 'Reason', ROTULO_REASON], ['perdas_', 'Losses', ROTULO_PERDAS],
  ];
  for (const [p, nome, mapa] of grupos) if (v.startsWith(p)) return `${nome}: ${rotulo(mapa, v.slice(p.length))}`;
  if (v === 'patamar do componente') return 'Patamar histórico do componente';
  if (v === 'escala do componente') return 'Escala histórica do componente';
  return v;
}
