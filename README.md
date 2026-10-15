# Projeto Varejo

## Sobre o Projeto

O **Projeto Varejo** é um projeto de estudo e desenvolvimento de um ambiente completo de **Data Analytics**, utilizando um conjunto de dados de vendas no varejo para demonstrar todo o ciclo de análise de dados, desde a obtenção e preparação das informações, até a construção de dashboards interativos e modelos de Machine Learning.

O objetivo é desenvolver um projeto de portfólio que represente um fluxo de trabalho semelhante ao encontrado em ambientes corporativos, utilizando diferentes ferramentas amplamente empregadas no mercado.

---

# Objetivos

Este projeto tem como objetivos:

* Praticar técnicas de limpeza e preparação de dados.
* Realizar Análise Exploratória de Dados (EDA).
* Produzir análises estatísticas.
* Construir indicadores de desempenho (KPIs).
* Desenvolver dashboards em diferentes tecnologias.
* Criar modelos de previsão de vendas utilizando Machine Learning.
* Consolidar um portfólio completo de Data Analytics.

---

# Tecnologias Utilizadas

## Linguagens

* Python

## Ferramentas

* Jupyter Notebook
* Microsoft Excel
* Power BI
* D3.js

## Bibliotecas Python

* Pandas
* NumPy
* Matplotlib
* PyArrow (formato Parquet)
* OpenPyXL (formato Excel)
* Plotly (planejada)
* Scikit-Learn (planejada)
* XGBoost (planejada)

---

# Arquitetura do Projeto

```
Dataset Bruto
        │
        ▼
Limpeza dos Dados
        │
        ▼
Organização
        │
        ▼
Análise Exploratória
        │
        ▼
Estatística
        │
        ▼
KPIs
        │
        ▼
Dashboards
        │
        ▼
Machine Learning
        │
        ▼
Previsão de Vendas
```

---

# Estrutura do Repositório

```
Projeto-Varejo/

├── .github/
│   └── workflows/
│
├── assets/
│   ├── icones/
│   ├── imagens/
│   └── logo/
│
├── dashboards/
│   ├── d3js/
│   │   ├── css/
│   │   ├── data/
│   │   └── js/
│   ├── excel/
│   └── powerbi/
│
├── data/
│   ├── external/
│   ├── interim/          ← gerado pelos notebooks (fora do Git)
│   ├── processed/        ← base limpa, gerada pelos notebooks (fora do Git)
│   └── raw/
│       └── varejo.csv    ← original, somente leitura
│
├── docs/
│
├── notebooks/
│   ├── 01-diagnostico.ipynb
│   └── 03-diagnostico.ipynb
│
├── reports/
│   ├── apresentacoes/
│   ├── html/
│   ├── imagens/
│   └── pdf/
│
├── scripts/
│
├── src/
│   ├── analise/
│   ├── exportacao/
│   ├── ingestao/
│   ├── limpeza/
│   ├── transformacao/
│   ├── utils/
│   └── visualizacao/
│
├── tests/
│
├── .editorconfig
├── .gitattributes
├── .gitignore
├── CLAUDE.md
├── criar_estrutura.py
├── environment.yml
├── LICENSE
├── README.md
└── requirements.txt
```

---

# Instalação

O projeto funciona no **Windows 10** e no **Ubuntu**. O ambiente é gerenciado pelo **Anaconda** e fica fora da pasta do projeto; o repositório guarda apenas a receita (`environment.yml`).

Tempo estimado: 10 minutos.

## Windows 10 (Anaconda Prompt)

```bat
git clone <endereço-do-repositório> C:\Git\Projeto-Varejo
cd /d C:\Git\Projeto-Varejo
conda env create -f environment.yml
conda activate varejo
python -m ipykernel install --user --name varejo --display-name "Python (varejo)"
jupyter lab
```

## Ubuntu (terminal)

```bash
git clone <endereço-do-repositório> ~/Git/Projeto-Varejo
cd ~/Git/Projeto-Varejo
conda env create -f environment.yml
conda activate varejo
python -m ipykernel install --user --name varejo --display-name "Python (varejo)"
jupyter lab
```

## Sem Anaconda

