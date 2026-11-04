/* =====================================================================
   app.js — Projeto Varejo · Esboço D3
   Roteamento por hash (#/, #/p/1 … #/p/20, #/conferencia), menu lateral,
   montagem de cada página, tabela de dados, "Sua conclusão" e tema.
   Os gráficos em si ficam em js/graficos.js (objeto GRAFICOS).
   ===================================================================== */
"use strict";                                                       // modo estrito: erros silenciosos viram erros visíveis

// =====================================================================
// 1. DADOS E CONFERÊNCIA DE CARREGAMENTO
// =====================================================================
const D = window.DADOS;                                             // agregados gravados pelo gerar_dados_d3.py
const conteudo = d3.select("#conteudo");                            // área principal da página

// =====================================================================
// 2. FORMATADORES pt-BR (vírgula decimal, ponto de milhar)
// =====================================================================
const FMT = {                                                       // um formatador por tipo de número
  brl: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),   // R$ 1.234,56
  brl0: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),   // R$ 1.235
  pct: (v, c = 1) => (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }) + "%",   // 0,123 → 12,3%
  pp: (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " p.p.",   // pontos percentuais
  num: (v, c = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }),   // 1.234 ou 1,23
  sinal: (v) => (v > 0 ? "+" : "") + FMT.pct(v),                    // +12,3% ou −4,5%
};

// =====================================================================
// 3. BLOCOS E PERGUNTAS (mesmos textos do notebook 05 e do Excel)
// =====================================================================
const BLOCOS = [                                                    // seis blocos temáticos
  { n: 1, nome: "Receita e Tendência", de: 1, ate: 4 },            // perguntas 1–4
  { n: 2, nome: "Mix de Categorias", de: 5, ate: 8 },              // perguntas 5–8
  { n: 3, nome: "Canais de Venda", de: 9, ate: 11 },               // perguntas 9–11
  { n: 4, nome: "Geografia", de: 12, ate: 14 },                     // perguntas 12–14
  { n: 5, nome: "Clientes", de: 15, ate: 17 },                      // perguntas 15–17
  { n: 6, nome: "Preço e Desconto", de: 18, ate: 20 },             // perguntas 18–20
];

