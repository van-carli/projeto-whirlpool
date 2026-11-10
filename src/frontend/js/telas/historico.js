// Histórico: as configurações salvas no Supabase e os testes já realizados, um card por
// item, com uma barra de pesquisa para os dois. A pesquisa filtra enquanto a pessoa
// digita, sem diferenciar maiúsculas, minúsculas nem acentos: configurações por código e
// nome, testes por nome, id e descrição. Clicar numa configuração salva abre a Visão
// Geral e refaz a previsão dela (configuracaoSalva.js). Clicar num teste abre a Visão
// Geral com a configuração daquele teste; a escolha fica só no navegador (não troca o
// teste ativo do registro nem grava em testes.json).
// Os testes fictícios só entram com o banco offline e sem cópia da lista na aba: com o
// banco online, só aparecem dados reais.
import { estado, selecionarTeste, movimentoReduzido } from '../estado.js';
import { escapar, inteiro } from '../formato.js';
import { cartao, ficha, vazio, botao } from '../ui.js';
import { t, idioma } from '../i18n.js';
import { abrirConfiguracaoSalva, componentesDoRegistro } from '../configuracaoSalva.js';

// ---------- testes fictícios: só aparecem com o banco offline ----------
// Com USAR_MOCK = true e o banco fora do ar, os testes de dados/testes_mock.json entram
// depois dos reais. Para remover: troque para false (ou apague este bloco) e apague o arquivo.
const USAR_MOCK = true;
const ARQUIVO_MOCK = 'dados/testes_mock.json';

async function carregarMock() {
  if (!USAR_MOCK) return [];
  try {
    const r = await fetch(ARQUIVO_MOCK, { cache: 'no-store' });
    if (!r.ok) return [];
    return (await r.json()).testes ?? [];
  } catch (e) { return []; }
}
// ---------------------------------------------------------------------------------

// ---------- configurações salvas (Supabase, pelas rotas /api/historico do servir.py) ----------
const API_HISTORICO = '/api/historico';
// Última lista vinda do banco, guardada na aba: se a conexão cair no meio da sessão, a
// tela mostra essa lista em vez dos testes fictícios. Os registros têm só códigos
// mascarados e a configuração, sem dado pessoal, e somem ao fechar a aba.
const CHAVE_COPIA = 'ignis.historicoConfiguracoes';

/**
 * Lista as configurações salvas, uma vez por abertura da tela. Devolve
 * { configuracoes, erro, copiaDe }: com o banco fora do ar, vem a cópia da aba, se houver,
 * e `copiaDe` diz quando ela foi feita; sem cópia, a lista vem vazia e `erro` diz o
 * motivo, para a tela avisar sem deixar de mostrar os testes.
 */
async function carregarConfiguracoes() {
  let erro = null, corpo = null;
  try {
    const r = await fetch(API_HISTORICO, { cache: 'no-store' });
    corpo = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(corpo)) erro = corpo?.erro || t('vg.configSemServidor');
  } catch (e) {
    erro = t('vg.configSemServidor');
  }
  if (!erro) {
    const configuracoes = corpo.filter(c => typeof c?.codigo === 'string');
    try { sessionStorage.setItem(CHAVE_COPIA, JSON.stringify({ em: Date.now(), configuracoes })); } catch (e) { /* sem armazenamento */ }
    return { configuracoes, erro: null, copiaDe: null };
  }
  try {
    const copia = JSON.parse(sessionStorage.getItem(CHAVE_COPIA) || 'null');
    if (Array.isArray(copia?.configuracoes)) return { configuracoes: copia.configuracoes, erro: null, copiaDe: copia.em };
  } catch (e) { /* cópia ilegível: segue sem ela */ }
  return { configuracoes: [], erro, copiaDe: null };
}
// ---------------------------------------------------------------------------------

const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es' };
const MAX_SEQUENCIA = 8;      // a partir daqui os cards entram juntos, para a fila não demorar

