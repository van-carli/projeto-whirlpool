// Glossário: toda explicação de variável, sigla, região, métrica e estado vive aqui.
// As outras telas só usam os termos. Fontes: dataset da parceria, Glossário da parceria
// (fatores e níveis), documentação do projeto (métricas e critérios).
import { ORDEM_AREAS, ROTULO_AREA, DESCRICAO_AREA } from '../dados.js';
import { escapar, pct } from '../formato.js';
import { corRegiao } from '../graficos.js';
import { rotuloEstado, ESTADOS } from '../ui.js';
import { t } from '../i18n.js';

const VARIAVEIS = [
  ['Blower Direction', 'Direção do ventilador da placa no ensaio. Níveis: <code>To Front</code> e <code>To Back</code>.'],
  ['Housing', 'Estado do housing que envolve o ventilador da placa. Níveis: <code>Open</code> e <code>Closed</code>.'],
  ['Board Position', 'Posição da placa dentro do burner box. Níveis: <code>Central</code> e <code>Right</code>.'],
  ['Run Case', 'Modo de operação do ensaio. Níveis: <code>Pyro</code>, <code>Broil C1</code>, <code>Broil C2</code> e <code>Broil Qualitative</code>.'],
  ['Losses', 'Calor dissipado nos componentes da placa de indução, em watts. Varia com a ordem de montagem das bobinas e com o modo de operação; nos casos <code>Pyro</code> a perda é zero.'],
  ['Deflector Hole', 'Furo defletor na região do console. Níveis: <code>Open</code> e <code>Closed</code>.'],
  ['Material Coil Support', 'Material da placa de suporte da bobina. Níveis: <code>Aluminium</code> e <code>Plastic</code>.'],
  ['Reason', 'Motivo registrado para o ensaio, em texto livre na planilha.'],
];

const COLUNAS = [
  ['TC Number', 'Identificador numérico do termopar. É um rótulo: média e diferença não têm significado.'],
  ['TC Name', 'Nome do termopar, isto é, do componente medido. É o nome usado em todo o dashboard.'],
  ['Key Area', 'Região térmica a que o componente pertence. São sete no dataset.'],
  ['Active Limit', 'Limite de temperatura do componente, em °C, por norma ou especificação. Componentes sem limite são apenas monitorados.'],
  ['Run', 'Cada coluna de ensaio da planilha, com a temperatura medida em cada componente naquela configuração.'],
];

const METRICAS = [
  ['MAE', 'Erro absoluto médio, em °C: de quantos graus a predição erra, em média, para mais ou para menos. É a métrica principal, porque sai na mesma unidade dos limites.'],
  ['RMSE', 'Raiz do erro quadrático médio. Comparada ao MAE, mostra se os erros são parecidos entre si ou se poucos pontos concentram o erro.'],
  ['Viés', 'Erro médio com sinal. Positivo: a predição fica acima da medição. Negativo: fica abaixo, que é o erro perigoso, porque aprova o que deveria reprovar.'],
  ['R²', 'Quanto da variação do alvo a predição explica. Negativo significa que prever sempre a média do componente erraria menos.'],
  ['Dentro da margem', 'Proporção das predições que erram menos que a margem acordada em relação à temperatura medida.'],
  ['Reprova real', 'Quantas vezes a temperatura <b>medida</b> atingiu o limite do componente. É o total contra o qual se leem os falsos aprovados.'],
  ['Falso aprovado', 'O componente atingiu o limite na medição e a predição aprovou. É o erro caro: deixa passar risco térmico.'],
  ['Falso reprovado', 'O componente passou na medição e a predição reprovou. Custa uma verificação desnecessária.'],
  ['Folga', 'Distância entre a temperatura e o limite do componente, em °C. Folga negativa significa acima do limite.'],
  ['Importância da variável', 'Quanto cada variável de configuração contribuiu para as predições daquela região, por redução de impureza.'],
];

const VALIDACAO = [
  ['Validação por configuração de ensaio', 'Cada rodada separa as configurações de um grupo, treina sem elas e prevê esse grupo. Assim nenhuma configuração é prevista tendo participado do próprio treino.'],
  ['Ensaio (Run)', 'Uma execução do teste com uma combinação das sete variáveis de configuração.'],
  ['Conjunto reservado', 'Ensaios separados desde o início e nunca usados no ajuste, guardados para a verificação final.'],
];

// Seções em que um termo novo pode entrar
const SECOES = ['Termos do time', 'Regiões térmicas', 'Variáveis de configuração do ensaio',
  'Colunas do dataset', 'Métricas', 'Validação', 'Estados dos componentes'];

