// Visão Geral (Composição): o fogão em 3D, seletor de regiões e painel da região.
import { Fogao3D } from '../../geometriaFogao/fogao3d.js';
import { estado, definir, alternarRegiao, definirRegioes, regioesAtivas, tecnico, movimentoReduzido } from '../estado.js';
import { ORDEM_AREAS, ROTULO_AREA, DESCRICAO_AREA } from '../dados.js';
import { graus, numero, escapar, inteiro, rotulo, ROTULO_BLOWER, ROTULO_HOUSING, ROTULO_BOARD, ROTULO_MATERIAL,
  ROTULO_RUN_CASE, ROTULO_REASON } from '../formato.js';
import { corTemperatura, corEstado, corRegiao, rampaCss, token } from '../graficos.js';
import { rotuloEstado, tabela, vazio, espec, botao, ativarOrdenacao, notaDidatica, kpi, equivalentePorArea } from '../ui.js';
import { t, avisoIdioma } from '../i18n.js';

const GRUPOS_CONFIG = [
  ['vg.configComponentes', ['blower_direction', 'housing', 'board_position', 'deflector_hole', 'material_coil_support']],
  ['vg.configEnsaio', ['run_case', 'losses', 'reason']],
];
const ROTULOS_VALOR = { blower_direction: ROTULO_BLOWER, housing: ROTULO_HOUSING, board_position: ROTULO_BOARD,
  deflector_hole: ROTULO_HOUSING, material_coil_support: ROTULO_MATERIAL, run_case: ROTULO_RUN_CASE, reason: ROTULO_REASON };
const PADRAO_CONFIG = { reason: 'not_declared' };

const GRUPOS_EXCLUSIVOS = {};

async function pedirJson(url, corpo) {
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  } catch (e) {
    throw new Error(t('vg.configSemServidor'));
  }
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || `${r.status}`);
  return dados;
}

