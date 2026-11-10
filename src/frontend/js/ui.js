// Peças do design base (mesma semântica de src/frontend/base): estado, cartão, medidor, tabela, ficha, vazio.
import { numero, escapar } from './formato.js';

export const ESTADOS = {
  seguro:   { rotulo: 'Seguro',   icone: 'ph-shield-check',  risco: 'Risco baixo',  negocio: 'folga confortável' },
  atencao:  { rotulo: 'Atenção',  icone: 'ph-warning',       risco: 'Risco médio',  negocio: 'folga apertada' },
  critico:  { rotulo: 'Crítico',  icone: 'ph-warning-circle', risco: 'Risco alto',   negocio: 'acima do limite' },
  monitorar:{ rotulo: 'Só monitorar', icone: 'ph-eye',       risco: 'Sem limite',   negocio: 'sem limite definido' },
  neutro:   { rotulo: 'Indefinido', icone: 'ph-minus-circle', risco: 'Sem leitura', negocio: 'sem leitura' },
  sem_predicao: { rotulo: 'Sem predição', icone: 'ph-minus-circle', risco: 'Sem leitura', negocio: 'não coberto pelo modelo' },
};
export const espec = e => ESTADOS[e] ?? ESTADOS.neutro;

/** Rótulo de estado: ícone + rótulo + detalhe. formato: linha | faixa | chip. modo: tecnico | naotecnico */
export function rotuloEstado(estadoNome, { detalhe = '', formato = 'linha', texto = null, modo = 'tecnico' } = {}) {
  const s = espec(estadoNome);
  const t = texto ?? (modo === 'tecnico' ? s.rotulo : s.risco);
  const cls = ['seguro', 'atencao', 'critico', 'monitorar', 'sem_predicao'].includes(estadoNome) ? estadoNome : 'neutro';
  return `<span class="ig-estado ig-estado--${formato} ig-estado--${cls}"><i class="ph ${s.icone}" aria-hidden="true"></i><b>${escapar(t)}</b>${detalhe ? `<span class="ig-estado__det">${escapar(detalhe)}</span>` : ''}</span>`;
}

export function estadoPorFolga(folga, limite, atencaoPct = 10) {
  if (folga === null || folga === undefined || limite === null) return 'monitorar';
  if (folga < 0) return 'critico';
  return folga < (atencaoPct / 100) * limite ? 'atencao' : 'seguro';
}

/** Cartão de KPI: título, métrica, apoio e (opcional) estado. Número só muda de cor no crítico. */
export function kpi({ titulo, valor, apoio = '', estado = null, detalhe = '', modo = 'tecnico' }) {
  const critico = estado === 'critico';
  return `<div class="ig-cartao${critico ? ' ig-cartao--critico' : ''}">
    <p class="ig-cartao__titulo">${escapar(titulo)}</p>
    <div class="ig-metrica${critico ? ' ig-metrica--critico' : ''}">${valor}</div>
    ${apoio ? `<div class="ig-cartao__apoio">${apoio}</div>` : ''}
    ${estado ? `<div style="margin-top:6px">${rotuloEstado(estado, { detalhe, modo })}</div>` : ''}
  </div>`;
}

/**
 * Cabeçalho de gráfico em dois níveis: a conclusão em destaque e, abaixo, como ler.
 * A conclusão é o que a pessoa leva da tela; a descrição existe para quem quer o detalhe.
 */
export function cabecalhoGrafico(conclusao, comoLer) {
  return `<p class="ig-grafico__conclusao">${conclusao}</p>${comoLer ? `<p class="ig-descricao-grafico">${comoLer}</p>` : ''}`;
}

/**
 * Legenda de gráfico, sempre em texto além da cor.
 * itens: [{ cor, rotulo, forma }] — forma: 'quadrado' (padrão), 'linha', 'tracejada',
 * 'ponto', 'faixa' ou 'rampa' (gradiente, para escalas contínuas).
 */
