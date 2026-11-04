/* =====================================================================
   graficos.js — Projeto Varejo · Esboço D3
   Um gráfico por pergunta: GRAFICOS[1] … GRAFICOS[20].
   Cada função recebe (alvo, D, U):
     alvo → seleção D3 do <div class="grafico"> onde desenhar
     D    → window.DADOS (agregados do gerar_dados_d3.py)
     U    → utilitários do app.js (FMT = formatadores, mostrar/esconder = dica)
   e devolve a tabela de dados { colunas: [{nome, num}], linhas: [[...]] }.
   Cores sempre por variável CSS (var(--s1) etc.): o tema troca sem mexer aqui.
   ===================================================================== */
"use strict";                                                       // modo estrito

const GRAFICOS = {};                                                // registro dos 20 gráficos
window.GRAFICOS = GRAFICOS;                                         // exposto para o app.js

// =====================================================================
// 0. AJUDANTES COMPARTILHADOS
// =====================================================================
const MARGEM = { topo: 16, dir: 24, base: 36, esq: 84 };            // margens padrão (px)
const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)"];   // cores categóricas na ordem validada
const cor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();   // lê o hex atual de uma variável CSS
const corTextoSobre = (fundo) => (d3.lab(fundo).l > 62 ? "#0b0b0b" : "#ffffff");   // texto escuro em fundo claro e vice-versa

function quadro(alvo, altura, m = MARGEM) {                         // cria o SVG e a área útil
  const largura = Math.max(320, alvo.node().clientWidth || 800);    // largura do cartão (mínimo 320)
  const svg = alvo.append("svg")                                    // elemento <svg>
    .attr("viewBox", `0 0 ${largura} ${altura}`)                    // sistema de coordenadas
    .attr("role", "img");                                           // acessibilidade: é uma imagem
  const g = svg.append("g").attr("transform", `translate(${m.esq},${m.topo})`);   // grupo deslocado pelas margens
  return { svg, g, w: largura - m.esq - m.dir, h: altura - m.topo - m.base, largura };   // área útil
}

function legenda(alvo, itens) {                                     // legenda HTML acima do gráfico
  const l = alvo.append("div").attr("class", "legenda");            // contêiner
  itens.forEach((it) => {                                           // um item por série
    const s = l.append("span");                                     // item
    if (it.linha) s.append("i").attr("class", "linha");             // amostra tracejada (referência)
    else s.append("i").style("background", it.cor).style("opacity", it.opacidade ?? 1);   // amostra de cor
    s.append("span").text(it.rotulo);                               // nome da série
  });
}

function eixoX(q, escala, formato, n) {                             // eixo inferior
  const a = d3.axisBottom(escala).tickSizeOuter(0);                 // eixo sem marca nas pontas
  if (formato) a.tickFormat(formato);                               // formato dos números
  if (n) a.ticks(n);                                                // quantidade de marcas
  return q.g.append("g").attr("class", "eixo").attr("transform", `translate(0,${q.h})`).call(a);   // desenha embaixo
}

function eixoY(q, escala, formato, n = 5) {                         // eixo esquerdo com grade horizontal
  q.g.append("g").attr("class", "grade")                            // grade atrás das marcas
    .call(d3.axisLeft(escala).ticks(n).tickSize(-q.w).tickFormat(""));   // linhas finas de ponta a ponta
  const a = d3.axisLeft(escala).ticks(n).tickSizeOuter(0);          // eixo com números
  if (formato) a.tickFormat(formato);                               // formato dos números
  return q.g.append("g").attr("class", "eixo").call(a);             // desenha à esquerda
}

function gradeX(q, escala, formato, n = 5) {                        // grade vertical + eixo inferior (barras horizontais)
  q.g.append("g").attr("class", "grade").attr("transform", `translate(0,${q.h})`)   // grade a partir da base
    .call(d3.axisBottom(escala).ticks(n).tickSize(-q.h).tickFormat(""));   // linhas verticais
  return eixoX(q, escala, formato, n);                              // números embaixo
}

function eixoCategorias(q, escala) {                                // nomes das categorias à esquerda (sem grade)
  return q.g.append("g").attr("class", "eixo").call(d3.axisLeft(escala).tickSize(0).tickPadding(8));   // sem tracinhos
}

function refH(q, y, texto) {                                        // linha de referência horizontal
  q.g.append("line").attr("class", "referencia")                    // tracejada
    .attr("x1", 0).attr("x2", q.w).attr("y1", y).attr("y2", y);     // de ponta a ponta
  q.g.append("text").attr("class", "rotulo-ref").attr("x", q.w).attr("y", y - 6).attr("text-anchor", "end").text(texto);   // rótulo à direita, com halo
}

function refV(q, x, texto) {                                        // linha de referência vertical
  q.g.append("line").attr("class", "referencia")                    // tracejada
    .attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", q.h);     // de cima a baixo
  q.g.append("text").attr("class", "rotulo-ref").attr("x", x + 6).attr("y", 10).text(texto);   // rótulo no topo, com halo
}

function nota(alvo, texto) {                                        // observação abaixo do gráfico
  alvo.append("p").attr("class", "nota").text(texto);               // parágrafo pequeno
}

function interativo(sel, html, U) {                                 // liga a dica a um conjunto de marcas
  return sel.style("cursor", "default")                             // cursor normal
    .on("pointermove", (e, d) => U.mostrar(e, html(d)))             // mostra a dica com o conteúdo do dado
    .on("pointerleave", U.esconder);                                // esconde ao sair
}

function pontoGrande(sel) {                                         // aumenta a área de toque sem aumentar o desenho
  return sel.style("stroke", "transparent").style("stroke-width", 14);   // contorno invisível de 14 px capta o mouse
}

function barrasH(alvo, U, dados, o) {                               // barras horizontais genéricas (perguntas 5, 9, 10, 12, 16)
  const q = quadro(alvo, dados.length * (o.passo || 30) + 46, { ...MARGEM, esq: o.esq || 110, dir: 140 });   // altura cresce com as linhas
  const y = d3.scaleBand().domain(dados.map(o.nome)).range([0, q.h]).padding(0.25);   // uma faixa por item
  const x = d3.scaleLinear().domain([0, (o.max || d3.max(dados, o.valor)) * 1.02]).nice().range([0, q.w]);   // começa em zero
  gradeX(q, x, o.formatoEixo, 5);                                   // grade vertical e eixo
  eixoCategorias(q, y);                                             // nomes à esquerda
  const barras = q.g.selectAll("rect.barra").data(dados).join("rect").attr("class", "barra")   // uma barra por item
    .attr("x", 0).attr("y", (d) => y(o.nome(d)))                    // posição
    .attr("width", (d) => x(o.valor(d))).attr("height", y.bandwidth())   // tamanho
    .attr("rx", 2)                                                  // cantos levemente arredondados
    .style("fill", o.cor || "var(--s1)")                            // cor (fixa ou por item)
    .style("opacity", o.opacidade || 1);                            // esmaecer itens, se pedido
  interativo(barras, o.dica, U);                                    // dica ao passar o mouse
  q.g.selectAll("text.valor").data(dados).join("text").attr("class", "valor")   // rótulo direto no fim da barra
    .attr("x", (d) => x(o.valor(d)) + 6).attr("y", (d) => y(o.nome(d)) + y.bandwidth() / 2)   // posição
    .attr("dy", "0.35em").text(o.rotulo);                           // centraliza na vertical
  return { q, x, y };                                               // devolve escalas para extras
}

// =====================================================================
// BLOCO 1 — RECEITA E TENDÊNCIA
// =====================================================================

