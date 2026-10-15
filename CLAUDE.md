# CLAUDE.md — Projeto Varejo

Contexto e regras para o Claude trabalhar neste repositório.
Atualize este arquivo sempre que uma fase avançar ou uma decisão mudar.

**Última atualização:** 13/10/2026

---

## 1. O projeto

Projeto de **estudo e portfólio** em Data Analytics: ciclo completo sobre um dataset de vendas
no varejo, da limpeza à previsão de vendas com Machine Learning.

- **O dataset é fictício**, gerado para estudo. Não tirar conclusões de negócio dele. Escrever
  "a análise demonstra como testar se…", nunca "a análise indica que…".
- **O objetivo é demonstrar método**, não descobrir fatos de mercado.
- As mesmas análises são feitas em **quatro ferramentas**: Excel, Jupyter/Python, Power BI e D3.js.
  Os números precisam coincidir entre elas.

## 2. Ambiente

| Item | Valor |
|---|---|
| Sistemas | **Windows 10** (principal) e **Ubuntu**. Tudo deve funcionar nos dois. |
| Raiz no Windows | `C:\Git\Projeto-Varejo` |
| Gerenciador | Anaconda (Anaconda Prompt no Windows) |
| Ambiente | `varejo` (conda, Python 3.12), **fora** da pasta do projeto |
| Receita do ambiente | `environment.yml` (gerado com `--from-history`) e `requirements.txt` |
| Abrir o Jupyter | `conda activate varejo` → `cd /d C:\Git\Projeto-Varejo` → `jupyter lab` |

**Power BI Desktop não roda no Ubuntu.** Ao tratar dashboards de Power BI, considerar só o Windows.

## 3. Estrutura principal

```
Projeto-Varejo/
├── data/raw/varejo.csv          ← original, somente leitura, NUNCA alterar
├── data/interim/                ← intermediários (fora do Git)
├── data/processed/              ← base limpa (fora do Git, regenerada pelo notebook)
├── notebooks/                   ← numerados: 01-, 02-, 03-…
├── src/                         ← funções reutilizáveis (limpeza/, analise/, …)
├── dashboards/{excel,powerbi,d3js}/
├── docs/                        ← relatórios, log, decisões
├── tests/
└── CLAUDE.md                    ← este arquivo
```

## 4. Dataset

| Item | Valor |
|---|---|
| Arquivo | `data/raw/varejo.csv` — 1.000 linhas, 10 colunas, vendas de 2024 |
| SHA-256 | `446a6b0baefb04d93532ffbe5f86098cde09d68af1db152c8f4ba61c783796c7` |
| Colunas | `id_venda, data, cliente, categoria, canal, uf, quantidade, preco_unit, desconto_pct, valor_total` |
| Identidade de valor | `valor_total = quantidade × preco_unit × (1 − desconto_pct/100)` — vale em 545 de 547 linhas completas do bruto |

**Defeitos do bruto (apurados):** 998 células ausentes (719 vazias + 279 marcadores `--`, `?`,
`-`, `sem informacao`, `N/A`, `null`); 87 datas em `DD/MM/AAAA` e 913 em `AAAA-MM-DD`;
grafias inconsistentes (31 para 7 categorias, 18 para 4 canais, 32 para 15 UFs, 286 para 245
clientes); 7 registros com vírgula decimal deslocada (ids 3, 76, 168, 391, 470, 492, 776).

**Base limpa:** 1.000 linhas (nenhuma removida), zero nulos, identidade válida em 100%,
faturamento **R$ 109.344,37** (o bruto somava R$ 133.320,19, inflado 21,9% pelos 7 registros).

## 5. Regras de trabalho para o Claude

### Sempre
- **Avisar onde, como e quando alterar o `README.md`** ao final de cada entrega.
- Português do Brasil correto, com acentuação, e **UTF-8** em todo arquivo.
- Dar comandos para **Windows 10 e Ubuntu**, em blocos rotulados.
- **Executar e conferir** notebooks e scripts antes de entregar; não entregar código não testado.
- Medir o efeito de uma decisão antes de tomá-la e registrar a justificativa.
- Números citados em documentos vêm de apuração sobre o arquivo, nunca de estimativa.
- Separar **defeito** (exige correção) de **informação** (caracteriza a base).

### Nunca
- Alterar `data/raw/varejo.csv`.
- Remover linhas sem justificativa registrada.
- Imputar pela média ou pela moda quando a própria venda permite calcular o valor.
- Inventar números ou conclusões de negócio a partir do dado fictício.

## 6. Convenções técnicas