export function legenda(itens, { rotulo = 'Legenda' } = {}) {
  const peca = i => {
    const estilo = i.forma === 'rampa' ? `background:${i.cor}` : `--c:${i.cor}`;
    return `<span class="ig-leg__peca ig-leg__peca--${i.forma ?? 'quadrado'}" style="${estilo}" aria-hidden="true"></span>`;
  };
  return `<ul class="ig-leg" aria-label="${escapar(rotulo)}">
    ${itens.map(i => `<li>${peca(i)}<span>${i.rotulo}</span></li>`).join('')}
  </ul>`;
}

export function cartao(conteudo, { titulo = '', critico = false, classe = '' } = {}) {
  return `<section class="ig-cartao${critico ? ' ig-cartao--critico' : ''} ${classe}">
    ${titulo ? `<div class="ig-bloco__topo"><p class="ig-rotulo">${escapar(titulo)}</p></div>` : ''}${conteudo}</section>`;
}

/** Medidor: valor × limite com barra de incerteza. */
export function medidor({ valor, limite, incerteza = 0, maximo = null, estado = null, compacto = false, casas = 0, unidade = '°C' }) {
  const fim = maximo ?? Math.max(limite ?? 0, valor + incerteza) * 1.12;
  const pos = v => Math.max(0, Math.min(100, (v / fim) * 100));
  const texto = `${numero(valor, casas, unidade)}${limite != null ? `, limite ${numero(limite, casas, unidade)}` : ''}${incerteza ? `, incerteza de mais ou menos ${numero(incerteza, 1, unidade)}` : ''}`;
  return `<div class="ig-medidor${estado === 'critico' ? ' ig-medidor--critico' : ''}" role="img" aria-label="${escapar(texto)}">
    <div class="ig-medidor__trilho"><span class="ig-medidor__valor" style="width:${pos(valor).toFixed(1)}%"></span>
    ${incerteza ? `<span class="ig-medidor__erro" style="left:${pos(valor - incerteza).toFixed(1)}%;width:${(pos(valor + incerteza) - pos(valor - incerteza)).toFixed(1)}%"></span>` : ''}
    ${limite != null ? `<span class="ig-medidor__limite" style="left:${pos(limite).toFixed(1)}%"></span>` : ''}</div>
    ${compacto || limite == null ? '' : `<div class="ig-medidor__legenda"><span style="left:${pos(limite).toFixed(1)}%">limite ${escapar(numero(limite, casas, unidade))}</span></div>`}
  </div>`;
}

let seqDica = 0;

/**
 * Tabela técnica: unidade no cabeçalho, ordenável, destaque de linha.
 * colunas: [{titulo, campo, unidade, num, casas, sinal, formato(linha), largura, dica}]
 * `dica` vira a descrição breve da coluna, no passar do mouse e no foco do teclado.
 */
export function tabela({ colunas, linhas, legenda = '', densa = false, destacar = null, ordenarPor = null, decrescente = false, id = '', selecionavel = false, atributo = null }) {
  let ls = [...linhas];
  if (ordenarPor) ls.sort((a, b) => (a[ordenarPor] > b[ordenarPor] ? 1 : a[ordenarPor] < b[ordenarPor] ? -1 : 0) * (decrescente ? -1 : 1));
  const cab = colunas.map(c => {
    const rotulo = `<span class="rot">${escapar(c.titulo)}</span>${c.unidade ? `<span class="un">${escapar(c.unidade)}</span>` : ''}`;
    const idDica = c.dica ? `dica-${++seqDica}` : '';
    const conteudo = c.dica
      ? `<span class="ig-col-dica" tabindex="0" role="note" aria-describedby="${idDica}" data-dica="${escapar(c.dica)}">${rotulo}<i class="ph ph-info" aria-hidden="true"></i></span><span id="${idDica}" class="ig-oculto">${escapar(c.dica)}</span>`
      : rotulo;
    return `<th scope="col" class="${c.num ? 'num' : ''}" data-campo="${escapar(c.campo)}" aria-sort="${ordenarPor === c.campo ? (decrescente ? 'descending' : 'ascending') : 'none'}">${conteudo}</th>`;
  }).join('');
  const corpo = ls.map(l => {
    const cel = colunas.map(c => {
      let v;
      if (c.formato) v = c.formato(l);
      else if (c.num) v = numero(l[c.campo], c.casas ?? 0, '', c.sinal);
      else v = escapar(l[c.campo]);
      return `<td class="${c.num ? 'num' : ''}"${c.largura ? ` style="width:${c.largura}"` : ''}>${v}</td>`;
    }).join('');
    const cls = [destacar && destacar(l) ? 'destaque' : '', selecionavel ? 'selecionavel' : ''].filter(Boolean).join(' ');
    return `<tr${cls ? ` class="${cls}"` : ''}${atributo ? ` data-${atributo}="${escapar(l[atributo])}"` : ''}${selecionavel ? ' tabindex="0"' : ''}>${cel}</tr>`;
  }).join('');
  return `<div class="ig-rolagem"><table class="ig-tabela${densa ? ' ig-tabela--densa' : ''}"${id ? ` id="${id}"` : ''}>${legenda ? `<caption>${escapar(legenda)}</caption>` : ''}<thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody></table></div>`;
}