// ---------- GRÁFICO G1 — Evolução mensal da receita (linha) ----------
GRAFICOS[1] = (alvo, D, U) => {   // ===== GRÁFICO G1: recebe (alvo, D, U) e devolve a tabela T1 =====
  const d = D.p1.mensal, media = D.p1.media;                        // 12 meses e média mensal
  legenda(alvo, [{ rotulo: "Receita do mês", cor: "var(--s1)" }, { rotulo: "Média mensal", linha: true }]);   // legenda
  const q = quadro(alvo, 360);                                      // área do gráfico
  const x = d3.scalePoint().domain(d.map((v) => v.nome)).range([0, q.w]).padding(0.4);   // um ponto por mês
  const y = d3.scaleLinear().domain([0, d3.max(d, (v) => v.receita) * 1.1]).nice().range([q.h, 0]);   // eixo a partir de zero
  eixoY(q, y, U.FMT.brl0);                                          // eixo Y em reais
  eixoX(q, x);                                                      // meses
  refH(q, y(media), `Média ${U.FMT.brl0(media)}`);                  // linha da média
  q.g.append("path").datum(d)                                       // a linha
    .attr("d", d3.line().x((v) => x(v.nome)).y((v) => y(v.receita)))   // caminho mês a mês
    .style("fill", "none").style("stroke", "var(--s1)").style("stroke-width", 2);   // traço de 2 px
  const pontos = q.g.selectAll("circle").data(d).join("circle")     // marcadores
    .attr("cx", (v) => x(v.nome)).attr("cy", (v) => y(v.receita)).attr("r", 4)   // posição e raio
    .style("fill", "var(--s1)");                                    // cor da série
  interativo(pontoGrande(pontos), (v) => `<b>${v.nome}/2024</b>Receita: ${U.FMT.brl(v.receita)}<br>Vendas: ${v.vendas}<br>Vs. média: ${U.FMT.sinal(v.desvio)}`, U);   // dica
  return {                                                          // TABELA T1
    colunas: [{ nome: "Mês" }, { nome: "Receita", num: true }, { nome: "Vendas", num: true }, { nome: "Vs. média", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.nome, U.FMT.brl(v.receita), v.vendas, U.FMT.sinal(v.desvio)]),   // uma linha por mês
  };
};

// ---------- GRÁFICO G2 — Sazonalidade (barras acima/abaixo da média) ----------
GRAFICOS[2] = (alvo, D, U) => {   // ===== GRÁFICO G2: recebe (alvo, D, U) e devolve a tabela T2 =====
  const d = D.p1.mensal, media = D.p1.media;                        // reaproveita a série da pergunta 1
  legenda(alvo, [{ rotulo: "Acima da média", cor: "var(--enfase)" }, { rotulo: "Abaixo da média", cor: "var(--suave)" }, { rotulo: "Média mensal", linha: true }]);   // legenda
  const q = quadro(alvo, 360);                                      // área do gráfico
  const x = d3.scaleBand().domain(d.map((v) => v.nome)).range([0, q.w]).padding(0.25);   // uma barra por mês
  const y = d3.scaleLinear().domain([0, d3.max(d, (v) => v.receita) * 1.1]).nice().range([q.h, 0]);   // a partir de zero
  eixoY(q, y, U.FMT.brl0);                                          // eixo Y
  eixoX(q, x);                                                      // meses
  const barras = q.g.selectAll("rect").data(d).join("rect")         // barras
    .attr("x", (v) => x(v.nome)).attr("width", x.bandwidth())       // posição e largura
    .attr("y", (v) => y(v.receita)).attr("height", (v) => q.h - y(v.receita))   // altura = receita
    .attr("rx", 2)                                                  // cantos arredondados
    .style("fill", (v) => (v.receita > media ? "var(--enfase)" : "var(--suave)"));   // cor pela comparação com a média
  interativo(barras, (v) => `<b>${v.nome}/2024</b>${U.FMT.brl(v.receita)}<br>${v.receita > media ? "Acima" : "Abaixo"} da média (${U.FMT.sinal(v.desvio)})`, U);   // dica
  refH(q, y(media), `Média ${U.FMT.brl0(media)}`);                  // referência por cima das barras
  nota(alvo, `${D.p2.meses_acima} de 12 meses ficaram acima da média mensal.`);   // resposta direta
  return {                                                          // TABELA T2
    colunas: [{ nome: "Mês" }, { nome: "Receita", num: true }, { nome: "Vs. média", num: true }, { nome: "Situação" }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.nome, U.FMT.brl(v.receita), U.FMT.sinal(v.desvio), v.receita > media ? "Acima" : "Abaixo"]),   // linhas
  };
};

// ---------- GRÁFICO G3 — Ticket médio mensal (linha + referência) ----------
GRAFICOS[3] = (alvo, D, U) => {   // ===== GRÁFICO G3: recebe (alvo, D, U) e devolve a tabela T3 =====
  const d = D.p1.mensal, ref = D.p3.ticket_ano;                     // ticket mensal e do ano
  legenda(alvo, [{ rotulo: "Ticket médio do mês", cor: "var(--s1)" }, { rotulo: "Ticket médio do ano", linha: true }]);   // legenda
  const q = quadro(alvo, 360);                                      // área
  const x = d3.scalePoint().domain(d.map((v) => v.nome)).range([0, q.w]).padding(0.4);   // meses
  const y = d3.scaleLinear().domain([0, d3.max(d, (v) => v.ticket) * 1.15]).nice().range([q.h, 0]);   // a partir de zero
  eixoY(q, y, U.FMT.brl0);                                          // eixo Y
  eixoX(q, x);                                                      // eixo X
  refH(q, y(ref), `Ano ${U.FMT.brl(ref)}`);                         // referência anual
  q.g.append("path").datum(d)                                       // linha
    .attr("d", d3.line().x((v) => x(v.nome)).y((v) => y(v.ticket)))   // caminho
    .style("fill", "none").style("stroke", "var(--s1)").style("stroke-width", 2);   // traço
  const pontos = q.g.selectAll("circle").data(d).join("circle")     // marcadores
    .attr("cx", (v) => x(v.nome)).attr("cy", (v) => y(v.ticket)).attr("r", 4).style("fill", "var(--s1)");   // posição e cor
  interativo(pontoGrande(pontos), (v) => `<b>${v.nome}/2024</b>Ticket: ${U.FMT.brl(v.ticket)}<br>${U.FMT.brl(v.receita)} ÷ ${v.vendas} vendas`, U);   // dica com a conta
  return {                                                          // TABELA T3
    colunas: [{ nome: "Mês" }, { nome: "Receita", num: true }, { nome: "Vendas", num: true }, { nome: "Ticket médio", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.nome, U.FMT.brl(v.receita), v.vendas, U.FMT.brl(v.ticket)]),   // linhas
  };
};

