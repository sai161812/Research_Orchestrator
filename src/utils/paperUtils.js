const stopwords = new Set([
  "the", "a", "an", "of", "and", "for", "to", "in", "on", "at", "by", 
  "is", "as", "it", "with", "from", "that", "this", "which"
]);

export function normalizeText(str, removeStopwords = false) {
  if (!str) return "";
  let text = String(str)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (removeStopwords) {
    text = text.split(" ").filter(word => !stopwords.has(word)).join(" ");
  }
  return text;
}

export function computeTitleMatchScore(normalizedQuery, normalizedTitle) {
   if (!normalizedQuery || !normalizedTitle) return 0;
   
   const q = normalizedQuery.trim();
   const t = normalizedTitle.trim();
   
   if (q === t) return 1.0;
   
   // Penalize if length difference is too large to be an "exact" title match
   const lenRatio = Math.min(q.length, t.length) / Math.max(q.length, t.length);
   
   if (lenRatio > 0.8) {
       if (t.startsWith(q + " ") || t.startsWith(q + ":")) return 0.98;
       if (t.includes(q)) return 0.95;
   }
   
   const qWords = q.split(" ").filter(Boolean);
   if (qWords.length === 0) return 0;

   const tWords = t.split(" ").filter(Boolean);
   const matchedWords = qWords.filter(w => tWords.includes(w)).length;
   
   // Combine word match ratio with overall length ratio for more robust scoring
   const wordRatio = matchedWords / qWords.length;
   return (wordRatio * 0.8) + (lenRatio * 0.2);
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
    const titleKey = normalizeText(paper.title, false)

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
       const existingTitleKey = normalizeText(existing.title, false)
       if (existingTitleKey) byTitle.set(existingTitleKey, better)
    }
    
    if (doiKey) byDoi.set(doiKey, better)
    if (titleKey) byTitle.set(titleKey, better)
  }

  return deduped
}

export function hybridRank(paper, query) {
  // If explicitly marked as exact match during discovery, it's virtually guaranteed top
  if (paper.isExactMatch) {
    // Add small citation bias within 1000 range to prioritize original paper among duplicates
    const citationTieBreaker = Math.min((paper.citationCount || 0) / 1000000, 0.01);
    return 1000.0 + citationTieBreaker;
  }
  
  const literalQuery = normalizeText(query, false);
  const filteredQuery = normalizeText(query, true);
  const titleMatch = computeTitleMatchScore(literalQuery, paper.normalizedTitle || normalizeText(paper.title, false));
  
  const qWords = filteredQuery.split(" ").filter(Boolean);
  const abstractLower = (paper.abstract || "").toLowerCase();
  const kwMatches = qWords.filter(w => abstractLower.includes(w)).length;
  const keywordRelevance = qWords.length > 0 ? Math.min(kwMatches / qWords.length, 1.0) : 0;
  const citationsLog = Math.min(Math.log10((paper.citationCount || 0) + 1) / Math.log10(10000), 1.0);
  
  const currentYear = new Date().getFullYear();
  const age = currentYear - (paper.year || currentYear);
  const recencyScore = Math.max(0, 1 - age / 15); // Slightly softer recency bias
  
  const sourceQuality = paper.source === 'semanticscholar' ? 1.0 : 0.95; 
  
  // Weights tuned for title priority
  return (titleMatch * 0.5) + (keywordRelevance * 0.25) + (citationsLog * 0.15) + (recencyScore * 0.05) + (sourceQuality * 0.05);
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