const PERGUNTAS = [                                                 // uma entrada por página
  { n: 1, titulo: "Evolução mensal da receita",                     // título da página
    pergunta: "A receita está crescendo, caindo ou estável ao longo de 2024?",   // a pergunta de negócio
    leitura: "A receita de cada mês e a variação em relação à média. Olhe a tendência da linha, não um mês isolado.",   // como ler
    visual: "Linha com marcadores, eixo começando em zero." },      // forma escolhida
  { n: 2, titulo: "Sazonalidade por mês",                           // pergunta 2
    pergunta: "Quais meses concentram mais vendas, acima da média do ano?",   // a pergunta de negócio
    leitura: "Barras em azul forte estão acima da média anual; em azul claro, abaixo. A linha tracejada é a média.",   // como ler o resultado
    visual: "Barras com linha de referência da média." },   // forma do gráfico escolhida
  { n: 3, titulo: "Ticket médio ao longo do tempo",                 // pergunta 3
    pergunta: "O cliente está gastando mais ou menos por compra?",   // a pergunta de negócio
    leitura: "Ticket médio = receita do mês ÷ número de vendas do mês. Separa crescimento por mais vendas de crescimento por vendas maiores.",   // como ler o resultado
    visual: "Linha com marcadores e referência do ticket do ano." },   // forma do gráfico escolhida
  { n: 4, titulo: "Concentração de receita (Pareto)",               // pergunta 4
    pergunta: "Quantas transações respondem por 80% da receita?",   // a pergunta de negócio
    leitura: "As vendas são ordenadas da maior para a menor e a receita é acumulada. Quanto menor o percentual de vendas que forma 80% da receita, mais concentrada ela é.",   // como ler o resultado
    visual: "Curva acumulada com linhas de referência em 80%." },   // forma do gráfico escolhida
  { n: 5, titulo: "Ranking de categorias por receita",              // pergunta 5
    pergunta: "Quais categorias sustentam o faturamento?",   // a pergunta de negócio
    leitura: "Receita e participação de cada categoria, da maior para a menor.",   // como ler o resultado
    visual: "Barras horizontais ordenadas." },   // forma do gráfico escolhida
  { n: 6, titulo: "Receita versus volume por categoria",            // pergunta 6
    pergunta: "Quais categorias vendem muito em unidades mas pouco em dinheiro — e vice-versa?",   // a pergunta de negócio
    leitura: "Categoria com % de unidades maior que % de receita é de tráfego (atrai movimento); o contrário é de valor (sustenta o caixa). Abaixo da diagonal = tráfego.",   // como ler o resultado
    visual: "Dispersão com o nome de cada categoria no ponto." },   // forma do gráfico escolhida
  { n: 7, titulo: "Dispersão de preço unitário por categoria",      // pergunta 7
    pergunta: "Qual o posicionamento e a variação de preço de cada categoria?",   // a pergunta de negócio
    leitura: "A caixa vai do 1º ao 3º quartil; a linha no meio é a mediana; os bigodes mostram a faixa típica (1,5 × intervalo interquartil) e os pontos isolados são preços atípicos.",   // como ler o resultado
    visual: "Caixa (boxplot).",   // forma do gráfico escolhida
    filtro: "Só preços observados: as 260 vendas com preço imputado ficam de fora." },   // recorte aplicado aos dados
  { n: 8, titulo: "Evolução da participação das categorias",        // pergunta 8
    pergunta: "Alguma categoria está ganhando ou perdendo espaço ao longo do ano?",   // a pergunta de negócio
    leitura: "Participação de cada categoria na receita do mês (cada mês soma 100%). Uma faixa que engorda está ganhando espaço.",   // como ler o resultado
    visual: "Área empilhada 100%, com cores fixas por categoria." },   // forma do gráfico escolhida
  { n: 9, titulo: "Participação de receita por canal",              // pergunta 9
    pergunta: "Quanto cada canal (Loja, Site, App, Televendas) representa?",   // a pergunta de negócio
    leitura: "'% do total' inclui as vendas sem canal; '% com canal' as exclui. Cite qual está usando.",   // como ler o resultado
    visual: "Barras horizontais (mais precisas que pizza para comparar partes)." },   // forma do gráfico escolhida
  { n: 10, titulo: "Ticket médio por canal",                        // pergunta 10
    pergunta: "Em qual canal o cliente gasta mais por compra?",   // a pergunta de negócio
    leitura: "Receita do canal ÷ número de vendas do canal; a linha tracejada é o ticket médio do ano.",   // como ler o resultado
    visual: "Barras horizontais com referência." },   // forma do gráfico escolhida
  { n: 11, titulo: "Mix de categorias dentro de cada canal",        // pergunta 11
    pergunta: "O comportamento de compra muda conforme o canal?",   // a pergunta de negócio
    leitura: "Participação de cada categoria na receita do canal (cada linha soma 100%). Tons mais fortes = categoria mais relevante naquele canal.",   // como ler o resultado
    visual: "Mapa de calor em um só tom (azul)." },   // forma do gráfico escolhida
  { n: 12, titulo: "Receita por unidade federativa",                // pergunta 12
    pergunta: "Onde está concentrada a operação?",   // a pergunta de negócio
    leitura: "UFs ordenadas pela receita; 'NI' por último. UFs abaixo da massa mínima (15 vendas) aparecem esmaecidas: média instável.",   // como ler o resultado
    visual: "Barras horizontais (um mapa coroplético exige arquivo de fronteiras — fica para o dashboard final)." },   // forma do gráfico escolhida
  { n: 13, titulo: "Grau de concentração geográfica",               // pergunta 13
    pergunta: "Qual a dependência das praças principais?",   // a pergunta de negócio
    leitura: "Quanto da receita vem das 3 e das 5 maiores UFs, com dois denominadores: o faturamento total e só a receita com UF informada.",   // como ler o resultado
    visual: "Cartões de indicador — a resposta é um número, não uma comparação." },   // forma do gráfico escolhida
  { n: 14, titulo: "Canal preferencial por região",                 // pergunta 14
    pergunta: "O canal de compra varia geograficamente?",   // a pergunta de negócio
    leitura: "Participação de cada canal no número de vendas da UF (cada barra soma 100%). Só UFs com pelo menos 15 vendas.",   // como ler o resultado
    visual: "Barras empilhadas 100%, com cores fixas por canal." },   // forma do gráfico escolhida
  { n: 15, titulo: "Recorrência de compra",                         // pergunta 15
    pergunta: "Qual a proporção de clientes recorrentes na base?",   // a pergunta de negócio
    leitura: "Quantos clientes compraram 1 vez, 2 vezes, e assim por diante. Recorrente = 2 compras ou mais.",   // como ler o resultado
    visual: "Histograma (barras por número de compras)." },   // forma do gráfico escolhida
  { n: 16, titulo: "Top clientes por receita",                      // pergunta 16
    pergunta: "Quem são os clientes de maior valor?",   // a pergunta de negócio
    leitura: "Os 20 clientes com maior receita; '% acumulado' mostra quanto eles somam juntos.",   // como ler o resultado
    visual: "Barras horizontais ordenadas." },   // forma do gráfico escolhida
  { n: 17, titulo: "Segmentação RFV (Recência, Frequência, Valor)", // pergunta 17
    pergunta: "Como classificar a base em grupos acionáveis?",   // a pergunta de negócio
    leitura: "Cada cliente recebe nota de 1 a 4 em Recência, Frequência e Valor, por quartis. A soma (3 a 12) define o segmento: Campeões ≥ 10, Leais ≥ 7, Atenção ≥ 5, Em risco abaixo disso.",   // como ler o resultado
    visual: "Barras de receita por segmento + dispersão frequência × valor." },   // forma do gráfico escolhida
  { n: 18, titulo: "Distribuição da política de desconto",          // pergunta 18
    pergunta: "Como os descontos estão sendo aplicados na prática?",   // a pergunta de negócio
    leitura: "Quantas vendas caem em cada faixa de desconto.",   // como ler o resultado
    visual: "Histograma por faixas (mesmas do Excel).",   // forma do gráfico escolhida
    filtro: "Exclui as 69 vendas com desconto imputado." },   // recorte aplicado aos dados
  { n: 19, titulo: "Desconto médio por categoria e canal",          // pergunta 19
    pergunta: "Onde a empresa concede mais desconto?",   // a pergunta de negócio
    leitura: "Desconto médio, em pontos percentuais, de cada combinação. Tons mais fortes = mais desconto.",   // como ler o resultado
    visual: "Mapa de calor em um só tom (laranja, para não confundir com o azul do bloco 3).",   // forma do gráfico escolhida
    filtro: "Exclui as 69 vendas com desconto imputado." },   // recorte aplicado aos dados
  { n: 20, titulo: "Relação entre desconto e valor da venda",       // pergunta 20
    pergunta: "Desconto maior gera venda maior?",   // a pergunta de negócio
    leitura: "A correlação vai de −1 a +1; perto de zero, não há relação linear. Correlação não prova causa: uma relação positiva pode significar que vendas maiores recebem mais desconto (política por volume), e não que o desconto gera a venda.",   // como ler o resultado
    visual: "Dispersão com reta de tendência.",   // forma do gráfico escolhida
    filtro: "Exclui as 69 vendas com desconto imputado." },   // recorte aplicado aos dados
];