// ---------- GRÁFICO G4 — Pareto (curva acumulada) ----------
GRAFICOS[4] = (alvo, D, U) => {   // ===== GRÁFICO G4: recebe (alvo, D, U) e devolve a tabela T4 =====
  const p = D.p4, pts = [[0, 0], ...p.pontos];                      // curva começa na origem
  legenda(alvo, [{ rotulo: "Receita acumulada", cor: "var(--s1)" }, { rotulo: "Referências (80% e distribuição igual)", linha: true }]);   // legenda
  const q = quadro(alvo, 380);                                      // área
  const x = d3.scaleLinear().domain([0, 1]).range([0, q.w]);        // % das vendas
  const y = d3.scaleLinear().domain([0, 1]).range([q.h, 0]);        // % da receita
  eixoY(q, y, (v) => U.FMT.pct(v, 0));                              // eixo Y em %
  eixoX(q, x, (v) => U.FMT.pct(v, 0));                              // eixo X em %
  q.g.append("line").attr("class", "referencia").style("opacity", 0.5)   // diagonal: todas as vendas iguais
    .attr("x1", 0).attr("y1", q.h).attr("x2", q.w).attr("y2", 0);   // de (0,0) a (100%,100%)
  q.g.append("line").attr("class", "referencia")                    // horizontal em 80%
    .attr("x1", 0).attr("x2", x(p.pct_80)).attr("y1", y(0.8)).attr("y2", y(0.8));   // até a curva
  q.g.append("line").attr("class", "referencia")                    // vertical no ponto de 80%
    .attr("x1", x(p.pct_80)).attr("x2", x(p.pct_80)).attr("y1", y(0.8)).attr("y2", q.h);   // até o eixo
  q.g.append("path").datum(pts)                                     // a curva
    .attr("d", d3.line().x((v) => x(v[0])).y((v) => y(v[1])))       // caminho
    .style("fill", "none").style("stroke", "var(--s1)").style("stroke-width", 2.5);   // traço
  q.g.append("text").attr("class", "rotulo-forte")                  // anotação da resposta
    .attr("x", x(p.pct_80) + 8).attr("y", y(0.8) + 18)              // ao lado do cruzamento
    .text(`${p.vendas_80} vendas (${U.FMT.pct(p.pct_80)}) formam 80% da receita`);   // texto da anotação
  const marca = q.g.append("circle").attr("r", 5).style("fill", "var(--s1)").style("opacity", 0);   // marcador que segue o mouse
  const busca = d3.bisector((v) => v[0]).center;                    // procura o ponto mais próximo em X
  q.g.append("rect").attr("width", q.w).attr("height", q.h).style("fill", "transparent")   // camada que capta o mouse
    .on("pointermove", (e) => {                                     // mouse sobre o gráfico
      const v = pts[busca(pts, x.invert(d3.pointer(e)[0]))];        // ponto da curva mais próximo
      marca.attr("cx", x(v[0])).attr("cy", y(v[1])).style("opacity", 1);   // move o marcador
      U.mostrar(e, `<b>${Math.round(v[0] * D.meta.vendas)} maiores vendas</b>${U.FMT.pct(v[0])} das vendas<br>${U.FMT.pct(v[1])} da receita`);   // dica
    })
    .on("pointerleave", () => { marca.style("opacity", 0); U.esconder(); });   // sai do gráfico
  return {                                                          // TABELA T4 (resumo)
    colunas: [{ nome: "Indicador" }, { nome: "Valor", num: true }],   // cabeçalho da tabela
    linhas: [["Vendas na base", U.FMT.num(D.meta.vendas)],          // total
             ["Vendas que formam 80% da receita", U.FMT.num(p.vendas_80)],   // resposta
             ["% das vendas", U.FMT.pct(p.pct_80)],                 // em percentual
             ["Receita dos 10% maiores", U.FMT.pct(p.top10)],       // concentração no topo
             ["Maior venda", U.FMT.brl(p.maior)]],                  // maior valor individual
  };
};

// =====================================================================
// BLOCO 2 — MIX DE CATEGORIAS
// =====================================================================

// ---------- GRÁFICO G5 — Ranking de categorias (barras horizontais) ----------
GRAFICOS[5] = (alvo, D, U) => {   // ===== GRÁFICO G5: recebe (alvo, D, U) e devolve a tabela T5 =====
  const d = D.p5;                                                   // já vem ordenado
  barrasH(alvo, U, d, {                                             // barras horizontais
    nome: (v) => v.categoria, valor: (v) => v.receita, formatoEixo: U.FMT.brl0,   // eixo em reais
    rotulo: (v) => `${U.FMT.brl0(v.receita)} · ${U.FMT.pct(v.participacao)}`,   // valor e participação
    dica: (v) => `<b>${v.categoria}</b>${U.FMT.brl(v.receita)}<br>${U.FMT.pct(v.participacao)} do faturamento<br>${v.vendas} vendas`,   // dica
  });
  return {                                                          // TABELA T5
    colunas: [{ nome: "Categoria" }, { nome: "Receita", num: true }, { nome: "Vendas", num: true }, { nome: "Participação", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.categoria, U.FMT.brl(v.receita), v.vendas, U.FMT.pct(v.participacao)]),   // linhas
  };
};

// ---------- GRÁFICO G6 — Receita × volume (dispersão com diagonal) ----------
GRAFICOS[6] = (alvo, D, U) => {   // ===== GRÁFICO G6: recebe (alvo, D, U) e devolve a tabela T6 =====
  const d = D.p6;                                                   // uma linha por categoria
  legenda(alvo, [{ rotulo: "Valor (% receita > % unidades)", cor: "var(--s1)" }, { rotulo: "Tráfego (% unidades > % receita)", cor: "var(--s2)" }, { rotulo: "Diagonal: equilíbrio", linha: true }]);   // legenda
  const q = quadro(alvo, 400, { ...MARGEM, esq: 60 });              // área
  const max = d3.max(d, (v) => Math.max(v.pct_unidades, v.pct_receita)) * 1.15;   // mesmo limite nos dois eixos
  const x = d3.scaleLinear().domain([0, max]).range([0, q.w]);      // % das unidades
  const y = d3.scaleLinear().domain([0, max]).range([q.h, 0]);      // % da receita
  eixoY(q, y, (v) => U.FMT.pct(v, 0));                              // eixo Y
  eixoX(q, x, (v) => U.FMT.pct(v, 0));                              // eixo X
  q.g.append("text").attr("x", q.w).attr("y", q.h - 6).attr("text-anchor", "end").text("% das unidades →");   // nome do eixo X
  q.g.append("text").attr("x", 6).attr("y", 4).text("↑ % da receita");   // nome do eixo Y
  q.g.append("line").attr("class", "referencia")                    // diagonal y = x
    .attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(max)).attr("y2", y(max));   // de (0,0) até (máx,máx)
  const cor6 = (v) => (v.perfil === "valor" ? "var(--s1)" : "var(--s2)");   // cor pelo perfil
  const pontos = q.g.selectAll("circle").data(d).join("circle")     // um ponto por categoria
    .attr("cx", (v) => x(v.pct_unidades)).attr("cy", (v) => y(v.pct_receita)).attr("r", 7)   // posição
    .style("fill", cor6);                                           // cor
  interativo(pontoGrande(pontos), (v) => `<b>${v.categoria} — ${v.perfil}</b>${U.FMT.pct(v.pct_unidades)} das unidades<br>${U.FMT.pct(v.pct_receita)} da receita<br>${U.FMT.brl(v.receita_unidade)} por unidade`, U);   // dica
  q.g.selectAll("text.nome").data(d).join("text").attr("class", "nome rotulo-forte")   // nome direto no ponto
    .attr("x", (v) => x(v.pct_unidades) + 10).attr("y", (v) => y(v.pct_receita) + 4).text((v) => v.categoria);  // à direita do ponto
  return {                                                          // TABELA T6
    colunas: [{ nome: "Categoria" }, { nome: "Unidades", num: true }, { nome: "% unidades", num: true }, { nome: "% receita", num: true }, { nome: "R$/unidade", num: true }, { nome: "Perfil" }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.categoria, U.FMT.num(v.unidades), U.FMT.pct(v.pct_unidades), U.FMT.pct(v.pct_receita), U.FMT.brl(v.receita_unidade), v.perfil]),   // linhas
  };
};

