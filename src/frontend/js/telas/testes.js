// Testes (Visualização · veredito): por região, o modelo é viável ou não. Tela de aceitação.
import { estado, definir, regioesAtivas, tecnico } from '../estado.js';
import { ORDEM_AREAS, ROTULO_AREA, DESCRICAO_AREA } from '../dados.js';
import { graus, numero, pct, inteiro, escapar } from '../formato.js';
import { desenhar, layoutBase, cores, corEstado, corContexto, corFoco, corRegiao, limparGraficos } from '../graficos.js';
import { kpi, tabela, rotuloEstado, vazio, notaDidatica, botao, equivalentePorArea, ativarOrdenacao, cartao, cabecalhoGrafico, legenda } from '../ui.js';
import { registrarConsulta, exportarParecer, consultas, exportarConsultas } from '../parecer.js';
import { t, avisoIdioma } from '../i18n.js';

export function montar(raiz, dados) {
  const crit = dados.metricasAreas?.criterio ?? {}, val = dados.metricasAreas?.validacao ?? {};
  const alvo = crit.alvo_dentro_10 ?? 70, margem = (crit.margem_kpi ?? .1) * 100, maxFA = crit.max_falso_aprovado_pct ?? 5;
  let aberta = null;      // área com a tabela de componentes aberta

  function render() {
    limparGraficos(raiz);
    const at = regioesAtivas(ORDEM_AREAS), tec = tecnico();
    const linha = dados.parametros?.linhas?.[estado.linha];
    if (!dados.metricasAreas) { raiz.innerHTML = cabecalho(t('testes.semMetricas'), '') + vazio(t('testes.semMetricas'), t('testes.semMetricasPasso'), 'ph-shield-check'); return; }
    if (linha && !linha.disponivel) { raiz.innerHTML = cabecalho(t('vazio.linha', { linha: linha.rotulo }), '') + vazio(t('vazio.nenhumEnsaio', { linha: linha.rotulo }), linha.motivo ?? '', 'ph-flag'); return; }
    const areas = at.map(a => dados.porArea[a]).filter(Boolean);
    const viaveis = areas.filter(a => a.viavel);
    const titulo = t(tec ? 'testes.titulo' : 'testes.tituloNT', { n: inteiro(viaveis.length), total: inteiro(areas.length) });
    const sub = tec
      ? `Uma região é aprovada quando duas condições valem ao mesmo tempo: pelo menos ${pct(alvo, 0)} das predições erram menos de ${pct(margem, 0)} da temperatura medida, e no máximo ${pct(maxFA, 0)} delas aprovam um componente que na medição atingiu o limite. Os números vêm de ${inteiro(val.ensaios_treino)} ensaios avaliados em ${inteiro(val.dobras)} rodadas, em que cada configuração de ensaio é prevista sem ter participado do treino.${dados.parametros?.modelo?.nota ? ` ${escapar(dados.parametros.modelo.nota)}` : ''}`
      : `Para cada região do fogão, a predição é confiável o bastante para dispensar a simulação na triagem, ou a região ainda precisa dela.`;
    raiz.innerHTML = cabecalho(titulo, sub) + (tec ? tecnicoHtml(areas, at) : naoTecnicoHtml(areas, at));
    if (tec) { grafico(areas); ligarTecnico(areas); } else ligarNaoTecnico();
  }

  function cabecalho(titulo, sub) {
    return `<div class="ig-cabecalho"><p class="ig-kicker">${t('testes.kicker')}</p>
      <div class="ig-cabecalho__linha"><h1 class="ig-headline">${escapar(titulo)}</h1>${estado.regioes.size ? `<span class="ig-selo"><i class="ph ph-funnel" aria-hidden="true"></i>Recorte: ${regioesAtivas(ORDEM_AREAS).map(a => ROTULO_AREA[a]).join(', ')}</span>` : ''}</div>
      <p>${sub}</p>${avisoIdioma()}</div>`;
  }

  /* ---------- modo técnico ---------- */
  function tecnicoHtml(areas, at) {
    if (!areas.length) return vazio('Nenhuma região no recorte', 'Selecione ao menos uma região no menu lateral ou na Visão Geral.');
    const melhor = [...areas].sort((a, b) => b.dentro_10 - a.dentro_10)[0], pior = [...areas].sort((a, b) => a.dentro_10 - b.dentro_10)[0];
    const duvidosas = areas.filter(a => !a.viavel);
    const kpis = `<div class="ig-kpis">
      ${kpi({ titulo: t('testes.kpiViaveis'), valor: `${inteiro(areas.filter(a => a.viavel).length)} de ${inteiro(areas.length)}`, apoio: `critério: dentro de ${pct(margem, 0)} ≥ ${pct(alvo, 0)} e falso aprovado ≤ ${pct(maxFA, 0)}`, estado: duvidosas.length ? 'atencao' : 'seguro', detalhe: duvidosas.length ? `${duvidosas.map(a => a.rotulo).join(', ')} fora` : 'todas dentro do critério' })}
      ${kpi({ titulo: `${t('testes.kpiMelhor')} · ${melhor.rotulo}`, valor: pct(melhor.dentro_10), apoio: `dentro da margem · MAE ${graus(melhor.mae, 2)}`, estado: 'seguro', detalhe: `${pct(melhor.dentro_10 - alvo, 1)} acima do alvo` })}
      ${kpi({ titulo: `${t('testes.kpiPior')} · ${pior.rotulo}`, valor: pct(pior.dentro_10), apoio: `dentro da margem · MAE ${graus(pior.mae, 2)}`, estado: pior.viavel ? 'atencao' : 'critico', detalhe: pior.viavel ? `${pct(pior.dentro_10 - alvo, 1)} acima do alvo` : `${pct(alvo - pior.dentro_10, 1)} abaixo do alvo` })}
      ${kpi({ titulo: t('testes.kpiComponentes'), valor: inteiro(areas.reduce((s, a) => s + a.componentes, 0)), apoio: `${inteiro(val.dobras)} rodadas de validação · ${inteiro(val.ensaios_treino)} ensaios` })}
    </div>`;
    const aviso = duvidosas.length ? `<div class="ig-bloco">${rotuloEstado('critico', { formato: 'faixa', texto: `Predição duvidosa em ${duvidosas.map(a => a.rotulo).join(' e ')}`, detalhe: `Abaixo do critério de viabilidade (${duvidosas.map(a => `${a.rotulo}: ${pct(a.dentro_10)} dentro da margem, ${inteiro(a.falso_aprovado)} falsos aprovados`).join('; ')}). Encaminhe as configurações desta região para a simulação completa antes de aprovar.` })}</div>` : '';
    const blocos = areas.map(a => ({
      rotulo: a.rotulo,
      resumo: `${pct(a.dentro_10)} dentro da margem · ${a.viavel ? 'viável' : 'não viável'}`,
      detalhe: detalheComponentes(a.area),
    }));
    const conclusao = duvidosas.length
      ? `${duvidosas.map(a => a.rotulo).join(' e ')} ${duvidosas.length === 1 ? 'fica' : 'ficam'} abaixo do alvo de ${pct(alvo, 0)}; as outras ${inteiro(areas.length - duvidosas.length)} regiões passam.`
      : `As ${inteiro(areas.length)} regiões do recorte atingem o alvo de ${pct(alvo, 0)} dentro da margem.`;
    const ord = [...areas].sort((a, b) => a.dentro_10 - b.dentro_10);
    const grafico = cartao(`${cabecalhoGrafico(conclusao,
      `Cada barra é a proporção de predições que erram menos de ${pct(margem, 0)} da temperatura medida. A cor identifica a região; a linha tracejada marca o alvo, e quem fica abaixo dele ganha contorno vermelho.`)}
      <div class="ig-grafico" id="tGrafico"></div>
      ${legenda([
        ...ord.map(a => ({ cor: corRegiao(a.area), rotulo: a.rotulo })),
        { cor: corFoco('critico'), forma: 'linha', rotulo: `Contorno vermelho: abaixo do alvo de ${pct(alvo, 0)}` },
        { cor: cores().texto, forma: 'tracejada', rotulo: `Alvo · ${pct(alvo, 0)} das predições dentro da margem` },
      ], { rotulo: 'Uma cor por região térmica' })}${equivalentePorArea(blocos)}`, { titulo: `Dentro da margem por região` });
    const colunas = [
      { titulo: t('col.regiao'), campo: 'rotulo', dica: 'Região térmica do fogão, como aparece no dataset.', formato: l => `<b style="white-space:nowrap">${escapar(l.rotulo)}</b>` },
      { titulo: t('col.componentes'), campo: 'componentes', num: true, dica: 'Quantos componentes da região têm predição avaliada.' },
      { titulo: 'MAE', campo: 'mae', unidade: '°C', num: true, casas: 2, dica: 'Erro absoluto médio: de quantos graus a predição erra, em média, para mais ou para menos.' },
      { titulo: t('col.vies'), campo: 'vies', unidade: '°C', num: true, casas: 2, sinal: true, dica: 'Erro médio com sinal. Positivo: a predição fica acima da medição. Negativo: fica abaixo, que é o erro perigoso.' },
      { titulo: t('col.dentroMargem'), campo: 'dentro_10', unidade: `% (alvo ${numero(alvo, 0)})`, num: true, casas: 1, dica: `Proporção de predições que erram menos de ${pct(margem, 0)} da temperatura medida.` },
      { titulo: t('col.falsoAprov'), campo: 'falso_aprovado', unidade: `n (máx. ${numero(maxFA, 0)} %)`, num: true, dica: 'Componente que na medição atingiu o limite e a predição aprovou. É o erro caro.', formato: l => `${numero(l.falso_aprovado)} <span class="ig-apoio">(${pct(l.falso_aprovado_pct)})</span>` },
      { titulo: t('col.falsoReprov'), campo: 'falso_reprovado', unidade: 'n', num: true, dica: 'Componente que passou na medição e a predição reprovou. Custa uma verificação a mais.' },
      { titulo: t('col.status'), campo: 'viavel', dica: 'Aprovada quando atinge o alvo de predições dentro da margem e não passa do teto de falsos aprovados.', formato: l => rotuloEstado(l.viavel ? 'seguro' : 'critico', { texto: l.viavel ? 'Viável' : 'Não viável', detalhe: l.viavel ? '' : 'simular' }) },
    ];
    const resumo = cartao(`${tabela({ colunas, linhas: areas, densa: true, destacar: l => !l.viavel, selecionavel: true, atributo: 'area', legenda: 'Clique numa região para ver o detalhe por componente' })}<div id="tDetalhe"></div>`, { titulo: t('testes.resumo') });
    return kpis + aviso + `<div class="ig-grade ig-grade--2" style="grid-template-columns:minmax(0,1fr)">${grafico}${resumo}</div>` + blocoParecer(at);
  }

  function grafico(areas) {
    const c = cores(), ord = [...areas].sort((a, b) => a.dentro_10 - b.dentro_10);
    // uma cor por região (a mesma do 3D e do menu); quem fica abaixo do alvo é
    // marcado por contorno, não por cor — assim a identidade da região não se perde
    const data = [{
      type: 'bar', orientation: 'h', x: ord.map(a => a.dentro_10), y: ord.map(a => a.rotulo),
      marker: { color: ord.map(a => corRegiao(a.area)),
                line: { color: ord.map(a => a.viavel ? 'rgba(0,0,0,0)' : corFoco('critico')), width: ord.map(a => a.viavel ? 0 : 3) } },
      text: ord.map(a => pct(a.dentro_10)), textposition: 'outside', textfont: { color: c.texto }, cliponaxis: false,
      hovertemplate: '%{y}: %{x:.1f} % dentro da margem<extra></extra>',
    }];
    const layout = layoutBase({ margin: { l: 110, r: 60, t: 8, b: 40 }, showlegend: false, height: Math.max(220, 40 * ord.length + 60),
      xaxis: { ...layoutBase().xaxis, range: [0, 100], title: { text: `predições dentro de ${pct(margem, 0)} (%)` }, ticksuffix: ' %', showgrid: false, zeroline: false },
      yaxis: { ...layoutBase().yaxis, automargin: true },
      shapes: [{ type: 'line', x0: alvo, x1: alvo, y0: -.5, y1: ord.length - .5, line: { color: c.texto, width: 1.5, dash: 'dot' } }],
      annotations: [{ x: alvo, y: ord.length - .5, text: `alvo ${pct(alvo, 0)}`, showarrow: false, yanchor: 'bottom', xanchor: 'left', font: { size: 11, color: c.apoio } }] });
    const el = raiz.querySelector('#tGrafico'); if (el) el.style.minHeight = `${layout.height}px`;
    desenhar(el, data, layout, `Barras por região: ${ord.filter(a => !a.viavel).map(a => a.rotulo).join(', ') || 'nenhuma região'} abaixo do alvo de ${pct(alvo, 0)}; ${ord[ord.length - 1].rotulo} é a melhor, com ${pct(ord[ord.length - 1].dentro_10)}.`);
  }

  function detalheComponentes(area) {
    const comps = (dados.metricasComponentes ?? []).filter(m => m.area === area);
    const cat = new Map((dados.catalogo ?? []).map(c => [c.componente, c]));
    if (!comps.length) return vazio('Sem métricas por componente', 'Exporte metricas_componentes.json.');
    const linhas = comps.map(m => ({ ...m, cat: cat.get(m.componente) ?? {} }));
    const colunas = [
      { titulo: t('col.componente'), campo: 'componente', dica: 'Nome do sensor como aparece no dataset.' },
      { titulo: 'MAE', campo: 'mae', unidade: '°C', num: true, casas: 2, dica: 'Erro absoluto médio do componente, em graus.' },
      { titulo: 'Dentro da margem', campo: 'dentro_10', unidade: '%', num: true, casas: 1, dica: `Proporção de predições que erram menos de ${pct(margem, 0)} da temperatura medida.`, formato: l => `${numero(l.dentro_10, 1)}${l.dentro_10 < alvo ? ` <i class="ph ph-warning" style="color:var(--ig-atencao)" aria-label="abaixo do alvo"></i>` : ''}` },
      { titulo: t('col.limite'), campo: 'limite_c', unidade: '°C', num: true, casas: 0, dica: 'Limite de segurança do componente, por norma ou especificação. Sem limite, o componente é só monitorado.', formato: l => l.limite_c == null ? '<span class="ig-apoio">monitorar</span>' : numero(l.limite_c, 0) },
      { titulo: t('col.reprovaReal'), campo: 'n_reprova_real', num: true, dica: 'Quantas vezes a temperatura medida atingiu o limite. É o total contra o qual se leem os falsos aprovados.', formato: l => l.n_reprova_real == null ? '—' : numero(l.n_reprova_real) },
      { titulo: t('col.falsoAprov'), campo: 'falso_aprovado', num: true, dica: 'Atingiu o limite na medição e a predição aprovou.', formato: l => l.falso_aprovado == null ? '—' : numero(l.falso_aprovado) },
      { titulo: t('col.falsoReprov'), campo: 'falso_reprovado', num: true, dica: 'Passou na medição e a predição reprovou.', formato: l => l.falso_reprovado == null ? '—' : numero(l.falso_reprovado) },
      { titulo: t('col.veredito'), campo: 'v', dica: 'Estado do componente segundo a folga até o limite.', formato: l => rotuloEstado(l.cat.veredito ?? 'neutro', { detalhe: l.cat.veredito === 'critico' ? 'reprovado' : l.cat.veredito === 'atencao' ? 'limítrofe' : l.cat.veredito === 'seguro' ? 'aprovado' : '' }) },
    ];
    return `<div style="margin-top:var(--ig-e2)"><div class="ig-bloco__topo"><p class="ig-rotulo">${ROTULO_AREA[area]} · por componente</p><span class="ig-nota">passe o mouse no título da coluna para ver o que ela mede</span></div>
      ${tabela({ colunas, linhas, densa: true, destacar: l => l.cat.veredito === 'critico' || (l.falso_aprovado ?? 0) > 0, ordenarPor: 'dentro_10' })}</div>`;
  }

  function ligarTecnico(areas) {
    raiz.querySelectorAll('tr[data-area]').forEach(tr => {
      const abrir = () => { aberta = aberta === tr.dataset.area ? null : tr.dataset.area; const d = raiz.querySelector('#tDetalhe'); d.innerHTML = aberta ? detalheComponentes(aberta) : ''; ativarOrdenacao(d); raiz.querySelectorAll('tr[data-area]').forEach(t => t.classList.toggle('sob', t.dataset.area === aberta)); };
      tr.addEventListener('click', abrir);
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    });
    if (aberta && areas.some(a => a.area === aberta)) { const d = raiz.querySelector('#tDetalhe'); d.innerHTML = detalheComponentes(aberta); ativarOrdenacao(d); }
    ativarOrdenacao(raiz.querySelector('.ig-grade'));
    ligarParecer();
  }

  /* ---------- RF-T08 / RF-T09 ---------- */
  function blocoParecer(at) {
    const lista = consultas().slice(0, 5);
    return cartao(`
      <div class="ig-campo"><label for="pNota">Observação (opcional)</label><input type="text" id="pNota" placeholder="contexto da consulta, sem dados pessoais"></div>
      <div class="ig-linha-botoes" style="margin-top:var(--ig-e2)">
        ${botao('Registrar consulta', { icone: 'ph-notebook', id: 'pRegistrar' })}
        ${botao('Exportar parecer', { variante: 'secundario', icone: 'ph-export', id: 'pExportar' })}
        ${botao('Exportar histórico', { variante: 'secundario', icone: 'ph-download-simple', id: 'pHistorico' })}
        <span class="ig-nota" id="pAviso" aria-live="polite"></span>
      </div>
      <p class="ig-nota" style="margin-top:var(--ig-e1)">O parecer sai em JSON e Markdown com data, teste consultado, casos-suporte e limites do recorte (${at.map(a => ROTULO_AREA[a]).join(', ')}). As consultas ficam gravadas neste navegador e podem ser exportadas para realimentar a base.</p>
      ${lista.length ? `<div style="margin-top:var(--ig-e2)">${tabela({ colunas: [{ titulo: 'Quando', campo: 'quando', formato: l => new Date(l.quando).toLocaleString('pt-BR') }, { titulo: 'Recorte', campo: 'regioes', formato: l => l.regioes.map(r => `${r.rotulo ?? r.area}${r.viavel === false ? ' ✕' : ''}`).join(', ') }, { titulo: 'Observação', campo: 'nota' }], linhas: lista, densa: true, legenda: 'Últimas consultas registradas' })}</div>` : ''}
    `, { titulo: 'Registro de consulta e parecer' });
  }
  function ligarParecer() {
    const at = regioesAtivas(ORDEM_AREAS), nota = () => raiz.querySelector('#pNota')?.value.trim() ?? '';
    raiz.querySelector('#pRegistrar')?.addEventListener('click', () => { registrarConsulta({ dados, regioes: at, estado, nota: nota() }); render(); raiz.querySelector('#pAviso').textContent = 'Consulta registrada.'; });
    raiz.querySelector('#pExportar')?.addEventListener('click', () => { exportarParecer({ dados, regioes: at, estado, nota: nota() }); raiz.querySelector('#pAviso').textContent = 'Parecer exportado (JSON e Markdown).'; });
    raiz.querySelector('#pHistorico')?.addEventListener('click', exportarConsultas);
  }

  /* ---------- modo não-técnico ---------- */
  function naoTecnicoHtml(areas, at) {
    if (!areas.length) return vazio('Nenhuma região escolhida', 'Marque ao menos uma região no menu lateral.');
    const linhas = dados.parametros?.linhas ?? {};
    const faixaLinhas = `<div class="ig-grade ig-grade--2">${Object.entries(linhas).map(([k, l]) => `<div class="ig-cartao"><p class="ig-cartao__titulo">${escapar(l.rotulo)}</p>${l.disponivel ? `<div class="ig-metrica">${inteiro(areas.filter(a => a.viavel).length)} de ${inteiro(areas.length)}</div><div class="ig-cartao__apoio">regiões confiáveis para triagem</div>` : `<div class="ig-metrica" aria-label="sem dados">—</div><div class="ig-cartao__apoio">${escapar(l.motivo ?? 'sem dados')}</div>`}</div>`).join('')}</div>`;
    const cards = areas.map(a => {
      const dez = Math.round(a.dentro_10 / 10);
      const risco = a.viavel ? (a.dentro_10 - alvo < 5 ? 'atencao' : 'seguro') : 'critico';
      return `<section class="ig-cartao ig-veredito${a.viavel ? '' : ' ig-cartao--critico'}">
        <h3>${escapar(a.rotulo)}</h3><p class="ig-nota">${DESCRICAO_AREA[a.area]}</p>
        ${rotuloEstado(a.viavel ? 'seguro' : 'critico', { texto: a.viavel ? 'Esta região é confiável' : 'Precisa de simulação', modo: 'naotecnico' })}
        <p>O modelo acerta <b>${inteiro(dez)} de cada 10</b> pontos dentro da margem combinada${a.viavel ? '.' : ', abaixo do combinado.'}</p>
        <div class="ig-risco">${rotuloEstado(risco, { modo: 'naotecnico', detalhe: risco === 'critico' ? 'não decida só pelo modelo' : risco === 'atencao' ? 'confiável, com pouca margem' : 'pode seguir pela triagem' })}</div>
      </section>`;
    }).join('');
    return `${notaDidatica('<b>Como leio isto?</b> Cada cartão diz se o modelo já é confiável para triar aquela região do fogão. “Confiável” significa que a predição substitui a simulação na primeira triagem; “precisa de simulação” significa que a região ainda exige a simulação completa antes de decidir.')}
      <div class="ig-bloco" style="margin-top:var(--ig-e3)"><div class="ig-bloco__topo"><p class="ig-subhead">Brasil × México</p></div>${faixaLinhas}</div>
      <div class="ig-bloco"><div class="ig-bloco__topo"><p class="ig-subhead">Veredito por região</p>${botao('Ver no modo técnico', { variante: 'terciario', icone: 'ph-magnifying-glass', id: 'nVerTecnico', pequeno: true })}</div><div class="ig-grade ig-grade--3">${cards}</div></div>`;
  }
  function ligarNaoTecnico() { raiz.querySelector('#nVerTecnico')?.addEventListener('click', () => definir({ modo: 'tecnico' })); }

  render();
  return { atualizar(m) { if ('regioes' in m || 'modo' in m || 'linha' in m || 'tema' in m) render(); }, desmontar() { limparGraficos(raiz); } };
}
