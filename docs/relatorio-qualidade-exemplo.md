# Relatório de Qualidade dos Dados

**Projeto Varejo** · Diagnóstico da base bruta

> Documento gerado automaticamente por `notebooks/01-diagnostico.ipynb`.
> Nenhuma correção foi aplicada nesta etapa.

## Identificação do arquivo

| Campo | Valor |
|---|---|
| Arquivo | `data/raw/varejo.csv` |
| Tamanho | 57.139 bytes |
| SHA-256 | `446a6b0baefb04d93532ffbe5f86098cde09d68af1db152c8f4ba61c783796c7` |
| Quebra de linha | LF (Unix) |
| BOM UTF-8 | não |
| Dimensões | 1000 linhas × 10 colunas |
| Diagnóstico em | 13/09/2026 às 06:46 |

**Natureza do dado.** Conjunto fictício, gerado para fins de estudo. Os problemas listados são reais enquanto exercício técnico, mas não descrevem uma operação de varejo existente.

## Achados

Foram executadas 22 verificações: 14 apontaram defeito que exige decisão, 2 caracterizam a base sem exigir correção.

### Defeitos — exigem decisão e correção

| # | Área | Achado | Quantidade | Unidade | Observação |
|---:|---|---|---:|---|---|
| 1 | `canal` | valores ausentes (vazios + marcadores) | 233 | células | 176 vazios, 57 marcadores: -, --, ?, N/A, NULL, null, sem informacao |
| 2 | `uf` | valores ausentes (vazios + marcadores) | 243 | células | 174 vazios, 69 marcadores: -, --, ?, N/A, NULL, n/a, null, sem informacao |
| 3 | `preco_unit` | valores ausentes (vazios + marcadores) | 260 | células | 190 vazios, 70 marcadores: -, --, ?, N/A, NULL, null, sem informacao |
| 4 | `desconto_pct` | valores ausentes (vazios + marcadores) | 262 | células | 179 vazios, 83 marcadores: -, --, ?, N/A, NULL, null, sem informacao |
| 5 | `data` | datas em formato divergente do majoritário | 87 | linhas | majoritário AAAA-MM-DD; divergentes — DD/MM/AAAA: 87 |
| 6 | `categoria` | variações de grafia do mesmo valor | 24 | valores distintos | 31 formas escritas para 7 valores reais |
| 7 | `categoria` | células com espaço no início ou fim | 29 | células |  |
| 8 | `canal` | variações de grafia do mesmo valor | 14 | valores distintos | 18 formas escritas para 4 valores reais |
| 9 | `canal` | células com espaço no início ou fim | 20 | células |  |
| 10 | `uf` | variações de grafia do mesmo valor | 17 | valores distintos | 32 formas escritas para 15 valores reais |
| 11 | `uf` | células com espaço no início ou fim | 15 | células |  |
| 12 | `cliente` | variações de grafia do mesmo valor | 41 | valores distintos | 286 formas escritas para 245 valores reais |
| 13 | `cliente` | células com espaço no início ou fim | 33 | células |  |
| 14 | `valor_total` | linhas que violam a identidade de valor | 2 | linhas | 545 de 547 coerentes (99.6%) — regra confiável |

### Informações — caracterizam a base, sem correção prevista

| Área | Achado | Quantidade | Unidade | Observação |
|---|---|---:|---|---|
| `arquivo` | linhas de dados | 1000 | linhas | SHA-256 446a6b0baefb… |
| `valor_total` | registros acima de Q3 + 3×IQR | 42 | linhas | limite: R$ 507.72 — dispersão alta é esperada em varejo, NÃO é critério de remoção |

### Verificações sem problema encontrado

- `data` — datas que não convertem: nenhum caso.
- `data` — datas fora de 2024: nenhum caso.
- `desconto_pct` — descontos acima de 100%: nenhum caso.
- `id_venda` — identificadores repetidos: nenhum caso.
- `linha` — linhas integralmente duplicadas: nenhum caso.
- `linha` — linhas duplicadas ignorando o id: nenhum caso.

## Decisões propostas

> **Preencher antes de escrever `02-limpeza.ipynb`.**
> Cada correção implementada deve corresponder a uma linha desta tabela. Correção sem decisão registrada não entra no pipeline.

| # | Achado | Decisão | Justificativa |
|---|---|---|---|
| 1 | `canal` — valores ausentes (vazios + marcadores) | *a definir* | *a definir* |
| 2 | `uf` — valores ausentes (vazios + marcadores) | *a definir* | *a definir* |
| 3 | `preco_unit` — valores ausentes (vazios + marcadores) | *a definir* | *a definir* |
| 4 | `desconto_pct` — valores ausentes (vazios + marcadores) | *a definir* | *a definir* |
| 5 | `data` — datas em formato divergente do majoritário | *a definir* | *a definir* |
| 6 | `categoria` — variações de grafia do mesmo valor | *a definir* | *a definir* |
| 7 | `categoria` — células com espaço no início ou fim | *a definir* | *a definir* |
| 8 | `canal` — variações de grafia do mesmo valor | *a definir* | *a definir* |
| 9 | `canal` — células com espaço no início ou fim | *a definir* | *a definir* |
| 10 | `uf` — variações de grafia do mesmo valor | *a definir* | *a definir* |
| 11 | `uf` — células com espaço no início ou fim | *a definir* | *a definir* |
| 12 | `cliente` — variações de grafia do mesmo valor | *a definir* | *a definir* |
| 13 | `cliente` — células com espaço no início ou fim | *a definir* | *a definir* |
| 14 | `valor_total` — linhas que violam a identidade de valor | *a definir* | *a definir* |

## Verificação pós-limpeza

Tabela a ser preenchida após executar `02-limpeza.ipynb`. É a prova de que cada correção surtiu efeito.

| # | Indicador | Antes | Meta | Depois |
|---:|---|---:|---:|---:|
| 1 | `canal` — valores ausentes (vazios + marcadores) | 233 | 0 | |
| 2 | `uf` — valores ausentes (vazios + marcadores) | 243 | 0 | |
| 3 | `preco_unit` — valores ausentes (vazios + marcadores) | 260 | 0 | |
| 4 | `desconto_pct` — valores ausentes (vazios + marcadores) | 262 | 0 | |
| 5 | `data` — datas em formato divergente do majoritário | 87 | 0 | |
| 6 | `categoria` — variações de grafia do mesmo valor | 24 | 0 | |
| 7 | `categoria` — células com espaço no início ou fim | 29 | 0 | |
| 8 | `canal` — variações de grafia do mesmo valor | 14 | 0 | |
| 9 | `canal` — células com espaço no início ou fim | 20 | 0 | |
| 10 | `uf` — variações de grafia do mesmo valor | 17 | 0 | |
| 11 | `uf` — células com espaço no início ou fim | 15 | 0 | |
| 12 | `cliente` — variações de grafia do mesmo valor | 41 | 0 | |
| 13 | `cliente` — células com espaço no início ou fim | 33 | 0 | |
| 14 | `valor_total` — linhas que violam a identidade de valor | 2 | 0 | |