/** Liga a ordenação por clique no cabeçalho de uma tabela já renderizada (reordena o DOM). */
export function ativarOrdenacao(raiz) {
  raiz.querySelectorAll('table.ig-tabela th[aria-sort]').forEach((th, idx) => {
    th.addEventListener('click', () => {
      const tabela = th.closest('table');
      const asc = th.getAttribute('aria-sort') !== 'ascending';
      tabela.querySelectorAll('th[aria-sort]').forEach(o => o.setAttribute('aria-sort', 'none'));
      th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
      const corpo = tabela.tBodies[0];
      const linhas = [...corpo.rows];
      const chave = tr => {
        const t = tr.cells[idx].textContent.trim().replace(/ .*$/, '').replace(/−/, '-').replace(/\./g, '').replace(',', '.');
        const n = parseFloat(t);
        return Number.isNaN(n) || !/^[-+]?\d/.test(t) ? tr.cells[idx].textContent.trim().toLowerCase() : n;
      };
      linhas.sort((a, b) => { const x = chave(a), y = chave(b); return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); });
      linhas.forEach(l => corpo.appendChild(l));
    });
  });
}

export function ficha(pares) {
  return `<dl class="ig-ficha">${pares.map(([k, v]) => `<dt>${escapar(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

export function vazio(titulo, proximoPasso, icone = 'ph-tray') {
  return `<div class="ig-vazio" role="status"><i class="ph ${icone}" aria-hidden="true"></i><b>${escapar(titulo)}</b><span>${escapar(proximoPasso)}</span></div>`;
}

export function notaDidatica(texto, icone = 'ph-question') {
  return `<div class="ig-nota-didatica"><i class="ph ${icone}" aria-hidden="true"></i><p>${texto}</p></div>`;
}

export function equivalente(html, titulo = 'Tabela equivalente') {
  return `<details class="ig-equivalente"><summary>${escapar(titulo)}</summary><div>${html}</div></details>`;
}

/**
 * Tabela equivalente organizada por região, com os componentes em cascata.
 * blocos: [{ rotulo, resumo (html curto), detalhe (html, sob demanda) }]
 */
export function equivalentePorArea(blocos, titulo = 'Tabela equivalente por região') {
  const itens = blocos.map(b => `<details class="ig-equivalente__area">
      <summary><span class="ig-equivalente__nome">${escapar(b.rotulo)}</span><span class="ig-equivalente__resumo">${b.resumo ?? ''}</span></summary>
      <div>${b.detalhe}</div></details>`).join('');
  return `<details class="ig-equivalente"><summary>${escapar(titulo)}</summary><div>${itens}</div></details>`;
}

export function botao(texto, { variante = 'primario', icone = '', id = '', pequeno = false, atributos = '' } = {}) {
  return `<button type="button" class="ig-botao ig-botao--${variante}${pequeno ? ' ig-botao--pequeno' : ''}"${id ? ` id="${id}"` : ''} ${atributos}>${icone ? `<i class="ph ${icone}" aria-hidden="true"></i>` : ''}${escapar(texto)}</button>`;
}

export function baixarArquivo(nome, conteudo, tipo = 'application/json') {
  const blob = new Blob([conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