| Tema | Regra |
|---|---|
| Caminhos | `pathlib.Path`; âncora que funciona aberta da raiz ou de `notebooks/` |
| Leitura do bruto | `pd.read_csv(..., dtype=str, keep_default_na=False)` |
| Datas | `format` explícito por padrão. **Nunca** `format='mixed', dayfirst=True` (inverte 297 datas no pandas 3.0) |
| `fillna` | `df['col'] = df['col'].fillna(x)`. **Nunca** `inplace=True` (falha no pandas recente) |
| Regex com acento | Faixa `À-ÖØ-öø-ÿ`. **Nunca** `\é` (erro no pandas 3.0) nem `\w` (perde acentos no pandas 3.0) |
| Cliente | É código `CLI-NNNN`: padronizar em maiúsculas, **nunca** remover dígitos |
| Dia da semana | Dicionário fixo em português, não `day_name()` |
| CSV para Excel | `encoding='utf-8-sig'`, `sep=';'` — ou entregar `.xlsx` |
| CSV para Python/Power BI/D3 | UTF-8 sem BOM, separador vírgula |
| Markdown, YAML, JSON | UTF-8 **sem** BOM |
| Quebra de linha | LF no repositório (`.gitattributes`); `.bat`/`.ps1` em CRLF |
| Nomes de arquivo | minúsculas, hífen, sem acento, sem espaço |
| Moeda | `R$ 1.234,56` em tudo que for exibido |
| Compatibilidade | Testar em pandas 2.x e 3.x quando houver dúvida |

## 7. Decisões de limpeza adotadas (`notebooks/03-diagnostico.ipynb`)

| Decisão | Motivo |
|---|---|
| Preço e desconto ausentes **recalculados** pela identidade de valor | Recupera o valor exato em vez de estimar |
| Desconto pela mediana só nas 69 linhas sem preço e sem desconto | Única situação sem conta possível |
| Canal ausente → `Não informado`; UF ausente → `NI` | Moda inflaria Loja (44% → 57%) e SP (30% → 47%) |
| 7 registros com vírgula deslocada **corrigidos**, não removidos | Assinatura exata de fator 100 |
| Colunas de origem `preco_origem`, `desconto_origem`, `valor_origem` | Trilha de auditoria; permitem excluir valores estimados |
| Mantidas `mes`, `ano`, `dia`, `dia_semana` | Usadas nos dashboards |

**Uso nas análises:** excluir `desconto_origem = imputado_mediana` dos insights de política de
desconto (18 a 20). Filtrar `Não informado` e `NI` nos gráficos de canal e UF quando fizer sentido,
mantendo essas vendas no faturamento total.

## 8. Estado atual

| Fase do roadmap | Status | Onde |
|---|---|---|
| 1. Organização, estrutura e ambiente | ✅ concluída | raiz do repositório |
| 2. Limpeza dos dados | ✅ concluída | `notebooks/03-diagnostico.ipynb` |
| 3. Análise exploratória | ⬜ próxima | — |
| 4. Estatística descritiva | ⬜ | — |
| 5. Indicadores (KPIs) | ⬜ | — |
| 6. Dashboards (Excel, Python, Power BI, D3) | ⬜ | `dashboards/` |
| 7. Machine Learning | ⬜ | — |
| 8. Previsão de vendas | ⬜ | — |

## 9. Pendências

- [ ] Renomear `MIT License` para `LICENSE` (`git mv "MIT License" LICENSE`)
- [ ] Definir o papel de `notebooks/02-diagnostico.ipynb` (apagar ou renomear para o que ele faz)
- [ ] Apagar `docs/relatorio-qualidade-exemplo.md` e `log_limpeza-exemplo.txt` depois de conferir os números
- [ ] Trocar "Elaboração: Claude…" no cabeçalho do `03-diagnostico` pelo nome do autor, com menção à assistência
- [ ] Escrever a conclusão do `03-diagnostico` com as próprias palavras
- [ ] Decidir se `03-diagnostico` passa a se chamar `03-limpeza`
- [ ] Criar `.gitkeep` nas pastas vazias para que apareçam no GitHub
- [ ] Testes em `tests/` para datas, vírgula deslocada e padronização de cliente
- [ ] Migrar as funções de limpeza para `src/limpeza/`

## 10. Referências do projeto

- `README.md` — visão geral pública
- `docs/log_limpeza.txt` — registro de cada passo da limpeza (gerado pelo `03-diagnostico`)
- `docs/roadmap.md` — roadmap detalhado
- Entregáveis de apoio (fora do repositório ou em `docs/`): `insights-de-negocio.md` (20 perguntas
  de negócio), `manual-ambiente-projeto-varejo.html`, mentorias técnica e de documentação

---

## Histórico de atualizações

| Data | O que mudou |
|---|---|
| 13/10/2026 | Criação do arquivo, com estado após a conclusão da limpeza |