// ---------- filtros: ordem, tipo e período, com o texto de cada opção ----------
const ORDENS = { recentes: 'hist.ordemRecentes', antigos: 'hist.ordemAntigos', nomeAZ: 'hist.ordemNomeAZ', nomeZA: 'hist.ordemNomeZA' };
const TIPOS = { todos: 'hist.tipoTodos', configuracoes: 'hist.cfgTitulo', testes: 'hist.lista' };
const PERIODOS = ['qualquer', '7', '30', '90'];     // número = últimos N dias
const FILTROS_PADRAO = { ordem: 'recentes', tipo: 'todos', periodo: 'qualquer' };
const DIA = 86400000;

/** Instante de uma data gravada: "2026-09-29" é lido como dia local; ISO com hora, como está. null se não há data. */
function instante(valor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor ?? ''));
  const ms = (m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valor ?? '')).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Aplica o período e a ordem a uma lista já filtrada pela pesquisa. `data(x)` e `nome(x)`
 * dizem de onde vêm os campos de cada item. Item sem data fica fora de qualquer período
 * e vai para o fim nas ordens por data; a ordem por nome ignora acentos e maiúsculas.
 */
function filtrarOrdenar(itens, filtros, data, nome) {
  const dias = Number(filtros.periodo);
  const limite = dias > 0 ? Date.now() - dias * DIA : null;
  const comData = itens.map(x => ({ x, ms: instante(data(x)) }))
    .filter(i => limite === null || (i.ms !== null && i.ms >= limite));
  const semData = (a, b) => Number(a.ms === null) - Number(b.ms === null);
  const porNome = (a, b) => String(nome(a.x) ?? '').localeCompare(String(nome(b.x) ?? ''), LOCALE[idioma()] ?? 'pt-BR', { sensitivity: 'base', numeric: true });
  const ORDENAR = {
    recentes: (a, b) => semData(a, b) || (b.ms ?? 0) - (a.ms ?? 0),
    antigos: (a, b) => semData(a, b) || (a.ms ?? 0) - (b.ms ?? 0),
    nomeAZ: porNome,
    nomeZA: (a, b) => porNome(b, a),
  };
  return comData.sort(ORDENAR[filtros.ordem] ?? ORDENAR.recentes).map(i => i.x);
}

/** <option>s de um select de filtro. `rotulos` mapeia valor -> chave do i18n ou texto pronto. */
function opcoes(rotulos, atual) {
  return Object.entries(rotulos).map(([valor, rotulo]) =>
    `<option value="${escapar(valor)}"${valor === atual ? ' selected' : ''}>${escapar(rotulo)}</option>`).join('');
}
// ---------------------------------------------------------------------------------

/** Texto sem acentos e em minúsculas, para comparar na pesquisa. */
const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** "2026-09-29" -> data curta por extenso no idioma atual. O dia é lido como data local. */
function dataLegivel(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(LOCALE[idioma()] ?? 'pt-BR', { dateStyle: 'medium' });
}

