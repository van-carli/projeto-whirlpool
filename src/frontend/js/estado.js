// Estado global do dashboard: modo de leitura, linha, tela, recorte de regiões, tema.
// Persistido em localStorage (conveniência por usuário); o app funciona sem ele.
import { ORDEM_AREAS } from './dados.js';

const CHAVE = 'ignis.estado';

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch (e) { return {}; }
}

export const ESCALAS = [0.9, 1, 1.1, 1.2, 1.3, 1.4];
export const DALTONISMOS = ['nenhum', 'verde-vermelho', 'azul-amarelo', 'sem-cor'];
export const VISTAS = ['padrao', 'frente', 'topo', 'traseira'];

/**
 * Configuração de um teste, já conferida. Campo ausente ou inválido cai no padrão do
 * dashboard: todas as regiões, modo técnico, linha Brasil e controles do 3D zerados.
 * `raioX: null` quer dizer "acompanha o mapa de calor", que é o comportamento da tela.
 */
export function configuracaoDe(teste) {
  const c = teste?.configuracao ?? {}, v = c.visao ?? {};
  const explodir = Number(v.explodir);
  return {
    modo: c.modo === 'naotecnico' ? 'naotecnico' : 'tecnico',
    linha: c.linha === 'mx' ? 'mx' : 'br',
    regioes: ORDEM_AREAS.filter(a => Array.isArray(c.regioes) && c.regioes.includes(a)),
    visao: {
      explodir: Number.isFinite(explodir) ? Math.round(Math.max(0, Math.min(100, explodir))) : 0,
      mapaCalor: v.mapaCalor === true,
      raioX: typeof v.raioX === 'boolean' ? v.raioX : null,
      vista: VISTAS.includes(v.vista) ? v.vista : 'padrao',
    },
  };
}

/** Teste escolhido no Histórico, como foi gravado no navegador (ou null). */
function selecaoSalva(s) {
  if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id) return null;
  return { id: s.id, nome: String(s.nome ?? s.id), ficticio: s.ficticio === true,
    visao: configuracaoDe({ configuracao: { visao: s.visao } }).visao };
}

const salvo = ler();
export const estado = {
  modo: salvo.modo === 'naotecnico' ? 'naotecnico' : 'tecnico',
  linha: salvo.linha === 'mx' ? 'mx' : 'br',
  tela: ['visaoGeral', 'testes', 'visualizacao', 'historico', 'glossario'].includes(salvo.tela) ? salvo.tela : 'visaoGeral',
  teste: salvo.teste || null,        // id do teste em exibição (null = o ativo do registro)
  // teste escolhido no Histórico: { id, nome, ficticio, visao }. Só guarda a configuração
  // aplicada; os dados exibidos continuam sendo os de `teste`.
  testeSelecionado: selecaoSalva(salvo.testeSelecionado),
  idioma: ['pt', 'en', 'es'].includes(salvo.idioma) ? salvo.idioma : 'pt',
  // acessibilidade: escala do texto (0,9 a 1,4) e paleta alternativa para daltonismo
  escalaFonte: ESCALAS.includes(salvo.escalaFonte) ? salvo.escalaFonte : 1,
  daltonismo: DALTONISMOS.includes(salvo.daltonismo) ? salvo.daltonismo : 'nenhum',
  regioes: new Set(Array.isArray(salvo.regioes) ? salvo.regioes : []),   // vazio = todas
  regiaoSob: null,           // região sob o cursor (3D <-> lista)
  aba: salvo.aba || 'diagnostico',
  dados: null,
};

const ouvintes = new Set();
export function assinar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }

// Campos que a configuração de um teste define. Se a pessoa mexer em um deles por conta
// própria, a tela deixa de estar na configuração do teste e a seleção é desfeita.
const CAMPOS_DA_CONFIGURACAO = ['regioes', 'modo', 'linha'];

function mudou(campo, valor) {
  if (campo !== 'regioes') return estado[campo] !== valor;
  const antes = estado.regioes, depois = new Set(valor);
  return antes.size !== depois.size || [...depois].some(a => !antes.has(a));
}

export function definir(mudancas) {
  if (estado.testeSelecionado && !('testeSelecionado' in mudancas)
      && CAMPOS_DA_CONFIGURACAO.some(c => c in mudancas && mudou(c, mudancas[c]))) {
    mudancas = { ...mudancas, testeSelecionado: null };
  }
  Object.assign(estado, mudancas);
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ modo: estado.modo, linha: estado.linha, tela: estado.tela,
      regioes: [...estado.regioes], aba: estado.aba, teste: estado.teste, idioma: estado.idioma,
      escalaFonte: estado.escalaFonte, daltonismo: estado.daltonismo,
      testeSelecionado: estado.testeSelecionado }));
  } catch (e) { /* sem armazenamento: segue sem persistir */ }
  ouvintes.forEach(fn => fn(mudancas));
}

export function alternarRegiao(area) {
  const r = new Set(estado.regioes);
  if (r.has(area)) r.delete(area); else r.add(area);
  definir({ regioes: r });
}

export function definirRegioes(lista) { definir({ regioes: new Set(lista) }); }

/**
 * Abre um teste do Histórico: aplica a configuração dele (regiões, modo, linha e os
 * controles do 3D) e vai para a Visão Geral. A escolha fica só no navegador.
 */
export function selecionarTeste(teste) {
  const c = configuracaoDe(teste);
  definir({
    modo: c.modo, linha: c.linha, regioes: new Set(c.regioes), tela: 'visaoGeral',
    testeSelecionado: { id: String(teste.id), nome: String(teste.nome || teste.id), ficticio: teste.ficticio === true, visao: c.visao },
  });
}

// regiões do recorte atual (vazio = todas as 7, na ordem canônica)
export function regioesAtivas(ordem) {
  return estado.regioes.size ? ordem.filter(a => estado.regioes.has(a)) : ordem;
}

export const tecnico = () => estado.modo === 'tecnico';
export const movimentoReduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