const blocoDe = (n) => BLOCOS.find((b) => n >= b.de && n <= b.ate);   // bloco a que a pergunta n pertence

// =====================================================================
// 4. DICA (tooltip) COMPARTILHADA
// =====================================================================
const dica = d3.select("#dica");                                    // a caixa única definida no index.html
const U = {                                                         // utilitários entregues a cada gráfico
  FMT,                                                              // formatadores
  mostrar(evento, html) {                                           // exibe a dica junto ao ponteiro
    dica.html(html).style("opacity", 1);                            // conteúdo e visibilidade
    const caixa = dica.node().getBoundingClientRect();              // tamanho atual da dica
    let x = evento.clientX + 14, y = evento.clientY + 14;           // posição padrão: abaixo e à direita
    if (x + caixa.width > window.innerWidth - 8) x = evento.clientX - caixa.width - 14;   // vira para a esquerda na borda
    if (y + caixa.height > window.innerHeight - 8) y = evento.clientY - caixa.height - 14;   // vira para cima na borda
    dica.style("left", x + "px").style("top", y + "px");            // posiciona
  },
  esconder() { dica.style("opacity", 0); },                         // some com a dica
};

// =====================================================================
// 5. ARMAZENAMENTO LOCAL (sempre protegido — pode estar bloqueado)
// =====================================================================
const guardar = (chave, valor) => { try { localStorage.setItem(chave, valor); } catch (e) {} };   // grava sem quebrar
const ler = (chave) => { try { return localStorage.getItem(chave); } catch (e) { return null; } };   // lê sem quebrar

