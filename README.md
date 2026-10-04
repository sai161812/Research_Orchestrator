<h1 align="center">Orchestrix</h1>

<p align="center">
  <strong>Multi-Agent Research Intelligence Platform</strong><br/>
  <em>Discover papers, analyze trends, generate citations, and synthesize insights — all orchestrated by autonomous AI agents.</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-agents">Agents</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## ✨ Features

### 🔬 Intelligent Research Pipeline
- **Natural language queries** — ask anything from broad topics to exact paper titles
- **Intent classification** — hybrid rule-based + LLM classifier routes queries through the optimal pipeline
- **Automatic query expansion** — generates complementary sub-queries via Groq LLM to maximize paper coverage
- **Entity detection** — recognizes researchers, organizations, and concepts, then auto-extracts related sub-topics

### 📄 Multi-Source Paper Discovery
- **Dual-source fetching** — concurrent retrieval from [Semantic Scholar](https://www.semanticscholar.org/) and [arXiv](https://arxiv.org/)
- **Exact title matching** — fast-path lookup via Semantic Scholar's match endpoint for precise title queries
- **Smart deduplication** — DOI + normalized title matching across sources with metadata merging
- **Hybrid ranking** — composite scoring based on title match, keyword relevance, citation impact, recency, and source quality

### 📊 Analytics Dashboard
- **Publication volume trends** — year-over-year research output visualization
- **Top contributing authors** — most prolific researchers in your result set
- **Keyword & topic frequency** — treemap of dominant terms across abstracts
- **Citation impact distribution** — bucketed histogram of citation counts
- **Emerging sub-topics** — trending terms from papers published in the last 2 years

### 📝 Citation Generation
- **5 citation formats** — APA, MLA, IEEE, Chicago, and BibTeX generated instantly for every paper
- **One-click copy** — copy any citation to clipboard
- **Bulk export** — download all citations as `.txt` or `.bib` files
- **Session reports** — export full research reports as plain text or print-ready PDF

### 🎓 AI Mentor ("Mentor Me")
- **Learning path generation** — LLM-powered prerequisite analysis for any paper
- **Key concepts glossary** — plain-English explanations of foundational concepts
- **Step-by-step curriculum** — ordered learning path from fundamentals to the paper's advanced topics

### 🧠 Paper Intelligence
- **AI-powered summaries** — short, medium, or detailed structured summaries via Groq
- **Paper comparison** — side-by-side LLM-driven comparison of any two papers
- **Multi-paper synthesis** — cross-paper thematic analysis identifying common themes, differences, and gaps
- **Smart filtering** — filter results by year, citation count, and sort order

### 💾 Session Persistence
- **Auto-save** — every research session is automatically saved to `localStorage`
- **Session management** — load, delete, annotate, and compare past sessions
- **Session comparison** — side-by-side metric comparison of any two sessions
- **Execution trace** — real-time transparency into every agent decision and API call

---

## 🏗 Architecture

Orchestrix follows a **multi-agent orchestration** pattern where a central Orchestrator coordinates specialized agents through a defined pipeline:

```
┌─────────────────────────────────────────────────────────┐
│                      USER QUERY                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    ORCHESTRATOR     │
              │  Intent Classifier  │
              │  Query Expander     │
              │  Pipeline Router    │
              └────┬───┬───┬───┬───┘
                   │   │   │   │
        ┌──────────┘   │   │   └──────────┐
        ▼              ▼   ▼              ▼
  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ DISCOVERY │  │ ANALYSIS │  │ CITATION │  │  SUMMARY │
  │   Agent   │  │   Agent  │  │   Agent  │  │   Agent  │
  │           │  │          │  │          │  │          │
  │• S2 API   │  │• Trends  │  │• APA     │  │• Groq    │
  │• arXiv    │  │• Authors │  │• MLA     │  │• Compare │
  │• Match    │  │• Keywords│  │• IEEE    │  │• Synth.  │
  │• Dedup    │  │• Citations│ │• BibTeX  │  │• Mentor  │
  └───────────┘  └──────────┘  └──────────┘  └──────────┘
        │              │             │              │
        └──────────────┴─────────────┴──────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   SESSION STORE     │
              │   (localStorage)    │
              └─────────────────────┘
```

### Query Flow

1. **Intent Classification** — The Orchestrator classifies the query as `title`, `topic`, or `entity` using a rule-based classifier with LLM fallback via Groq
2. **Query Expansion** — For topic queries, the LLM generates two complementary sub-queries to broaden paper coverage
3. **Parallel Discovery** — The Discovery Agent fetches papers concurrently from Semantic Scholar and arXiv, with exact-match fast paths for title queries
4. **Deduplication & Ranking** — Results are merged, deduplicated by DOI/title, and scored using a hybrid ranking algorithm
5. **Smart Fallback** — If results are weak, the Orchestrator automatically pivots to entity-mode and extracts fallback sub-topics
6. **Analysis & Citation** — The Analysis Agent computes bibliometric analytics while the Citation Agent generates formatted citations
7. **Session Persistence** — All results, analyses, and traces are persisted to `localStorage` for future retrieval

---

## 🤖 Agents

| Agent | Responsibility | Engine |
|-------|---------------|--------|
| **Orchestrator** | Intent classification, query expansion, pipeline routing, fallback logic | Rule-based + Groq LLaMA 3.3 70B |
| **Discovery Agent** | Multi-source paper retrieval, exact title matching, deduplication | Semantic Scholar API, arXiv API |
| **Analysis Agent** | Publication trends, top authors, keyword frequency, citation distribution, emerging topics | Local computation |
| **Citation Agent** | APA/MLA/IEEE/Chicago/BibTeX generation, TXT/BIB/PDF export | Local computation |
| **Summarization Agent** | Paper summaries (short/medium/detailed), paper comparison, multi-paper synthesis | Groq LLaMA 3.3 70B |
| **Learning Agent** | Prerequisite extraction, learning path generation, concept glossary | Groq LLaMA 3.3 70B |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.19+ on the 20.x line, or 22.12+ (required by the locked Vite 8 and React plugin dependencies)
- **npm** ≥ 9
- A free **Groq API key** — [get one here](https://console.groq.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/sai161812/Research_Orchestrator.git
cd Research_Orchestrator

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
```

Edit `.env` and add your Groq API key:

```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

On PowerShell, create the environment file with `Copy-Item .env.example .env`.

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`. The Vite dev server automatically proxies requests to the Semantic Scholar and arXiv APIs, so no additional backend setup is needed.

### Verify the checkout

```bash
npm run lint
npm run build
```

These check lint rules and bundle generation. They do not establish paper-retrieval accuracy or end-to-end research quality; `package.json` currently defines no automated test script.

### Production Build

```bash
npm run build
npm run preview
```

`npm run preview` serves the built frontend. The paper API proxies are configured for the Vite development server and Vercel functions; preview does not start those functions, so use `npm run dev` for local paper-search testing.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 with Vite 8 |
| **Styling** | Tailwind CSS 4 |
| **Routing** | React Router v7 |
| **Charts** | Recharts |
| **LLM** | Groq Cloud (LLaMA 3.3 70B Versatile) |
| **Paper APIs** | Semantic Scholar Graph API, arXiv API |
| **State** | localStorage (zero-dependency persistence) |
| **Deployment** | Vercel (Serverless Functions for API proxies) |

---

## 📁 Project Structure

```
orchestrix/
├── api/                          # Vercel Serverless Functions
│   ├── arxiv.js                  #   arXiv API proxy
│   └── semantic-scholar.js       #   Semantic Scholar API proxy
├── public/                       # Static assets
├── src/
│   ├── agents/                   # Autonomous agent modules
│   │   ├── AnalysisAgent.js      #   Bibliometric analysis engine
│   │   ├── CitationAgent.js      #   Citation formatting & export
│   │   ├── DiscoveryAgent.js     #   Multi-source paper retrieval
│   │   ├── LearningAgent.js      #   AI Mentor learning paths
│   │   └── SummarizationAgent.js #   LLM-powered summarization
│   ├── components/               # React UI components
│   │   ├── charts/               #   Recharts visualizations
│   │   │   ├── AuthorsChart.jsx
│   │   │   ├── CitationChart.jsx
│   │   │   ├── EmergingTopics.jsx
│   │   │   ├── KeywordChart.jsx
│   │   │   └── TrendChart.jsx
│   │   ├── EntityConfirm.jsx     #   Entity disambiguation UI
│   │   ├── FilterBar.jsx         #   Smart result filtering
│   │   ├── Hero.jsx              #   Animated hero section
│   │   ├── MentorPanel.jsx       #   AI Mentor slide-over panel
│   │   ├── Navbar.jsx            #   Navigation bar
│   │   ├── PaperCard.jsx         #   Rich paper result card
│   │   ├── SearchBar.jsx         #   Search input component
│   │   └── TracePanel.jsx        #   Real-time execution trace
│   ├── orchestrator/
│   │   └── Orchestrator.js       # Central orchestration engine
│   ├── pages/
│   │   ├── DashboardPage.jsx     #   Analytics dashboard
│   │   ├── ResearchPage.jsx      #   Main research interface
│   │   └── SessionsPage.jsx      #   Session management
│   ├── store/
│   │   ├── sessionStore.js       #   Session persistence (localStorage)
│   │   └── traceStore.js         #   Execution trace state
│   ├── utils/
│   │   ├── paperUtils.js         #   Dedup, ranking, filtering utilities
│   │   └── schema.js             #   Data model definitions
│   ├── App.jsx                   # Root component with routing
│   ├── App.css                   # Global styles
│   ├── index.css                 # Base styles
│   └── main.jsx                  # Entry point
├── .env.example                  # Environment variable template
├── vercel.json                   # Vercel deployment config
├── vite.config.js                # Vite + proxy configuration
└── package.json
```

---

## ☁️ Deployment

The current build is a prototype. **`VITE_GROQ_API_KEY` is embedded in the client bundle and sent directly from the browser to Groq.** A hosting environment variable does not make a `VITE_` key private. Before publishing a shared deployment, move Groq calls behind a server endpoint that holds the credential and enforces authentication and usage limits; that endpoint is not implemented here.

For a controlled prototype deployment on **Vercel**:

1. Push the repository to GitHub
2. Import it in [Vercel Dashboard](https://vercel.com/new)
3. Add the environment variable: `VITE_GROQ_API_KEY`
4. Deploy — Vercel auto-detects the Vite framework and configures serverless functions from the `api/` directory

The `vercel.json` rewrites ensure that `/api/*` routes are handled by the serverless proxy functions, while the Vite dev server proxy handles the same routes locally.

---

## 📄 License

No `LICENSE` file is currently checked in. Public source availability does not establish an MIT license; reuse terms need an explicit license file.

---

*Built with ❤️ for researchers, by researchers.*