// ---------- GRÁFICO G7 — Preço unitário por categoria (boxplot) ----------
GRAFICOS[7] = (alvo, D, U) => {   // ===== GRÁFICO G7: recebe (alvo, D, U) e devolve a tabela T7 =====
  const d = D.p7.caixas;                                            // cinco números + atípicos por categoria
  legenda(alvo, [{ rotulo: "Caixa: 1º a 3º quartil", cor: "var(--s1)", opacidade: 0.35 }, { rotulo: "Traço: mediana", cor: "var(--texto)" }, { rotulo: "Pontos: preços atípicos", cor: "var(--s1)", opacidade: 0.6 }]);   // legenda
  const q = quadro(alvo, 400, { ...MARGEM, esq: 70 });              // área
  const x = d3.scaleBand().domain(d.map((v) => v.categoria)).range([0, q.w]).padding(0.45);   // uma caixa por categoria
  const y = d3.scaleLinear().domain([0, d3.max(d, (v) => v.max) * 1.05]).nice().range([q.h, 0]);   // preço a partir de zero
  eixoY(q, y, U.FMT.brl0);                                          // eixo Y
  eixoX(q, x);                                                      // categorias
  const c = q.g.selectAll("g.caixa").data(d).join("g").attr("class", "caixa")   // um grupo por categoria
    .attr("transform", (v) => `translate(${x(v.categoria)},0)`);    // posiciona o grupo
  const meio = x.bandwidth() / 2;                                   // centro da faixa
  c.append("line").attr("x1", meio).attr("x2", meio)                // bigode (linha vertical)
    .attr("y1", (v) => y(v.bigode_inf)).attr("y2", (v) => y(v.bigode_sup)).style("stroke", "var(--texto-2)");  // do bigode inferior ao superior
  c.append("line").attr("x1", meio * 0.5).attr("x2", meio * 1.5)    // trava inferior do bigode
    .attr("y1", (v) => y(v.bigode_inf)).attr("y2", (v) => y(v.bigode_inf)).style("stroke", "var(--texto-2)");  // na altura do bigode inferior
  c.append("line").attr("x1", meio * 0.5).attr("x2", meio * 1.5)    // trava superior do bigode
    .attr("y1", (v) => y(v.bigode_sup)).attr("y2", (v) => y(v.bigode_sup)).style("stroke", "var(--texto-2)");  // na altura do bigode superior
  const caixas = c.append("rect").attr("width", x.bandwidth())      // a caixa (Q1 a Q3)
    .attr("y", (v) => y(v.q3)).attr("height", (v) => Math.max(1, y(v.q1) - y(v.q3)))   // altura = intervalo interquartil
    .style("fill", "var(--s1)").style("fill-opacity", 0.35).style("stroke", "var(--s1)");   // preenchimento translúcido
  c.append("line").attr("x1", 0).attr("x2", x.bandwidth())          // mediana
    .attr("y1", (v) => y(v.mediana)).attr("y2", (v) => y(v.mediana)).style("stroke", "var(--texto)").style("stroke-width", 2.5);  // traço grosso na mediana
  c.selectAll("circle").data((v) => v.atipicos).join("circle")      // preços atípicos
    .attr("cx", meio).attr("cy", (a) => y(a)).attr("r", 3)          // posição
    .style("fill", "none").style("stroke", "var(--s1)");            // círculo vazado
  interativo(caixas, (v) => `<b>${v.categoria}</b>${v.n} preços observados<br>Mín ${U.FMT.brl(v.min)} · Máx ${U.FMT.brl(v.max)}<br>Q1 ${U.FMT.brl(v.q1)} · Mediana ${U.FMT.brl(v.mediana)} · Q3 ${U.FMT.brl(v.q3)}<br>Média ${U.FMT.brl(v.media)} · ${v.atipicos.length} atípicos`, U);   // dica
  nota(alvo, `${D.p7.excluidos} vendas com preço imputado ficaram fora deste gráfico.`);   // filtro explícito
  return {                                                          // TABELA T7
    colunas: ["Categoria", "N", "Mín", "Q1", "Mediana", "Q3", "Máx", "Média", "Atípicos"].map((n, i) => ({ nome: n, num: i > 0 })),  // cabeçalho da tabela
    linhas: d.map((v) => [v.categoria, v.n, ...[v.min, v.q1, v.mediana, v.q3, v.max, v.media].map(U.FMT.brl), v.atipicos.length]),   // linhas
  };
};

// ---------- GRÁFICO G8 — Participação das categorias (área empilhada 100%) ----------
GRAFICOS[8] = (alvo, D, U) => {   // ===== GRÁFICO G8: recebe (alvo, D, U) e devolve a tabela T8 =====
  const d = D.p8, cats = D.meta.categorias;                         // 12 meses × 7 categorias
  legenda(alvo, cats.map((c, i) => ({ rotulo: c, cor: SERIES[i] })));   // cor fixa por categoria
  const q = quadro(alvo, 380);                                      // área
  const x = d3.scalePoint().domain(d.map((v) => v.nome)).range([0, q.w]);   // meses de ponta a ponta
  const y = d3.scaleLinear().domain([0, 1]).range([q.h, 0]);        // 0 a 100%
  const pilha = d3.stack().keys(cats)(d);                           // empilha as categorias
  q.g.selectAll("path.faixa").data(pilha).join("path").attr("class", "faixa")   // uma faixa por categoria
    .attr("d", d3.area().x((v) => x(v.data.nome)).y0((v) => y(v[0])).y1((v) => y(v[1])))   // contorno da faixa
    .style("fill", (_, i) => SERIES[i])                             // cor fixa
    .style("stroke", "var(--superficie)").style("stroke-width", 0.75);   // fio separando as faixas
  eixoY(q, y, (v) => U.FMT.pct(v, 0));                              // eixo Y por cima
  q.g.select(".grade").raise().style("opacity", 0.35);              // grade discreta sobre as áreas
  eixoX(q, x);                                                      // meses
  const regua = q.g.append("line").attr("y1", 0).attr("y2", q.h)    // régua vertical do mês sob o mouse
    .style("stroke", "var(--texto)").style("opacity", 0);           // começa invisível
  q.g.append("rect").attr("width", q.w).attr("height", q.h).style("fill", "transparent")   // camada que capta o mouse
    .on("pointermove", (e) => {                                     // mouse sobre o gráfico
      const px = d3.pointer(e)[0];                                  // posição X
      const i = d3.minIndex(d, (v) => Math.abs(x(v.nome) - px));    // mês mais próximo
      regua.attr("x1", x(d[i].nome)).attr("x2", x(d[i].nome)).style("opacity", 0.6);   // move a régua
      U.mostrar(e, `<b>${d[i].nome}/2024</b>` + cats.slice().reverse().map((c) => `${c}: ${U.FMT.pct(d[i][c])}`).join("<br>"));   // lista na ordem visual
    })
    .on("pointerleave", () => { regua.style("opacity", 0); U.esconder(); });   // sai do gráfico
  return {                                                          // TABELA T8
    colunas: [{ nome: "Mês" }, ...cats.map((c) => ({ nome: c, num: true }))],   // cabeçalho da tabela
    linhas: d.map((v) => [v.nome, ...cats.map((c) => U.FMT.pct(v[c]))]),   // linhas
  };
};

// =====================================================================
// BLOCO 3 — CANAIS DE VENDA
// =====================================================================
const corCanal = (c) => (c === "Não informado" ? "var(--cinza)" : "var(--s1)");   // ausência sempre em cinza

