// Casca do Ignis: carrega os dados, liga a barra superior e o menu, despacha as telas.
import { carregarTudo, carregarRegistro, ORDEM_AREAS, ROTULO_AREA } from './dados.js';
import { estado, definir, assinar, alternarRegiao, definirRegioes, regioesAtivas, movimentoReduzido, ESCALAS, DALTONISMOS } from './estado.js';
import { vazio } from './ui.js';
import { t, traduzirCasca } from './i18n.js';
import { inteiro, escapar } from './formato.js';
import * as visaoGeral from './telas/visaoGeral.js';
import * as testes from './telas/testes.js';
import * as visualizacao from './telas/visualizacao.js';
import * as glossario from './telas/glossario.js';
import * as historico from './telas/historico.js';

const TELAS = { visaoGeral, testes, visualizacao, historico, glossario };
const TITULO_TELA = tela => t(`menu.${tela}`);
const principal = document.getElementById('principal');
let telaAtiva = null, nomeTela = null;

function tema(escuro) {
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light';
  const b = document.getElementById('tema');
  b.setAttribute('aria-pressed', String(escuro));
  b.querySelector('i').className = `ph ${escuro ? 'ph-sun' : 'ph-moon'}`;
  try { localStorage.setItem('ignis.tema', escuro ? 'dark' : 'light'); } catch (e) { /* sem armazenamento */ }
  document.querySelectorAll('#cfgTema [data-tema]').forEach(x => x.setAttribute('aria-checked', String((x.dataset.tema === 'dark') === escuro)));
  definir({ tema: escuro ? 'dark' : 'light' });
}

/* ---------- configurações de exibição: tema, tamanho do texto, filtro de cor ----------
   Tudo entra como atributo/variável no <html>, então vale para a interface, os
   gráficos e o 3D de uma vez só; o estado guarda a escolha entre as sessões. */
function escalaFonte(valor) {
  const v = ESCALAS.includes(valor) ? valor : 1;
  document.documentElement.style.setProperty('--ig-escala', String(v));
  document.getElementById('cfgFonteValor').textContent = `${Math.round(v * 100)} %`;
  document.getElementById('cfgFonteMenos').disabled = v === ESCALAS[0];
  document.getElementById('cfgFonteMais').disabled = v === ESCALAS[ESCALAS.length - 1];
  definir({ escalaFonte: v });
}

function daltonismo(modo) {
  const m = DALTONISMOS.includes(modo) ? modo : 'nenhum';
  if (m === 'nenhum') delete document.documentElement.dataset.daltonismo;
  else document.documentElement.dataset.daltonismo = m;
  document.getElementById('cfgDaltonismo').value = m;
  definir({ daltonismo: m });
}

function montarConfiguracoes() {
  const botao = document.getElementById('abrirConfig'), painel = document.getElementById('painelConfig');
  const abrir = mostrar => { painel.hidden = !mostrar; botao.setAttribute('aria-expanded', String(mostrar)); };
  botao.addEventListener('click', () => abrir(painel.hidden));
  document.addEventListener('pointerdown', e => { if (!painel.hidden && !painel.contains(e.target) && e.target !== botao && !botao.contains(e.target)) abrir(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !painel.hidden) { abrir(false); botao.focus(); } });

  document.querySelectorAll('#cfgTema [data-tema]').forEach(b => b.addEventListener('click', () => tema(b.dataset.tema === 'dark')));
  const passo = d => escalaFonte(ESCALAS[Math.min(ESCALAS.length - 1, Math.max(0, ESCALAS.indexOf(estado.escalaFonte) + d))]);
  document.getElementById('cfgFonteMenos').addEventListener('click', () => passo(-1));
  document.getElementById('cfgFonteMais').addEventListener('click', () => passo(1));
  document.getElementById('cfgFonteReset').addEventListener('click', () => escalaFonte(1));
  document.getElementById('cfgDaltonismo').addEventListener('change', e => daltonismo(e.target.value));
  escalaFonte(estado.escalaFonte); daltonismo(estado.daltonismo);
}

/** Selo de origem: diz o que o teste carregado realmente é, sem prometer o que não há. */
function atualizarSelo(dados) {
  const p = dados.parametros, selo = document.getElementById('seloDados');
  const val = dados.metricasAreas?.validacao;
  const validacao = val ? t('selo.rodadas', { n: inteiro(val.dobras) }) : t('selo.semValidacao');
  if (!p) {
    selo.className = 'ig-selo ig-selo--atencao';
    selo.innerHTML = `<i class="ph ph-warning" aria-hidden="true"></i><span>${escapar(t('selo.semDados'))}</span>`;
  } else if ((p.teste?.origem ?? p.dados) === 'reais') {
    selo.className = 'ig-selo ig-selo--seguro';
    selo.innerHTML = `<i class="ph ph-database" aria-hidden="true"></i><span>${escapar(t('selo.reais'))} · ${escapar(validacao)} · ${escapar(p.gerado_em ?? '')}</span>`;
  } else {
    selo.className = 'ig-selo ig-selo--atencao';
    selo.innerHTML = `<i class="ph ph-flask" aria-hidden="true"></i><span>${escapar(t('selo.simulados'))} · ${escapar(validacao)} · ${escapar(p.gerado_em ?? '')}</span>`;
  }
}

function montarTopo(dados) {
  document.querySelectorAll('#modo [data-modo]').forEach(b => b.addEventListener('click', () => definir({ modo: b.dataset.modo })));
  document.querySelectorAll('#linha [data-linha]').forEach(b => b.addEventListener('click', () => definir({ linha: b.dataset.linha })));
  document.getElementById('tema').addEventListener('click', () => tema(document.documentElement.dataset.theme !== 'dark'));
  tema(document.documentElement.dataset.theme === 'dark');
  montarConfiguracoes();
  atualizarSelo(dados);
  const idiomas = document.getElementById('seletorIdioma');
  idiomas.value = estado.idioma;
  idiomas.addEventListener('change', () => definir({ idioma: idiomas.value }));
  sincronizarIdioma();
}