export function montar(raiz, dados) {
  const geo = dados.geometria, base = dados.catalogo ?? [];
  const opcoes = dados.parametros?.configuracao?.opcoes;
  raiz.innerHTML = `
    <div class="ig-cabecalho">
      <p class="ig-kicker">${t('vg.kicker')}</p>
      <div class="ig-cabecalho__linha"><h1 class="ig-headline" id="vgTitulo">${t('vg.titulo')}</h1><span id="vgTeste"></span></div>
      <p id="vgSub">${t('vg.sub')}</p>${avisoIdioma()}
    </div>
    <div class="ig-ferramentas" role="toolbar" aria-label="${t('vg.controles')}">
      <label class="ig-ferramenta">${t('vg.explodir')} <input type="range" id="vgExplodir" min="0" max="100" value="0" aria-label="${t('vg.explodirAria')}"><span id="vgExplodirV">0 %</span></label>
      <label class="ig-ferramenta"><input type="checkbox" id="vgCalor"> ${t('vg.mapaCalor')}</label>
      <label class="ig-ferramenta"><input type="checkbox" id="vgRaioX"> ${t('vg.raioX')}</label>
      <span class="ig-ferramenta">${t('vg.vista')}
        ${['frente', 'topo', 'traseira'].map(v => `<button type="button" class="ig-botao ig-botao--terciario ig-botao--pequeno" data-vista="${v}">${t(`vg.${v}`)}</button>`).join('')}
        <button type="button" class="ig-botao ig-botao--secundario ig-botao--pequeno" data-vista="padrao"><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i>${t('vg.resetar')}</button>
      </span>
    </div>
    <div class="ig-veredito" id="vgVeredito" role="status" aria-live="polite" hidden></div>
    <div class="ig-3d">
      <div class="ig-3d__principal">
        <div class="ig-cena" id="vgCena">
          <div class="ig-cena__selos" id="vgSelos"></div>
          <div class="ig-cena__dica">${t('vg.dica')}</div>
        </div>
        <section class="ig-configuracao" id="vgConfig" aria-labelledby="vgConfigTitulo"></section>
      </div>
      <div class="ig-lateral">
        <div class="ig-legenda" id="vgLegenda" aria-label="Legenda do modelo 3D"></div>
        <aside class="ig-painel" id="vgPainel" aria-label="Resumo das regiões selecionadas"></aside>
      </div>
    </div>
    <div class="ig-bloco" id="vgLista"></div>`;

  const cena = raiz.querySelector('#vgCena'), painel = raiz.querySelector('#vgPainel'), lista = raiz.querySelector('#vgLista');
  const dica = document.getElementById('dica3d');
  if (!estado.escolhidos) estado.escolhidos = new Set();
  const escolhidos = estado.escolhidos;
  let cat = base, porNome = new Map();
  function aplicarPrevisao() {
    const prev = estado.previsao;
    cat = (prev ? base.map(c => {
      const p = prev.porNome[c.componente];
      return p ? { ...c, t_max_prevista: p.previsto, folga_min: p.folga, veredito: p.veredito, incerteza: p.incerteza ?? c.incerteza } : c;
    }) : base).filter(c => escolhidos.has(c.componente));
    porNome = new Map(cat.map(c => [c.componente, c]));
  }
  aplicarPrevisao();
  let fogao = null;

  if (!geo) {
    cena.innerHTML = vazio('Sem geometria do modelo', 'Rode src/frontend/dados/exportar.py para gerar geometria_3d.json.', 'ph-cube');
  } else {
    try {
      fogao = new Fogao3D(cena, geo, { aoPassar: passar, aoClicar: (nome, regiao) => { if (regiao) alternarRegiao(regiao); else if (estado.regioes.size) definirRegioes([]); } });
      cena.querySelector('canvas').setAttribute('role', 'img');
      cena.querySelector('canvas').setAttribute('tabindex', '0');
    } catch (e) {
      cena.innerHTML = vazio('Não foi possível iniciar o 3D', 'Confira se src/frontend/assets/vendor/three existe (python src/frontend/tools/baixarVendor.py) e recarregue a página.', 'ph-cube');
    }
    const selos = [];
    if ((geo.modelo?.origem ?? 'aproximada') !== 'cad') selos.push(`<span class="ig-selo ig-selo--atencao"><i class="ph ph-ruler" aria-hidden="true"></i>${t('vg.posicoes')}</span>`);
    selos.push(`<span class="ig-selo ig-selo--neutro"><i class="ph ph-cube" aria-hidden="true"></i>${escapar(geo.modelo?.fonte ?? 'geometria paramétrica')}</span>`);
    raiz.querySelector('#vgSelos').innerHTML = selos.join('');
  }

  let mapaCalor = false;
  const caixaCalor = raiz.querySelector('#vgCalor'), caixaRaioX = raiz.querySelector('#vgRaioX');
  raiz.querySelector('#vgExplodir').addEventListener('input', e => { fogao?.explodir(e.target.value / 100); raiz.querySelector('#vgExplodirV').textContent = `${e.target.value} %`; });

  // O mapa de calor só serve para alguma coisa se as peças internas aparecerem:
  // ligar o mapa liga o raio-X junto, e desligar devolve a carcaça fechada. Quem
  // mexer na caixa do raio-X passa a mandar nela, e o mapa não a move mais.
  let raioXManual = false;
  function raioX(ligado) { caixaRaioX.checked = ligado; fogao?.raioX(ligado); }
  caixaCalor.addEventListener('change', e => {
    mapaCalor = e.target.checked;
    if (!raioXManual) raioX(mapaCalor);
    pintar();
  });
  caixaRaioX.addEventListener('change', e => { raioXManual = true; fogao?.raioX(e.target.checked); });
  raiz.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => fogao?.vista(b.dataset.vista)));

  // Teste aberto pelo Histórico: os controles começam nos valores da configuração dele.
  // O raio-X segue o que a configuração diz; só acompanha o mapa de calor quando ela
  // não informa o raio-X ou informa o mesmo valor do mapa.
  const visao = estado.testeSelecionado?.visao;
  if (visao) {
    raiz.querySelector('#vgExplodir').value = String(visao.explodir);
    raiz.querySelector('#vgExplodirV').textContent = `${visao.explodir} %`;
    fogao?.explodir(visao.explodir / 100);
    mapaCalor = visao.mapaCalor;
    caixaCalor.checked = mapaCalor;
    raioXManual = visao.raioX !== null && visao.raioX !== visao.mapaCalor;
    raioX(visao.raioX ?? visao.mapaCalor);
    if (visao.vista !== 'padrao') fogao?.vista(visao.vista, true);
  }

  // Selo do teste escolhido no Histórico. Teste fictício não tem dados próprios: o selo
  // diz de qual teste são os números que aparecem na tela.
  function renderTeste() {
    const alvo = raiz.querySelector('#vgTeste'), sel = estado.testeSelecionado;
    if (!sel) { alvo.innerHTML = ''; return; }
    const real = estado.registro?.testes?.find(x => x.id === estado.teste)?.nome ?? estado.teste ?? '';
    const entrando = movimentoReduzido() ? '' : ' ig-selo--entrando';
    alvo.innerHTML = sel.ficticio
      ? `<span class="ig-selo ig-selo--atencao ig-selo--texto${entrando}"><i class="ph ph-flask" aria-hidden="true"></i><span>${escapar(t('vg.testeFicticio', { nome: sel.nome, real }))}</span></span>`
      : `<span class="ig-selo ig-selo--neutro ig-selo--texto${entrando}"><i class="ph ph-clock-counter-clockwise" aria-hidden="true"></i><span>${escapar(t('vg.testeSelecionado', { nome: sel.nome }))}</span></span>`;
  }

  function ativas() { return regioesAtivas(ORDEM_AREAS); }
  function compsDe(regioes) { return cat.filter(c => regioes.includes(c.area)); }

  // escala de temperatura das regiões ativas (mín/máx das máximas previstas)
  function faixa(regioes) {
    const v = compsDe(regioes).map(c => c.t_max_prevista).filter(x => x != null);
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1];
  }

  function pintar() {
    if (!fogao) return;
    const at = ativas(), [mn, mx] = faixa(at), tec = tecnico();
    fogao.atenuarContexto(estado.regioes.size > 0);
    fogao.colorir((nome, regiao) => {
      const ativa = at.includes(regiao);
      if (!ativa) return { cor: null, ativa };
      if (nome && !escolhidos.has(nome)) return { cor: token('--ig-cena-aco-escuro'), ativa };
      const c = nome ? porNome.get(nome) : null;
      if (mapaCalor) {
        if (!c || c.t_max_prevista == null) return { cor: token('--ig-cena-aco-escuro'), ativa };
        return { cor: corTemperatura(mx === mn ? .5 : (c.t_max_prevista - mn) / (mx - mn)), ativa };
      }
      if (!tec && c) return { cor: corEstado(c.veredito), ativa };
      return { cor: corRegiao(regiao), ativa };
    });
    const leg = raiz.querySelector('#vgLegenda');
    if (mapaCalor) {
      const meio = (mn + mx) / 2;
      leg.innerHTML = `<b>${t('vg.legendaCalor')}</b>
        <div class="ig-legenda__barra" role="img" aria-label="Escala de ${graus(mn)} (mais frio) a ${graus(mx)} (mais quente)" style="background:${rampaCss('temperatura')}"></div>
        <div class="ig-legenda__escala"><span>${graus(mn)}</span><span>${graus(meio)}</span><span>${graus(mx)}</span></div>
        <p class="ig-legenda__nota">${t(estado.daltonismo === 'sem-cor' ? 'vg.legendaNotaCalorSemCor' : 'vg.legendaNotaCalor')}</p>
        <p class="ig-legenda__nota">${t('vg.raioXAuto')}</p>`;
    } else if (tec) {
      leg.innerHTML = `<b>${t('vg.legendaRegioes')}</b>
        <ul class="ig-legenda__itens">${at.map(a => `<li><span class="ig-legenda__cor" style="background:${corRegiao(a)}"></span>${escapar(ROTULO_AREA[a])}</li>`).join('')}</ul>
        <p class="ig-legenda__nota">${t('vg.legendaNotaRegioes')}</p>`;
    } else {
      leg.innerHTML = `<b>${t('vg.legendaEstado')}</b>
        <ul class="ig-legenda__itens">${['seguro', 'atencao', 'critico'].map(e => `<li><span class="ig-legenda__cor" style="background:${corEstado(e)}"></span>${rotuloEstado(e, { modo: 'naotecnico' })}</li>`).join('')}</ul>
        <p class="ig-legenda__nota">${t('vg.legendaNotaEstado')}</p>`;
    }
    const quentes = compsDe(at).filter(c => c.t_max_prevista != null).sort((a, b) => b.t_max_prevista - a.t_max_prevista);
    const q = quentes[0];
    const aria = `Fogão em 3D. ${estado.regioes.size ? `Regiões selecionadas: ${at.map(a => ROTULO_AREA[a]).join(', ')}` : 'Todas as 7 regiões'}. ${compsDe(at).length} componentes${q ? `; o mais quente é ${q.componente} a ${graus(q.t_max_prevista)}, ${q.folga_min == null ? 'sem limite' : q.folga_min < 0 ? `${graus(-q.folga_min)} acima do limite` : `${graus(q.folga_min)} abaixo do limite`}` : ''}.`;
    cena.querySelector('canvas')?.setAttribute('aria-label', aria);
  }

  function passar(h, e) {
    if (!h) { dica.hidden = true; if (estado.regiaoSob) definir({ regiaoSob: null }); return; }
    const c = porNome.get(h.nome);
    if (h.regiao !== estado.regiaoSob) definir({ regiaoSob: h.regiao });
    const est = c?.veredito ?? 'neutro';
    if (tecnico()) {
      dica.innerHTML = `<b>${escapar(h.nome)}</b><span class="ig-nota">${ROTULO_AREA[h.regiao]}</span>
        ${c && c.t_max_prevista != null ? `<span>Máx. prevista ${graus(c.t_max_prevista)} ± ${graus(c.incerteza)}</span><span>Limite ${c.limite_c == null ? 'só monitorar' : graus(c.limite_c, 0)}${c.folga_min != null ? ` · folga ${graus(c.folga_min)}` : ''}</span>` : '<span>Sem predição do modelo</span>'}
        ${rotuloEstado(est)}`;
    } else {
      dica.innerHTML = `<b>${escapar(h.nome)}</b><span class="ig-nota">${ROTULO_AREA[h.regiao]}</span>${rotuloEstado(est, { modo: 'naotecnico', detalhe: espec(est).negocio })}`;
    }
    dica.hidden = false;
    const x = Math.min(innerWidth - 300, e.clientX + 14), y = Math.min(innerHeight - 120, e.clientY + 14);
    dica.style.left = `${x}px`; dica.style.top = `${y}px`;
  }

  // regiões do recorte que têm ao menos um componente no protótipo
  function regioesDoPrototipo() { return ativas().filter(a => cat.some(c => c.area === a)); }

  function renderPainel() {
    const at = regioesDoPrototipo(), tec = tecnico();
    if (!base.length) { painel.innerHTML = vazio('Sem catálogo de componentes', 'Exporte componentes.csv com src/frontend/dados/exportar.py.'); return; }
    if (!at.length) { painel.innerHTML = vazio(t('vg.prototipoVazio'), t('vg.prototipoVazioPasso'), 'ph-list-checks'); return; }
    const blocos = at.map(a => {
      const cs = compsDe([a]), comPred = cs.filter(c => c.t_max_prevista != null);
      const q = [...comPred].sort((x, y) => y.t_max_prevista - x.t_max_prevista)[0];
      const pior = ['critico', 'atencao', 'seguro'].find(e => cs.some(c => c.veredito === e)) ?? 'monitorar';
      const m = dados.porArea[a];
      const n = { critico: cs.filter(c => c.veredito === 'critico').length, atencao: cs.filter(c => c.veredito === 'atencao').length };
      return `<section class="ig-cartao${pior === 'critico' ? ' ig-cartao--critico' : ''}" data-regiao="${a}">
        <div class="ig-bloco__topo"><p class="ig-rotulo">${ROTULO_AREA[a]}</p>${rotuloEstado(pior, { modo: estado.modo })}</div>
        <p class="ig-nota">${DESCRICAO_AREA[a]} · ${inteiro(cs.length)} componentes${comPred.length < cs.length ? ` (${inteiro(cs.length - comPred.length)} sem predição)` : ''}</p>
        ${tec
          ? `<p>${q ? `Mais quente: <b>${escapar(q.componente)}</b> a ${graus(q.t_max_prevista)}${q.limite_c != null ? `, limite ${graus(q.limite_c, 0)}` : ''}` : 'Sem predições'}</p>
             ${m ? `<p class="ig-nota">${numero(m.dentro_10, 1)} % das predições dentro da margem · MAE ${graus(m.mae, 2)}</p>` : ''}`
          : `<p>${n.critico ? `<b>${inteiro(n.critico)}</b> ${n.critico === 1 ? 'componente acima do limite' : 'componentes acima do limite'}` : n.atencao ? `<b>${inteiro(n.atencao)}</b> com folga apertada, nenhum acima do limite` : 'Todos os componentes com folga confortável'}.</p>
             <ul class="ig-estados-comp">${['critico', 'atencao', 'seguro', 'monitorar'].map(e => {
               const q = cs.filter(c => c.veredito === e).length;
               return q ? `<li>${rotuloEstado(e, { modo: 'naotecnico', texto: `${inteiro(q)} ${q === 1 ? 'componente' : 'componentes'}`, detalhe: espec(e).negocio })}</li>` : '';
             }).join('')}</ul>
             ${m ? `<p class="ig-nota">${m.viavel ? 'Região confiável para triagem.' : 'Região precisa de simulação completa.'}</p>` : ''}`}
        ${botao(t('vg.verTestes'), { variante: 'secundario', pequeno: true, icone: 'ph-shield-check', atributos: `data-ver-testes="${a}"` })}
      </section>`;
    });
    const total = compsDe(at), ok = total.filter(c => c.veredito === 'seguro').length;
    const cabeca = tec
      ? kpi({ titulo: t('vg.regioesPrototipo'), valor: `${inteiro(at.length)} de 7`, apoio: `${inteiro(total.length)} componentes · ${inteiro(total.filter(c => c.veredito === 'critico').length)} acima do limite` })
      : notaDidatica(`<b>${inteiro(at.filter(a => dados.porArea[a]?.viavel).length)} de ${inteiro(at.length)}</b> regiões estão ok para triagem pelo modelo; ${inteiro(at.filter(a => dados.porArea[a] && !dados.porArea[a].viavel).length)} exigem atenção. ${inteiro(ok)} de ${inteiro(total.length)} componentes com folga confortável.`, 'ph-info');
    painel.innerHTML = cabeca + blocos.join('');
    painel.querySelectorAll('[data-ver-testes]').forEach(b => b.addEventListener('click', () => { definirRegioes([b.dataset.verTestes]); definir({ tela: 'testes' }); }));
    painel.querySelectorAll('[data-regiao]').forEach(s => {
      s.addEventListener('pointerenter', () => definir({ regiaoSob: s.dataset.regiao }));
      s.addEventListener('pointerleave', () => definir({ regiaoSob: null }));
    });
  }

  function renderLista() {
    const at = regioesDoPrototipo(), tec = tecnico(), comps = compsDe(at);
    const semNo = c => !geo?.componentes?.[c.componente];
    const nomeCol = { titulo: t('col.componente'), campo: 'componente', formato: l => `${escapar(l.componente)}${semNo(l) ? '<span class="ig-sem-posicao" title="Sem nó no modelo 3D">sem posição no modelo</span>' : ''}` };
    const colunas = tec ? [
      nomeCol, { titulo: t('col.regiao'), campo: 'area', formato: l => ROTULO_AREA[l.area] },
      { titulo: estado.previsao ? 'Prevista na configuração' : 'Máx. prevista', campo: 't_max_prevista', unidade: '°C', num: true, casas: 1 },
      { titulo: 'Incerteza (MAE)', campo: 'incerteza', unidade: '°C', num: true, casas: 1 },
      { titulo: 'Limite', campo: 'limite_c', unidade: '°C', num: true, casas: 0, formato: l => l.limite_c == null ? '<span class="ig-apoio">monitorar</span>' : numero(l.limite_c, 0) },
      { titulo: 'Folga', campo: 'folga_min', unidade: '°C', num: true, casas: 1, sinal: true },
      { titulo: 'Estado', campo: 'veredito', formato: l => rotuloEstado(l.veredito) },
    ] : [nomeCol, { titulo: 'Região', campo: 'area', formato: l => ROTULO_AREA[l.area] }, { titulo: 'Risco', campo: 'veredito', formato: l => rotuloEstado(l.veredito, { modo: 'naotecnico', detalhe: espec(l.veredito).negocio }) }];
    const ordem = { critico: 0, atencao: 1, seguro: 2, monitorar: 3, sem_predicao: 4 };
    const porRegiao = at.map(a => {
      const linhas = comps.filter(c => c.area === a)
        .sort((x, y) => (ordem[x.veredito] ?? 9) - (ordem[y.veredito] ?? 9) || (x.folga_min ?? 1e9) - (y.folga_min ?? 1e9));
      const criticos = linhas.filter(c => c.veredito === 'critico').length;
      return {
        rotulo: ROTULO_AREA[a],
        resumo: `${inteiro(linhas.length)} ${linhas.length === 1 ? 'componente' : 'componentes'}${criticos ? ` · ${inteiro(criticos)} acima do limite` : ''}`,
        detalhe: `<div class="ig-lista-comp">${tabela({ colunas, linhas, densa: true, destacar: l => l.veredito === 'critico', legenda: `Componentes de ${ROTULO_AREA[a]}`, atributo: 'area' })}</div>`,
      };
    });
    lista.innerHTML = `<div class="ig-bloco__topo"><p class="ig-subhead">${t('vg.componentes')}</p><span class="ig-nota">${inteiro(comps.length)} componentes · equivalente textual do modelo 3D</span></div>
      ${equivalentePorArea(porRegiao, t('vg.verComponentes'))}`;
    ativarOrdenacao(lista);
    lista.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('pointerenter', () => definir({ regiaoSob: tr.dataset.area }));
      tr.addEventListener('pointerleave', () => definir({ regiaoSob: null }));
    });
  }

  /* ---------- configuração do fogão: prever e salvar no histórico ---------- */
  const CAMPOS = GRUPOS_CONFIG.flatMap(([, campos]) => campos);
  const config = { ...PADRAO_CONFIG, ...(estado.configuracao ?? {}) };
  const chave = c => CAMPOS.map(k => c?.[k] ?? '').join('|');
  const caixa = raiz.querySelector('#vgConfig');

  function mensagem(texto, tipo = '') {
    const m = caixa.querySelector('#vgConfigMsg');
    if (!m) return;
    m.className = `ig-nota ig-configuracao__msg${tipo ? ` ig-configuracao__msg--${tipo}` : ''}`;
    m.textContent = texto;
  }

  function atualizarAcoes() {
    const prev = estado.previsao, emDia = prev && chave(prev.configuracao) === chave(config);
    const salvar = caixa.querySelector('#vgSalvar'), limpar = caixa.querySelector('#vgLimpar');
    if (salvar) salvar.disabled = !emDia;
    if (limpar) limpar.hidden = !prev;
    if (!escolhidos.size) mensagem(t('vg.configEscolhaComps'), 'atencao');
    else if (!prev) mensagem(t('vg.configSemPrevisao'));
    else if (emDia && estado.origemHistorico) {
      const h = estado.origemHistorico;
      mensagem(h.versao && h.versao !== prev.versao
        ? t('vg.configDoHistoricoOutraVersao', { codigo: h.codigo, antiga: h.versao, versao: prev.versao })
        : t('vg.configDoHistorico', { codigo: h.codigo, versao: prev.versao }), h.versao !== prev.versao ? 'atencao' : '');
    } else if (emDia) mensagem(t('vg.configPrevista', { versao: prev.versao }));
    else mensagem(t('vg.configMudou'), 'atencao');
  }

  // Componentes de mesma função numa região, pelo nome: numeração final (IGBT 1 a 16,
  // Reso Cap 1 a 8), posição da bobina (Coil FL, FR, RL, RR) e lado dos encoders.
  const funcao = nome => nome.replace(/\s+\d+$/, '').replace(/\s+(FR|FL|RR|RL)$/, '')
    .replace(/\b(Left|Right)( Center)?\s+/g, '').trim();

  function regiaoHtml(a) {
    const comps = base.filter(c => c.area === a);
    if (!comps.length) return '';
    const grupos = new Map();
    comps.forEach(c => { const f = funcao(c.componente); grupos.set(f, [...(grupos.get(f) ?? []), c]); });
    // grupo exclusivo: botões de opção com o mesmo name, e só o atalho Nenhum
    const item = (c, gid, unico = false) => `<label class="ig-configuracao__item"><input type="${unico ? 'radio' : 'checkbox'}"
      ${unico ? `name="vgGrupo-${gid}" ` : ''}data-comp="${escapar(c.componente)}" data-grupo="${gid}"${escolhidos.has(c.componente) ? ' checked' : ''}> ${escapar(c.componente)}</label>`;
    const atalhos = (gid, unico = false) => (unico ? '' : botao(t('vg.configTodos'), { variante: 'terciario', pequeno: true, atributos: `data-grupo="${gid}" data-marcar="1"` }))
      + botao(t('vg.configNenhum'), { variante: 'terciario', pequeno: true, atributos: `data-grupo="${gid}" data-marcar="0"` });
    const blocos = [], unicos = [];
    [...grupos].forEach(([f, membros], k) => {
      if (membros.length < 2) { unicos.push(...membros); return; }
      const gid = `${a}-${k}`, exclusivo = (GRUPOS_EXCLUSIVOS[a] ?? []).includes(f);
      blocos.push(`<fieldset class="ig-configuracao__funcao"><legend><span>${escapar(f)} <span class="ig-nota">(${exclusivo ? t('vg.configUmSo') : inteiro(membros.length)})</span></span>${atalhos(gid, exclusivo)}</legend>
        <div class="ig-configuracao__itens">${membros.map(c => item(c, gid, exclusivo)).join('')}</div></fieldset>`);
    });
    if (unicos.length) {
      const gid = `${a}-u`;
      blocos.push(`<fieldset class="ig-configuracao__funcao"><legend><span>${t('vg.configUnicos')}</span>${atalhos(gid)}</legend>
        <div class="ig-configuracao__itens">${unicos.map(c => item(c, gid)).join('')}</div></fieldset>`);
    }
    const aberta = comps.some(c => escolhidos.has(c.componente)) ? ' open' : '';
    return `<details class="ig-configuracao__regiao" data-regiao="${a}"${aberta}><summary><span>${ROTULO_AREA[a]}</span>
      <span class="ig-nota" data-contagem="${a}"></span></summary><div class="ig-configuracao__funcoes">${blocos.join('')}</div></details>`;
  }

  function contagens() {
    ORDEM_AREAS.forEach(a => {
      const el = caixa.querySelector(`[data-contagem="${a}"]`);
      if (!el) return;
      const da = base.filter(c => c.area === a);
      el.textContent = t('vg.configContagem', { sel: inteiro(da.filter(c => escolhidos.has(c.componente)).length), n: inteiro(da.length) });
    });
  }

  function renderConfig() {
    if (!opcoes) {
      caixa.innerHTML = `<p class="ig-subhead" id="vgConfigTitulo">${t('vg.config')}</p>
        ${vazio(t('vg.configSemOpcoes'), t('vg.configSemOpcoesPasso'), 'ph-sliders')}`;
      return;
    }
    for (const campo of CAMPOS) if (!(campo in config)) config[campo] = opcoes[campo]?.[0] ?? null;
    const campoHtml = campo => {
      const itens = (campo === 'losses' ? [['', t('vg.configNaoDeclarado')]] : [])
        .concat((opcoes[campo] ?? []).map(v => [v, rotulo(ROTULOS_VALOR[campo] ?? {}, v)]));
      const atual = config[campo] ?? '';
      return `<div class="ig-campo"><label for="vgCfg_${campo}">${t(`vg.campo.${campo}`)}</label>
        <select id="vgCfg_${campo}" data-campo="${campo}">${itens.map(([v, r]) =>
          `<option value="${escapar(v)}"${v === atual ? ' selected' : ''}>${escapar(r)}</option>`).join('')}</select></div>`;
    };
    caixa.innerHTML = `
      <div class="ig-bloco__topo"><p class="ig-subhead" id="vgConfigTitulo">${t('vg.config')}</p>
        <span class="ig-nota">${t('vg.configApoio')}</span></div>
      <div class="ig-configuracao__grade">${GRUPOS_CONFIG.map(([rot, campos]) =>
        `<fieldset class="ig-configuracao__grupo"><legend class="ig-rotulo">${t(rot)}</legend>
          <div class="ig-configuracao__campos">${campos.map(campoHtml).join('')}</div></fieldset>`).join('')}</div>
      <div class="ig-configuracao__comps">
        <p class="ig-rotulo">${t('vg.configComps')}</p>
        <p class="ig-nota">${t('vg.configCompsApoio')}</p>
        ${ORDEM_AREAS.map(regiaoHtml).join('')}
      </div>
      <div class="ig-configuracao__acoes">
        ${botao(t('vg.configPrever'), { icone: 'ph-play', id: 'vgPrever' })}
        <div class="ig-campo ig-configuracao__nome"><label for="vgNome">${t('vg.configNome')}</label>
          <input type="text" id="vgNome" maxlength="100" value="${escapar(estado.nomeConfiguracao ?? '')}" placeholder="${escapar(t('vg.configNomeExemplo'))}"></div>
        ${botao(t('vg.configSalvar'), { variante: 'secundario', icone: 'ph-floppy-disk', id: 'vgSalvar' })}
        ${botao(t('vg.configLimpar'), { variante: 'terciario', icone: 'ph-arrow-counter-clockwise', id: 'vgLimpar' })}
      </div>
      <p class="ig-nota ig-configuracao__msg" id="vgConfigMsg" role="status" aria-live="polite"></p>`;

    caixa.querySelectorAll('select[data-campo]').forEach(s => s.addEventListener('change', () => {
      config[s.dataset.campo] = s.value === '' ? null : s.value;
      estado.origemHistorico = null;
      estado.configuracao = { ...config };
      atualizarAcoes();
    }));
    caixa.querySelector('#vgNome').addEventListener('input', e => { estado.nomeConfiguracao = e.target.value; });

    const aoEscolher = () => { estado.origemHistorico = null; aplicarPrevisao(); tudo(); contagens(); atualizarAcoes(); };
    const marcar = (i, ligado) => { i.checked = ligado; if (ligado) escolhidos.add(i.dataset.comp); else escolhidos.delete(i.dataset.comp); };
    caixa.querySelectorAll('input[data-comp]').forEach(i => i.addEventListener('change', () => {
      // num grupo exclusivo, marcar um componente desmarca os demais do grupo
      if (i.type === 'radio') caixa.querySelectorAll(`input[data-grupo="${i.dataset.grupo}"]`).forEach(o => { if (o !== i) marcar(o, false); });
      marcar(i, i.checked);
      aoEscolher();
    }));
    caixa.querySelectorAll('button[data-marcar]').forEach(b => b.addEventListener('click', () => {
      caixa.querySelectorAll(`input[data-grupo="${b.dataset.grupo}"]`).forEach(i => marcar(i, b.dataset.marcar === '1'));
      aoEscolher();
    }));
    contagens();

    const prever = caixa.querySelector('#vgPrever');
    const rotuloPrever = prever.innerHTML;
    prever.addEventListener('click', async () => {
      prever.disabled = true;
      prever.setAttribute('aria-busy', 'true');
      prever.innerHTML = `<i class="ph ph-spinner-gap ig-girando" aria-hidden="true"></i>${escapar(t('vg.configPrever'))}`;
      mensagem(t('vg.configPrevendo'));
      try {
        const r = await pedirJson('/api/prever', { configuracao: config });
        estado.previsao = { configuracao: r.configuracao, versao: r.versao_modelo,
          porNome: Object.fromEntries(r.componentes.map(c => [c.componente, c])) };
        aplicarPrevisao(); tudo(); atualizarAcoes();
      } catch (e) {
        mensagem(t('vg.configErro', { erro: e.message }), 'erro');
      } finally {
        prever.disabled = false;
        prever.removeAttribute('aria-busy');
        prever.innerHTML = rotuloPrever;
      }
    });

    const salvar = caixa.querySelector('#vgSalvar');
    salvar.addEventListener('click', async () => {
      const nome = caixa.querySelector('#vgNome').value.trim();
      if (!nome) { mensagem(t('vg.configSemNome'), 'atencao'); caixa.querySelector('#vgNome').focus(); return; }
      // Os componentes salvos são os das regiões do recorte, pelo código mascarado.
      const escolhidos = cat.filter(c => ativas().includes(c.area));
      if (!escolhidos.length) { mensagem(t('vg.configSemComponentes'), 'atencao'); return; }
      const componentes = escolhidos.filter(c => c.codigo).map(c => c.codigo);
      if (!componentes.length) { mensagem(t('vg.configSemCodigo'), 'erro'); return; }
      salvar.disabled = true;
      mensagem(t('vg.configSalvando'));
      try {
        const r = await pedirJson('/api/historico', { nome, linha: estado.linha, configuracao: estado.previsao.configuracao,
          componentes, versao_modelo: estado.previsao.versao });
        mensagem(t('vg.configSalva', { codigo: r.codigo, n: inteiro(r.componentes?.length ?? componentes.length) }), 'ok');
      } catch (e) {
        mensagem(t('vg.configErro', { erro: e.message }), 'erro');
      } finally {
        salvar.disabled = false;
      }
    });

    caixa.querySelector('#vgLimpar').addEventListener('click', () => {
      estado.previsao = null;
      estado.origemHistorico = null;
      aplicarPrevisao(); tudo(); atualizarAcoes();
    });
    atualizarAcoes();
  }

  /* ---------- veredito do protótipo ---------- */
  // Regra de projeto da parceira: um componente com limite ativo só é aprovado se a
  // temperatura prevista ficar até 90% do limite, isto é, com margem de segurança de
  // 10%. O fogão passa quando todos os componentes com limite do protótipo passam;
  // componentes sem limite são só monitorados e não decidem.
  const MARGEM = (dados.parametros?.folga_atencao_pct ?? 10) / 100;
  // Distância até os ensaios da base, nos sete campos que o ensaios.json registra: dá a
  // medida de quanto a previsão é interpolação e quanto é extrapolação.
  const CAMPOS_ENSAIO = [['run_case', 'run_case'], ['losses', 'losses'], ['material_coil_support', 'material'],
    ['housing', 'housing'], ['blower_direction', 'blower_direction'], ['board_position', 'board_position'],
    ['deflector_hole', 'deflector_hole']];
  const ensaiadas = [...new Map((dados.ensaios ?? []).map(e => {
    const v = CAMPOS_ENSAIO.map(([, k]) => e[k] ?? null);
    return [v.join('|'), v];
  })).values()];
  function distanciaEnsaios(cfg) {
    if (!ensaiadas.length || !cfg) return null;
    const v = CAMPOS_ENSAIO.map(([c]) => cfg[c] ?? null);
    return Math.min(...ensaiadas.map(e => e.reduce((n, x, i) => n + (x !== v[i] ? 1 : 0), 0)));
  }

  function renderVeredito() {
    const el = raiz.querySelector('#vgVeredito');
    const prev = estado.previsao;
    if (!prev || !cat.length) { el.hidden = true; el.innerHTML = ''; return; }
    const comLimite = cat.filter(c => c.limite_c != null && c.t_max_prevista != null);
    const teto = c => (1 - MARGEM) * c.limite_c;
    const reprovados = comLimite.filter(c => c.t_max_prevista > teto(c))
      .sort((a, b) => b.t_max_prevista / b.limite_c - a.t_max_prevista / a.limite_c);
    const acima = reprovados.filter(c => c.t_max_prevista > c.limite_c).length;
    const ressalva = comLimite.filter(c => c.t_max_prevista <= teto(c) && c.t_max_prevista + (c.incerteza ?? 0) > teto(c));
    const passa = comLimite.length > 0 && !reprovados.length;
    const dist = distanciaEnsaios(prev.configuracao);
    // a 3 ou mais campos do ensaio mais próximo a previsão é extrapolação: o veredito vale como indicação
    const indicativo = dist != null && dist >= 3;
    const lista = reprovados.slice(0, 5).map(c => `<li><b>${escapar(c.componente)}</b> ${graus(c.t_max_prevista)} ·
      ${t('vg.vereditoDoLimite', { pct: numero(100 * c.t_max_prevista / c.limite_c, 0), lim: graus(c.limite_c, 0) })}</li>`).join('');
    const confianca = dist == null ? '' : `<p class="ig-veredito__confianca${dist >= 3 ? ' ig-veredito__confianca--baixa' : ''}">
      <i class="ph ${dist >= 3 ? 'ph-warning' : 'ph-info'}" aria-hidden="true"></i>
      ${dist === 0 ? t('vg.vereditoEnsaiada') : t(dist >= 3 ? 'vg.vereditoExtrapolacao' : 'vg.vereditoProxima', { n: inteiro(dist) })}</p>`;
    el.className = `ig-veredito ig-veredito--${passa ? 'aprovado' : comLimite.length ? 'reprovado' : 'neutro'}${indicativo ? ' ig-veredito--indicativo' : ''}`;
    el.innerHTML = `
      <i class="ph ${passa ? 'ph-check-circle' : comLimite.length ? 'ph-x-circle' : 'ph-minus-circle'} ig-veredito__icone" aria-hidden="true"></i>
      <div class="ig-veredito__corpo">
        ${indicativo ? `<span class="ig-veredito__selo"><i class="ph ph-flask" aria-hidden="true"></i>${t('vg.vereditoIndicativo')}</span>` : ''}
        <p class="ig-veredito__titulo">${t(passa ? 'vg.vereditoAprovado' : comLimite.length ? 'vg.vereditoReprovado' : 'vg.vereditoSemLimite')}</p>
        <p>${t('vg.vereditoRegra', { lim: inteiro(100 - MARGEM * 100), pct: inteiro(MARGEM * 100) })}</p>
        <p class="ig-nota">${reprovados.length
          ? t('vg.vereditoResumo', { n: inteiro(comLimite.length), r: inteiro(reprovados.length), acima: inteiro(acima),
            margem: inteiro(reprovados.length - acima), mon: inteiro(cat.length - comLimite.length) })
          : t('vg.vereditoResumoOk', { n: inteiro(comLimite.length), lim: inteiro(100 - MARGEM * 100), mon: inteiro(cat.length - comLimite.length) })}</p>
        ${lista ? `<ul class="ig-veredito__lista">${lista}${reprovados.length > 5 ? `<li class="ig-nota">${t('vg.vereditoMais', { n: inteiro(reprovados.length - 5) })}</li>` : ''}</ul>` : ''}
        ${passa && ressalva.length ? `<p class="ig-nota">${t('vg.vereditoRessalva', { n: inteiro(ressalva.length) })}</p>` : ''}
        ${confianca}
      </div>`;
    el.hidden = false;
  }

  function tudo() { pintar(); renderPainel(); renderLista(); renderVeredito(); }
  renderConfig();
  tudo();
  renderTeste();
  if (estado.preverAoAbrir) {
    estado.preverAoAbrir = false;
    caixa.scrollIntoView({ block: 'start' });
    caixa.querySelector('#vgPrever')?.click();
  }

  return {
    atualizar(m) {
      if ('regioes' in m || 'modo' in m || 'linha' in m) tudo();
      if ('tema' in m) { fogao?.tema(); pintar(); }
      if ('regiaoSob' in m) fogao?.destacarRegiao(m.regiaoSob);
      if ('testeSelecionado' in m) renderTeste();
    },
    desmontar() { fogao?.dispose(); dica.hidden = true; },
  };
}
