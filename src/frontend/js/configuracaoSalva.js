// Integração entre o histórico de configurações e a tela de Visão Geral.
//
// A aba de Histórico lista as configurações com GET /api/historico?busca=<texto> e abre
// uma delas chamando abrirConfiguracaoSalva(registro, dados.catalogo). A Visão Geral
// recebe a configuração e os componentes, abre as regiões do protótipo, refaz a previsão
// com o modelo atual e informa de qual código a configuração veio.
//
// Cada registro devolvido pela API tem: codigo, nome, linha, os oito campos de CAMPOS,
// versao_modelo, criado_em e componentes, a lista de códigos mascarados. O banco não
// guarda o nome real dos componentes: ele é traduzido pelo catálogo local
// (componentes.csv, coluna codigo), com componentesDoRegistro.
import { estado, definir } from './estado.js';

export const CAMPOS = ['blower_direction', 'housing', 'board_position', 'deflector_hole',
  'material_coil_support', 'run_case', 'losses', 'reason'];

/** Componentes do catálogo local que correspondem aos códigos do registro, e quantos
 *  códigos não foram reconhecidos (chave de mascaramento diferente da de quem salvou). */
export function componentesDoRegistro(registro, catalogo) {
  const porCodigo = new Map((catalogo ?? []).filter(c => c.codigo).map(c => [c.codigo, c]));
  const componentes = (registro.componentes ?? []).map(c => porCodigo.get(c)).filter(Boolean);
  return { componentes, desconhecidos: (registro.componentes ?? []).length - componentes.length };
}

/** A versão do registro difere da do modelo exportado nesta máquina? */
export function outraVersao(registro, dados) {
  const atual = dados?.parametros?.modelo?.versao;
  return Boolean(atual && registro.versao_modelo && registro.versao_modelo !== atual);
}

/** Leva o registro para a Visão Geral e refaz a previsão lá. */
export function abrirConfiguracaoSalva(registro, catalogo) {
  estado.configuracao = Object.fromEntries(CAMPOS.map(c => [c, registro[c] ?? null]));
  estado.escolhidos = new Set(componentesDoRegistro(registro, catalogo).componentes.map(c => c.componente));
  estado.nomeConfiguracao = registro.nome ?? '';
  estado.previsao = null;
  estado.origemHistorico = { codigo: registro.codigo, versao: registro.versao_modelo };
  estado.preverAoAbrir = true;
  definir({ tela: 'visaoGeral', remontar: true, testeSelecionado: null });
}