// =====================================================================
// 6. MENU LATERAL (montado uma vez)
// =====================================================================
function montarMenu() {                                             // cria os links das 20 perguntas
  const menu = d3.select("#menu");                                  // <nav id="menu">
  menu.append("a").attr("href", "#/").attr("data-rota", "inicio").text("Início e índice");   // link da página inicial
  BLOCOS.forEach((b) => {                                           // um grupo por bloco
    menu.append("h2").text(`Bloco ${b.n} — ${b.nome}`);             // nome do bloco
    PERGUNTAS.filter((p) => p.n >= b.de && p.n <= b.ate).forEach((p) => {   // perguntas do bloco
      menu.append("a").attr("href", `#/p/${p.n}`).attr("data-rota", `p${p.n}`)   // link da pergunta
        .text(`${p.n}. ${p.titulo}`);                               // texto do link
    });
  });
  menu.append("h2").text("Verificação");                            // grupo final
  menu.append("a").attr("href", "#/conferencia").attr("data-rota", "conferencia").text("Conferência com o Excel");   // link da conferência
}

function marcarMenu(rota) {                                         // destaca o item da página atual
  d3.selectAll("#menu a").classed("ativo", function () { return this.dataset.rota === rota; });   // só um fica ativo
}

// =====================================================================
// 7. TABELA DE DADOS (visão tabular de cada gráfico)
// =====================================================================
function montarTabela(alvo, tabela) {                               // tabela = { colunas: [{nome, num}], linhas: [[...]] }
  const t = alvo.append("table");                                   // elemento <table>
  t.append("thead").append("tr").selectAll("th").data(tabela.colunas).join("th")   // cabeçalho
    .attr("class", (c) => (c.num ? "num" : null)).text((c) => c.nome);   // números à direita
  t.append("tbody").selectAll("tr").data(tabela.linhas).join("tr")  // uma linha por registro
    .selectAll("td").data((linha) => linha).join("td")              // uma célula por coluna
    .attr("class", (_, i) => (tabela.colunas[i].num ? "num" : null)).text((v) => v);   // valor já formatado
}

// =====================================================================
// 8. PÁGINAS (uma função por tipo de rota)
// =====================================================================
let redesenhar = null;                                              // redesenho do gráfico atual (tema/tamanho)

