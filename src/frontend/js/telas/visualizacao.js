// Visualização (aprofundada): diagnóstico, sensibilidade e exploração de configurações.
import { estado, definir, regioesAtivas, tecnico } from '../estado.js';
import { ORDEM_AREAS, ROTULO_AREA, DESCRICAO_AREA } from '../dados.js';
import { graus, numero, pct, inteiro, escapar, horas, segundos, variavelLegivel, ROTULO_RUN_CASE, ROTULO_MATERIAL, ROTULO_HOUSING, ROTULO_BLOWER, ROTULO_BOARD, rotulo } from '../formato.js';
import { desenhar, layoutBase, cores, corEstado, corContexto, corFoco, corRegiao, corSerie, corNormal, limparGraficos, escalaTemperatura } from '../graficos.js';
import { kpi, tabela, rotuloEstado, vazio, notaDidatica, botao, equivalente, ativarOrdenacao, cartao, ficha, espec, cabecalhoGrafico, legenda } from '../ui.js';
import { coordenadasParalelas } from '../parcoords.js';
import { t, avisoIdioma } from '../i18n.js';

const ABAS_TEC = () => [['diagnostico', t('vis.abaDiagnostico')], ['sensibilidade', t('vis.abaSensibilidade')], ['configuracoes', t('vis.abaConfiguracoes')]];
const ABAS_NT = () => [['confiabilidade', t('vis.abaConfiabilidade')], ['alternativas', t('vis.abaAlternativas')]];