// ---------- GRÁFICO G9 — Participação por canal (barras horizontais) ----------
GRAFICOS[9] = (alvo, D, U) => {   // ===== GRÁFICO G9: recebe (alvo, D, U) e devolve a tabela T9 =====
  const d = D.p9;                                                   // canais na ordem fixa
  legenda(alvo, [{ rotulo: "Canal informado", cor: "var(--s1)" }, { rotulo: "Não informado", cor: "var(--cinza)" }]);   // legenda
  barrasH(alvo, U, d, {                                             // barras
    nome: (v) => v.canal, valor: (v) => v.pct_total, formatoEixo: (v) => U.FMT.pct(v, 0),   // eixo em %
    cor: (v) => corCanal(v.canal),                                  // cinza para ausência
    rotulo: (v) => `${U.FMT.pct(v.pct_total)} · ${U.FMT.brl0(v.receita)}`,   // rótulo
    dica: (v) => `<b>${v.canal}</b>${U.FMT.brl(v.receita)} em ${v.vendas} vendas<br>% do total: ${U.FMT.pct(v.pct_total)}` + (v.pct_com_canal == null ? "" : `<br>% com canal: ${U.FMT.pct(v.pct_com_canal)}`),   // dica
  });
  return {                                                          // TABELA T9
    colunas: [{ nome: "Canal" }, { nome: "Receita", num: true }, { nome: "Vendas", num: true }, { nome: "% do total", num: true }, { nome: "% com canal", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.canal, U.FMT.brl(v.receita), v.vendas, U.FMT.pct(v.pct_total), v.pct_com_canal == null ? "—" : U.FMT.pct(v.pct_com_canal)]),   // linhas
  };
};

// ---------- GRÁFICO G10 — Ticket médio por canal (barras + referência) ----------
GRAFICOS[10] = (alvo, D, U) => {   // ===== GRÁFICO G10: recebe (alvo, D, U) e devolve a tabela T10 =====
  const d = D.p10.canais, ref = D.p10.ticket_ano;                   // canais e ticket do ano
  legenda(alvo, [{ rotulo: "Ticket do canal", cor: "var(--s1)" }, { rotulo: "Não informado", cor: "var(--cinza)" }, { rotulo: "Ticket médio do ano", linha: true }]);   // legenda
  const { q, x } = barrasH(alvo, U, d, {                            // barras
    nome: (v) => v.canal, valor: (v) => v.ticket, formatoEixo: U.FMT.brl0,   // eixo em reais
    cor: (v) => corCanal(v.canal),                                  // cinza para ausência
    rotulo: (v) => `${U.FMT.brl(v.ticket)} (${U.FMT.sinal(v.vs_ano)})`,   // valor e diferença
    dica: (v) => `<b>${v.canal}</b>Ticket: ${U.FMT.brl(v.ticket)}<br>${U.FMT.brl(v.receita)} ÷ ${v.vendas} vendas<br>Vs. ano: ${U.FMT.sinal(v.vs_ano)}`,   // dica
  });
  refV(q, x(ref), `Ano ${U.FMT.brl(ref)}`);                         // referência anual
  return {                                                          // TABELA T10
    colunas: [{ nome: "Canal" }, { nome: "Receita", num: true }, { nome: "Vendas", num: true }, { nome: "Ticket", num: true }, { nome: "Vs. ano", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.canal, U.FMT.brl(v.receita), v.vendas, U.FMT.brl(v.ticket), U.FMT.sinal(v.vs_ano)]),   // linhas
  };
};

function mapaCalor(alvo, U, m, o) {                                 // mapa de calor genérico (perguntas 11 e 19)
  const q = quadro(alvo, m.linhas.length * 40 + 60, { topo: 34, dir: 16, base: 10, esq: 120 });   // altura pelas linhas
  const x = d3.scaleBand().domain(m.colunas).range([0, q.w]).padding(0.04);   // colunas
  const y = d3.scaleBand().domain(m.linhas).range([0, q.h]).padding(0.06);    // linhas
  const vals = m.valores.flat().filter((v) => v != null);           // valores existentes
  const escala = d3.scaleLinear()                                   // rampa de um só tom
    .domain([d3.min(vals), d3.mean(vals), d3.max(vals)])            // baixo, médio, alto
    .range([cor(o.rampa + "-0"), cor(o.rampa + "-1"), cor(o.rampa + "-2")])   // hex lidos do tema atual
    .interpolate(d3.interpolateLab);                                // transição perceptualmente suave
  const celulas = m.linhas.flatMap((l, i) => m.colunas.map((c, j) => ({ l, c, v: m.valores[i][j] })));   // lista de células
  q.g.append("g").attr("class", "eixo").call(d3.axisTop(x).tickSize(0).tickPadding(8)).select(".domain").remove();   // nomes das colunas em cima
  q.g.append("g").attr("class", "eixo").call(d3.axisLeft(y).tickSize(0).tickPadding(8)).select(".domain").remove();  // nomes das linhas à esquerda
  const ret = q.g.selectAll("rect.celula").data(celulas).join("rect").attr("class", "celula")   // um retângulo por célula
    .attr("x", (k) => x(k.c)).attr("y", (k) => y(k.l)).attr("width", x.bandwidth()).attr("height", y.bandwidth())   // posição
    .attr("rx", 3)                                                  // cantos arredondados
    .style("fill", (k) => (k.v == null ? "var(--cinza)" : escala(k.v)));   // cor pelo valor (cinza = sem dado)
  interativo(ret, (k) => `<b>${k.l} × ${k.c}</b>${k.v == null ? "sem vendas" : o.formato(k.v)}`, U);   // dica
  q.g.selectAll("text.valor").data(celulas).join("text").attr("class", "valor")   // valor escrito na célula
    .attr("x", (k) => x(k.c) + x.bandwidth() / 2).attr("y", (k) => y(k.l) + y.bandwidth() / 2)   // centro
    .attr("dy", "0.35em").attr("text-anchor", "middle")             // centralizado
    .style("fill", (k) => (k.v == null ? "var(--texto)" : corTextoSobre(escala(k.v))))   // contraste com o fundo
    .text((k) => (k.v == null ? "—" : o.curto(k.v)));               // texto curto
  return {                                                          // tabela da matriz
    colunas: [{ nome: o.canto }, ...m.colunas.map((c) => ({ nome: c, num: true }))],   // cabeçalho da tabela
    linhas: m.linhas.map((l, i) => [l, ...m.valores[i].map((v) => (v == null ? "—" : o.formato(v)))]),   // linhas
  };
}

// ---------- GRÁFICO G11 — Categoria dentro de cada canal (mapa de calor azul) ----------
GRAFICOS[11] = (alvo, D, U) => {   // ===== GRÁFICO G11: recebe (alvo, D, U) e devolve a tabela T11 =====
  legenda(alvo, [{ rotulo: "Menor participação", cor: "var(--azul-0)" }, { rotulo: "Maior participação", cor: "var(--azul-2)" }]);   // leitura da escala
  const t = mapaCalor(alvo, U, D.p11, {                             // mapa de calor
    rampa: "--azul", canto: "Canal",                                // tom azul (bloco 3)
    formato: (v) => `${U.FMT.pct(v)} da receita do canal`,          // dica
    curto: (v) => U.FMT.pct(v, 0),                                  // texto na célula
  });
  nota(alvo, "Cada linha soma 100%: compare as cores dentro da mesma coluna para ver se o canal muda o mix.");   // orientação
  t.linhas.forEach((l) => l.forEach((v, i) => { if (i > 0) l[i] = v.replace(" da receita do canal", ""); }));   // tabela sem o texto longo
  return t;                                                         // TABELA T11
};

// =====================================================================
// BLOCO 4 — GEOGRAFIA
// =====================================================================

