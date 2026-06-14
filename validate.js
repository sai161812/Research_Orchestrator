import { normalizeText, computeTitleMatchScore, deduplicateAndMerge, hybridRank } from './src/utils/paperUtils.js';

console.log("=== STARTING VALIDATION TESTS ===");

const papers = [
  { id: '1', title: 'Attention is all you need', citationCount: 50000, abstract: 'Transformer model.', source: 'semanticscholar' },
  { id: '2', title: 'Not attention', citationCount: 10, abstract: 'Something else.', source: 'semanticscholar' },
  { id: '3', title: 'Attention is all you need', citationCount: 100, abstract: 'Arxiv version!', source: 'arxiv' } // missing DOI, duplicate
];

papers.forEach(p => p.normalizedTitle = normalizeText(p.title, true));

const testQueries = [
  "attention is all you need",
  "bert pre training of deep bidirectional transformers",
  "resnet deep residual learning for image recognition"
];

let allPassed = true;

testQueries.forEach(query => {
  console.log(`\nTesting query: "${query}"`);
  const nQuery = normalizeText(query, true);
  
  if (query === "attention is all you need") {
    let maxScore = -1;
    let exactFound = false;
    papers.forEach(p => {
        const score = computeTitleMatchScore(nQuery, p.normalizedTitle);
        console.log(`  - Title: "${p.title}" | Normalized: "${p.normalizedTitle}" | Score: ${score.toFixed(2)}`);
        if (score > maxScore) maxScore = score;
        if (score >= 0.85) exactFound = true;
    });
    
    if (exactFound) {
       console.log("  ✅ Exact match properly detected.");
    } else {
       console.log("  ❌ FAILED to detect exact match.");
       allPassed = false;
    }
  } else {
    // For the other cases, just check if computeTitleMatchScore yields 1.0 against identical titles
    const score = computeTitleMatchScore(nQuery, normalizeText(query, true));
    if (score >= 0.85) {
       console.log(`  ✅ Score for identical generated title: ${score}`);
    } else {
       console.log(`  ❌ FAILED to detect identical title. Score: ${score}`);
       allPassed = false;
    }
  }
});

// Test Deduplication
console.log("\n=== Testing Deduplication ===");
const deduped = deduplicateAndMerge(papers);
if (deduped.length === 2 && deduped.find(p => p.id === '1').abstract === 'Transformer model.') {
   console.log("  ✅ Deduplication successfully merged 'Attention is all you need' preferring SS due to higher citations.");
} else {
   console.log("  ❌ Deduplication FAILED.");
   console.log(deduped);
   allPassed = false;
}

if (allPassed) {
  console.log("\n✅ ALL VALIDATION TESTS PASSED!");
} else {
  console.log("\n❌ VALIDATION TESTS FAILED!");
}