Quem usa Python puro (3.11 ou superior) pode instalar pelo `requirements.txt`:

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Ubuntu:   source .venv/bin/activate
pip install -r requirements.txt
```

## Conferir o arquivo de dados

O arquivo original tem hash SHA-256 conhecido. Se o resultado for diferente, o arquivo foi alterado, quase sempre por ter sido aberto e salvo no Excel.

```bat
:: Windows 10
certutil -hashfile data\raw\varejo.csv SHA256
```

```bash
# Ubuntu
sha256sum data/raw/varejo.csv
```

Valor esperado: `446a6b0baefb04d93532ffbe5f86098cde09d68af1db152c8f4ba61c783796c7`

---

# Como executar

No Jupyter, com o núcleo **Python (varejo)** selecionado, execute os notebooks em ordem:

| Notebook | O que faz | Gera |
|---|---|---|
| `01-diagnostico.ipynb` | Inventário dos problemas do arquivo bruto, sem nenhuma correção | `docs/relatorio-qualidade.md` |
| `03-diagnostico.ipynb` | Limpeza completa em 10 fases | `data/processed/varejo_limpo.csv`, `.xlsx`, `.parquet` e `docs/log_limpeza.txt` |

## Saída esperada

Ao final do `03-diagnostico.ipynb`, o relatório da Fase 9 deve exibir:

```
Total de linhas: 1000
Clientes únicos: 245
Categorias: ['Bebidas', 'Frios', 'Higiene', 'Hortifruti', 'Limpeza', 'Mercearia', 'Padaria']
Valor total de vendas: R$ 109.344,37
```

Se o faturamento for diferente, confira o hash do arquivo de dados.

---

# Etapas do Projeto

* Limpeza dos Dados
* Organização
* Análise Exploratória
* Estatística
* Construção de KPIs
* Dashboards em Excel
* Dashboards em Python
* Dashboards em Power BI
* Dashboards em D3.js
* Machine Learning
* Previsão de Vendas

---

# Dataset

O projeto utiliza um conjunto de dados **fictício** de vendas no varejo, em formato CSV, gerado especificamente para fins de estudo.

> **Importante:** os dados não representam uma operação real. Os padrões encontrados na análise não devem ser lidos como comportamento de mercado. O objetivo do projeto é demonstrar o método de análise, não extrair conclusões de negócio.

O dataset representa operações comerciais contendo informações como:

* vendas
* clientes
* categorias
* canais de venda
* unidades federativas
* quantidade
* preço unitário
* descontos
* valor total

O conjunto de dados é mantido em sua versão original na pasta **data/raw**, com integridade verificável pelo hash SHA-256 informado na seção de instalação.

## Qualidade do arquivo bruto

O arquivo contém defeitos inseridos de propósito, para exercitar a limpeza:

| Problema | Ocorrências |
|---|---:|
| Células ausentes (vazias ou com marcadores como `--`, `?`, `sem informacao`) | 998 |
| Datas em formato `DD/MM/AAAA` misturadas a `AAAA-MM-DD` | 87 |
| Grafias diferentes para os mesmos valores (espaços e maiúsculas) | 31 para 7 categorias, 18 para 4 canais, 32 para 15 UFs |
| Clientes duplicados por grafia | 286 grafias para 245 clientes |
| Registros com vírgula decimal deslocada duas casas | 7 |

## Base limpa

Após o tratamento, a base mantém as **1.000 vendas** (nenhuma removida), sem valores nulos nem duplicatas. A regra `valor_total = quantidade × preço unitário × (1 − desconto)` passa a valer em todas as linhas.

As principais decisões de tratamento:

* Preços e descontos ausentes são **recalculados a partir da própria venda**, em vez de preenchidos pela média.
* Canal e UF ausentes recebem os rótulos **"Não informado"** e **"NI"**, em vez da categoria mais frequente, que distorceria a participação de cada canal e estado.
* Os 7 registros com vírgula deslocada são **corrigidos**, não removidos. Sem a correção, o faturamento ficaria inflado em 21,9%.
* Três colunas de origem (`preco_origem`, `desconto_origem`, `valor_origem`) indicam, em cada linha, se o valor é original, recalculado, estimado ou corrigido.

O registro completo de cada passo fica em `docs/log_limpeza.txt`.

---

# Limitações conhecidas

* **Não há coluna de custo**, portanto não há análise de margem ou lucro. As análises tratam de faturamento, volume e comportamento de compra.
* **1.000 transações** limitam cruzamentos detalhados (por exemplo, categoria × canal × estado), que ficam com poucas observações.
* **12 meses de histórico** não permitem capturar sazonalidade anual na previsão de vendas.
* **Cerca de um quarto das vendas não tem canal ou UF informados**; esses casos aparecem como "Não informado" e "NI" nos gráficos.
* **O Power BI Desktop não roda no Ubuntu.** Os dashboards dessa ferramenta exigem Windows.

---

# Entregáveis

O projeto produz os seguintes artefatos:

* Notebooks Jupyter
* Scripts Python
* Planilhas Excel
* Dashboards em Excel
* Dashboards em Power BI
* Dashboards em D3.js
* Relatórios em PDF

---

# Roadmap

## Fase 1 ✅

* Organização do projeto
* Estrutura do repositório
* Configuração do ambiente

## Fase 2 ✅

* Limpeza dos dados — concluída em `notebooks/03-diagnostico.ipynb`
  (base limpa em `data/processed/`, log em `docs/log_limpeza.txt`)

## Fase 3

* Análise Exploratória

## Fase 4

* Estatística Descritiva

## Fase 5

* Indicadores (KPIs)

## Fase 6

* Dashboards

## Fase 7

* Machine Learning

## Fase 8

* Previsão de Vendas

---

# Público-Alvo

Este projeto foi desenvolvido principalmente para:

* Portfólio profissional
* Estudos
* Demonstração de conhecimentos em Data Analytics
* Compartilhamento de boas práticas em análise de dados

---

# Uso de Inteligência Artificial

Este projeto foi desenvolvido com apoio do **Claude** (Anthropic) como assistente técnico, na revisão de código, na documentação e na avaliação de alternativas de tratamento. As decisões de tratamento foram revisadas e validadas pelo autor.

O arquivo `CLAUDE.md` reúne o contexto e as regras usadas pelo assistente ao longo do projeto.

---

# Licença

Este projeto está disponível sob a licença MIT.

---

# Autor

Projeto desenvolvido para fins de estudo, prática e construção de portfólio em Data Analytics.