/** Instante gravado pelo banco (ISO com fuso) -> data e hora curtas, no idioma e no fuso de quem lê. */
function momentoLegivel(iso) {
  const d = new Date(iso ?? '');
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(LOCALE[idioma()] ?? 'pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Moldura dos cards. `ordem` é a posição do card na fila de entrada; null quando ele não anima. */
function item(conteudo, selecionado, ordem) {
  const entrada = ordem === null ? '' : ` ig-historico__item--entrando" style="--ig-ordem:${Math.min(ordem, MAX_SEQUENCIA)}`;
  return `<li class="ig-historico__item${entrada}">${cartao(conteudo, { classe: `ig-historico__card${selecionado ? ' ig-historico__card--selecionado' : ''}` })}</li>`;
}

/**
 * Card de uma configuração salva. A marca aparece na que está aberta na Visão Geral.
 * O banco guarda só os códigos mascarados dos componentes: os que o catálogo local não
 * reconhece (chave de mascaramento diferente da de quem salvou) são contados à parte.
 */
function cardConfiguracao(registro, catalogo, ordem = null) {
  const quando = momentoLegivel(registro.criado_em);
  const aberta = estado.origemHistorico?.codigo === registro.codigo;
  const { desconhecidos } = componentesDoRegistro(registro, catalogo);
  const linha = ['br', 'mx'].includes(registro.linha) ? t(`linha.${registro.linha}`) : (registro.linha || '—');
  const conteudo = `
    <button type="button" class="ig-historico__acao" data-configuracao="${escapar(registro.codigo)}"${aberta ? ' aria-current="true"' : ''}>${escapar(registro.nome || registro.codigo)}</button>
    ${aberta ? `<span class="ig-historico__marca"><i class="ph ph-check-circle" aria-hidden="true"></i>${escapar(t('hist.cfgAberta'))}</span>` : ''}
    ${ficha([
      [t('hist.cfgCodigo'), `<code>${escapar(registro.codigo)}</code>`],
      [t('hist.cfgLinha'), escapar(linha)],
      [t('hist.cfgSalvaEm'), quando ? `<time datetime="${escapar(registro.criado_em)}">${escapar(quando)}</time>` : '—'],
      [t('hist.cfgModelo'), escapar(registro.versao_modelo || '—')],
      [t('hist.cfgComponentes'), `${inteiro((registro.componentes ?? []).length)}${desconhecidos
        ? ` <span class="ig-nota">(${escapar(t('hist.cfgDesconhecidos', { n: inteiro(desconhecidos) }))})</span>` : ''}`],
    ])}`;
  return item(conteudo, aberta, ordem);
}

/** Card de um teste. `ordem` como em item(). */
function card(teste, ordem = null) {
  const data = dataLegivel(teste.gerado_em);
  const selecionado = estado.testeSelecionado?.id === teste.id;
  const conteudo = `
    <button type="button" class="ig-historico__acao" data-teste="${escapar(teste.id)}"${selecionado ? ' aria-current="true"' : ''}>${escapar(teste.nome || teste.id)}</button>
    <span class="ig-historico__marca"${selecionado ? '' : ' hidden'}><i class="ph ph-check-circle" aria-hidden="true"></i>${escapar(t('hist.selecionado'))}</span>
    ${teste.ficticio ? `<span class="ig-selo ig-selo--atencao ig-historico__exemplo"><i class="ph ph-flask" aria-hidden="true"></i>${escapar(t('hist.exemplo'))}</span>` : ''}
    <p class="ig-historico__descricao${teste.descricao ? '' : ' ig-apoio'}">${escapar(teste.descricao || t('hist.semDescricao'))}</p>
    ${ficha([
      [t('hist.id'), `<code>${escapar(teste.id)}</code>`],
      [t('hist.geradoEm'), data ? `<time datetime="${escapar(teste.gerado_em)}">${escapar(data)}</time>` : '—'],
      [t('hist.ensaios'), inteiro(teste.ensaios)],
    ])}`;
  return item(conteudo, selecionado, ordem);
}

export function montar(raiz, dados) {
  const reais = estado.registro?.testes ?? [];
  let testes = [...reais];
  let configuracoes = null;   // configurações salvas; null enquanto a lista não chega
  let erroConfiguracoes = null;
  let montada = true;
  const filtros = { ...FILTROS_PADRAO };
  const rotulosOrdem = Object.fromEntries(Object.entries(ORDENS).map(([v, chave]) => [v, t(chave)]));
  const rotulosTipo = Object.fromEntries(Object.entries(TIPOS).map(([v, chave]) => [v, t(chave)]));
  const rotulosPeriodo = Object.fromEntries(PERIODOS.map(p => [p, p === 'qualquer' ? t('hist.periodoQualquer') : t('hist.periodoDias', { n: inteiro(Number(p)) })]));

  raiz.innerHTML = `
    <div class="ig-cabecalho">
      <p class="ig-kicker">${t('hist.kicker')}</p>
      <div class="ig-cabecalho__linha"><h1 class="ig-headline">${t('hist.titulo')}</h1></div>
      <p>${t('hist.sub')}</p>
    </div>
    <div class="ig-historico__filtros" role="search" aria-label="${escapar(t('hist.filtros'))}">
      <div class="ig-campo ig-historico__busca">
        <label for="hBusca">${t('hist.buscar')}</label>
        <input type="text" id="hBusca" placeholder="${escapar(t('hist.buscarExemplo'))}" autocomplete="off">
      </div>
      <div class="ig-campo ig-historico__filtro"><label for="hOrdem">${t('hist.ordenar')}</label>
        <select id="hOrdem">${opcoes(rotulosOrdem, filtros.ordem)}</select></div>
      <div class="ig-campo ig-historico__filtro"><label for="hTipo">${t('hist.tipo')}</label>
        <select id="hTipo">${opcoes(rotulosTipo, filtros.tipo)}</select></div>
      <div class="ig-campo ig-historico__filtro"><label for="hPeriodo">${t('hist.periodo')}</label>
        <select id="hPeriodo">${opcoes(rotulosPeriodo, filtros.periodo)}</select></div>
      ${botao(t('hist.limparFiltros'), { variante: 'terciario', icone: 'ph-x', id: 'hLimpar', atributos: 'disabled' })}
    </div>
    <p class="ig-selo ig-selo--atencao ig-historico__fonte" id="hFonte" role="status" hidden></p>
    <div id="hVazio" hidden></div>
    <section class="ig-bloco" id="hSecaoConfigs" aria-labelledby="hConfigsTitulo">
      <div class="ig-bloco__topo"><p class="ig-subhead" id="hConfigsTitulo">${t('hist.cfgTitulo')}</p></div>
      <div id="hConfigs"></div>
    </section>
    <section class="ig-historico__lista" id="hSecaoTestes" aria-labelledby="hListaTitulo">
      <div class="ig-bloco__topo"><p class="ig-subhead" id="hListaTitulo">${t('hist.lista')}</p></div>
      <div id="hLista"></div>
    </section>`;

  const el = id => raiz.querySelector(`#${id}`);
  const busca = el('hBusca'), lista = el('hLista'), caixaConfigs = el('hConfigs'), caixaVazio = el('hVazio');
  const secaoConfigs = el('hSecaoConfigs'), secaoTestes = el('hSecaoTestes');
  const selOrdem = el('hOrdem'), selTipo = el('hTipo'), selPeriodo = el('hPeriodo'), limpar = el('hLimpar');

  // Cada seção informa o que desenhou: 'cards', 'vazio' (a pesquisa e os filtros não acharam
  // nada), 'aviso' (carregando, sem dado ou API fora do ar) ou 'oculta' (pelo filtro de tipo).
  let configsVisiveis = [];   // códigos dos cards de configuração na tela, na ordem em que aparecem

  /**
   * Desenha as configurações salvas que passam pela pesquisa (código e nome) e pelos
   * filtros. Enquanto a lista carrega, se a API falhar ou se não houver nenhuma salva,
   * fica só uma linha de aviso: os cards de testes não dependem dela. `animar` como em render().
   */
  function renderConfiguracoes(animar = 'todos') {
    const aviso = (texto, icone) => {
      caixaConfigs.innerHTML = `<p class="ig-nota" role="status"><i class="ph ${icone}" aria-hidden="true"></i> ${escapar(texto)}</p>`;
      configsVisiveis = [];
      return 'aviso';
    };
    if (filtros.tipo === 'testes') { caixaConfigs.innerHTML = ''; configsVisiveis = []; return 'oculta'; }
    if (configuracoes === null) return aviso(t('hist.cfgCarregando'), 'ph-hourglass');
    if (erroConfiguracoes) return aviso(t('hist.cfgErro', { erro: erroConfiguracoes }), 'ph-warning');
    if (!configuracoes.length) return aviso(t('hist.cfgVazio'), 'ph-info');
    const q = normalizar(busca.value);
    const achadas = filtrarOrdenar(
      q ? configuracoes.filter(c => normalizar(`${c.codigo} ${c.nome ?? ''}`).includes(q)) : configuracoes,
      filtros, c => c.criado_em, c => c.nome || c.codigo);
    if (!achadas.length) {
      caixaConfigs.innerHTML = vazio(t('hist.cfgSemResultado'), t('hist.semResultadoPasso'), 'ph-magnifying-glass');
      configsVisiveis = [];
      return 'vazio';
    }
    const codigos = achadas.map(c => c.codigo);
    if (codigos.length === configsVisiveis.length && codigos.every((c, i) => c === configsVisiveis[i])) return 'cards';

    const antes = new Set(configsVisiveis);
    const entra = codigo => !movimentoReduzido() && (animar === 'todos' || !antes.has(codigo));
    let ordem = 0;
    caixaConfigs.innerHTML = `<ul class="ig-historico__grade">${achadas.map(c => cardConfiguracao(c, dados.catalogo, entra(c.codigo) ? ordem++ : null)).join('')}</ul>`;
    configsVisiveis = codigos;
    return 'cards';
  }

  let visiveis = [];          // ids dos cards de teste na tela, na ordem em que aparecem

  /**
   * Desenha os cards de testes que passam pela pesquisa e pelos filtros. `animar` diz quem
   * entra em sequência: 'todos' os cards do resultado ou só os 'novos' (os que não estavam
   * na tela). Se o resultado é o mesmo que já está na tela, nada é redesenhado, então
   * digitar sem mudar o resultado não faz os cards piscarem.
   */
  function render(animar = 'todos') {
    if (filtros.tipo === 'configuracoes') { lista.innerHTML = ''; visiveis = []; return 'oculta'; }
    if (!testes.length) {
      lista.innerHTML = vazio(t('hist.vazioTitulo'), t('hist.vazioPasso'), 'ph-clock-counter-clockwise');
      visiveis = [];
      return 'aviso';
    }
    const q = normalizar(busca.value);
    const achados = filtrarOrdenar(
      q ? testes.filter(x => normalizar(`${x.nome ?? ''} ${x.id ?? ''} ${x.descricao ?? ''}`).includes(q)) : testes,
      filtros, x => x.gerado_em, x => x.nome || x.id);
    const ids = achados.map(x => x.id);
    if (ids.length && ids.length === visiveis.length && ids.every((id, i) => id === visiveis[i])) return 'cards';

    const antes = new Set(visiveis);
    const entra = id => !movimentoReduzido() && (animar === 'todos' || !antes.has(id));
    let ordem = 0;
    lista.innerHTML = achados.length
      ? `<ul class="ig-historico__grade">${achados.map(x => card(x, entra(x.id) ? ordem++ : null)).join('')}</ul>`
      : vazio(t('hist.semResultadoTitulo'), t('hist.semResultadoPasso'), 'ph-magnifying-glass');
    visiveis = ids;
    return achados.length ? 'cards' : 'vazio';
  }

  /**
   * Desenha as duas seções e decide o que fica à vista. Uma seção oculta pelo tipo some
   * inteira; se todas as que restam ficaram sem resultado, elas somem também e um único
   * estado vazio explica que a pesquisa e os filtros não acharam nada.
   */
  function desenhar(animar = 'todos') {
    const estados = [[secaoConfigs, renderConfiguracoes(animar)], [secaoTestes, render(animar)]];
    const aVista = estados.filter(([, e]) => e !== 'oculta');
    const nada = aVista.every(([, e]) => e === 'vazio');
    estados.forEach(([secao, e]) => { secao.hidden = e === 'oculta' || nada; });
    caixaVazio.hidden = !nada;
    if (nada && !caixaVazio.innerHTML) caixaVazio.innerHTML = vazio(t('hist.nadaTitulo'), t('hist.semResultadoPasso'), 'ph-magnifying-glass');
    limpar.disabled = !busca.value && Object.keys(FILTROS_PADRAO).every(k => filtros[k] === FILTROS_PADRAO[k]);
  }

  /** Atualiza só a marca de selecionado nos cards que já estão na tela, para a transição acontecer. */
  function marcarSelecao() {
    const id = estado.testeSelecionado?.id;
    lista.querySelectorAll('[data-teste]').forEach(botao => {
      const selecionado = botao.dataset.teste === id, cartaoEl = botao.closest('.ig-historico__card');
      cartaoEl.classList.toggle('ig-historico__card--selecionado', selecionado);
      cartaoEl.querySelector('.ig-historico__marca').hidden = !selecionado;
      if (selecionado) botao.setAttribute('aria-current', 'true'); else botao.removeAttribute('aria-current');
    });
  }

  busca.addEventListener('input', () => desenhar('todos'));
  const ligarFiltro = (select, campo, validos) => select.addEventListener('change', () => {
    filtros[campo] = validos.includes(select.value) ? select.value : FILTROS_PADRAO[campo];
    desenhar('todos');
  });
  ligarFiltro(selOrdem, 'ordem', Object.keys(ORDENS));
  ligarFiltro(selTipo, 'tipo', Object.keys(TIPOS));
  ligarFiltro(selPeriodo, 'periodo', PERIODOS);
  limpar.addEventListener('click', () => {
    Object.assign(filtros, FILTROS_PADRAO);
    selOrdem.value = filtros.ordem; selTipo.value = filtros.tipo; selPeriodo.value = filtros.periodo;
    busca.value = '';
    desenhar('todos');
    busca.focus();            // o botão desliga ao limpar; o foco segue para a pesquisa
  });
  caixaConfigs.addEventListener('click', e => {
    const botao = e.target.closest('[data-configuracao]');
    const registro = botao && configuracoes?.find(c => c.codigo === botao.dataset.configuracao);
    if (registro) abrirConfiguracaoSalva(registro, dados.catalogo);
  });
  lista.addEventListener('click', e => {
    const botao = e.target.closest('[data-teste]');
    const teste = botao && testes.find(x => x.id === botao.dataset.teste);
    if (teste) selecionarTeste(teste);
  });
  desenhar('todos');

  // Banco online: configurações do banco e testes reais. Offline com cópia na aba: a cópia,
  // com aviso. Offline sem cópia: os testes reais e os fictícios, com aviso.
  const avisar = texto => {
    const fonte = el('hFonte');
    fonte.innerHTML = `<i class="ph ph-plugs" aria-hidden="true"></i>${escapar(texto)}`;
    fonte.hidden = false;
  };
  carregarConfiguracoes().then(async r => {
    if (!montada) return;
    configuracoes = r.configuracoes; erroConfiguracoes = r.erro;
    if (r.copiaDe) {
      avisar(t('hist.offlineCopia', { hora: new Date(r.copiaDe).toLocaleTimeString(LOCALE[idioma()] ?? 'pt-BR', { timeStyle: 'short' }) }));
    } else if (r.erro) {
      const ficticios = await carregarMock();
      if (!montada) return;
      if (ficticios.length) {
        const ids = new Set(reais.map(x => x.id));
        testes = [...reais, ...ficticios.filter(x => !ids.has(x.id))];   // o real vence se o id repetir
        avisar(t('hist.offline'));
      }
    }
    desenhar('novos');       // os testes já na tela não mudam, então não entram de novo
  });

  return {
    atualizar(m) { if ('testeSelecionado' in m) marcarSelecao(); },   // seleção desfeita pelo menu lateral ou pelo topo
    desmontar() { montada = false; },
  };
}
