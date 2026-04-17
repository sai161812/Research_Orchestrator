# Orchestrix

**Multi-Agent Research Intelligence Platform**

Orchestrix is a client-side AI system where multiple specialized agents collaborate to turn a simple query into structured research insights.

Built in 48 hours.

---

## ⚡ What it does

Type anything:
- "AI in healthcare"
- "top papers on transformers"
- "Elon Musk"

Orchestrix will:
- Fetch real research papers
- Rank them intelligently
- Analyze trends and patterns
- Summarize key insights
- Generate citations
- Show everything with a live execution trace

---

## Core Idea

> One query → orchestrated research pipeline

This is **not a fixed pipeline**.

The system decides:
- what to run
- when to run it
- what to skip

---

## Orchestrator

- Uses Groq (LLaMA 3.3 70B) to classify query intent
- Builds execution plan dynamically
- Runs only required agents
- Shows live trace of every step

Example:
- Query → Classified → Discovery → Analysis → Summary

---

## Agents

### 1. Discovery Agent
- Semantic Scholar + arXiv
- Fetches + ranks papers
- Handles pagination

### 2. Analysis Agent
- Publication trends
- Top authors
- Keyword frequency
- Citation distribution
- Emerging topics

### 3. Citation Agent
- APA / MLA / IEEE
- Export: `.txt`, `.bib`

### 4. Summarization Agent
- Single paper summary
- Cross-paper synthesis

---

## Entity Mode

If user enters something like:


System:
- Detects it's an entity
- Expands into research topics (Tesla, SpaceX, AI…)
- Asks user to confirm before searching

---

## Execution Trace

Every step is visible:
[1] Query classified
[2] Topics extracted
[3] Discovery Agent executed
[4] Analysis completed
[5] Summary generated


---

## UI

- Deep black + indigo theme
- Collapsing hero section
- Premium paper cards
- Live trace panel (side)
- Interactive charts
- Session memory + comparison

---

## Tech Stack

- **Frontend:** Vite + React
- **Styling:** Tailwind CSS
- **AI:** Groq (llama-3.3-70b-versatile)
- **APIs:** Semantic Scholar, arXiv
- **Charts:** Recharts
- **Storage:** localStorage
- **Deploy:** Vercel

---


---

## ⚡ Setup

```bash
git clone https://github.com/sai161812/Research_Orchestrator
cd orchestrix
npm install

Create .env:

VITE_GROQ_API_KEY=your_key

Run:

npm run dev