export function montar(raiz, dados) {
  const crit = dados.metricasAreas?.criterio ?? {};
  const margem = (crit.margem_kpi ?? .1) * 100, alvo = crit.alvo_dentro_10 ?? 70, maxFA = crit.max_falso_aprovado_pct ?? 5;
  let termosTime = [];        // termos cadastrados pelo time (dados/glossario.json)

  const secao = (titulo, itens, aberta = false) => `
    <details class="ig-glossario__secao"${aberta ? ' open' : ''}>
      <summary><span class="ig-subhead">${escapar(titulo)}</span><span class="ig-nota">${itens.length} ${itens.length === 1 ? 'termo' : 'termos'}</span></summary>
      <dl class="ig-ficha">${itens.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    </details>`;

  const regioes = ORDEM_AREAS.map(a => [
    `<span class="ig-glossario__cor" style="background:${corRegiao(a)}"></span>${escapar(ROTULO_AREA[a])}`,
    `${escapar(DESCRICAO_AREA[a])}. ${dados.porArea?.[a] ? `${dados.porArea[a].componentes} componentes medidos neste teste.` : ''}`,
  ]);
  const estados = Object.entries(ESTADOS).map(([k, e]) => [rotuloEstado(k), escapar(`${e.risco}: ${e.negocio}.`)]);
  const criterio = [
    ['Margem acordada', `As predições são consideradas dentro da margem quando erram menos de ${pct(margem, 0)} da temperatura medida.`],
    ['Alvo por região', `Uma região é aprovada quando ao menos ${pct(alvo, 0)} das predições ficam dentro da margem.`],
    ['Teto de falso aprovado', `A mesma região é reprovada se mais de ${pct(maxFA, 0)} das predições aprovarem componentes que atingiram o limite.`],
    ['Folga de atenção', `O componente entra em atenção quando a folga até o limite fica abaixo de ${pct(dados.parametros?.folga_atencao_pct ?? 10, 0)} do próprio limite.`],
  ];

  raiz.innerHTML = `
    <div class="ig-cabecalho">
      <p class="ig-kicker">${t('glos.kicker')}</p>
      <div class="ig-cabecalho__linha"><h1 class="ig-headline">${t('glos.titulo')}</h1></div>
      <p>Os nomes de variáveis e de componentes aparecem no dashboard exatamente como estão no dataset. O que cada um significa está aqui.</p>
    </div>
    <div class="ig-campo ig-glossario__busca">
      <label for="gBusca">${t('glos.buscar')}</label>
      <input type="text" id="gBusca" placeholder="ex.: falso aprovado, Housing, MAE" autocomplete="off">
    </div>
    <div id="gLista">
      ${secao('Regiões térmicas', regioes, true)}
      ${secao('Variáveis de configuração do ensaio', VARIAVEIS)}
      ${secao('Colunas do dataset', COLUNAS)}
      ${secao('Métricas', METRICAS)}
      ${secao('Validação', VALIDACAO)}
      ${secao('Critério de aprovação deste teste', criterio)}
      ${secao('Estados dos componentes', estados)}
      <div id="gTime"></div>
    </div>
    <p class="ig-nota" style="margin-top:var(--ig-e3)">Fontes: dataset e glossário da parceria Whirlpool × Inteli e documentação do projeto (seções 4.2 a 4.5).</p>`;

  renderTime();
  carregarTermos();

  /* ---------- termos cadastrados pelo time ---------- */
  function renderTime() {
    const alvoEl = raiz.querySelector('#gTime');
    if (!alvoEl) return;
    if (!termosTime.length) { alvoEl.innerHTML = ''; return; }
    const itens = termosTime.map(t => [
      escapar(t.termo),
      `${escapar(t.definicao)} <span class="ig-nota">(${escapar(t.secao || 'Termos do time')}${t.adicionado_em ? ` · ${escapar(t.adicionado_em)}` : ''})</span>`,
    ]);
    alvoEl.innerHTML = secao('Termos do time', itens, true);
  }

  async function carregarTermos() {
    try {
      const r = await fetch('dados/glossario.json', { cache: 'no-store' });
      if (!r.ok) return;
      termosTime = (await r.json()).termos ?? [];
      renderTime();
    } catch (e) { /* sem arquivo ainda: a seção fica de fora */ }
  }

  const busca = raiz.querySelector('#gBusca');
  busca.addEventListener('input', () => {
    const q = busca.value.trim().toLowerCase();
    raiz.querySelectorAll('.ig-glossario__secao').forEach(sec => {
      let achou = 0;
      sec.querySelectorAll('dt').forEach(dt => {
        const dd = dt.nextElementSibling;
        const casa = !q || (dt.textContent + ' ' + (dd?.textContent ?? '')).toLowerCase().includes(q);
        dt.hidden = !casa; if (dd) dd.hidden = !casa;
        if (casa) achou++;
      });
      sec.hidden = q && !achou;
      if (q && achou) sec.open = true;
    });
  });

  return { atualizar() {}, desmontar() {} };
}
