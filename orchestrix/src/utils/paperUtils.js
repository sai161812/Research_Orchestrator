const stopwords = new Set(["the", "a", "an", "of", "and", "for", "to", "in"]);

export function normalizeText(str, removeStopwords = true) {
  if (!str) return "";
  let text = String(str).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (removeStopwords) {
    text = text.split(" ").filter(word => !stopwords.has(word)).join(" ");
  }
  return text;
}

export function computeTitleMatchScore(normalizedQuery, normalizedTitle) {
   if (!normalizedQuery || !normalizedTitle) return 0;
   
   if (normalizedQuery === normalizedTitle) return 1.0;
   if (normalizedTitle.includes(normalizedQuery)) return 0.9;
   
   const qWords = normalizedQuery.split(" ").filter(Boolean);
   if (qWords.length === 0) return 0;

   const matchedWords = qWords.filter(w => normalizedTitle.split(" ").includes(w)).length;
   return matchedWords / qWords.length;
}

export function normalizeDoi(doi = '') {
  return String(doi)
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .trim()
}

export function mergePaperData(current, candidate) {
  const currentCitations = current?.citationCount || 0
  const candidateCitations = candidate?.citationCount || 0
  
  const better = candidateCitations > currentCitations ? { ...candidate } : { ...current }
  const other = better.id === current.id ? candidate : current
  
  if (!better.abstract || better.abstract === 'No abstract available.') {
     better.abstract = other.abstract || 'No abstract available.'
  }
  if (!better.doi && other.doi) {
     better.doi = other.doi
  }
  
  if ((current && current.isExactMatch) || (candidate && candidate.isExactMatch)) {
     better.isExactMatch = true
  }
  
  return better
}

export function deduplicateAndMerge(papers) {
  const byDoi = new Map()
  const byTitle = new Map()
  const deduped = []

  for (const paper of papers) {
    const doiKey = normalizeDoi(paper.doi)
    const titleKey = normalizeText(paper.title, true)

    let existing = null
    if (doiKey && byDoi.has(doiKey)) existing = byDoi.get(doiKey)
    else if (titleKey && byTitle.has(titleKey)) existing = byTitle.get(titleKey)

    if (!existing) {
      deduped.push(paper)
      if (doiKey) byDoi.set(doiKey, paper)
      if (titleKey) byTitle.set(titleKey, paper)
      continue
    }

    const better = mergePaperData(existing, paper)
    
    const idx = deduped.findIndex(p => p.id === existing.id || p === existing)
    if (idx >= 0) deduped[idx] = better
    
    if (existing.doi) {
       const existingDoiKey = normalizeDoi(existing.doi)
       if (existingDoiKey) byDoi.set(existingDoiKey, better)
    }
    if (existing.title) {
       const existingTitleKey = normalizeText(existing.title, true)
       if (existingTitleKey) byTitle.set(existingTitleKey, better)
    }
    
    if (doiKey) byDoi.set(doiKey, better)
    if (titleKey) byTitle.set(titleKey, better)
  }

  return deduped
}

export function hybridRank(paper, query) {
  if (paper.isExactMatch) return 1000.0;
  
  const normQuery = normalizeText(query, true);
  const titleMatch = computeTitleMatchScore(normQuery, paper.normalizedTitle || normalizeText(paper.title, true));
  
  const qWords = normQuery.split(" ").filter(Boolean);
  const kwMatches = qWords.filter(w => (paper.abstract || "").toLowerCase().includes(w)).length;
  const keywordRelevance = qWords.length > 0 ? Math.min(kwMatches / qWords.length, 1.0) : 0;
  const citationsLog = Math.min(Math.log10((paper.citationCount || 0) + 1) / Math.log10(10000), 1.0);
  
  const currentYear = new Date().getFullYear();
  const age = currentYear - (paper.year || currentYear);
  const recencyScore = Math.max(0, 1 - age / 10);
  
  const sourceQuality = 1.0; // Level the playing field for preprint sources
  
  return (titleMatch * 0.4) + (keywordRelevance * 0.35) + (citationsLog * 0.1) + (recencyScore * 0.1) + (sourceQuality * 0.05);
}

export function applySmartFilters(papers, filters) {
  let filtered = [...papers];
  
  if (filters?.minYear) {
      filtered = filtered.filter(p => !p.year || p.year >= filters.minYear);
  }
  if (filters?.minCitations) {
      filtered = filtered.filter(p => (p.citationCount || 0) >= filters.minCitations);
  }
  
  if (filters?.sortBy === 'citations') {
      filtered.sort((a,b) => (b.citationCount || 0) - (a.citationCount || 0));
  } else if (filters?.sortBy === 'recency') {
      filtered.sort((a,b) => (b.year || 0) - (a.year || 0));
  } else {
      // Default semantic ranking
      filtered.sort((a,b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }
  
  return filtered;
}