// ---------- GRÁFICO G12 — Receita por UF (barras horizontais) ----------
GRAFICOS[12] = (alvo, D, U) => {   // ===== GRÁFICO G12: recebe (alvo, D, U) e devolve a tabela T12 =====
  const d = D.p12;                                                  // UFs ordenadas, "NI" por último
  legenda(alvo, [{ rotulo: "UF informada", cor: "var(--s1)" }, { rotulo: "Menos de 15 vendas (média instável)", cor: "var(--s1)", opacidade: 0.4 }, { rotulo: "NI — sem UF", cor: "var(--cinza)" }]);   // legenda
  const { q } = barrasH(alvo, U, d, {                               // barras
    nome: (v) => v.uf, valor: (v) => v.receita, formatoEixo: U.FMT.brl0, esq: 50, passo: 24,   // compactas
    cor: (v) => (v.uf === "NI" ? "var(--cinza)" : "var(--s1)"),    // cinza para ausência
    opacidade: (v) => (v.massa || v.uf === "NI" ? 1 : 0.4),         // esmaece UFs com pouca massa
    rotulo: (v) => `${U.FMT.brl0(v.receita)} · ${U.FMT.pct(v.participacao)}`,   // rótulo
    dica: (v) => `<b>${v.uf}</b>${U.FMT.brl(v.receita)} em ${v.vendas} vendas<br>${U.FMT.pct(v.participacao)} do faturamento` + (v.massa ? "" : "<br>Abaixo da massa mínima"),   // dica
  });
  q.svg.attr("aria-label", "Receita por UF");                       // nome acessível
  return {                                                          // TABELA T12
    colunas: [{ nome: "UF" }, { nome: "Receita", num: true }, { nome: "Vendas", num: true }, { nome: "Participação", num: true }, { nome: "Massa mínima" }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.uf, U.FMT.brl(v.receita), v.vendas, U.FMT.pct(v.participacao), v.massa ? "sim" : "não"]),   // linhas
  };
};

// ---------- GRÁFICO G13 — Concentração geográfica (cartões de indicador) ----------
GRAFICOS[13] = (alvo, D, U) => {   // ===== GRÁFICO G13: recebe (alvo, D, U) e devolve a tabela T13 =====
  const d = D.p13;                                                  // Top 3 e Top 5
  const k = alvo.append("div").attr("class", "ladrilhos");          // grade de cartões
  d.forEach((v) => {                                                // dois cartões por recorte
    [["do faturamento total", v.pct_total], ["da receita com UF informada", v.pct_com_uf]].forEach(([den, pct]) => {   // dois denominadores
      const c = k.append("div").attr("class", "ladrilho");          // cartão
      c.append("div").attr("class", "rotulo").text(`${v.indicador} (${v.ufs.join(", ")})`);   // nome
      c.append("div").attr("class", "valor").text(U.FMT.pct(pct));  // número em destaque
      c.append("div").attr("class", "detalhe").text(`${U.FMT.brl(v.receita)} ${den}`);   // explicação
    });
  });
  nota(alvo, "Diga sempre qual denominador está usando: com ou sem a receita das vendas sem UF ('NI').");   // orientação
  return {                                                          // TABELA T13
    colunas: [{ nome: "Recorte" }, { nome: "UFs" }, { nome: "Receita", num: true }, { nome: "% do total", num: true }, { nome: "% com UF", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.indicador, v.ufs.join(", "), U.FMT.brl(v.receita), U.FMT.pct(v.pct_total), U.FMT.pct(v.pct_com_uf)]),   // linhas
  };
};

// ---------- GRÁFICO G14 — Canal dentro de cada UF (barras empilhadas 100%) ----------
GRAFICOS[14] = (alvo, D, U) => {   // ===== GRÁFICO G14: recebe (alvo, D, U) e devolve a tabela T14 =====
  const m = D.p14;                                                  // UFs × canais
  const cores = m.colunas.map((c, i) => (c === "Não informado" ? "var(--cinza)" : SERIES[i]));   // cor fixa por canal
  const hex = m.colunas.map((c, i) => cor(c === "Não informado" ? "--cinza" : `--s${i + 1}`));   // hex para escolher a cor do texto
  legenda(alvo, m.colunas.map((c, i) => ({ rotulo: c, cor: cores[i] })));   // legenda
  const linhas = m.linhas.map((uf, i) => {                          // uma linha por UF
    let acum = 0;                                                   // soma acumulada
    return { uf, partes: m.valores[i].map((v, j) => { const p = { canal: m.colunas[j], j, v, ini: acum }; acum += v; return p; }) };   // início e tamanho de cada parte
  });
  const q = quadro(alvo, linhas.length * 26 + 46, { ...MARGEM, esq: 44 });   // área
  const y = d3.scaleBand().domain(m.linhas).range([0, q.h]).padding(0.2);   // uma barra por UF
  const x = d3.scaleLinear().domain([0, 1]).range([0, q.w]);        // 0 a 100%
  gradeX(q, x, (v) => U.FMT.pct(v, 0));                             // eixo X
  eixoCategorias(q, y);                                             // UFs
  const g = q.g.selectAll("g.uf").data(linhas).join("g").attr("class", "uf")   // grupo por UF
    .attr("transform", (l) => `translate(0,${y(l.uf)})`);           // posição vertical
  const partes = g.selectAll("rect").data((l) => l.partes.map((p) => ({ ...p, uf: l.uf }))).join("rect")   // uma parte por canal
    .attr("x", (p) => x(p.ini)).attr("width", (p) => x(p.v) - x(0)).attr("height", y.bandwidth())   // posição e tamanho
    .style("fill", (p) => cores[p.j])                               // cor fixa do canal
    .style("stroke", "var(--superficie)").style("stroke-width", 1); // fio separando as partes
  interativo(partes, (p) => `<b>${p.uf} — ${p.canal}</b>${U.FMT.pct(p.v)} das vendas da UF`, U);   // dica
  g.selectAll("text").data((l) => l.partes.filter((p) => x(p.v) - x(0) > 34)).join("text")   // rótulo só onde cabe
    .attr("x", (p) => x(p.ini + p.v / 2)).attr("y", y.bandwidth() / 2).attr("dy", "0.35em")   // centro da parte
    .attr("text-anchor", "middle").style("fill", (p) => corTextoSobre(hex[p.j]))   // contraste com o fundo
    .text((p) => U.FMT.pct(p.v, 0));                                // percentual
  nota(alvo, `Só UFs com pelo menos ${m.massa_minima} vendas.`);   // filtro explícito
  return {                                                          // TABELA T14
    colunas: [{ nome: "UF" }, ...m.colunas.map((c) => ({ nome: c, num: true }))],   // cabeçalho da tabela
    linhas: m.linhas.map((uf, i) => [uf, ...m.valores[i].map((v) => U.FMT.pct(v))]),   // linhas
  };
};

// =====================================================================
// BLOCO 5 — CLIENTES
// =====================================================================

// ---------- GRÁFICO G15 — Recorrência de compra (histograma) ----------
GRAFICOS[15] = (alvo, D, U) => {   // ===== GRÁFICO G15: recebe (alvo, D, U) e devolve a tabela T15 =====
  const p = D.p15, d = p.distribuicao;                              // clientes por nº de compras
  legenda(alvo, [{ rotulo: "Recorrente (2 compras ou mais)", cor: "var(--enfase)" }, { rotulo: "Comprou uma vez", cor: "var(--suave)" }]);   // legenda
  const q = quadro(alvo, 340, { ...MARGEM, esq: 56 });              // área
  const x = d3.scaleBand().domain(d.map((v) => v.compras)).range([0, q.w]).padding(0.2);   // uma barra por nº de compras
  const y = d3.scaleLinear().domain([0, d3.max(d, (v) => v.clientes) * 1.15]).nice().range([q.h, 0]);   // clientes
  eixoY(q, y);                                                      // eixo Y
  eixoX(q, x);                                                      // eixo X
  q.g.append("text").attr("x", q.w).attr("y", q.h + 32).attr("text-anchor", "end").text("número de compras no ano →");   // nome do eixo X
  const barras = q.g.selectAll("rect").data(d).join("rect")         // barras
    .attr("x", (v) => x(v.compras)).attr("width", x.bandwidth())    // posição
    .attr("y", (v) => y(v.clientes)).attr("height", (v) => q.h - y(v.clientes)).attr("rx", 2)   // altura
    .style("fill", (v) => (v.compras >= 2 ? "var(--enfase)" : "var(--suave)"));   // cor pela recorrência
  interativo(barras, (v) => `<b>${v.compras} compra${v.compras > 1 ? "s" : ""}</b>${v.clientes} clientes (${U.FMT.pct(v.pct)})`, U);   // dica
  q.g.selectAll("text.valor").data(d).join("text").attr("class", "valor")   // rótulo no topo
    .attr("x", (v) => x(v.compras) + x.bandwidth() / 2).attr("y", (v) => y(v.clientes) - 6)   // centro da barra, acima do topo
    .attr("text-anchor", "middle").text((v) => v.clientes);         // nº de clientes
  nota(alvo, `${p.recorrentes} de ${p.clientes} clientes (${U.FMT.pct(p.recorrentes / p.clientes)}) são recorrentes; média de ${U.FMT.num(p.media, 2)} compras por cliente.`);   // resposta
  return {                                                          // TABELA T15
    colunas: [{ nome: "Compras", num: true }, { nome: "Clientes", num: true }, { nome: "% dos clientes", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.compras, v.clientes, U.FMT.pct(v.pct)]),   // linhas
  };
};