export function montar(raiz, dados) {
  const crit = dados.metricasAreas?.criterio ?? {}, alvo = crit.alvo_dentro_10 ?? 70, margem = (crit.margem_kpi ?? .1);
  let areaSel = null, comparar = [], filtroIds = null, pc = null;

  function abas() { return tecnico() ? ABAS_TEC() : ABAS_NT(); }
  function abaAtual() { const l = abas().map(a => a[0]); return l.includes(estado.aba) ? estado.aba : l[0]; }

  function render() {
    limparGraficos(raiz);
    const at = regioesAtivas(ORDEM_AREAS), tec = tecnico();
    const linha = dados.parametros?.linhas?.[estado.linha];
    if (!at.some(a => dados.porArea[a])) { raiz.innerHTML = cab(t('vis.semDados'), '') + vazio(t('vis.semMetricas'), t('vis.semMetricasPasso')); return; }
    if (linha && !linha.disponivel) { raiz.innerHTML = cab(t('vazio.linha', { linha: linha.rotulo }), '') + vazio(t('vazio.nenhumEnsaio', { linha: linha.rotulo }), linha.motivo ?? '', 'ph-flag'); return; }
    if (!areaSel || !at.includes(areaSel)) areaSel = at[0];
    const aba = abaAtual();
    raiz.innerHTML = cab(t(tec ? 'vis.tituloTec' : 'vis.tituloNT'), t(tec ? 'vis.subTec' : 'vis.subNT'))
      + `<div class="ig-abas" role="tablist" aria-label="Seções">${abas().map(([k, r]) => `<button type="button" role="tab" id="aba-${k}" aria-selected="${k === aba}" aria-controls="painel-${k}" data-aba="${k}">${r}</button>`).join('')}</div>
         <div id="painel-${aba}" role="tabpanel" aria-labelledby="aba-${aba}"></div>`;
    raiz.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => definir({ aba: b.dataset.aba })));
    const painel = raiz.querySelector('[role="tabpanel"]');
    ({ diagnostico, sensibilidade, configuracoes, confiabilidade, alternativas })[aba](painel, at);
  }
  function cab(titulo, sub) {
    return `<div class="ig-cabecalho"><p class="ig-kicker">${t('vis.kicker')}</p><div class="ig-cabecalho__linha"><h1 class="ig-headline">${escapar(titulo)}</h1>${estado.regioes.size ? `<span class="ig-selo"><i class="ph ph-funnel" aria-hidden="true"></i>Recorte: ${regioesAtivas(ORDEM_AREAS).map(a => ROTULO_AREA[a]).join(', ')}</span>` : ''}</div><p>${sub}</p>${avisoIdioma()}</div>`;
  }
  function seletorArea(at, id) {
    return `<div class="ig-campo" style="max-width:280px"><label for="${id}">Região</label><select id="${id}">${at.map(a => `<option value="${a}"${a === areaSel ? ' selected' : ''}>${ROTULO_AREA[a]}</option>`).join('')}</select></div>`;
  }
  function ligarSeletor(painel, id) { painel.querySelector(`#${id}`)?.addEventListener('change', e => { areaSel = e.target.value; render(); }); }

  /* ---------- diagnóstico ---------- */
  function diagnostico(painel, at) {
    const m = dados.porArea[areaSel], preds = dados.predicoes?.[areaSel] ?? [], c = cores();
    if (!preds.length) { painel.innerHTML = seletorArea(at, 'dArea') + vazio('Sem predições de validação', 'Exporte predicoes.json do notebook.'); ligarSeletor(painel, 'dArea'); return; }
    const fora = preds.filter(p => Math.abs(p.previsto - p.real) / p.real > margem);
    painel.innerHTML = `<div class="ig-bloco__topo">${seletorArea(at, 'dArea')}<span class="ig-nota">${inteiro(dados.metricasAreas.validacao.dobras)} rodadas de validação · ${inteiro(dados.metricasAreas.validacao.ensaios_treino)} ensaios</span></div>
      <div class="ig-kpis">
        ${kpi({ titulo: `MAE · ${m.rotulo}`, valor: graus(m.mae, 2), apoio: `RMSE ${graus(m.rmse, 2)} · R² ${numero(m.r2, 2)}`, estado: m.viavel ? 'seguro' : 'critico', detalhe: m.viavel ? 'região viável' : 'não viável' })}
        ${kpi({ titulo: 'Pontos fora da margem', valor: `${inteiro(fora.length)} de ${inteiro(preds.length)}`, apoio: `${pct(100 - m.dentro_10)} das predições erram mais de ${pct(margem * 100, 0)}` })}
        ${kpi({ titulo: 'Viés médio', valor: graus(m.vies, 2), apoio: m.vies > 0 ? 'predito − real · o modelo superestima' : 'predito − real · o modelo subestima' })}
        ${kpi({ titulo: 'Faixa confiável', valor: m.faixa_confiavel_c == null ? 'nenhuma' : `≤ ${graus(m.faixa_confiavel_c, 0)}`, apoio: `até esta temperatura real a proporção acumulada dentro da margem atinge ${pct(alvo, 0)}`, estado: m.faixa_confiavel_c == null ? 'critico' : m.faixa_confiavel_c < Math.max(...preds.map(p => p.real)) ? 'atencao' : 'seguro', detalhe: m.faixa_confiavel_c == null ? 'nenhuma faixa atinge o alvo: use simulação' : m.faixa_confiavel_c < Math.max(...preds.map(p => p.real)) ? 'acima disso, use simulação' : 'cobre toda a faixa medida' })}
      </div>
      <div class="ig-grade ig-grade--2">
        ${cartao(`${cabecalhoGrafico(`${inteiro(fora.length)} das ${inteiro(preds.length)} predições de ${escapar(m.rotulo)} caem fora da margem de ${pct(margem * 100, 0)}.`,
          'Cada ponto é uma predição num ensaio: no eixo horizontal a temperatura medida, no vertical a prevista. A faixa sombreada é a margem e a linha tracejada é o acerto exato. Em cinza, as predições dentro da margem.')}<div class="ig-grafico" id="dDisp"></div>
          ${legenda([
            { cor: corFoco('critico'), forma: 'ponto', rotulo: 'Predição fora da margem' },
            { cor: corNormal(), forma: 'ponto', rotulo: 'Predição dentro da margem' },
            { cor: c.fundoSeguro, forma: 'faixa', rotulo: `Banda de ±${pct(margem * 100, 0)} em volta da medição` },
            { cor: c.apoio, forma: 'tracejada', rotulo: 'Acerto exato (predito = real)' },
          ])}${equivalente(tabelaPred(preds))}`, { titulo: 'Predito × real' })}
        ${cartao(`${cabecalhoGrafico(`Em média, a predição de ${escapar(m.rotulo)} fica ${graus(Math.abs(m.vies), 2)} ${m.vies < 0 ? 'abaixo' : 'acima'} da medição.`,
          'Diferença entre o previsto e o medido, em graus. Acima de zero superestima; abaixo, subestima, que é o erro perigoso. Clique num ponto para ver o ensaio de origem.')}<div class="ig-grafico" id="dRes"></div>
          ${legenda([
            { cor: corFoco('critico'), forma: 'ponto', rotulo: 'Predição fora da margem' },
            { cor: corNormal(), forma: 'ponto', rotulo: 'Predição dentro da margem' },
            { cor: c.apoio, forma: 'tracejada', rotulo: 'Erro zero' },
            ...(m.faixa_confiavel_c != null ? [{ cor: c.atencao, forma: 'linha', rotulo: `Faixa confiável até ${graus(m.faixa_confiavel_c, 0)}` }] : []),
          ])}`, { titulo: 'Resíduo (predito − real)' })}
        ${cartao(`${cabecalhoGrafico(`${escapar(ROTULO_AREA[areaSel])} fica abaixo do alvo em ${inteiro((dados.porArea[areaSel]?.por_dobra ?? []).filter(d => d.dentro_10 < alvo).length)} das ${inteiro((dados.porArea[areaSel]?.por_dobra ?? []).length)} rodadas de validação.`,
          'Cada célula é uma região numa rodada, com a proporção dentro da margem. Azul: acima do alvo. Vermelho: abaixo dele. O par azul-vermelho foi escolhido por continuar legível no daltonismo vermelho-verde.')}<div class="ig-grafico" id="dHeat"></div>
          ${legenda([
            { cor: `linear-gradient(90deg, ${cores().temperatura.slice().reverse().join(', ')})`, forma: 'rampa', rotulo: `Vermelho: abaixo do alvo · neutro: no alvo (${pct(alvo, 0)}) · azul: acima` },
            { cor: cores().contorno, rotulo: 'Célula vazia: a região não foi avaliada naquela rodada' },
          ])}${equivalente(tabelaDobras(at))}`, { titulo: 'Dentro da margem por rodada de validação' })}
        ${cartao(`${cabecalhoGrafico(`${pct(m.dentro_10)} das predições de ${escapar(m.rotulo)} erram menos que a margem de ${pct(margem * 100, 0)}.`,
          'Quantas predições caem em cada faixa de erro percentual. A linha tracejada marca a margem: as barras à direita dela ficaram fora.')}<div class="ig-grafico" id="dHist"></div>
          ${legenda([
            { cor: corNormal(), rotulo: `Predições dentro da margem de ${pct(margem * 100, 0)}` },
            { cor: corFoco('critico'), rotulo: 'Predições fora da margem' },
            { cor: c.critico, forma: 'tracejada', rotulo: 'Margem acordada' },
          ])}`, { titulo: 'Distribuição do erro relativo' })}
      </div>
      <div id="dPonto"></div>`;
    ligarSeletor(painel, 'dArea');
    // azul para a predição que fica dentro da margem, vermelho para a que escapa:
    // duas cores que continuam separadas em todos os filtros de daltonismo
    const cor = p => (Math.abs(p.previsto - p.real) / p.real <= margem ? corNormal() : corFoco('critico'));
    const hover = preds.map(p => `${p.componente}<br>Run ${p.ensaio} · dobra ${p.dobra}<br>real ${graus(p.real)} · previsto ${graus(p.previsto)}`);
    const mn = Math.min(...preds.map(p => p.real)) * .95, mx = Math.max(...preds.map(p => p.real)) * 1.05;
    const banda = { x: [mn, mx, mx, mn], y: [mn * (1 - margem), mx * (1 - margem), mx * (1 + margem), mn * (1 + margem)], fill: 'toself', fillcolor: c.fundoSeguro, line: { width: 0 }, hoverinfo: 'skip', showlegend: true, name: `banda ±${pct(margem * 100, 0)}`, type: 'scatter', mode: 'lines' };
    const disp = [banda,
      { x: [mn, mx], y: [mn, mx], mode: 'lines', line: { color: c.apoio, dash: 'dot', width: 1 }, name: 'predito = real', hoverinfo: 'skip', type: 'scatter' },
      { x: preds.map(p => p.real), y: preds.map(p => p.previsto), mode: 'markers', type: 'scatter', marker: { color: preds.map(cor), size: 7, opacity: .8 }, text: hover, hovertemplate: '%{text}<extra></extra>', name: 'predições', customdata: preds.map((p, i) => i) }];
    desenhar(painel.querySelector('#dDisp'), disp, layoutBase({ xaxis: { ...layoutBase().xaxis, title: { text: 'temperatura real (°C)' } }, yaxis: { ...layoutBase().yaxis, title: { text: 'predito (°C)' } } }),
      `Predito contra real em ${m.rotulo}: ${inteiro(fora.length)} de ${inteiro(preds.length)} pontos fora da banda de ${pct(margem * 100, 0)}; MAE ${graus(m.mae, 2)}.`);
    const res = [{ x: preds.map(p => p.real), y: preds.map(p => p.previsto - p.real), mode: 'markers', type: 'scatter', marker: { color: preds.map(cor), size: 7, opacity: .8 }, text: hover, hovertemplate: '%{text}<extra></extra>', name: 'resíduo', customdata: preds.map((p, i) => i) }];
    const shapes = [{ type: 'line', x0: mn, x1: mx, y0: 0, y1: 0, line: { color: c.apoio, dash: 'dot', width: 1 } }];
    if (m.faixa_confiavel_c != null) shapes.push({ type: 'line', x0: m.faixa_confiavel_c, x1: m.faixa_confiavel_c, yref: 'paper', y0: 0, y1: 1, line: { color: c.atencao, width: 1.5 } });
    desenhar(painel.querySelector('#dRes'), res, layoutBase({ showlegend: false, shapes, xaxis: { ...layoutBase().xaxis, title: { text: 'temperatura real (°C)' } }, yaxis: { ...layoutBase().yaxis, title: { text: 'erro (°C)' } },
      annotations: m.faixa_confiavel_c != null ? [{ x: m.faixa_confiavel_c, yref: 'paper', y: 1, text: `faixa confiável ${graus(m.faixa_confiavel_c, 0)}`, showarrow: false, xanchor: 'left', font: { size: 11, color: c.atencao } }] : [] }),
      `Resíduo em ${m.rotulo}: viés médio de ${graus(m.vies, 2)}.`);
    // heatmap por dobra × região (todas as regiões do recorte)
    const dobras = [...new Set(at.flatMap(a => (dados.porArea[a]?.por_dobra ?? []).map(d => d.dobra)))].sort((a, b) => a - b);
    const z = at.map(a => dobras.map(d => dados.porArea[a]?.por_dobra.find(x => x.dobra === d)?.dentro_10 ?? null));
    desenhar(painel.querySelector('#dHeat'), [{ type: 'heatmap', z, x: dobras.map(d => String(d)), y: at.map(a => ROTULO_AREA[a]), colorscale: escalaTemperatura(true), zmin: Math.max(0, 2 * alvo - 100), zmax: 100, zmid: alvo, xgap: 2, ygap: 2,
      hovertemplate: '%{y} · dobra %{x}: %{z:.0f} % dentro da margem<extra></extra>', hoverongaps: false, colorbar: { title: { text: '%' }, thickness: 10, len: .9 }, text: z.map(l => l.map(v => v == null ? '' : numero(v, 0))), texttemplate: '%{text}', textfont: { size: 10 } }],
      layoutBase({ margin: { l: 100, r: 16, t: 8, b: 40 }, xaxis: { ...layoutBase().xaxis, title: { text: 'dobra (grupo de configuração deixado de fora)' }, type: 'category', tickangle: 0 }, yaxis: { ...layoutBase().yaxis, automargin: true } }),
      `Mapa de calor por rodada: azul acima do alvo de ${pct(alvo, 0)}, vermelho abaixo. ${ROTULO_AREA[areaSel]} tem ${inteiro((dados.porArea[areaSel]?.por_dobra ?? []).filter(d => d.dentro_10 < alvo).length)} rodadas abaixo do alvo.`);
    const rel = preds.map(p => 100 * Math.abs(p.previsto - p.real) / p.real);
    const dentro = rel.filter(v => v <= margem * 100), foraRel = rel.filter(v => v > margem * 100);
    const bins = { start: 0, end: Math.max(30, Math.ceil(Math.max(...rel) / 5) * 5), size: 2.5 };
    desenhar(painel.querySelector('#dHist'), [
      { type: 'histogram', x: dentro, xbins: bins, marker: { color: corNormal(), line: { color: c.superficie, width: 1 } }, name: `dentro de ${pct(margem * 100, 0)}`, hovertemplate: 'erro %{x} %: %{y} pontos<extra></extra>' },
      { type: 'histogram', x: foraRel, xbins: bins, marker: { color: corFoco('critico'), line: { color: c.superficie, width: 1 } }, name: 'fora da margem', hovertemplate: 'erro %{x} %: %{y} pontos<extra></extra>' }],
      layoutBase({ showlegend: false, barmode: 'overlay', bargap: .05, shapes: [{ type: 'line', x0: margem * 100, x1: margem * 100, yref: 'paper', y0: 0, y1: 1, line: { color: c.critico, width: 1.5, dash: 'dot' } }], annotations: [{ x: margem * 100, yref: 'paper', y: 1, text: `margem ${pct(margem * 100, 0)}`, showarrow: false, xanchor: 'left', font: { size: 11, color: c.critico } }], xaxis: { ...layoutBase().xaxis, title: { text: '|predito − real| / real (%)' } }, yaxis: { ...layoutBase().yaxis, title: { text: 'pontos' } } }),
      `Histograma do erro relativo: ${pct(m.dentro_10)} das predições ficam abaixo da margem.`);
    // clique num ponto -> ensaio de origem e casos-suporte (RF-T02)
    ['#dDisp', '#dRes'].forEach(s => painel.querySelector(s).on('plotly_click', ev => { const i = ev.points[0]?.customdata; if (i != null) painel.querySelector('#dPonto').innerHTML = detalhePonto(preds[i]); }));
  }
  function tabelaPred(preds) {
    return tabela({ colunas: [{ titulo: 'Componente', campo: 'componente' }, { titulo: 'Run', campo: 'ensaio', num: true }, { titulo: 'Dobra', campo: 'dobra', num: true }, { titulo: 'Real', campo: 'real', unidade: '°C', num: true, casas: 1 }, { titulo: 'Previsto', campo: 'previsto', unidade: '°C', num: true, casas: 1 }, { titulo: 'Erro', campo: 'erro', unidade: '°C', num: true, casas: 1, sinal: true, formato: p => numero(p.previsto - p.real, 1, '', true) }], linhas: preds, densa: true, legenda: 'Predições de validação' });
  }
  function tabelaDobras(at) {
    const linhas = at.flatMap(a => (dados.porArea[a]?.por_dobra ?? []).map(d => ({ area: ROTULO_AREA[a], ...d })));
    return tabela({ colunas: [{ titulo: 'Região', campo: 'area' }, { titulo: 'Dobra', campo: 'dobra', num: true }, { titulo: 'n', campo: 'n', num: true }, { titulo: 'MAE', campo: 'mae', unidade: '°C', num: true, casas: 2 }, { titulo: 'Dentro da margem', campo: 'dentro_10', unidade: '%', num: true, casas: 1 }], linhas, densa: true });
  }
  function detalhePonto(p) {
    const e = (dados.ensaios ?? []).find(x => x.id_ensaio === p.ensaio && x.area === areaSel);
    const cat = (dados.catalogo ?? []).find(c => c.componente === p.componente);
    const suporte = e ? (dados.ensaios ?? []).filter(x => x.area === areaSel && x.id_ensaio !== e.id_ensaio && x.run_case === e.run_case && x.losses === e.losses && x.material === e.material && x.housing === e.housing) : [];
    const est = cat?.limite_c == null ? 'monitorar' : p.previsto >= cat.limite_c ? 'critico' : cat.limite_c - p.previsto < (dados.parametros?.folga_atencao_pct ?? 10) / 100 * cat.limite_c ? 'atencao' : 'seguro';
    return cartao(`<div class="ig-grade ig-grade--2">
      <div>${ficha([['Componente', escapar(p.componente)], ['Run de origem', `<b>Run ${p.ensaio}</b> · dobra ${p.dobra}`], ['Real / previsto', `${graus(p.real)} / ${graus(p.previsto)} (erro ${numero(p.previsto - p.real, 1, '°C', true)})`], ['Limite', cat?.limite_c == null ? 'só monitorar' : `${graus(cat.limite_c, 0)} · folga ${graus(cat.limite_c - p.previsto)}`], ['Veredito', rotuloEstado(est)]])}</div>
      <div>${e ? ficha([['Run Case', rotulo(ROTULO_RUN_CASE, e.run_case)], ['Losses', escapar(e.losses)], ['Material Coil Support', rotulo(ROTULO_MATERIAL, e.material)], ['Housing', rotulo(ROTULO_HOUSING, e.housing)], ['Blower Direction · Board Position · Deflector Hole', `${rotulo(ROTULO_BLOWER, e.blower_direction)} · ${rotulo(ROTULO_BOARD, e.board_position)} · ${rotulo(ROTULO_HOUSING, e.deflector_hole)}`]]) : '<span class="ig-nota">Ensaio sem ficha (ensaios.json ausente)</span>'}</div>
    </div>
    <p style="margin-top:var(--ig-e2)"><b>Casos-suporte:</b> ${suporte.length ? `${inteiro(suporte.length)} ensaios com a mesma configuração (modo, perdas, material, alojamento) sustentam esta predição: ${suporte.map(s => `Run ${s.id_ensaio}`).join(', ')}.` : 'nenhum outro ensaio com a mesma configuração; a predição vem de configurações vizinhas e merece simulação.'}</p>`, { titulo: 'Rastreabilidade do ponto' });
  }

  /* ---------- sensibilidade ---------- */
  function sensibilidade(painel, at) {
    const imp = dados.importancias?.areas, c = cores();
    if (!imp) { painel.innerHTML = vazio('Sem importâncias', 'Exporte importancias.json.'); return; }
    const lista = imp[areaSel] ?? [], top = lista.slice(0, 12), top2 = lista.slice(0, 2).reduce((s, v) => s + v.importancia, 0);
    const somas = at.map(a => ({ area: a, rotulo: ROTULO_AREA[a], top2: (imp[a] ?? []).slice(0, 2).reduce((s, v) => s + v.importancia, 0), vars: (imp[a] ?? []).slice(0, 2).map(v => variavelLegivel(v.variavel)).join(' + ') }));
    const outras = somas.filter(s => s.area !== areaSel), mediaOutras = outras.length ? outras.reduce((s, x) => s + x.top2, 0) / outras.length : null;
    painel.innerHTML = `${notaDidatica('<b>Tela de apoio.</b> A importância (MDI, redução média de impureza) diz quais variáveis o Random Forest mais usa para separar as temperaturas. Ela não decide aceitação e não mede efeito causal.', 'ph-info')}
      <div class="ig-bloco__topo" style="margin-top:var(--ig-e3)">${seletorArea(at, 'sArea')}<span class="ig-nota">${escapar(dados.importancias.metrica)}</span></div>
      <div class="ig-kpis">
        ${kpi({ titulo: `2 maiores · ${ROTULO_AREA[areaSel]}`, valor: pct(top2 * 100, 0), apoio: lista.slice(0, 2).map(v => variavelLegivel(v.variavel)).join(' + ') })}
        ${kpi({ titulo: 'Média das outras regiões', valor: mediaOutras == null ? '—' : pct(mediaOutras * 100, 0), apoio: '2 maiores somadas' })}
        ${kpi({ titulo: 'Concentração relativa', valor: mediaOutras ? `${numero(top2 / mediaOutras, 1)}×` : '—', apoio: `${ROTULO_AREA[areaSel]} ÷ média das outras` })}
        ${kpi({ titulo: 'Variáveis no gráfico', valor: inteiro(top.length), apoio: `${pct(top.reduce((s, v) => s + v.importancia, 0) * 100, 1)} da importância total` })}
      </div>
      <div class="ig-grade ig-grade--2">
        ${cartao(`${cabecalhoGrafico(`${lista.slice(0, 2).map(v => escapar(variavelLegivel(v.variavel))).join(' e ')} respondem por ${pct(top2 * 100, 0)} da importância em ${escapar(ROTULO_AREA[areaSel])}.`,
          'Quanto cada variável de configuração pesou nas predições desta região. Barras maiores indicam variáveis que mais mudam a temperatura prevista.')}<div class="ig-grafico" id="sBar"></div>
          ${legenda([
            { cor: cores().texto, forma: 'linha', rotulo: 'Contorno escuro: as duas variáveis de maior peso' },
            { cor: corSerie(0), rotulo: 'Uma cor por variável, para acompanhar a mesma variável entre as regiões' },
          ])}${equivalente(tabela({ colunas: [{ titulo: 'Variável', campo: 'v', formato: l => escapar(variavelLegivel(l.variavel)) }, { titulo: 'Importância', campo: 'importancia', unidade: '%', num: true, casas: 1, formato: l => numero(l.importancia * 100, 1) }], linhas: lista, densa: true }))}`, { titulo: `Importância das variáveis · ${ROTULO_AREA[areaSel]}` })}
        ${cartao(`${cabecalhoGrafico(`Em ${escapar(ROTULO_AREA[areaSel])}, duas variáveis explicam ${pct(top2 * 100, 0)} da importância${mediaOutras ? `, contra ${pct(mediaOutras * 100, 0)} na média das outras regiões` : ''}.`,
          'Soma da importância das duas maiores variáveis de cada região: quanto mais alta a barra, mais a região depende de poucas variáveis.')}<div class="ig-grafico" id="sTop2"></div>
          ${legenda([
            { cor: cores().texto, forma: 'linha', rotulo: 'Contorno escuro: região selecionada' },
            { cor: corRegiao(areaSel), rotulo: 'Uma cor por região, a mesma do modelo 3D e do menu' },
            { cor: cores().texto, forma: 'tracejada', rotulo: 'Média das outras regiões' },
          ])}${equivalente(tabela({ colunas: [{ titulo: 'Região', campo: 'rotulo' }, { titulo: '2 maiores', campo: 'top2', unidade: '%', num: true, casas: 0, formato: l => numero(l.top2 * 100, 0) }, { titulo: 'Quais', campo: 'vars' }], linhas: somas, densa: true }))}`, { titulo: 'Soma das 2 maiores por região' })}
      </div>`;
    ligarSeletor(painel, 'sArea');
    const ord = [...top].reverse();
    desenhar(painel.querySelector('#sBar'), [{ type: 'bar', orientation: 'h', x: ord.map(v => v.importancia * 100), y: ord.map(v => variavelLegivel(v.variavel)), marker: { color: ord.map((v, i) => corSerie(ord.length - 1 - i)),
      line: { color: ord.map((v, i) => i >= ord.length - 2 ? cores().texto : 'rgba(0,0,0,0)'), width: ord.map((v, i) => i >= ord.length - 2 ? 2 : 0) } }, text: ord.map(v => pct(v.importancia * 100)), textposition: 'outside', cliponaxis: false, hovertemplate: '%{y}: %{x:.1f} %<extra></extra>' }],
      layoutBase({ margin: { l: 230, r: 60, t: 8, b: 40 }, showlegend: false, height: 30 * ord.length + 60, xaxis: { ...layoutBase().xaxis, title: { text: 'importância (MDI, %)' } }, yaxis: { ...layoutBase().yaxis, automargin: true } }),
      `Importância das variáveis em ${ROTULO_AREA[areaSel]}: as duas maiores (${lista.slice(0, 2).map(v => variavelLegivel(v.variavel)).join(' e ')}) somam ${pct(top2 * 100, 0)}.`);
    const so = [...somas].sort((a, b) => a.top2 - b.top2);
    desenhar(painel.querySelector('#sTop2'), [{ type: 'bar', orientation: 'h', x: so.map(s => s.top2 * 100), y: so.map(s => s.rotulo), marker: { color: so.map(s => corRegiao(s.area)),
      line: { color: so.map(s => s.area === areaSel ? cores().texto : 'rgba(0,0,0,0)'), width: so.map(s => s.area === areaSel ? 3 : 0) } }, text: so.map(s => pct(s.top2 * 100, 0)), textposition: 'outside', cliponaxis: false, hovertemplate: '%{y}: %{x:.0f} %<extra></extra>' }],
      layoutBase({ margin: { l: 110, r: 60, t: 8, b: 40 }, showlegend: false, height: 34 * so.length + 60, xaxis: { ...layoutBase().xaxis, title: { text: 'soma das 2 maiores (%)' }, range: [0, 100] }, shapes: mediaOutras == null ? [] : [{ type: 'line', x0: mediaOutras * 100, x1: mediaOutras * 100, y0: -.5, y1: so.length - .5, line: { color: c.texto, dash: 'dot', width: 1 } }] }),
      `Soma das duas maiores importâncias por região.`);
  }

  /* ---------- configurações: coordenadas paralelas (7.3.1) ---------- */
  function configuracoes(painel, at) {
    const ens = (dados.ensaios ?? []).filter(e => at.includes(e.area));
    if (!ens.length) { painel.innerHTML = vazio('Sem ensaios exportados', 'Exporte ensaios.json do notebook para explorar as configurações.', 'ph-chart-line'); return; }
    const linhas = ens.map(e => ({ ...e, losses: e.losses ?? 'não informado', id: `${e.area}#${e.id_ensaio}`, estado: e.veredito, losses_r: e.losses ?? 'não informado', material_r: rotulo(ROTULO_MATERIAL, e.material), housing_r: rotulo(ROTULO_HOUSING, e.housing), run_case_r: rotulo(ROTULO_RUN_CASE, e.run_case) }));
    const catLosses = [...new Set(linhas.map(l => l.losses))].sort((a, b) => (a === 'no losses' ? -1 : b === 'no losses' ? 1 : a.localeCompare(b)));
    painel.innerHTML = `<div class="ig-bloco__topo"><p class="ig-nota">Uma linha por ensaio${at.length > 1 ? ' e região' : ''}: da configuração (esquerda) ao resultado térmico (direita). Arraste num eixo para filtrar, arraste o título para reordenar, clique no título para inverter.</p>
        <div class="ig-linha-botoes"><span class="ig-nota" id="cContador" aria-live="polite"></span>${botao('Limpar filtros', { variante: 'terciario', pequeno: true, icone: 'ph-x', id: 'cLimpar' })}</div></div>
      ${cartao(`<p class="ig-descricao-grafico">Cada linha é um ensaio atravessando os eixos: as variáveis de configuração à esquerda e, à direita, temperatura prevista, folga até o limite e erro. A cor indica o estado do componente mais crítico do ensaio. Arraste sobre um eixo para filtrar.</p><div id="cPc"></div><p class="ig-nota" id="cNota"></p>${legenda([
        { cor: corEstado('seguro'), forma: 'linha', rotulo: 'Ensaio com folga confortável' },
        { cor: corEstado('atencao'), forma: 'linha', rotulo: 'Folga apertada' },
        { cor: corEstado('critico'), forma: 'linha', rotulo: 'Componente acima do limite' },
        { cor: corEstado('monitorar'), forma: 'linha', rotulo: 'Sem limite: só monitorado' },
        { cor: cores().atencao, forma: 'tracejada', rotulo: 'Linha do limite no eixo de folga' },
      ], { rotulo: 'Cores das linhas por estado do ensaio' })}<div id="cSob" class="ig-nota" style="min-height:1.5em;margin-top:var(--ig-e1)" aria-live="polite"></div>`, { titulo: 'Coordenadas paralelas · configuração → temperatura → folga → erro' })}
      <div class="ig-kpis" id="cKpis"></div>
      <div id="cComparar"></div>
      ${cartao(`<div id="cTabela" class="ig-lista-comp"></div>`, { titulo: 'Tabela equivalente (mesmos filtros)' })}
      <div id="cDetalhe"></div>`;
    const eixos = [
      { chave: 'run_case_r', titulo: 'Run Case', tipo: 'cat', categorias: ['Pyro', 'Broil C1', 'Broil C2', 'Broil Qualitative'].filter(c => linhas.some(l => l.run_case_r === c)) },
      { chave: 'losses', titulo: 'Losses', tipo: 'cat', categorias: catLosses, formato: v => v.length > 22 ? v.slice(0, 21) + '…' : v },
      { chave: 'material_r', titulo: 'Material Coil Support', tipo: 'cat', categorias: ['Plastic', 'Aluminium'] },
      { chave: 'housing_r', titulo: 'Housing', tipo: 'cat', categorias: ['Open', 'Closed'] },
      { chave: 't_max_prevista', titulo: 'Temp. máx. prevista', tipo: 'num', unidade: '°C', casas: 0 },
      { chave: 'folga_c', titulo: 'Folga até o limite', tipo: 'num', unidade: '°C', casas: 0, marca: 0, marcaRotulo: 'limite', incluirZero: true },
      { chave: 'erro_abs_c', titulo: 'Erro absoluto', tipo: 'num', unidade: '°C', casas: 0, marca: null },
    ];
    // marca da margem de 10 % no eixo de erro: 10 % da temperatura crítica típica (mediana)
    const medReal = [...linhas.map(l => l.t_critico_real)].sort((a, b) => a - b)[Math.floor(linhas.length / 2)];
    eixos[6].marca = margem * medReal; eixos[6].marcaRotulo = `margem 10 % · ${graus(margem * medReal, 0)}`;
    const cont = painel.querySelector('#cContador');
    const tabelaEq = (ids) => {
      const ls = linhas.filter(l => !ids || ids.includes(l.id));
      painel.querySelector('#cTabela').innerHTML = tabela({ colunas: [
        { titulo: 'Run', campo: 'id_ensaio', formato: l => `<b>Run ${l.id_ensaio}</b> <span class="ig-apoio">${ROTULO_AREA[l.area]}</span>` }, { titulo: 'Run Case', campo: 'run_case_r' }, { titulo: 'Losses', campo: 'losses' }, { titulo: 'Material Coil Support', campo: 'material_r' }, { titulo: 'Housing', campo: 'housing_r' },
        { titulo: 'Temp. máx.', campo: 't_max_prevista', unidade: '°C', num: true, casas: 1 }, { titulo: 'Folga', campo: 'folga_c', unidade: '°C', num: true, casas: 1, sinal: true, formato: l => l.folga_c == null ? '—' : numero(l.folga_c, 1, '', true) }, { titulo: 'Erro abs.', campo: 'erro_abs_c', unidade: '°C', num: true, casas: 1 },
        { titulo: 'Componente crítico', campo: 'componente_critico' }, { titulo: 'Estado', campo: 'estado', formato: l => rotuloEstado(l.estado) },
        { titulo: '', campo: 'acoes', formato: l => `<button type="button" class="ig-botao ig-botao--terciario ig-botao--pequeno" data-comparar="${escapar(l.id)}">${comparar.includes(l.id) ? 'Remover' : 'Comparar'}</button>` },
      ], linhas: ls, densa: true, destacar: l => l.estado === 'critico', ordenarPor: 'folga_c', selecionavel: true, atributo: 'id' });
      ativarOrdenacao(painel.querySelector('#cTabela'));
      painel.querySelectorAll('[data-comparar]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); alternarComparar(b.dataset.comparar); }));
      painel.querySelectorAll('#cTabela tr[data-id]').forEach(tr => tr.addEventListener('click', () => { painel.querySelector('#cDetalhe').innerHTML = detalheEnsaio(linhas.find(l => l.id === tr.dataset.id)); pc?.destacar(tr.dataset.id); }));
      const crits = ls.filter(l => l.estado === 'critico');
      painel.querySelector('#cKpis').innerHTML = [
        kpi({ titulo: 'Configurações no filtro', valor: `${inteiro(ls.length)} de ${inteiro(linhas.length)}` }),
        kpi({ titulo: 'Acima do limite', valor: inteiro(crits.length), apoio: crits.length ? `${pct(100 * crits.length / ls.length, 0)} das filtradas` : 'nenhuma no filtro', estado: crits.length ? 'critico' : 'seguro', detalhe: crits.length ? 'folga negativa' : 'todas com folga' }),
        kpi({ titulo: 'Folga mediana', valor: ls.length ? graus(mediana(ls.map(l => l.folga_c).filter(v => v != null)), 0) : '—', apoio: 'do componente crítico de cada ensaio' }),
        kpi({ titulo: 'Erro dentro da margem', valor: ls.length ? pct(100 * ls.filter(l => l.dentro_10).length / ls.length, 0) : '—', apoio: 'no componente crítico' }),
      ].join('');
    };
    pc = coordenadasParalelas(painel.querySelector('#cPc'), { eixos, linhas, amostraMax: 300,
      aoFiltrar: ids => { filtroIds = ids.length === linhas.length ? null : ids; cont.textContent = `${inteiro(ids.length)} de ${inteiro(linhas.length)} configurações`; tabelaEq(filtroIds); },
      aoPassar: l => { painel.querySelector('#cSob').innerHTML = l ? `<b>Run ${l.id_ensaio}</b> · ${ROTULO_AREA[l.area]} · ${l.run_case_r}, ${escapar(l.losses)}, ${l.material_r}, ${l.housing_r} → mais quente: <b>${escapar(l.componente_critico)}</b> ${graus(l.t_critico_prevista)} (limite ${l.limite_c == null ? 'monitorar' : graus(l.limite_c, 0)}) ${rotuloEstado(l.estado)}` : ''; },
      aoClicar: l => { painel.querySelector('#cDetalhe').innerHTML = detalheEnsaio(l); painel.querySelector('#cDetalhe').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } });
    const fech = linhas.filter(l => l.housing === 'closed' && l.material === 'plastic'), negFech = fech.filter(l => l.folga_c < 0).length, neg = linhas.filter(l => l.folga_c < 0).length;
    pc.definirAria(`Coordenadas paralelas de ${inteiro(linhas.length)} configurações; ${inteiro(neg)} terminam com folga negativa${fech.length ? `, ${inteiro(negFech)} delas combinando alojamento fechado e material plástico` : ''}.`);
    painel.querySelector('#cNota').textContent = pc.amostradas < pc.total ? `Mostrando ${inteiro(pc.amostradas)} de ${inteiro(pc.total)} configurações (amostra determinística); a tabela e os filtros valem para todas.` : `Em Pyro a perda é zero, por isso essas linhas colapsam em “no losses”: é informação, não defeito.`;
    painel.querySelector('#cLimpar').addEventListener('click', () => pc.limpar());
    renderComparar();

    function alternarComparar(id) {
      if (comparar.includes(id)) comparar = comparar.filter(x => x !== id);
      else if (comparar.length < 3) comparar.push(id);
      else { comparar.shift(); comparar.push(id); }
      tabelaEq(filtroIds); renderComparar();
    }
    function renderComparar() {
      const el = painel.querySelector('#cComparar');
      const ls = comparar.map(id => linhas.find(l => l.id === id)).filter(Boolean);
      if (!ls.length) { el.innerHTML = ''; return; }
      const campos = [['Run Case', l => l.run_case_r], ['Losses', l => escapar(l.losses)], ['Material Coil Support', l => l.material_r], ['Housing', l => l.housing_r], ['Blower Direction', l => rotulo(ROTULO_BLOWER, l.blower_direction)], ['Board Position', l => rotulo(ROTULO_BOARD, l.board_position)], ['Deflector Hole', l => rotulo(ROTULO_HOUSING, l.deflector_hole)],
        ['Componente crítico', l => escapar(l.componente_critico)], ['Temp. máx. prevista', l => graus(l.t_max_prevista)], ['Limite', l => l.limite_c == null ? 'monitorar' : graus(l.limite_c, 0)], ['Folga', l => l.folga_c == null ? '—' : numero(l.folga_c, 1, '°C', true)], ['Erro absoluto (validação)', l => graus(l.erro_abs_c)], ['Dobra', l => `D${l.dobra}`], ['Veredito', l => rotuloEstado(l.estado)]];
      el.innerHTML = cartao(`<div class="ig-rolagem"><table class="ig-tabela ig-tabela--densa"><caption>Até três configurações lado a lado, com o detalhe técnico preservado</caption><thead><tr><th scope="col"></th>${ls.map(l => `<th scope="col">Run ${l.id_ensaio} · ${ROTULO_AREA[l.area]} <button type="button" class="ig-botao ig-botao--terciario ig-botao--pequeno" data-comparar="${escapar(l.id)}" aria-label="Remover Run ${l.id_ensaio} da comparação">✕</button></th>`).join('')}</tr></thead><tbody>${campos.map(([k, f]) => `<tr><th scope="row">${k}</th>${ls.map(l => `<td>${f(l)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`, { titulo: `Comparação de configurações (${inteiro(ls.length)} de 3)` });
      el.querySelectorAll('[data-comparar]').forEach(b => b.addEventListener('click', () => alternarComparar(b.dataset.comparar)));
    }
    function detalheEnsaio(l) {
      if (!l) return '';
      const preds = (dados.predicoes?.[l.area] ?? []).filter(p => p.ensaio === l.id_ensaio);
      const cat = new Map((dados.catalogo ?? []).map(c => [c.componente, c]));
      return cartao(`<div class="ig-grade ig-grade--2"><div>${ficha([['Run de origem', `<b>${escapar(l.run_origem)}</b> · dobra ${l.dobra} · ${ROTULO_AREA[l.area]}`], ['Configuração', `${l.run_case_r} · ${escapar(l.losses)} · ${l.material_r} · ${l.housing_r}`], ['Blower · placa · defletor', `${rotulo(ROTULO_BLOWER, l.blower_direction)} · ${rotulo(ROTULO_BOARD, l.board_position)} · ${rotulo(ROTULO_HOUSING, l.deflector_hole)}`], ['Componente crítico', `${escapar(l.componente_critico)}: previsto ${graus(l.t_critico_prevista)}, real ${graus(l.t_critico_real)}, limite ${l.limite_c == null ? 'monitorar' : graus(l.limite_c, 0)}`], ['Veredito', rotuloEstado(l.estado, { detalhe: l.folga_c == null ? '' : `folga ${graus(l.folga_c)}` })]])}
        <div class="ig-linha-botoes" style="margin-top:var(--ig-e2)">${botao(comparar.includes(l.id) ? 'Remover da comparação' : 'Comparar (até 3)', { variante: 'secundario', pequeno: true, icone: 'ph-columns', atributos: `data-comparar="${escapar(l.id)}"` })}</div></div>
        <div>${tabela({ colunas: [{ titulo: 'Componente', campo: 'componente' }, { titulo: 'Real', campo: 'real', unidade: '°C', num: true, casas: 1 }, { titulo: 'Previsto', campo: 'previsto', unidade: '°C', num: true, casas: 1 }, { titulo: 'Limite', campo: 'lim', unidade: '°C', num: true, casas: 0, formato: p => cat.get(p.componente)?.limite_c == null ? '—' : numero(cat.get(p.componente).limite_c, 0) }], linhas: preds, densa: true, legenda: `Todos os componentes do ${l.run_origem} nesta região`, destacar: p => cat.get(p.componente)?.limite_c != null && p.previsto >= cat.get(p.componente).limite_c })}</div></div>`, { titulo: 'Detalhe do ensaio' });
    }
    painel.querySelector('#cDetalhe').addEventListener('click', ev => { const b = ev.target.closest('[data-comparar]'); if (b) alternarComparar(b.dataset.comparar); });
  }
  const mediana = v => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

  /* ---------- não-técnico: confiabilidade e alternativas ---------- */
  function confiabilidade(painel, at) {
    const areas = at.map(a => dados.porArea[a]).filter(Boolean);
    painel.innerHTML = `${notaDidatica('<b>Como leio isto?</b> Para cada região, dizemos se o modelo já pode ser usado na triagem e o quanto da sua resposta cai dentro da margem combinada com a Whirlpool. Quem quiser os números completos pode abrir o modo técnico.')}
      <div class="ig-grade ig-grade--3" style="margin-top:var(--ig-e3)">${areas.map(a => `<section class="ig-cartao ig-veredito${a.viavel ? '' : ' ig-cartao--critico'}"><h3>${escapar(a.rotulo)}</h3><p class="ig-nota">${DESCRICAO_AREA[a.area]}</p>${rotuloEstado(a.viavel ? 'seguro' : 'critico', { texto: a.viavel ? 'Confiável para triagem' : 'Precisa de simulação', modo: 'naotecnico' })}<p>Acerta <b>${inteiro(Math.round(a.dentro_10 / 10))} de cada 10</b> pontos dentro da margem combinada${a.falso_aprovado ? `; em ${inteiro(a.falso_aprovado)} casos deu como ok algo que não estava` : '; nunca deu como ok algo que não estava'}.</p></section>`).join('')}</div>
      <div class="ig-linha-botoes">${botao('Ver no modo técnico', { variante: 'terciario', icone: 'ph-magnifying-glass', id: 'vTec', pequeno: true })}</div>`;
    painel.querySelector('#vTec').addEventListener('click', () => definir({ modo: 'tecnico', aba: 'diagnostico' }));
  }
  function alternativas(painel, at) {
    const ens = (dados.ensaios ?? []).filter(e => at.includes(e.area) && e.folga_c != null);
    if (!ens.length) { painel.innerHTML = vazio('Sem configurações para comparar', 'Exporte ensaios.json do notebook.'); return; }
    // agrupa por configuração (modo, perdas, material, alojamento) e pega a menor folga de cada grupo
    const grupos = new Map();
    ens.forEach(e => { const k = `${e.run_case}|${e.losses}|${e.material}|${e.housing}`; const g = grupos.get(k) ?? { k, run_case: e.run_case, losses: e.losses ?? 'não informado', material: e.material, housing: e.housing, folga: Infinity, runs: new Set(), estado: 'seguro', regioes: new Set(), regioesCriticas: new Set() }; g.runs.add(e.id_ensaio); g.regioes.add(e.area); if (e.veredito === 'critico') g.regioesCriticas.add(e.area); if (e.folga_c < g.folga) { g.folga = e.folga_c; g.estado = e.veredito; g.comp = e.componente_critico; } grupos.set(k, g); });
    const lista = [...grupos.values()].sort((a, b) => a.regioesCriticas.size - b.regioesCriticas.size || b.folga - a.folga);
    painel.innerHTML = `${notaDidatica('<b>Como leio isto?</b> Cada linha é uma alternativa de configuração já ensaiada. Quanto mais folga, mais longe do limite fica o componente mais quente. As de risco alto passam do limite em pelo menos um ensaio.')}
      <div style="margin-top:var(--ig-e3)">${tabela({ colunas: [
        { titulo: 'Alternativa', campo: 'k', formato: g => `<b>${rotulo(ROTULO_RUN_CASE, g.run_case)}</b> · Losses ${escapar(g.losses)} · Material Coil Support ${rotulo(ROTULO_MATERIAL, g.material)} · Housing ${rotulo(ROTULO_HOUSING, g.housing)}` },
        { titulo: 'Ensaios', campo: 'n', num: true, formato: g => inteiro(g.runs.size) },
        { titulo: 'Regiões ok', campo: 'ok', num: true, formato: g => `${inteiro(g.regioes.size - g.regioesCriticas.size)} de ${inteiro(g.regioes.size)}` },
        { titulo: 'Folga disponível', campo: 'folga', formato: g => `${espec(g.estado).negocio}${g.estado === 'atencao' || g.estado === 'critico' ? ` <span class="ig-apoio">(${escapar(g.comp)}, ${[...g.regioesCriticas].map(a => ROTULO_AREA[a]).join(', ') || ROTULO_AREA[[...g.regioes][0]]})</span>` : ''}` },
        { titulo: 'Risco', campo: 'estado', formato: g => rotuloEstado(g.estado, { modo: 'naotecnico' }) },
      ], linhas: lista, destacar: g => g.estado === 'critico', legenda: 'Alternativas ordenadas da maior para a menor folga' })}</div>`;
  }

  render();
  return { atualizar(m) { if ('regioes' in m || 'modo' in m || 'linha' in m || 'tema' in m || 'aba' in m) render(); }, desmontar() { limparGraficos(raiz); } };
}