function paginaInicio() {                                           // ROTA "#/" — capa, indicadores e índice
  conteudo.append("p").attr("class", "trilha").text("Projeto Varejo · estudo com base fictícia");   // trilha
  conteudo.append("h1").text("Esboço dos dashboards em D3.js");     // título
  conteudo.append("p").attr("class", "pergunta")                    // apresentação
    .text("Uma página por pergunta de negócio, com gráfico, tabela de dados e espaço para a sua conclusão. Mesmas regras e números do esboço em Excel e do notebook 05.");  // texto de apresentação
  const k = conteudo.append("div").attr("class", "ladrilhos");      // cartões de indicador
  const clientes = D.p15.clientes;                                  // total de clientes
  [["Faturamento", FMT.brl(D.meta.faturamento), "soma de valor_total"],   // cartão 1
   ["Vendas", FMT.num(D.meta.vendas), "linhas da base limpa"],       // cartão 2
   ["Ticket médio", FMT.brl(D.p3.ticket_ano), "faturamento ÷ vendas"],   // cartão 3
   ["Clientes", FMT.num(clientes), `${FMT.pct(D.p15.recorrentes / clientes)} recorrentes`],   // cartão 4
  ].forEach(([rotulo, valor, detalhe]) => {                         // desenha cada cartão
    const c = k.append("div").attr("class", "ladrilho");            // moldura
    c.append("div").attr("class", "rotulo").text(rotulo);           // nome
    c.append("div").attr("class", "valor").text(valor);             // número
    c.append("div").attr("class", "detalhe").text(detalhe);         // explicação
  });
  const ind = conteudo.append("div").attr("class", "indice");       // índice por bloco
  BLOCOS.forEach((b) => {                                           // um cartão por bloco
    const c = ind.append("section").attr("class", "cartao");        // moldura
    c.append("h2").text(`Bloco ${b.n} — ${b.nome}`);                // nome do bloco
    const ol = c.append("ol").attr("start", b.de);                  // lista começando no nº certo
    PERGUNTAS.filter((p) => p.n >= b.de && p.n <= b.ate).forEach((p) =>   // perguntas do bloco
      ol.append("li").append("a").attr("href", `#/p/${p.n}`).text(p.titulo));   // link
  });
  conteudo.append("p").attr("class", "nota")                        // rodapé com a origem dos dados
    .text(`Dados: ${D.meta.fonte}, gerados em ${D.meta.gerado_em} pelo gerar_dados_d3.py. Use as setas ← → do teclado para trocar de página.`);  // origem e data dos dados
}

function paginaPergunta(n) {                                        // ROTA "#/p/N" — uma pergunta
  const p = PERGUNTAS[n - 1];                                       // metadados da pergunta
  const b = blocoDe(n);                                             // bloco da pergunta
  conteudo.append("p").attr("class", "trilha")                      // trilha de navegação
    .text(`Bloco ${b.n} — ${b.nome} · Pergunta ${n} de 20`);   // texto da trilha
  conteudo.append("h1").text(`Pergunta ${n} — ${p.titulo}`);        // título
  conteudo.append("p").attr("class", "pergunta").text(p.pergunta);  // a pergunta
  const ficha = conteudo.append("dl").attr("class", "ficha");       // ficha técnica
  [["Como ler", p.leitura], ["Visual", p.visual], ["Filtro", p.filtro]]   // três campos
    .filter(([, v]) => v)                                           // "Filtro" só quando existe
    .forEach(([k, v]) => { ficha.append("dt").text(k); ficha.append("dd").text(v); });   // dt + dd

  const cg = conteudo.append("section").attr("class", "cartao");    // CARTÃO DO GRÁFICO
  cg.append("h2").text(`Gráfico G${n} — ${p.titulo}`);              // nome do gráfico
  const area = cg.append("div").attr("class", "grafico").attr("id", `grafico-p${n}`);   // onde o D3 desenha
  let tabela = null;                                                // tabela devolvida pelo gráfico
  redesenhar = () => {                                              // desenha (e redesenha no resize/tema)
    U.esconder();                                                   // some com dica antiga
    area.selectAll("*").remove();                                   // limpa o desenho anterior
    tabela = GRAFICOS[n](area, D, U);                               // chama G1…G20 de graficos.js
  };
  redesenhar();                                                     // primeiro desenho

  const ct = conteudo.append("section").attr("class", "cartao");    // CARTÃO DA TABELA
  const det = ct.append("details");                                 // recolhível
  det.append("summary").text(`Tabela T${n} — ver os dados do gráfico`);   // título clicável
  montarTabela(det, tabela);                                        // conteúdo da tabela

  const cc = conteudo.append("section").attr("class", "cartao");    // CARTÃO "SUA CONCLUSÃO"
  cc.append("h2").text(`Sua conclusão — pergunta ${n}`);            // título
  const chave = `varejo-d3-conclusao-${n}`;                         // chave no armazenamento local
  cc.append("textarea").attr("aria-label", `Sua conclusão — pergunta ${n}`)   // caixa de texto
    .attr("placeholder", "Escreva aqui, com suas palavras, o que a tabela e o gráfico mostram. Cite os números.")  // texto-guia dentro da caixa
    .property("value", ler(chave) || "")                            // recupera o que já foi escrito
    .on("input", function () { guardar(chave, this.value); });      // salva a cada tecla
  cc.append("p").attr("class", "nota").text("Fica salvo só neste navegador. Para guardar de vez, copie para o seu notebook ou README.");   // aviso

  const nav = conteudo.append("div").attr("class", "navegacao");    // ANTERIOR / ÍNDICE / PRÓXIMA
  nav.append("a").attr("class", "botao").attr("href", `#/p/${n - 1}`)   // anterior
    .attr("aria-disabled", n === 1 ? "true" : null).text("← Anterior");   // desativado na pergunta 1
  nav.append("a").attr("class", "botao").attr("href", "#/").text("Índice");   // volta ao início
  nav.append("a").attr("class", "botao").attr("href", `#/p/${n + 1}`)   // próxima
    .attr("aria-disabled", n === 20 ? "true" : null).text("Próxima →");   // desativado na pergunta 20
}

