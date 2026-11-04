# -*- coding: utf-8 -*-
"""
gerar_dados_d3.py — Projeto Varejo
==================================

Calcula os agregados das 20 perguntas a partir da base limpa e grava data/dados.js, o arquivo
que o esboço D3 (index.html) lê. As contas são as mesmas do notebooks/05-esboco-dashboard-python.ipynb.

Onde procura a base limpa (na raiz da pasta onde este script está):
    1. o caminho passado na linha de comando (opcional)
    2. <pasta>/varejo_limpo.parquet
    3. <pasta>/data/processed/varejo_limpo.parquet   (onde o gerar_varejo_limpo.py grava)

Onde grava:
    <pasta>/data/dados.js

Por que .js e não .json: o navegador bloqueia a leitura de .json quando o index.html é aberto
com duplo clique (file://). Um .js carregado por <script> não tem essa restrição.

Uso:
    Windows 10:  python gerar_dados_d3.py
    Ubuntu:      python3 gerar_dados_d3.py
"""

# =====================================================================
# 1. BIBLIOTECAS
# =====================================================================
import argparse                                   # lê argumentos da linha de comando
import json                                       # converte os agregados em texto JSON
import sys                                        # ajusta o console e encerra com código de saída
from datetime import datetime                     # data e hora da geração
from pathlib import Path                          # caminhos que funcionam no Windows e no Ubuntu

import numpy as np                                # correlação e regressão
import pandas as pd                               # leitura e agregação da base

# =====================================================================
# 2. PARÂMETROS (os mesmos do notebook 05)
# =====================================================================
PRECO_IMPUTADO = "imputado_mediana_categoria"     # rótulo das 260 vendas com preço estimado
DESCONTO_IMPUTADO = "imputado_mediana"            # rótulo das 69 vendas com desconto estimado
SEM_CANAL, SEM_UF = "Não informado", "NI"         # rótulos de ausência
MASSA_MINIMA_UF = 15                              # vendas mínimas para comparar uma UF
RFV_CAMPEOES, RFV_LEAIS, RFV_ATENCAO = 10, 7, 5   # limites dos segmentos RFV
MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]  # rótulos
REFERENCIA_EXCEL = {                              # valores do esboco-dashboard-excel.xlsx, para conferência
    "faturamento": 109344.37, "meses_acima": 6, "vendas_80": 304, "top3_receita": 41383.26,   # faturamento, meses, Pareto, top 3 UFs
    "recorrentes": 230, "campeoes": 49, "vendas_desconto_valido": 931, "correlacao": 0.4066,   # clientes, RFV, desconto, correlação
}


def r(valor, casas=4):   # função de arredondamento
    """Arredonda para deixar o dados.js menor (sem afetar o que é exibido)."""
    return None if pd.isna(valor) else round(float(valor), casas)   # nulo vira None (null no JSON)


# =====================================================================
# 3. LOCALIZAR A BASE LIMPA
# =====================================================================
def localizar(argumento):   # função que acha a base limpa
    """Procura o varejo_limpo.parquet na raiz da pasta do script (ou no caminho informado)."""
    pasta = Path(__file__).resolve().parent                            # raiz da pasta do script
    candidatos = [Path(argumento)] if argumento else []                # caminho informado (opcional)
    candidatos += [pasta / "varejo_limpo.parquet",                     # direto na raiz
                   pasta / "data" / "processed" / "varejo_limpo.parquet"]  # onde o gerador grava
    for c in candidatos:                                               # testa cada candidato
        if c.is_file():                                                # achou...
            return c.resolve(), pasta                                  # ...devolve arquivo e pasta
    lista = "\n".join(f"    {c}" for c in candidatos)                  # lista do que foi tentado
    sys.exit(f"ERRO: varejo_limpo.parquet não encontrado. Rode antes o gerar_varejo_limpo.py.\n"   # encerra com a lista de lugares verificados
             f"Lugares verificados:\n{lista}")                         # encerra com mensagem clara