// ---------- GRÁFICO G16 — Top 20 clientes (barras horizontais) ----------
GRAFICOS[16] = (alvo, D, U) => {   // ===== GRÁFICO G16: recebe (alvo, D, U) e devolve a tabela T16 =====
  const d = D.p16;                                                  // 20 maiores
  barrasH(alvo, U, d, {                                             // barras
    nome: (v) => v.cliente, valor: (v) => v.receita, formatoEixo: U.FMT.brl0, passo: 22, esq: 90,   // compactas
    rotulo: (v) => U.FMT.brl0(v.receita),                           // rótulo
    dica: (v) => `<b>${v.posicao}º — ${v.cliente}</b>${U.FMT.brl(v.receita)} em ${v.compras} compras<br>${U.FMT.pct(v.pct, 2)} do faturamento<br>Acumulado até aqui: ${U.FMT.pct(v.pct_acum)}`,   // dica
  });
  nota(alvo, `Juntos, os 20 maiores clientes somam ${U.FMT.pct(d[d.length - 1].pct_acum)} do faturamento.`);   // resposta
  return {                                                          // TABELA T16
    colunas: [{ nome: "Posição", num: true }, { nome: "Cliente" }, { nome: "Receita", num: true }, { nome: "Compras", num: true }, { nome: "%", num: true }, { nome: "% acumulado", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.posicao, v.cliente, U.FMT.brl(v.receita), v.compras, U.FMT.pct(v.pct, 2), U.FMT.pct(v.pct_acum)]),   // linhas
  };
};