/** O idioma é escolha de quem lê, em qualquer linha: português do Brasil, inglês ou espanhol. */
export function sincronizarIdioma() {
  document.getElementById('seletorIdioma').value = estado.idioma;
  traduzirCasca();
}

function sincronizarTopo() {
  document.querySelectorAll('#modo [data-modo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.modo === estado.modo)));
  document.querySelectorAll('#linha [data-linha]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.linha === estado.linha)));
  document.querySelectorAll('.ig-menu__item[data-tela]').forEach(b => { if (b.dataset.tela === estado.tela) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
}

function montarRegioes() {
  const el = document.getElementById('regioes');
  el.innerHTML = ORDEM_AREAS.map(a =>
    `<label class="ig-regiao" data-regiao="${a}"><input type="checkbox" value="${a}"><span>${ROTULO_AREA[a]}</span></label>`).join('');
  el.querySelectorAll('input').forEach(i => i.addEventListener('change', () => alternarRegiao(i.value)));
  el.querySelectorAll('.ig-regiao').forEach(l => {
    l.addEventListener('pointerenter', () => definir({ regiaoSob: l.dataset.regiao }));
    l.addEventListener('pointerleave', () => definir({ regiaoSob: null }));
  });
  document.getElementById('regioesNenhuma').addEventListener('click', () => definirRegioes([]));
  document.querySelectorAll('.ig-menu__item[data-tela]').forEach(b => b.addEventListener('click', () => definir({ tela: b.dataset.tela })));
  sincronizarRegioes();
}
function sincronizarRegioes() {
  const at = regioesAtivas(ORDEM_AREAS);
  document.querySelectorAll('#regioes .ig-regiao').forEach(l => {
    const a = l.dataset.regiao, marcado = estado.regioes.has(a);
    l.querySelector('input').checked = marcado;
    l.classList.toggle('ig-regiao--ativa', marcado);
    l.classList.toggle('ig-regiao--sob', estado.regiaoSob === a);
    l.style.opacity = at.includes(a) ? '1' : '.55';
  });
  document.getElementById('rotuloRegioes').textContent = estado.regioes.size
    ? t('menu.recorteN', { n: inteiro(estado.regioes.size) }) : t('menu.todas');
}

// Fade curto na área principal. Só vale para a troca de tela: remontar a mesma tela
// (idioma, tamanho do texto, filtro de cor) não anima.
function animarEntrada() {
  if (movimentoReduzido()) return;
  principal.classList.remove('ig-principal--entrando');
  void principal.offsetWidth;          // reinicia a animação se a troca anterior ainda corria
  principal.classList.add('ig-principal--entrando');
}
principal.addEventListener('animationend', e => { if (e.target === principal) principal.classList.remove('ig-principal--entrando'); });

function trocarTela(dados) {
  const veioDeOutraTela = nomeTela !== null && nomeTela !== estado.tela;
  if (telaAtiva) { telaAtiva.desmontar(); telaAtiva = null; }
  principal.innerHTML = '';
  nomeTela = estado.tela;
  telaAtiva = TELAS[nomeTela].montar(principal, dados);
  document.title = `Ignis · ${TITULO_TELA(nomeTela)}`;
  principal.focus({ preventScroll: true });
  if (veioDeOutraTela) animarEntrada();
}

async function iniciar() {
  // O registro é lido só para saber de qual pasta vêm os dados do teste ativo;
  // o dashboard não troca de teste em tempo de execução.
  const registro = await carregarRegistro();
  const teste = registro.testes.find(t => t.id === registro.ativo) ?? registro.testes[0];
  const dados = await carregarTudo(teste?.pasta ?? '.');
  estado.dados = dados; estado.teste = teste?.id ?? null; estado.registro = registro;

  montarTopo(dados); montarRegioes(); sincronizarTopo(); traduzirCasca();
  if (!dados.parametros && !dados.metricasAreas && !dados.catalogo) {
    principal.innerHTML = vazio('Nenhum arquivo de dados encontrado', 'Rode "python src/frontend/dados/exportar.py" na raiz do repositório e sirva a pasta src/frontend/ por HTTP (python src/frontend/servir.py).', 'ph-database');
    return;
  }
  trocarTela(dados);
  assinar(m => {
    sincronizarTopo();
    if ('linha' in m) sincronizarIdioma();
    if ('idioma' in m) {
      traduzirCasca(); atualizarSelo(estado.dados); sincronizarRegioes();
      document.title = `Ignis · ${TITULO_TELA(estado.tela)}`;
      trocarTela(estado.dados);
      return;
    }
    // tamanho do texto e filtro de cor mudam cores e medidas dos gráficos e do 3D:
    // a tela é remontada para tudo sair redesenhado com os novos tokens
    if ('daltonismo' in m || 'escalaFonte' in m) { trocarTela(estado.dados); return; }
    if ('regioes' in m || 'regiaoSob' in m) sincronizarRegioes();
    if ('tela' in m && (m.tela !== nomeTela || m.remontar)) { trocarTela(estado.dados); return; }
    if ('tela' in m) return;
    telaAtiva?.atualizar(m);
  });
}

iniciar().catch(err => {
  principal.innerHTML = vazio('Falha ao iniciar o Ignis', String(err?.message ?? err), 'ph-warning');
  console.error(err);
});
