// RF-T08 (registrar cada consulta de forma recuperável) e RF-T09 (exportar parecer com metadados).
// Nenhum dado pessoal é pedido nem gravado (Seção 4.1.8 da documentação): a consulta e o
// parecer registram data, recorte, versão do modelo e a observação opcional, sem autor.
import { dataHora, numero, graus, pct } from './formato.js';
import { ROTULO_AREA } from './dados.js';
import { baixarArquivo } from './ui.js';

const CHAVE = 'ignis.consultas';

// Versões anteriores gravavam o nome de quem consultava: o nome salvo é apagado e os
// registros antigos perdem o campo autor na primeira leitura.
try { localStorage.removeItem('ignis.autor'); } catch (e) { /* sem armazenamento */ }

export function consultas() {
  let lista;
  try { lista = JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch (e) { return []; }
  if (lista.some(i => 'autor' in i)) {
    lista.forEach(i => { delete i.autor; });
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { /* sem armazenamento */ }
  }
  return lista;
}

function resumo(dados, regioes, estado) {
  return regioes.map(a => {
    const m = dados.porArea[a];
    return m ? { area: a, rotulo: ROTULO_AREA[a], viavel: m.viavel, dentro_10: m.dentro_10, mae: m.mae, n: m.n, falso_aprovado: m.falso_aprovado } : { area: a };
  });
}

export function registrarConsulta({ dados, regioes, estado, nota }) {
  const lista = consultas();
  const item = {
    id: Date.now(), quando: new Date().toISOString(), nota: nota || '',
    modo: estado.modo, linha: estado.linha, tela: estado.tela, versao_modelo: dados.parametros?.versao_modelo ?? '—',
    regioes: resumo(dados, regioes, estado),
  };
  lista.unshift(item);
  try { localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, 200))); } catch (e) { /* sem armazenamento */ }
  return item;
}

export function exportarConsultas() {
  baixarArquivo(`ignis-consultas-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(consultas(), null, 1));
}

/** Metadados, veredito por região e limites por componente do recorte: a base das exportações. */
function montarParecer({ dados, regioes, estado, nota }) {
  const p = dados.parametros ?? {}, v = dados.metricasAreas?.validacao ?? {};
  const cat = (dados.catalogo ?? []).filter(c => regioes.includes(c.area));
  const ensaios = (dados.ensaios ?? []).filter(e => regioes.includes(e.area));
  const meta = {
    data: new Date().toISOString(), ferramenta: 'Ignis',
    versao_modelo: p.versao_modelo ?? '—', dados: p.dados ?? '—', linha: estado.linha,
    validacao: v, criterio: dados.metricasAreas?.criterio ?? {},
    casos_suporte: { ensaios_validacao: [...new Set(ensaios.map(e => e.id_ensaio))].length, predicoes: regioes.reduce((s, a) => s + (dados.porArea[a]?.n ?? 0), 0), runs: [...new Set(ensaios.map(e => e.run_origem))] },
  };
  const parecer = {
    metadados: meta, nota: nota || '',
    regioes: resumo(dados, regioes, estado),
    limites: cat.map(c => ({ area: c.area, componente: c.componente, limite_c: c.limite_c, monitorado: c.monitorado, t_max_prevista: c.t_max_prevista, incerteza_mae: c.incerteza, folga_min: c.folga_min, veredito: c.veredito })),
  };
  return { meta, parecer, v };
}

export function exportarParecer({ dados, regioes, estado, nota }) {
  const { meta, parecer, v } = montarParecer({ dados, regioes, estado, nota });
  const md = [
    `# Parecer Ignis · ${dataHora()}`, '',
    `- Versão do modelo: ${meta.versao_modelo}`, `- Dados: ${meta.dados} · linha ${estado.linha.toUpperCase()}`,
    `- Validação: ${v.esquema ?? '—'}, ${v.dobras ?? '—'} dobras, ${v.ensaios_treino ?? '—'} ensaios`,
    `- Casos-suporte: ${meta.casos_suporte.ensaios_validacao} ensaios de validação, ${numero(meta.casos_suporte.predicoes)} predições`,
    `- Critério: dentro de ${pct((meta.criterio.margem_kpi ?? .1) * 100, 0)} em pelo menos ${pct(meta.criterio.alvo_dentro_10 ?? 0, 0)} das predições, falso aprovado até ${pct(meta.criterio.max_falso_aprovado_pct ?? 0, 0)}`,
    '', nota ? `> ${nota}\n` : '', '## Veredito por região', '', '| Região | Viável | Dentro de 10 % | MAE | Predições | Falso aprovado |', '|---|---|---|---|---|---|',
    ...parecer.regioes.map(r => `| ${r.rotulo ?? r.area} | ${r.viavel ? 'sim' : 'não'} | ${pct(r.dentro_10)} | ${graus(r.mae, 2)} | ${numero(r.n)} | ${numero(r.falso_aprovado)} |`),
    '', '## Limites e leituras por componente', '', '| Região | Componente | Limite | Máx. prevista | Incerteza (MAE) | Folga | Veredito |', '|---|---|---|---|---|---|---|',
    ...parecer.limites.map(l => `| ${ROTULO_AREA[l.area]} | ${l.componente} | ${l.limite_c == null ? 'monitorar' : graus(l.limite_c, 0)} | ${graus(l.t_max_prevista)} | ${graus(l.incerteza_mae)} | ${l.folga_min == null ? '—' : graus(l.folga_min)} | ${l.veredito} |`),
    '', `Runs de origem: ${meta.casos_suporte.runs.join(', ')}`,
  ].join('\n');
  const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  baixarArquivo(`ignis-parecer-${carimbo}.json`, JSON.stringify(parecer, null, 1));
  baixarArquivo(`ignis-parecer-${carimbo}.md`, md, 'text/markdown');
  return parecer;
}