# =====================================================================
# 4. AGREGADOS — UMA FUNÇÃO POR BLOCO
# =====================================================================
def bloco1(df, fat):   # função bloco1
    """Perguntas 1 a 4: receita mensal, sazonalidade, ticket e Pareto."""
    m = df.groupby("mes").agg(receita=("valor_total", "sum"), vendas=("id_venda", "count")).reset_index()  # por mês
    media = m["receita"].mean()                                        # média mensal
    ticket_ano = fat / len(df)                                         # ticket do ano
    mensal = [{"mes": int(x.mes), "nome": MESES[int(x.mes) - 1],       # uma linha por mês
               "receita": r(x.receita, 2), "vendas": int(x.vendas),   # campos: receita, vendas
               "ticket": r(x.receita / x.vendas, 2),   # campos: ticket
               "desvio": r(x.receita / media - 1)} for x in m.itertuples()]   # campos: desvio
    v = np.sort(df["valor_total"].to_numpy())[::-1]                    # vendas da maior para a menor
    acum = np.cumsum(v) / fat                                          # % acumulado da receita
    n = len(v)                                                         # total de vendas
    vendas_80 = int((acum < 0.8).sum()) + 1                            # vendas até formar 80%
    pareto = [[r((i + 1) / n), r(a)] for i, a in enumerate(acum)]      # pontos (x = % vendas, y = % receita)
    return {   # devolve os agregados do bloco
        "p1": {"mensal": mensal, "media": r(media, 2)},                # pergunta 1
        "p2": {"meses_acima": int((m["receita"] > media).sum())},      # pergunta 2 (usa p1)
        "p3": {"ticket_ano": r(ticket_ano, 2)},                        # pergunta 3 (usa p1)
        "p4": {"pontos": pareto, "vendas_80": vendas_80, "pct_80": r(vendas_80 / n),   # pergunta 4
               "maior": r(v.max(), 2), "top10": r(acum[n // 10 - 1])},   # campos: maior, top10
    }


def bloco2(df, fat, cats):   # função bloco2
    """Perguntas 5 a 8: categorias."""
    g = df.groupby("categoria").agg(receita=("valor_total", "sum"), vendas=("id_venda", "count"),   # receita, vendas e unidades por categoria...
                                    unidades=("quantidade", "sum")).reindex(cats)       # por categoria
    total_un = df["quantidade"].sum()                                  # unidades totais
    p5 = [{"categoria": c, "receita": r(x.receita, 2), "vendas": int(x.vendas),        # pergunta 5
           "participacao": r(x.receita / fat)} for c, x in g.iterrows()]   # campos: participacao
    p6 = [{"categoria": c, "unidades": int(x.unidades), "receita": r(x.receita, 2),    # pergunta 6
           "pct_unidades": r(x.unidades / total_un), "pct_receita": r(x.receita / fat),   # campos: pct_unidades, pct_receita
           "receita_unidade": r(x.receita / x.unidades, 2),   # campos: receita_unidade
           "perfil": "tráfego" if x.unidades / total_un > x.receita / fat else "valor"}   # campos: perfil
          for c, x in g.iterrows()]   # uma entrada por linha do agrupamento
    precos = df[df["preco_origem"] != PRECO_IMPUTADO]                  # sem preços imputados
    p7 = []                                                            # pergunta 7 — boxplot
    for c in cats:                                                     # uma caixa por categoria
        s = precos.loc[precos["categoria"] == c, "preco_unit"]         # preços da categoria
        q1, med, q3 = s.quantile([0.25, 0.5, 0.75])                    # quartis
        iqr = q3 - q1                                                  # intervalo interquartil
        dentro = s[(s >= q1 - 1.5 * iqr) & (s <= q3 + 1.5 * iqr)]      # valores dentro dos bigodes
        p7.append({"categoria": c, "n": int(len(s)), "min": r(s.min(), 2), "q1": r(q1, 2),   # campos: categoria, n, min, q1
                   "mediana": r(med, 2), "q3": r(q3, 2), "max": r(s.max(), 2), "media": r(s.mean(), 2),  # campos: mediana, q3, max, media
                   "bigode_inf": r(dentro.min(), 2), "bigode_sup": r(dentro.max(), 2),   # campos: bigode_inf, bigode_sup
                   "atipicos": [r(x, 2) for x in s[(s < dentro.min()) | (s > dentro.max())]]})   # campos: atipicos
    mat = df.pivot_table(index="mes", columns="categoria", values="valor_total",   # matriz mês × categoria...
                         aggfunc="sum", fill_value=0)[cats]            # receita mês × categoria
    mat = mat.div(mat.sum(axis=1), axis=0)                             # cada mês soma 100%
    p8 = [{"nome": MESES[i - 1], **{c: r(mat.loc[i, c]) for c in cats}} for i in mat.index]  # pergunta 8
    return {"p5": p5, "p6": p6, "p7": {"caixas": p7, "excluidos": int(len(df) - len(precos))}, "p8": p8}  # devolve os agregados do bloco


def bloco3(df, fat, canais, cats):   # função bloco3
    """Perguntas 9 a 11: canais."""
    g = df.groupby("canal").agg(receita=("valor_total", "sum"), vendas=("id_venda", "count")).reindex(canais)  # receita e vendas por canal, na ordem fixa
    com_canal = g.drop(SEM_CANAL)["receita"].sum()                     # receita com canal informado
    ticket_ano = fat / len(df)                                         # ticket do ano
    p9 = [{"canal": k, "receita": r(x.receita, 2), "vendas": int(x.vendas),            # pergunta 9
           "pct_total": r(x.receita / fat),   # campos: pct_total
           "pct_com_canal": None if k == SEM_CANAL else r(x.receita / com_canal)} for k, x in g.iterrows()]  # campos: pct_com_canal
    p10 = [{"canal": k, "receita": r(x.receita, 2), "vendas": int(x.vendas),           # pergunta 10
            "ticket": r(x.receita / x.vendas, 2), "vs_ano": r((x.receita / x.vendas) / ticket_ano - 1)}  # campos: ticket, vs_ano
           for k, x in g.iterrows()]   # uma entrada por linha do agrupamento
    mat = df.pivot_table(index="canal", columns="categoria", values="valor_total",   # matriz canal × categoria...
                         aggfunc="sum", fill_value=0).reindex(index=canais, columns=cats)  # canal × categoria
    mat = mat.div(mat.sum(axis=1), axis=0)                             # cada canal soma 100%
    p11 = {"linhas": canais, "colunas": cats,                          # pergunta 11
           "valores": [[r(v) for v in linha] for linha in mat.to_numpy()]}   # campos: valores
    return {"p9": p9, "p10": {"canais": p10, "ticket_ano": r(ticket_ano, 2)}, "p11": p11}   # devolve os agregados do bloco


def bloco4(df, fat, canais):   # função bloco4
    """Perguntas 12 a 14: geografia."""
    g = (df.groupby("uf").agg(receita=("valor_total", "sum"), vendas=("id_venda", "count"))   # receita e vendas por UF...
          .sort_values("receita", ascending=False))                   # ...da maior para a menor
    g = pd.concat([g.drop(SEM_UF), g.loc[[SEM_UF]]])                   # "NI" por último
    p12 = [{"uf": u, "receita": r(x.receita, 2), "vendas": int(x.vendas),              # pergunta 12
            "participacao": r(x.receita / fat), "massa": bool(x.vendas >= MASSA_MINIMA_UF)}   # campos: participacao, massa
           for u, x in g.iterrows()]   # uma entrada por linha do agrupamento
    ufs = g.drop(SEM_UF)                                               # só UFs informadas
    com_uf = ufs["receita"].sum()                                      # receita com UF
    p13 = [{"indicador": f"Top {n} UFs", "ufs": list(ufs.index[:n]),   # pergunta 13
            "receita": r(ufs["receita"][:n].sum(), 2),   # campos: receita
            "pct_total": r(ufs["receita"][:n].sum() / fat),   # campos: pct_total
            "pct_com_uf": r(ufs["receita"][:n].sum() / com_uf)} for n in (3, 5)]   # campos: pct_com_uf
    validas = [u for u in ufs.index if ufs.loc[u, "vendas"] >= MASSA_MINIMA_UF]        # UFs comparáveis
    mat = pd.crosstab(df["uf"], df["canal"], normalize="index").reindex(index=validas, columns=canais).fillna(0)  # % de vendas de cada canal por UF, só UFs comparáveis
    p14 = {"linhas": validas, "colunas": canais, "massa_minima": MASSA_MINIMA_UF,      # pergunta 14
           "valores": [[r(v) for v in linha] for linha in mat.to_numpy()]}   # campos: valores
    return {"p12": p12, "p13": p13, "p14": p14}   # devolve os agregados do bloco


def bloco5(df, fat):   # função bloco5
    """Perguntas 15 a 17: clientes."""
    cli = df.groupby("cliente").agg(compras=("id_venda", "count"), receita=("valor_total", "sum"),   # compras, receita e última compra por cliente...
                                    ultima=("data", "max"))            # uma linha por cliente
    hist = cli["compras"].value_counts().sort_index()                  # clientes por nº de compras
    p15 = {"distribuicao": [{"compras": int(k), "clientes": int(v), "pct": r(v / len(cli))}  # pergunta 15
                            for k, v in hist.items()],   # uma entrada por linha do agrupamento
           "clientes": int(len(cli)), "recorrentes": int((cli["compras"] >= 2).sum()),   # campos: clientes, recorrentes
           "media": r(cli["compras"].mean(), 2)}   # campos: media
    top = cli.sort_values("receita", ascending=False).head(20)         # 20 maiores
    acum = (top["receita"] / fat).cumsum()                             # % acumulado
    p16 = [{"posicao": i + 1, "cliente": c, "receita": r(x.receita, 2), "compras": int(x.compras),  # pergunta 16
            "pct": r(x.receita / fat), "pct_acum": r(acum[c])} for i, (c, x) in enumerate(top.iterrows())]  # campos: pct, pct_acum
    ref = df["data"].max() + pd.DateOffset(days=1)                     # dia após a última venda
    cli["recencia"] = (ref - cli["ultima"]).dt.days                    # dias sem comprar

    def nota(s, menor_melhor=False):                                   # nota 1–4 por quartis
        q1, q2, q3 = s.quantile([0.25, 0.5, 0.75])                     # cortes
        if menor_melhor:                                               # recência: menos dias = melhor
            return np.select([s <= q1, s <= q2, s <= q3], [4, 3, 2], default=1)   # menos dias → nota maior
        return np.select([s > q3, s > q2, s > q1], [4, 3, 2], default=1)   # frequência e valor

    cli["rfv"] = nota(cli["recencia"], True) + nota(cli["compras"]) + nota(cli["receita"])   # soma 3–12
    cli["segmento"] = np.select([cli["rfv"] >= RFV_CAMPEOES, cli["rfv"] >= RFV_LEAIS,   # segmento pela soma RFV...
                                 cli["rfv"] >= RFV_ATENCAO], ["Campeões", "Leais", "Atenção"], default="Em risco")  # ...Campeões, Leais, Atenção ou Em risco
    seg = (cli.groupby("segmento").agg(clientes=("rfv", "count"), receita=("receita", "sum"),   # resumo por segmento...
                                       compras_medias=("compras", "mean"))   # ...com compras médias
             .reindex(["Campeões", "Leais", "Atenção", "Em risco"]))  # ordem fixa
    p17 = {"segmentos": [{"segmento": s, "clientes": int(x.clientes), "receita": r(x.receita, 2),   # pergunta 17
                          "compras_medias": r(x.compras_medias, 1), "pct": r(x.receita / fat)}   # campos: compras_medias, pct
                         for s, x in seg.iterrows()],   # uma entrada por linha do agrupamento
           "pontos": [[int(x.compras), r(x.receita, 2), x.segmento, c] for c, x in cli.iterrows()],   # campos: pontos
           "data_ref": ref.strftime("%d/%m/%Y"),   # campos: data_ref
           "limites": {"campeoes": RFV_CAMPEOES, "leais": RFV_LEAIS, "atencao": RFV_ATENCAO}}   # campos: limites, campeoes, leais, atencao
    return {"p15": p15, "p16": p16, "p17": p17}   # devolve os agregados do bloco


def bloco6(df, canais, cats):   # função bloco6
    """Perguntas 18 a 20: desconto (sem os 69 imputados)."""
    d = df[df["desconto_origem"] != DESCONTO_IMPUTADO]                 # só descontos válidos
    cortes = [-0.001, 0, 1, 2, 3, 5, 10, 20]                           # limites das faixas
    rot = ["Sem desconto", "até 1%", "1% a 2%", "2% a 3%", "3% a 5%", "5% a 10%", "10% a 20%"]  # nomes
    cont = pd.cut(d["desconto_pct"], bins=cortes, labels=rot).value_counts().reindex(rot)       # por faixa
    p18 = {"faixas": [{"faixa": k, "vendas": int(v), "pct": r(v / len(d))} for k, v in cont.items()],  # pergunta 18
           "n": int(len(d)), "media": r(d["desconto_pct"].mean(), 2),   # campos: n, media
           "mediana": r(d["desconto_pct"].median(), 2), "max": r(d["desconto_pct"].max(), 2)}   # campos: mediana, max
    mat = d.pivot_table(index="categoria", columns="canal", values="desconto_pct",   # matriz categoria × canal...
                        aggfunc="mean").reindex(index=cats, columns=canais)   # média categoria × canal
    p19 = {"linhas": cats, "colunas": canais,                          # pergunta 19
           "valores": [[r(v, 2) for v in linha] for linha in mat.to_numpy()]}   # campos: valores
    x, y = d["desconto_pct"], d["valor_total"]                         # pares desconto × valor
    a, b = np.polyfit(x, y, 1)                                         # reta y = a·x + b
    corr = x.corr(y)                                                   # correlação de Pearson
    p20 = {"pontos": [[r(i, 2), r(j, 2)] for i, j in zip(x, y)], "n": int(len(d)),   # pergunta 20
           "r_validas": r(corr), "r_todas": r(df["desconto_pct"].corr(df["valor_total"])),   # campos: r_validas, r_todas
           "r2": r(corr ** 2), "a": r(a), "b": r(b)}   # campos: r2, a, b
    return {"p18": p18, "p19": p19, "p20": p20}   # devolve os agregados do bloco


# =====================================================================
# 5. PROGRAMA PRINCIPAL
# =====================================================================
def main():   # função principal
    """Lê a base, calcula os agregados, confere com o Excel e grava data/dados.js."""
    for fluxo in (sys.stdout, sys.stderr):                             # acentos no console do Windows
        try:   # tenta ajustar a codificação
            fluxo.reconfigure(encoding="utf-8", errors="replace")   # força UTF-8 na saída
        except (AttributeError, ValueError):   # console antigo sem reconfigure
            pass   # segue sem ajuste
    p = argparse.ArgumentParser(description="Gera data/dados.js para o esboço D3.")   # ajuda
    p.add_argument("base", nargs="?", help="caminho do varejo_limpo.parquet (opcional)")   # argumento opcional: caminho da base
    arquivo, pasta = localizar(p.parse_args().base)                    # acha a base
    df = pd.read_parquet(arquivo)                                      # lê a base limpa
    fat = df["valor_total"].sum()                                      # faturamento
    cats = df.groupby("categoria")["valor_total"].sum().sort_values(ascending=False).index.tolist()  # ordem fixa
    canais = (df[df["canal"] != SEM_CANAL].groupby("canal")["valor_total"].sum()   # canais pela receita, do maior ao menor...
              .sort_values(ascending=False).index.tolist()) + [SEM_CANAL]                         # ausência por último

    dados = {"meta": {"gerado_em": datetime.now().strftime("%d/%m/%Y %H:%M"),           # metadados
                      "fonte": arquivo.name, "vendas": int(len(df)), "faturamento": r(fat, 2),   # arquivo, nº de vendas e faturamento
                      "categorias": cats, "canais": canais}}   # ordens fixas usadas nas cores
    dados.update(bloco1(df, fat))                                      # perguntas 1–4
    dados.update(bloco2(df, fat, cats))                                # perguntas 5–8
    dados.update(bloco3(df, fat, canais, cats))                        # perguntas 9–11
    dados.update(bloco4(df, fat, canais))                              # perguntas 12–14
    dados.update(bloco5(df, fat))                                      # perguntas 15–17
    dados.update(bloco6(df, canais, cats))                             # perguntas 18–20

    calculado = {"faturamento": fat, "meses_acima": dados["p2"]["meses_acima"],          # valores deste script
                 "vendas_80": dados["p4"]["vendas_80"], "top3_receita": dados["p13"][0]["receita"],   # Pareto e top 3 UFs
                 "recorrentes": dados["p15"]["recorrentes"], "campeoes": dados["p17"]["segmentos"][0]["clientes"],  # clientes e Campeões
                 "vendas_desconto_valido": dados["p18"]["n"], "correlacao": dados["p20"]["r_validas"]}  # desconto e correlação
    dados["conferencia"] = [{"indicador": k, "d3": r(calculado[k]), "excel": v,          # conferência
                             "ok": bool(abs(calculado[k] - v) <= 0.005 * max(1, abs(v)))}   # confere com tolerância de 0,5%
                            for k, v in REFERENCIA_EXCEL.items()]   # um item por indicador do Excel

    destino = pasta / "data" / "dados.js"                              # arquivo de saída
    destino.parent.mkdir(parents=True, exist_ok=True)                  # cria data/ se preciso
    texto = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))   # JSON compacto, com acentos
    destino.write_text("// Gerado por gerar_dados_d3.py — não edite à mão.\n"   # cabeçalho de aviso + variável global...
                       f"window.DADOS = {texto};\n", encoding="utf-8")   # vira variável global no navegador

    ok = sum(c["ok"] for c in dados["conferencia"])                    # quantos batem com o Excel
    print(f"Base     : {arquivo}")                                     # resumo no console
    print(f"Gravado  : {destino} ({destino.stat().st_size / 1024:.0f} KB)")   # caminho e tamanho
    print(f"Conferência com o Excel: {ok} de {len(dados['conferencia'])} indicadores batem")   # resultado da conferência
    return 0 if ok == len(dados["conferencia"]) else 1                 # código de saída


if __name__ == "__main__":                                             # executa só quando chamado direto
    sys.exit(main())   # código de saída 0 = tudo confere