// ---------- GRÁFICO G17 — Segmentação RFV (barras + dispersão) ----------
GRAFICOS[17] = (alvo, D, U) => {   // ===== GRÁFICO G17: recebe (alvo, D, U) e devolve a tabela T17 =====
  const p = D.p17, segs = p.segmentos.map((s) => s.segmento);       // quatro segmentos em ordem
  const corSeg = d3.scaleOrdinal(segs, ["var(--ord1)", "var(--ord2)", "var(--ord3)", "var(--ord4)"]);   // rampa ordinal azul
  legenda(alvo, segs.map((s) => ({ rotulo: s, cor: corSeg(s) })));  // legenda única para os dois painéis
  // ---- Painel A: receita por segmento ----
  const qa = quadro(alvo, 230, { ...MARGEM, esq: 84 });             // área do painel A
  const xa = d3.scaleBand().domain(segs).range([0, qa.w]).padding(0.3);   // um segmento por barra
  const ya = d3.scaleLinear().domain([0, d3.max(p.segmentos, (s) => s.receita) * 1.2]).nice().range([qa.h, 0]);   // receita
  eixoY(qa, ya, U.FMT.brl0, 4);                                     // eixo Y
  eixoX(qa, xa);                                                    // segmentos
  const barras = qa.g.selectAll("rect").data(p.segmentos).join("rect")   // barras
    .attr("x", (s) => xa(s.segmento)).attr("width", xa.bandwidth()) // posição
    .attr("y", (s) => ya(s.receita)).attr("height", (s) => qa.h - ya(s.receita)).attr("rx", 2)   // altura
    .style("fill", (s) => corSeg(s.segmento));                      // cor do segmento
  interativo(barras, (s) => `<b>${s.segmento}</b>${s.clientes} clientes<br>${U.FMT.brl(s.receita)} (${U.FMT.pct(s.pct)})<br>${U.FMT.num(s.compras_medias, 1)} compras em média`, U);   // dica
  qa.g.selectAll("text.valor").data(p.segmentos).join("text").attr("class", "valor")   // rótulo no topo
    .attr("x", (s) => xa(s.segmento) + xa.bandwidth() / 2).attr("y", (s) => ya(s.receita) - 6)   // centro da barra, acima do topo
    .attr("text-anchor", "middle").text((s) => `${s.clientes} clientes · ${U.FMT.pct(s.pct)}`);   // clientes e % da receita
  // ---- Painel B: frequência × valor, um ponto por cliente ----
  const qb = quadro(alvo, 340, { ...MARGEM, esq: 84, topo: 24 });   // área do painel B
  const xb = d3.scaleLinear().domain([0.5, d3.max(p.pontos, (v) => v[0]) + 0.5]).range([0, qb.w]);   // nº de compras
  const yb = d3.scaleLinear().domain([0, d3.max(p.pontos, (v) => v[1]) * 1.05]).nice().range([qb.h, 0]);   // receita do cliente
  eixoY(qb, yb, U.FMT.brl0);                                        // eixo Y
  eixoX(qb, xb, d3.format("d"), 10);                                // eixo X inteiro
  qb.g.append("text").attr("x", 0).attr("y", -10).attr("class", "rotulo-forte").text("Cada ponto é um cliente: compras no ano × receita");   // título do painel
  const tremor = (i) => (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.5;   // deslocamento fixo para separar pontos iguais
  const pontos = qb.g.selectAll("circle").data(p.pontos).join("circle")   // um ponto por cliente
    .attr("cx", (v, i) => xb(v[0] + tremor(i))).attr("cy", (v) => yb(v[1])).attr("r", 3.5)   // posição
    .style("fill", (v) => corSeg(v[2])).style("fill-opacity", 0.85);   // cor do segmento
  interativo(pontos, (v) => `<b>${v[3]} — ${v[2]}</b>${v[0]} compras<br>${U.FMT.brl(v[1])}`, U);   // dica
  nota(alvo, `Recência medida até ${p.data_ref} (dia seguinte à última venda). Limites: Campeões ≥ ${p.limites.campeoes}, Leais ≥ ${p.limites.leais}, Atenção ≥ ${p.limites.atencao}.`);   // regra
  return {                                                          // TABELA T17
    colunas: [{ nome: "Segmento" }, { nome: "Clientes", num: true }, { nome: "Receita", num: true }, { nome: "% receita", num: true }, { nome: "Compras médias", num: true }],  // cabeçalho da tabela
    linhas: p.segmentos.map((s) => [s.segmento, s.clientes, U.FMT.brl(s.receita), U.FMT.pct(s.pct), U.FMT.num(s.compras_medias, 1)]),   // linhas
  };
};

// =====================================================================
// BLOCO 6 — PREÇO E DESCONTO
// =====================================================================

// ---------- GRÁFICO G18 — Faixas de desconto (histograma) ----------
GRAFICOS[18] = (alvo, D, U) => {   // ===== GRÁFICO G18: recebe (alvo, D, U) e devolve a tabela T18 =====
  const p = D.p18, d = p.faixas;                                    // vendas por faixa
  const q = quadro(alvo, 340, { ...MARGEM, esq: 56 });              // área
  const x = d3.scaleBand().domain(d.map((v) => v.faixa)).range([0, q.w]).padding(0.2);   // uma barra por faixa (ordem fixa)
  const y = d3.scaleLinear().domain([0, d3.max(d, (v) => v.vendas) * 1.18]).nice().range([q.h, 0]);   // vendas
  eixoY(q, y);                                                      // eixo Y
  eixoX(q, x);                                                      // faixas
  const barras = q.g.selectAll("rect").data(d).join("rect")         // barras
    .attr("x", (v) => x(v.faixa)).attr("width", x.bandwidth())      // posição
    .attr("y", (v) => y(v.vendas)).attr("height", (v) => q.h - y(v.vendas)).attr("rx", 2)   // altura
    .style("fill", (v) => (v.faixa === "Sem desconto" ? "var(--suave)" : "var(--s1)"));   // "sem desconto" destacado à parte
  interativo(barras, (v) => `<b>${v.faixa}</b>${v.vendas} vendas (${U.FMT.pct(v.pct)})`, U);   // dica
  q.g.selectAll("text.valor").data(d).join("text").attr("class", "valor")   // rótulo no topo
    .attr("x", (v) => x(v.faixa) + x.bandwidth() / 2).attr("y", (v) => y(v.vendas) - 6)   // centro da barra, acima do topo
    .attr("text-anchor", "middle").text((v) => `${v.vendas} · ${U.FMT.pct(v.pct, 0)}`);   // vendas e %
  nota(alvo, `${p.n} vendas com desconto válido. Média ${U.FMT.num(p.media, 2)}%, mediana ${U.FMT.num(p.mediana, 2)}%, máximo ${U.FMT.num(p.max, 2)}%. As 69 imputadas ficaram de fora.`);   // resumo e filtro
  return {                                                          // TABELA T18
    colunas: [{ nome: "Faixa" }, { nome: "Vendas", num: true }, { nome: "% das vendas", num: true }],  // cabeçalho da tabela
    linhas: d.map((v) => [v.faixa, v.vendas, U.FMT.pct(v.pct)]),    // linhas
  };
};

// ---------- GRÁFICO G19 — Desconto médio categoria × canal (mapa de calor laranja) ----------
GRAFICOS[19] = (alvo, D, U) => {   // ===== GRÁFICO G19: recebe (alvo, D, U) e devolve a tabela T19 =====
  legenda(alvo, [{ rotulo: "Menos desconto", cor: "var(--laranja-0)" }, { rotulo: "Mais desconto", cor: "var(--laranja-2)" }, { rotulo: "Sem vendas", cor: "var(--cinza)" }]);   // leitura da escala
  const t = mapaCalor(alvo, U, D.p19, {                             // mapa de calor
    rampa: "--laranja", canto: "Categoria",                         // tom laranja (bloco 6)
    formato: (v) => `${U.FMT.num(v, 2)}% de desconto médio`,        // dica
    curto: (v) => U.FMT.num(v, 1),                                  // texto na célula
  });
  nota(alvo, "Valores em % (pontos percentuais de desconto). Exclui as 69 vendas com desconto imputado.");   // unidade e filtro
  t.linhas.forEach((l) => l.forEach((v, i) => { if (i > 0) l[i] = v.replace(" de desconto médio", ""); }));   // tabela sem texto longo
  return t;                                                         // TABELA T19
};

// ---------- GRÁFICO G20 — Desconto × valor da venda (dispersão + reta) ----------
GRAFICOS[20] = (alvo, D, U) => {   // ===== GRÁFICO G20: recebe (alvo, D, U) e devolve a tabela T20 =====
  const p = D.p20, d = p.pontos;                                    // 931 pares (desconto, valor)
  legenda(alvo, [{ rotulo: "Venda (desconto válido)", cor: "var(--s1)" }, { rotulo: "Reta de tendência (mínimos quadrados)", cor: "var(--s2)" }]);   // legenda
  const q = quadro(alvo, 420, { ...MARGEM, esq: 76 });              // área
  const x = d3.scaleLinear().domain([0, d3.max(d, (v) => v[0])]).nice().range([0, q.w]);   // desconto (%)
  const y = d3.scaleLinear().domain([0, d3.max(d, (v) => v[1])]).nice().range([q.h, 0]);   // valor da venda
  eixoY(q, y, U.FMT.brl0);                                          // eixo Y
  eixoX(q, x, (v) => `${v}%`);                                      // eixo X
  q.g.append("text").attr("x", q.w).attr("y", q.h + 32).attr("text-anchor", "end").text("desconto (%) →");   // nome do eixo X
  q.g.selectAll("circle.ponto").data(d).join("circle").attr("class", "ponto")   // um ponto por venda
    .attr("cx", (v) => x(v[0])).attr("cy", (v) => y(v[1])).attr("r", 2.5)   // posição
    .style("fill", "var(--s1)").style("fill-opacity", 0.45);        // translúcido: mostra sobreposição
  const [x0, x1] = x.domain();                                      // extremos do eixo X
  q.g.append("line")                                                // reta y = a·x + b
    .attr("x1", x(x0)).attr("y1", y(p.a * x0 + p.b)).attr("x2", x(x1)).attr("y2", y(p.a * x1 + p.b))  // do início ao fim do eixo X
    .style("stroke", "var(--s2)").style("stroke-width", 2.5);       // traço laranja
  const caixa = q.g.append("g").attr("transform", "translate(12,8)");   // anotação no canto
  [`r = ${U.FMT.num(p.r_validas, 2)}   R² = ${U.FMT.num(p.r2, 2)}   n = ${p.n}`,   // estatísticas
   `+1 p.p. de desconto ↔ ${U.FMT.brl(p.a)} a mais, em média`]      // leitura da inclinação
    .forEach((t, i) => caixa.append("text").attr("y", i * 18).attr("class", i ? null : "rotulo-forte").text(t));   // duas linhas
  const delaunay = d3.Delaunay.from(d, (v) => x(v[0]), (v) => y(v[1]));   // índice espacial: ponto mais próximo do mouse
  const marca = q.g.append("circle").attr("r", 5).style("fill", "none").style("stroke", "var(--texto)").style("opacity", 0);   // realce
  q.g.append("rect").attr("width", q.w).attr("height", q.h).style("fill", "transparent")   // camada que capta o mouse
    .on("pointermove", (e) => {                                     // mouse sobre o gráfico
      const [mx, my] = d3.pointer(e);                               // posição do mouse
      const v = d[delaunay.find(mx, my)];                           // venda mais próxima
      marca.attr("cx", x(v[0])).attr("cy", y(v[1])).style("opacity", 1);   // realça
      U.mostrar(e, `<b>Venda</b>Desconto: ${U.FMT.num(v[0], 2)}%<br>Valor: ${U.FMT.brl(v[1])}`);   // dica
    })
    .on("pointerleave", () => { marca.style("opacity", 0); U.esconder(); });   // sai do gráfico
  nota(alvo, "Correlação positiva e moderada. Não prova que o desconto gera a venda: pode ser política de dar mais desconto a compras maiores.");   // cautela
  return {                                                          // TABELA T20 (resumo estatístico)
    colunas: [{ nome: "Indicador" }, { nome: "Valor", num: true }],   // cabeçalho da tabela
    linhas: [["Vendas analisadas (desconto válido)", p.n],          // n
             ["Correlação — só descontos válidos", U.FMT.num(p.r_validas, 4)],   // r principal
             ["Correlação — todas as vendas", U.FMT.num(p.r_todas, 4)],   // r com imputados
             ["R² (variação explicada)", U.FMT.pct(p.r2)],          // R²
             ["Inclinação (R$ por p.p.)", U.FMT.brl(p.a)],          // a
             ["Intercepto (valor com 0% de desconto)", U.FMT.brl(p.b)]],   // b
  };
};