function paginaConferencia() {                                      // ROTA "#/conferencia"
  const nomes = {                                                   // nome legível de cada indicador
    faturamento: ["Faturamento", 1, (v) => FMT.brl(v)],             // [rótulo, pergunta, formatador]
    meses_acima: ["Meses acima da média", 2, (v) => FMT.num(v)],   // indicador da pergunta 2
    vendas_80: ["Vendas para 80% da receita", 4, (v) => FMT.num(v)],   // indicador da pergunta 4
    top3_receita: ["Receita das 3 maiores UFs", 13, (v) => FMT.brl(v)],   // indicador da pergunta 13
    recorrentes: ["Clientes recorrentes", 15, (v) => FMT.num(v)],   // indicador da pergunta 15
    campeoes: ["Clientes 'Campeões'", 17, (v) => FMT.num(v)],   // indicador da pergunta 17
    vendas_desconto_valido: ["Vendas com desconto válido", 18, (v) => FMT.num(v)],   // indicador da pergunta 18
    correlacao: ["Correlação desconto × valor", 20, (v) => FMT.num(v, 4)],   // indicador da pergunta 20
  };
  const ok = D.conferencia.filter((c) => c.ok).length;              // quantos batem
  conteudo.append("p").attr("class", "trilha").text("Verificação");   // trilha
  conteudo.append("h1").text("Conferência com o esboço em Excel");  // título
  conteudo.append("p").attr("class", "pergunta")                    // resumo
    .html(`<span class="${ok === D.conferencia.length ? "ok" : "erro"}">${ok} de ${D.conferencia.length}</span> indicadores batem com o esboco-dashboard-excel.xlsx (tolerância de 0,5%).`);  // resumo colorido: verde se tudo bate
  const c = conteudo.append("section").attr("class", "cartao");     // moldura
  montarTabela(c, {                                                 // tabela de conferência
    colunas: [{ nome: "Indicador" }, { nome: "Pergunta", num: true }, { nome: "D3 (este esboço)", num: true },  // cabeçalho da tabela
              { nome: "Excel", num: true }, { nome: "Situação" }],  // cabeçalho
    linhas: D.conferencia.map((x) => {                              // uma linha por indicador
      const [rotulo, perg, f] = nomes[x.indicador];                 // rótulo e formatador
      return [rotulo, perg, f(x.d3), f(x.excel), x.ok ? "✓ confere" : "✗ diverge"];   // linha formatada
    }),
  });
  c.selectAll("td:last-child").attr("class", (_, i) => (D.conferencia[i].ok ? "ok" : "erro"));   // cor + símbolo
}

function paginaNaoEncontrada() {                                    // qualquer outra rota
  conteudo.append("h1").text("Página não encontrada");              // título
  conteudo.append("p").html('Este endereço não existe. <a href="#/">Voltar ao índice</a>.');   // saída
}

// =====================================================================
// 9. ROTEADOR (lê o "#" do endereço e escolhe a página)
// =====================================================================
function rotear() {                                                 // chamado ao abrir e a cada troca de "#"
  const hash = location.hash.replace(/^#\/?/, "");                  // "#/p/3" → "p/3"
  conteudo.selectAll("*").remove();                                 // limpa a página anterior
  redesenhar = null;                                                // nenhuma página com gráfico ainda
  U.esconder();                                                     // some com dica antiga
  const m = hash.match(/^p\/(\d{1,2})$/);                           // "p/N"?
  let rota;                                                         // nome da rota (para o menu)
  if (hash === "") { paginaInicio(); rota = "inicio"; }             // página inicial
  else if (m && +m[1] >= 1 && +m[1] <= 20) { paginaPergunta(+m[1]); rota = `p${+m[1]}`; }   // pergunta 1–20
  else if (hash === "conferencia") { paginaConferencia(); rota = "conferencia"; }   // conferência
  else { paginaNaoEncontrada(); rota = ""; }                        // endereço inválido
  marcarMenu(rota);                                                 // destaca no menu
  const titulo = conteudo.select("h1").text();                      // título da página
  document.title = `${titulo} — Esboço D3 · Projeto Varejo`;        // nome na aba
  window.scrollTo(0, 0);                                            // volta ao topo
}

// =====================================================================
// 10. TEMA CLARO/ESCURO
// =====================================================================
const sistemaEscuro = window.matchMedia("(prefers-color-scheme: dark)");   // preferência do sistema
const temaAtual = () => document.documentElement.getAttribute("data-theme") || (sistemaEscuro.matches ? "dark" : "light");   // tema efetivo
function atualizarBotaoTema() {                                     // texto do botão = o tema que ele ativa
  d3.select("#botao-tema").text(temaAtual() === "dark" ? "Tema claro" : "Tema escuro");   // texto conforme o tema efetivo
}
d3.select("#botao-tema").on("click", () => {                        // clique no botão
  const novo = temaAtual() === "dark" ? "light" : "dark";           // inverte
  document.documentElement.setAttribute("data-theme", novo);        // aplica
  guardar("varejo-d3-tema", novo);                                  // lembra a escolha
  atualizarBotaoTema();                                             // troca o texto
  if (redesenhar) redesenhar();                                     // cores lidas por JS (mapas de calor) são refeitas
});
sistemaEscuro.addEventListener("change", () => { atualizarBotaoTema(); if (redesenhar) redesenhar(); });   // sistema mudou de tema

// =====================================================================
// 11. EVENTOS GERAIS E PARTIDA
// =====================================================================
let espera;                                                         // temporizador do redimensionamento
window.addEventListener("resize", () => {                           // janela mudou de tamanho
  clearTimeout(espera);                                             // cancela o anterior
  espera = setTimeout(() => { if (redesenhar) redesenhar(); }, 150);   // redesenha 150 ms depois
});
document.addEventListener("keydown", (e) => {                       // setas ← → trocam de pergunta
  if (e.target.closest("textarea, input")) return;                  // não atrapalha quem está digitando
  const m = location.hash.match(/^#\/p\/(\d+)$/);                   // está numa pergunta?
  if (!m) return;                                                   // não: ignora
  const n = +m[1] + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0);   // próxima ou anterior
  if (n !== +m[1] && n >= 1 && n <= 20) location.hash = `#/p/${n}`; // navega dentro de 1–20
});

if (!D || !window.GRAFICOS) {                                       // dados ou gráficos não carregaram
  conteudo.html("<h1>Dados não encontrados</h1><p>Rode <code>python gerar_dados_d3.py</code> na raiz desta pasta para criar <code>data/dados.js</code> e recarregue a página.</p>");   // instrução
} else {                                                            // tudo certo
  montarMenu();                                                     // menu lateral
  atualizarBotaoTema();                                             // texto do botão de tema
  window.addEventListener("hashchange", rotear);                    // cada troca de "#" chama o roteador
  rotear();                                                         // desenha a rota inicial
}
