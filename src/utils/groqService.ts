import type { QuizResult, GapAnalysis, MicroLearningStep, GeneratedQA, ChatMessage, Difficulty, Question, Domain } from '../types';
import { DOMAINS } from '../data/domains';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: 'wikipedia' | 'ddg' | 'mock';
}

const WEB_SEARCH_ENABLED = true;
const MAX_SEARCH_RESULTS = 5;

export const GROQ_MODELS = {
  LLAMA_3_70B: 'llama-3.1-70b-versatile',
  MIXTRAL_8X7B: 'mixtral-8x7b-32768',
} as const;

export const DEFAULT_MODEL = GROQ_MODELS.LLAMA_3_70B;

const MAX_INPUT_TOKENS = 6000;
const MAX_OUTPUT_TOKENS = 2048;

export function hasGroqApiKey(): boolean {
  return Boolean(GROQ_API_KEY && typeof GROQ_API_KEY === 'string' && GROQ_API_KEY.trim().length > 0);
}

function truncateText(text: string, maxChars: number = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n...[truncated]';
}

export function sanitizeInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

const MOCK_WEB_RESULTS: Record<string, WebSearchResult[]> = {
  default: [
    { title: 'Wikipedia — Tutorial & Fundamentals', snippet: 'A conceptual foundations and  concepts build on first principles and worked examples from standard curriculum. Many reference guides', url: 'https://en.wikipedia.org/wiki/Outline_of_academic_disciplines', source: 'mock' },
    { title: 'Interactive guide to Learning resource', snippet: 'explains foundational theory with examples, applications, and self-check questions. answers', url: 'https://example.com/learn', source: 'mock' },
  ],
};

async function searchWikipedia(query: string, signal: AbortSignal): Promise<WebSearchResult[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&origin=*&format=json`;
  try {
    const resp = await fetch(url, { signal });
    const data = await resp.json();
    const titles: string[] = data[1] ?? [];
    const descriptions: string[] = data[2] ?? [];
    const links: string[] = data[3] ?? [];
    return titles
      .map((title, i) => ({
        title,
        snippet: descriptions[i] ?? '',
        url: links[i] ?? '',
        source: 'wikipedia' as const,
      }))
      .filter(r => r.title && r.url)
      .slice(0, MAX_SEARCH_RESULTS);
  } catch {
    return [];
  }
}

async function searchDuckDuckGo(query: string, signal: AbortSignal): Promise<WebSearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`;
  try {
    const resp = await fetch(url, { signal });
    const data = await resp.json();
    const results: WebSearchResult[] = [];
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query, snippet: data.AbstractText, url: data.AbstractURL, source: 'ddg' });
    }
    const topics: Array<{ Text?: string; FirstURL?: string }> = data.RelatedTopics ?? [];
    for (const t of topics.slice(0, 3)) {
      if (t.Text && t.FirstURL) results.push({ title: query, snippet: t.Text, url: t.FirstURL, source: 'ddg' });
    }
    return results.slice(0, MAX_SEARCH_RESULTS);
  } catch {
    return [];
  }
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const q = sanitizeInput(query.trim());
  if (!q) return [];
  if (!WEB_SEARCH_ENABLED) return MOCK_WEB_RESULTS.default;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const [wiki, ddg] = await Promise.allSettled([
      searchWikipedia(q, controller.signal),
      searchDuckDuckGo(q, controller.signal),
    ]);
    const wikiResults = wiki.status === 'fulfilled' ? wiki.value : [];
    const ddgResults = ddg.status === 'fulfilled' ? ddg.value : [];
    const combined: WebSearchResult[] = [...wikiResults, ...ddgResults];
    if (combined.length === 0) return MOCK_WEB_RESULTS.default;
    return combined.slice(0, MAX_SEARCH_RESULTS);
  } catch {
    return MOCK_WEB_RESULTS.default;
  } finally {
    clearTimeout(timeout);
  }
}

export function formatSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) return '';
  const lines = results.map((r, i) => '[' + (i + 1) + '] ' + r.title + ' — ' + r.snippet + ' (' + r.url + ')');
  return (
    '\nREFERENCES (from web search — cite these when helpful):\n' +
    lines.join('\n') +
    '\n'
  ).trim();
}

interface GapAnalysisInput {
  wrongAnswers: QuizResult[];
  domain: string;
  currentDifficulty: Difficulty;
  accuracy: number;
}

const MOCK_GAP_ANALYSES: Record<string, GapAnalysis> = {
  mathematics: {
    rootGap: 'Algebraic manipulation — the learner struggles with isolating variables and applying inverse operations systematically.',
    weakConcept: 'Equation Solving & Inverse Operations',
    microPlan: [
      { title: 'Review: Inverse Operations', description: 'Reinforce that each operation has an inverse (↔+/-, ×/÷). Practice isolating x in one-step equations.', resource: 'Interactive: One-step equation solver' },
      { title: 'Two-Step Equations Drill', description: 'Build muscle memory for order: subtract constant first, then divide by coefficient. Complete 10 guided problems.', resource: 'Practice set: 10 two-step equations' },
      { title: 'Apply to Real-World', description: 'Translate word problems into equations. Focus on identifying the unknown and setting up the equation correctly.', resource: 'Word problem workshop: 5 scenarios' },
    ],
    confidence: 0.82,
  },
  python: {
    rootGap: 'Data structure semantics — confusion between mutable vs immutable types and how default arguments behave across calls.',
    weakConcept: 'Mutable Defaults & Object Mutability',
    microPlan: [
      { title: 'Mutability Fundamentals', description: 'Understand lists/dicts are mutable (shared reference), tuples/strings are immutable. Trace memory references visually.', resource: 'Visualizer: Python Tutor memory diagram' },
      { title: 'The Default Argument Trap', description: 'Learn why b=[] in function signatures persists. Practice using None + conditional initialization as the safe pattern.', resource: 'Code lab: Fix 5 buggy functions' },
      { title: 'Copy vs Reference', description: 'Distinguish shallow vs deep copy. When does modifying a list affect the original? Practice with copy.copy() and copy.deepcopy().', resource: 'Exercise: 8 copy/reference scenarios' },
    ],
    confidence: 0.79,
  },
  'data-science': {
    rootGap: 'Model evaluation intuition — difficulty distinguishing training performance from generalization, and understanding why we hold out data.',
    weakConcept: 'Generalization & Overfitting Detection',
    microPlan: [
      { title: 'The Overfitting Story', description: 'Visualize a model fitting training data perfectly but failing on new data. Understand the bias-variance decomposition intuitively.', resource: 'Interactive: Overfitting visual demo' },
      { title: 'Train/Validation/Test Deep Dive', description: 'Practice splitting datasets. Understand when to use a validation set vs cross-validation. Implement a k-fold split from scratch.', resource: 'Lab: Build your own k-fold CV' },
      { title: 'Diagnosing Model Health', description: 'Learn to read learning curves. High train acc + low test acc = overfit. Both low = underfit. Practice interpreting 5 curve scenarios.', resource: 'Curve interpretation quiz: 10 plots' },
    ],
    confidence: 0.85,
  },
};

const MOCK_QA: GeneratedQA[] = [
  { question: 'What is the key difference between supervised and unsupervised learning, and when would you choose each?', answer: 'Supervised learning uses labeled data (input-output pairs) to learn a mapping, used for prediction/classification. Unsupervised learning uses unlabeled data to discover patterns, used for clustering/dimensionality reduction. Choose supervised when you have labeled data and a clear prediction target; unsupervised when exploring unknown structure.' },
  { question: 'Explain the bias-variance tradeoff in your own words. What happens at the extremes?', answer: 'Bias is error from wrong assumptions (underfitting); variance is error from sensitivity to training data (overfitting). High bias + low variance = simple model that consistently misses. Low bias + high variance = complex model that memorizes noise. The goal is a sweet spot minimizing total error.' },
  { question: 'Why is cross-validation preferred over a single train/test split for model evaluation?', answer: 'Cross-validation uses multiple splits, reducing the variance of the performance estimate. A single split can be unrepresentative if the split is unlucky. K-fold CV ensures every data point is in the test set once, giving a more robust generalization estimate.' },
];

const MOCK_SUMMARY: Record<string, string> = {
  default: `📚 Document Summary

🔑 Key Points:
• Core concepts are clearly defined with practical examples
• Progressive difficulty builds from fundamentals to advanced applications
• Emphasis on hands-on practice and real-world problem-solving
• Visual aids supplement theoretical explanations

💡 Main Takeaways:
1. Mastery comes through deliberate practice with immediate feedback
2. Connect abstract concepts to concrete scenarios
3. Spaced repetition improves long-term retention

📝 Suggested Next Steps:
• Review bold/italicized sections for high-yield information
• Attempt end-of-chapter problems to reinforce understanding
• Teach back the material to identify remaining gaps`,
};

function mockSocraticResponse(userMessage: string, history: ChatMessage[]): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || history.length <= 1) {
    return "Hello! I'm your Socratic learning companion. Instead of giving you answers directly, I'll guide you to discover them yourself. What topic are you working on, and what do you already know about it?";
  }

  if (lower.includes('derivative') || lower.includes('calculus')) {
    return "Great that you're thinking about derivatives! Let me ask: if a car's position at time t is given by s(t) = t², what do you think the instantaneous velocity at a specific moment represents? And how might you approximate it using positions at two very close time points?";
  }

  if (lower.includes('python') || lower.includes('list') || lower.includes('function')) {
    return "Let's explore that together. Consider: what happens in memory when you do `a = [1,2,3]` and then `b = a`? If you append to `b`, does `a` change? Why do you think that is? Think about what `=` actually does in Python.";
  }

  if (lower.includes('data') || lower.includes('model') || lower.includes('machine learning')) {
    return "Interesting question! Before I guide you — imagine you trained a model that gets 99% accuracy on training data but 60% on test data. What does that tell you about what the model learned? Is it learning the underlying pattern, or something else?";
  }

  if (lower.includes('don\'t know') || lower.includes('not sure') || lower.includes('confused')) {
    return "That's perfectly okay — confusion is where learning begins! Let's break it down. Can you tell me what part feels most unclear? Is it the concept itself, the notation, or how to apply it? Sometimes starting with a concrete example helps. What's a simple real-world scenario where this concept might appear?";
  }

  return `That's a thoughtful question. Let me turn it back to you: what do you think the answer might be, based on what you've learned so far? Even a partial intuition helps me guide you better. What part of this topic feels most familiar to you?`;
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

let requestCount = 0;
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60000;
const requestTimestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = requestTimestamps.filter(t => t >= windowStart);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  requestTimestamps.push(now);
  requestCount++;
  return true;
}

export function getRateLimitInfo(): { remaining: number; total: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = requestTimestamps.filter(t => t >= windowStart);
  return { remaining: RATE_LIMIT_MAX - recent.length, total: RATE_LIMIT_MAX };
}

async function callGroq(
  messages: GroqMessage[],
  temperature: number = 0.7,
  model: string = DEFAULT_MODEL,
  maxTokens: number = MAX_OUTPUT_TOKENS
): Promise<string> {
  if (!hasGroqApiKey()) {
    throw new Error('GROQ_API_KEY not configured');
  }

  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again in a moment.');
  }

  let retries = 2;
  let lastError: unknown;

  while (retries >= 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 429) {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 2000));
          retries--;
          continue;
        }
        throw new Error('Groq rate limited (429). Using demo responses.');
      }

      if (res.status === 401) {
        throw new Error('Invalid GROQ_API_KEY. Please check your configuration.');
      }

      if (!res.ok) {
        throw new Error(`Groq API error: ${res.status} ${res.statusText}`);
      }

      const data: GroqResponse = await res.json();
      if (data.error?.message) {
        throw new Error(`Groq error: ${data.error.message}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from Groq API');
      }
      return content.trim();
    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.name === 'AbortError') {
        if (retries > 0) {
          retries--;
          continue;
        }
        throw new Error('Request timed out. Please try again.');
      }
      retries--;
      if (retries < 0) break;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Groq API call failed');
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const toParse = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    return JSON.parse(toParse) as T;
  } catch {
    return fallback;
  }
}

export async function analyzeGaps(input: GapAnalysisInput): Promise<GapAnalysis> {
  const fallbackGap = MOCK_GAP_ANALYSES[input.domain] ?? MOCK_GAP_ANALYSES.mathematics;

  if (!hasGroqApiKey()) {
    return Promise.resolve(fallbackGap);
  }

  const wrongSummary = input.wrongAnswers.map(w => ({
    concept: w.concept,
    difficulty: w.difficulty,
    responseTimeSec: Math.round(w.responseTimeMs / 1000),
    chosenAnswer: w.selectedIndex,
  }));

  const systemPrompt = `You are an expert educational AI analyzing a student's quiz performance.

TASK: Identify the ROOT knowledge gap (not just surface errors) and generate a 3-step personalized micro-learning plan.

CRITICAL RULES:
- Respond ONLY as valid JSON. No markdown, no prose, no explanation outside JSON.
- rootGap: 1-2 sentences identifying the underlying misunderstanding
- weakConcept: the specific concept name that needs remediation
- microPlan: EXACTLY 3 steps, each with title, description, resource
- confidence: number between 0.0 and 1.0

JSON Schema:
{
  "rootGap": "string",
  "weakConcept": "string",
  "microPlan": [
    {"title": "string", "description": "string", "resource": "string"},
    {"title": "string", "description": "string", "resource": "string"},
    {"title": "string", "description": "string", "resource": "string"}
  ],
  "confidence": 0.85
}`;

  const userPrompt = `STUDENT PERFORMANCE DATA:
Domain: ${input.domain}
Current Difficulty: ${input.currentDifficulty}
Overall Accuracy: ${input.accuracy}%
Wrong Answers Summary: ${JSON.stringify(wrongSummary)}

Analyze the root knowledge gap and create a 3-step micro-learning plan. Output ONLY valid JSON.`;

  try {
    const content = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.4,
      GROQ_MODELS.LLAMA_3_70B,
      1024
    );

    const parsed = safeParseJson<Partial<GapAnalysis>>(content, null as unknown as Partial<GapAnalysis>);
    if (!parsed || !parsed.rootGap || !parsed.weakConcept || !Array.isArray(parsed.microPlan)) {
      return fallbackGap;
    }

    return {
      rootGap: String(parsed.rootGap),
      weakConcept: String(parsed.weakConcept),
      microPlan: (parsed.microPlan as MicroLearningStep[]).slice(0, 3).map((s: MicroLearningStep) => ({
        title: String(s.title),
        description: String(s.description),
        resource: String(s.resource),
      })),
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.8,
    };
  } catch {
    return fallbackGap;
  }
}

export interface TutorResponse {
  content: string;
  sources: WebSearchResult[];
  usedSearch: boolean;
}

export async function generateSocraticResponse(
  userMessage: string,
  history: ChatMessage[],
  useWebSearch: boolean = false
): Promise<TutorResponse> {
  const safeMessage = sanitizeInput(userMessage);

  if (!hasGroqApiKey()) {
    return {
      content: mockSocraticResponse(safeMessage, history),
      sources: useWebSearch ? MOCK_WEB_RESULTS.default : [],
      usedSearch: useWebSearch,
    };
  }

  const sources: WebSearchResult[] = useWebSearch ? await searchWeb(safeMessage) : [];
  const searchContext = sources.length > 0 ? formatSearchContext(sources) : '';

  const systemPrompt = `You are a Socratic tutor for an EdTech platform.

STRICT RULES:
1. NEVER give direct answers. NEVER solve problems for the student.
2. ALWAYS guide through targeted questions, analogies, and incremental hints.
3. Be encouraging and warm. Use 2-4 sentences max.
4. ALWAYS end with a specific question that moves the student forward.
5. Adapt to their level: if stuck, simplify and give a concrete example; if confident, challenge them.
6. If student says "I don't know", validate that confusion is good learning, then give a small concrete hint and ask a simpler question.
7. Do NOT mention that you are an AI or use phrases like "as an AI". Be a human tutor.
${searchContext ? `8. If helpful, ground your hints in the REFERENCES web snippets below. You may cite a numbered source like [1] [2] when referring to a snippet.

${searchContext}
` : ''}
Good Socratic response pattern:
- Affirm their attempt / validate confusion
- Provide a small hint, analogy, or simplified example
- Ask a specific next question

Bad response pattern (do NOT do this):
- Gives step-by-step solution
- Just says "correct" or "wrong" without guidance
- Ends without a question`;

  const recentHistory: GroqMessage[] = history.slice(-8).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: sanitizeInput(m.content),
  }));

  try {
    const content = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: safeMessage },
      ],
      0.7,
      GROQ_MODELS.LLAMA_3_70B,
      1024
    );
    return { content, sources, usedSearch: useWebSearch };
  } catch {
    return {
      content: mockSocraticResponse(safeMessage, history),
      sources,
      usedSearch: useWebSearch,
    };
  }
}

export async function generatePracticeQA(notes: string): Promise<GeneratedQA[]> {
  const safeNotes = sanitizeInput(truncateText(notes, 8000));

  if (!hasGroqApiKey()) {
    return Promise.resolve(MOCK_QA);
  }

  const systemPrompt = `You are an expert educator. Given study notes, generate practice Q&A pairs.

RULES:
- Generate EXACTLY 3 Q&A pairs
- Questions must TEST UNDERSTANDING, not just memorization
- Questions should ask for explanation, comparison, application, or analysis
- Answers should be thorough (3-5 sentences) but concise
- Output ONLY as valid JSON, no markdown, no extra text

JSON Schema:
{
  "questions": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}`;

  const userPrompt = `STUDY NOTES:
${safeNotes}

Generate exactly 3 practice Q&A pairs that test deep understanding. Output ONLY valid JSON.`;

  try {
    const content = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.5,
      GROQ_MODELS.MIXTRAL_8X7B,
      1536
    );

    const parsed = safeParseJson<{ questions?: GeneratedQA[] }>(content, { questions: MOCK_QA });
    const qas = (parsed.questions ?? MOCK_QA).slice(0, 3).map((qa: GeneratedQA) => ({
      question: String(qa.question),
      answer: String(qa.answer),
    }));
    return qas.length === 3 ? qas : MOCK_QA;
  } catch {
    return MOCK_QA;
  }
}

export async function summarizeDocument(text: string): Promise<string> {
  const safeText = sanitizeInput(truncateText(text, 24000));

  if (!hasGroqApiKey()) {
    return Promise.resolve(MOCK_SUMMARY.default);
  }

  const systemPrompt = `You are an expert academic summarizer. Create a clear, actionable document summary.

STRUCTURE YOUR RESPONSE EXACTLY LIKE THIS:

📚 Document Summary

🔑 Key Points:
• [point 1]
• [point 2]
• [point 3]
• [add more as needed]

💡 Main Takeaways:
1. [takeaway 1]
2. [takeaway 2]
3. [takeaway 3]

📝 Suggested Next Steps:
• [action step 1]
• [action step 2]
• [action step 3]

RULES:
- Be thorough but concise. Aim for 250-400 words total.
- Use bullet points, never long paragraphs.
- Prioritize: core concepts → examples → applications.
- Ignore formatting artifacts, headers, page numbers.
- NEVER make up information not in the document.
- Write in a clear, study-friendly tone.`;

  const userPrompt = `DOCUMENT CONTENT:
${safeText}

Summarize this document using the exact structure specified.`;

  try {
    const content = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.4,
      GROQ_MODELS.MIXTRAL_8X7B,
      2048
    );
    return content;
  } catch {
    return MOCK_SUMMARY.default;
  }
}

function safeParseJsonArray<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    const toParse = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    return JSON.parse(toParse) as T;
  } catch {
    return fallback;
  }
}

interface QuizBankEntry {
  question: string;
  concept: string;
  explanation: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
}

const BEGINNER_BANK: Record<string, QuizBankEntry[]> = {
  'data-structures': [
    { question: 'Which data structure uses LIFO (Last-In-First-Out) order?', concept: 'Stacks vs Queues', explanation: 'A stack is LIFO — last item pushed is first item popped. Think of a stack of plates.', options: ['Stack', 'Queue', 'Linked List', 'Tree'], correct: 0 },
    { question: 'What is the time complexity of inserting at the END of a dynamic array (amortized)?', concept: 'Dynamic Array Complexity', explanation: 'Appending to a dynamic array runs in amortized O(1) because doubling happens rarely.', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], correct: 0 },
    { question: 'A node in a singly linked list minimally stores:', concept: 'Singly Linked List Node', explanation: 'A node holds a value and a pointer (next reference); no previous pointer is required.', options: ['data + prev pointer', 'data + next pointer', 'data + prev + next', 'data + index'], correct: 1 },
    { question: 'Which operation is FASTEST on a balanced BST (on average)?', concept: 'BST Operations', explanation: 'Search on balanced BST is O(log n) average, faster than O(n) on unsorted array.', options: ['Search', 'Reverse traversal', 'Sequential scan', 'Print all values'], correct: 0 },
    { question: 'A Hash Table stores key-value pairs using:', concept: 'Hashing Basics', explanation: 'A hash table uses a hash function on keys to compute an array index for fast O(1) access.', options: ['Sorting keys first', 'A hash function + array buckets', 'Linked list chaining only', 'Binary search'], correct: 1 },
  ],
  'algorithms': [
    { question: 'Which sorting algorithm has AVERAGE time complexity O(n log n)?', concept: 'Sorting Complexity', explanation: 'Merge sort always splits/merges in O(n log n) worst, average, best case.', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'], correct: 2 },
    { question: 'Binary search works ONLY on:', concept: 'Binary Search Prerequisite', explanation: 'Binary search requires random access on a sorted array to halve the search space each step.', options: ['Any array', 'Sorted array with random access', 'Linked list', 'String'], correct: 1 },
    { question: 'Greedy algorithms work well when:', concept: 'Greedy Property', explanation: 'Greedy makes locally optimal choices hoping they reach global optimum (needs greedy choice + optimal substructure).', options: ['Always optimal by brute force', 'Local choices lead to global optimum', 'You need exact optimum only', 'Input is sorted'], correct: 1 },
    { question: 'Dynamic Programming (DP) primarily solves problems with:', concept: 'DP Basics', explanation: 'DP memoizes overlapping subproblems and exploits optimal substructure to avoid recomputation.', options: ['Single recursive call only', 'Overlapping subproblems + optimal substructure', 'Sorting only', 'Hash collisions'], correct: 1 },
    { question: 'BFS and DFS traverse a graph in time:', concept: 'Graph Traversal Complexity', explanation: 'Standard BFS/DFS visits every vertex and edge once: O(V + E).', options: ['O(V + E)', 'O(V log V)', 'O(V²)', 'O(E log E)'], correct: 0 },
  ],
  'operating-systems': [
    { question: 'A process differs from a thread because:', concept: 'Process vs Thread', explanation: 'Each process owns isolated memory space; threads share memory within a process.', options: ['Threads run faster', 'Processes have isolated memory; threads share it', 'Processes are smaller', 'Threads cannot be scheduled'], correct: 1 },
    { question: 'Round-Robin scheduling is fundamentally a:', concept: 'Scheduling Algorithms', explanation: 'Round-Robin gives each process a fixed time quantum and cycles, preemptive & fair.', options: ['Priority scheduler', 'First-come-first-served', 'Preemptive time-slicing scheduler', 'Shortest-job-first'], correct: 2 },
    { question: 'Mutual Exclusion (Mutex) is used to:', concept: 'Synchronization', explanation: 'Mutex locks protect critical sections so only one thread at a time accesses shared state.', options: ['Make threads faster', 'Schedule threads by priority', 'Protect critical sections', 'Garbage collect'], correct: 2 },
    { question: 'Paging for memory management partitions virtual memory into:', concept: 'Paging Fundamentals', explanation: 'Paging splits virtual address space into fixed-size pages, mapped to frames in RAM.', options: ['Variable-size segments', 'Fixed-size pages', 'Contiguous blocks only', 'Swap files'], correct: 1 },
    { question: 'Deadlock requires four conditions. Which is NOT one?', concept: 'Coffman Conditions', explanation: 'Four Coffman conditions: mutual exclusion, hold & wait, no preemption, circular wait. Priority inversion is a related bug, not a deadlock condition.', options: ['Mutual exclusion', 'Hold and wait', 'Circular wait', 'Priority inversion'], correct: 3 },
  ],
  'dbms': [
    { question: 'Which SQL clause filters ROWS *before* grouping?', concept: 'WHERE vs HAVING', explanation: 'WHERE filters rows before grouping/aggregation; HAVING filters grouped results.', options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'], correct: 0 },
    { question: 'ACID property "I" (Isolation) mainly refers to:', concept: 'ACID Isolation', explanation: 'Isolation ensures concurrent transactions don’t interfere; each executes as if alone.', options: ['Data is saved on disk', 'Transactions don’t overlap effects', 'Values are unique', 'Data types are correct'], correct: 1 },
    { question: 'A primary key must always be:', concept: 'Primary Key', explanation: 'PK must be unique + not null; every row has exactly one, used for identity.', options: ['Numeric only', 'Unique and NOT NULL', 'Auto-increment', 'At least 8 bytes'], correct: 1 },
    { question: 'Indexing a column primarily improves:', concept: 'Indexing Basics', explanation: 'Indexes accelerate lookups and joins by reducing I/O via tree/hash structures.', options: ['Insert speed', 'Read/query speed', 'Table size', 'Security'], correct: 1 },
    { question: '3NF (3rd Normal Form) removes:', concept: 'Normalization 3NF', explanation: '3NF: no transitive dependencies — non-prime attributes depend only on candidate keys.', options: ['Repeating groups', 'Partial dependencies', 'Transitive dependencies', 'Foreign keys'], correct: 2 },
  ],
  'computer-networks': [
    { question: 'Which layer of OSI handles reliable end-to-end flow control?', concept: 'OSI Transport Layer', explanation: 'Layer 4 Transport (TCP) handles reliability, flow & congestion control.', options: ['Network', 'Transport', 'Data Link', 'Application'], correct: 1 },
    { question: 'TCP provides all of the following EXCEPT:', concept: 'TCP vs UDP', explanation: 'TCP is reliable, ordered, congestion-controlled, connection-oriented. UDP is connectionless & faster without guarantees.', options: ['Reliable delivery', 'Flow control', 'Connectionless low-latency delivery', 'Ordered bytes'], correct: 2 },
    { question: 'Default HTTPS port number is:', concept: 'Ports', explanation: 'HTTPS (TLS) runs over port 443 by convention.', options: ['22', '80', '443', '8080'], correct: 2 },
    { question: 'DNS mainly translates:', concept: 'DNS Basics', explanation: 'DNS = Domain Name System resolves human-readable names to IP addresses.', options: ['MAC address to IP', 'Domain name to IP address', 'TCP to UDP', 'HTTP to TLS'], correct: 1 },
    { question: 'TLS handshake establishes:', concept: 'TLS Handshake', explanation: 'TLS handshake negotiates cipher suite + verifies server cert + exchanges session keys before secure data.', options: ['Compression only', 'Shared secret session keys & authenticated channel', 'Source routing', 'Firewall rules'], correct: 1 },
  ],
  'object-oriented-programming': [
    { question: 'Encapsulation in OOP means:', concept: 'Pillars: Encapsulation', explanation: 'Encapsulation bundles data + methods into a class with controlled access (public/private).', options: ['All fields must be public', 'Bundling data and methods with controlled access', 'Using inheritance only', 'Using static classes'], correct: 1 },
    { question: 'Polymorphism is best illustrated by:', concept: 'Pillars: Polymorphism', explanation: 'Polymorphism — same interface different behavior; overriding run-time dispatch is classic.', options: ['Single class one method', 'Method overriding via inheritance', 'Global variables', 'Structs with no methods'], correct: 1 },
    { question: 'Which relationship implies "is-a"?', concept: 'Inheritance vs Composition', explanation: '"is-a" = inheritance; "has-a" = composition.', options: ['Inheritance', 'Composition', 'Aggregation', 'Association'], correct: 0 },
    { question: 'SOLID "S" stands for:', concept: 'SOLID Single Responsibility', explanation: 'SRP — each class should have one reason to change / one job.', options: ['Static', 'Single Responsibility Principle', 'Simple', 'Solidarity'], correct: 1 },
    { question: 'An abstract class CANNOT:', concept: 'Abstract vs Concrete', explanation: 'Abstract classes may contain abstract methods, but cannot be instantiated directly.', options: ['Have concrete methods', 'Be inherited', 'Be instantiated directly', 'Have fields'], correct: 2 },
  ],
  'web-development': [
    { question: 'CSS Flexbox justify-content controls alignment:', concept: 'Flexbox', explanation: 'justify-content distributes items along the MAIN axis (default horizontal).', options: ['Along main axis', 'Along cross axis', 'Z-index stacking', 'Font size'], correct: 0 },
    { question: 'React useState hook returns:', concept: 'React useState', explanation: 'useState returns [stateValue, setter] tuple.', options: ['Setter only', '[state, setState]', 'Component class', 'Reducer'], correct: 1 },
    { question: 'HTTP status 404 means:', concept: 'HTTP Status Codes', explanation: '404 Not Found — server can’t find the requested resource.', options: ['Server error', 'Not Found', 'Unauthorized', 'Bad Request'], correct: 1 },
    { question: 'RESTful API GET is generally intended to be:', concept: 'REST Verbs', explanation: 'GET should be safe/idempotent: no server state changes, retrieves only.', options: ['Create data', 'Delete data', 'Read (idempotent, safe)', 'Modify state'], correct: 2 },
    { question: 'Which builds client-side React apps for production in this project?', concept: 'Tooling', explanation: 'Vite is the bundler/dev-server for this React project (package.json).', options: ['Webpack 4', 'Vite', 'Create React App', 'Rollup only'], correct: 1 },
  ],
  'machine-learning': [
    { question: 'Supervised learning requires:', concept: 'Supervised Learning', explanation: 'Supervised = labeled input→output pairs used to train a model to predict.', options: ['No labels', 'Labeled training data', 'Only numeric input', 'Clusters'], correct: 1 },
    { question: 'K-means is an example of:', concept: 'K-Means Clustering', explanation: 'K-means is an unsupervised clustering algorithm partitioning into K centroid-based groups.', options: ['Classification', 'Regression', 'Unsupervised clustering', 'Reinforcement learning'], correct: 2 },
    { question: 'Overfitting means:', concept: 'Overfitting', explanation: 'Overfitting memorizes train noise, performs poorly on unseen data (low train error, high test error).', options: ['Underfits training data too', 'Performs well on train but poorly on unseen test', 'Model too simple', 'Always optimal'], correct: 1 },
    { question: 'Cross-validation is used to:', concept: 'Cross Validation', explanation: 'CV estimates generalization more reliably with multiple splits (k-fold).', options: ['Clean data', 'Estimate out-of-sample performance', 'Speed training', 'Label data'], correct: 1 },
    { question: 'F1 score is the harmonic mean of:', concept: 'Classification Metrics', explanation: 'F1 = 2*(Precision*Recall)/(Precision+Recall).', options: ['Accuracy & AUC', 'Precision & Recall', 'TP & TN', 'Loss & Gradient'], correct: 1 },
  ],
  'cyber-security': [
    { question: 'CIA triad stands for:', concept: 'CIA Triad', explanation: 'Confidentiality, Integrity, Availability — classic security triad.', options: ['Confidentiality, Integrity, Availability', 'Cost, Identity, Authentication', 'Control, Impact, Accountability', 'Cybersecurity, Infosec, Awareness'], correct: 0 },
    { question: 'Which attack injects malicious script into trusted web sites via user input?', concept: 'XSS', explanation: 'Cross-Site Scripting (XSS) injects scripts that run in victim browsers.', options: ['SQL injection', 'Cross-Site Scripting (XSS)', 'CSRF', 'DDoS'], correct: 1 },
    { question: 'AES is primarily a:', concept: 'Cryptography Basics', explanation: 'AES = Advanced Encryption Standard, widely adopted symmetric block cipher.', options: ['Hash function', 'Symmetric block cipher', 'Asymmetric RSA variant', 'MAC code'], correct: 1 },
    { question: 'MFA (Multi-Factor Authentication) works by:', concept: 'MFA', explanation: 'MFA combines ≥2 independent factors: something you know/have/are, reducing single-point failures.', options: ['Longer passwords', 'Requiring ≥2 distinct verification factors', 'IP whitelisting', 'Biometrics only'], correct: 1 },
    { question: 'OWASP Top 10 first item 2021:', concept: 'OWASP 2021', explanation: 'A01:2021 — Broken Access Control ranked #1.', options: ['Broken Access Control', 'SQLi', 'Phishing', 'XSS'], correct: 0 },
  ],
  'compiler-design': [
    { question: 'Lexical analysis converts source into:', concept: 'Compiler Phases', explanation: 'Lexer tokenizes source code into meaningful tokens (keywords, identifiers, ops).', options: ['Parse tree', 'Stream of tokens', 'Assembly', 'Bytecode'], correct: 1 },
    { question: 'Parsing determines if input tokens follow:', concept: 'Parsing', explanation: 'Parser validates syntactic structure against the grammar; outputs parse tree / AST.', options: ['Database schema', 'Grammar rules (syntax)', 'HTTP spec', 'Runtime type safety'], correct: 1 },
    { question: 'Three-address code is an example of:', concept: 'Intermediate Representation', explanation: '3-addr code is a flat IR between source and machine code (easy to optimize).', options: ['Target assembly', 'Intermediate Representation (IR)', 'Lexical token', 'Linker script'], correct: 1 },
    { question: 'Peephole optimization works on:', concept: 'Peephole Opts', explanation: 'Peephole scans a small window of generated code to replace with cheaper equivalent.', options: ['Source only', 'A small window of target/IR code', 'Only function calls', 'Memory layout'], correct: 1 },
    { question: 'Loader primarily does:', concept: 'Linker Loader', explanation: 'Loader brings executable image into memory, adjusts addresses, jumps to entry.', options: ['Source parsing', 'Loading executable into memory + relocating', 'Tokenize', 'Linting'], correct: 1 },
  ],
  'software-engineering': [
    { question: 'Agile Scrum sprints are typically:', concept: 'Scrum Basics', explanation: 'Scrum sprints are timeboxed iterations typically 1–4 weeks.', options: ['6+ months', '1–4 weeks', 'One day only', 'Decided at end of project'], correct: 1 },
    { question: 'Unit tests verify:', concept: 'Test Pyramid', explanation: 'Unit tests isolate individual functions/modules in isolation; fast & narrow.', options: ['End-to-end user flows only', 'UI only', 'Smallest individual components in isolation', 'Integration only'], correct: 2 },
    { question: 'CI/CD "CI" stands for:', concept: 'CI/CD', explanation: 'Continuous Integration merges/builds/tests code changes frequently.', options: ['Configurable Interface', 'Continuous Integration', 'Code Inspection', 'Critical Infrastructure'], correct: 1 },
    { question: 'Observer pattern is a:', concept: 'Design Patterns', explanation: 'Observer (pub/sub) behavioral pattern: notify dependents automatically on state change.', options: ['Creational', 'Behavioral', 'Structural', 'Anti-pattern'], correct: 1 },
    { question: 'Coupling and cohesion best describe:', concept: 'Coupling/Cohesion', explanation: 'Low coupling (between modules) + high cohesion (inside modules) = maintainable software.', options: ['Database perf only', 'Module independence & single-focus modules', 'Network throughput', 'CSS specificity'], correct: 1 },
  ],
};

const INTERMEDIATE_BANK: Record<string, QuizBankEntry[]> = {
  'data-structures': [
    { question: 'Which collision resolution strategy typically DOES NOT use additional linked storage per bucket?', concept: 'Open Addressing', explanation: 'Open addressing (linear/quadratic probing) finds another slot within the table array itself.', options: ['Chaining', 'Open addressing', 'Tree buckets', 'Bucket overflow'], correct: 1 },
    { question: 'AVL trees guarantee balance by:', concept: 'AVL Rotation', explanation: 'AVL maintains balance factor ∈ {−1,0,+1}, rotates on insertion/deletion.', options: ['Rebuilding fully', 'Tracking balance factors + rotating', 'Randomizing keys', 'Using B-tree rules'], correct: 1 },
    { question: 'Priority queue most efficient implementation:', concept: 'Heaps', explanation: 'Binary heap is O(1) get-min/max, O(log n) insert and extract-min — standard for priority queues.', options: ['Sorted array', 'Binary Heap', 'Linked list', 'Stack'], correct: 1 },
    { question: 'Trie is best suited for:', concept: 'Trie Use Cases', explanation: 'Trie (prefix tree) stores strings by prefix; superb for autocomplete & longest prefix match.', options: ['Numeric range queries', 'Prefix-based string search / autocomplete', 'Arbitrary key-values', 'Sorting objects'], correct: 1 },
    { question: 'Disjoint-Set Union-Find with path compression + union-by-rank achieves:', concept: 'DSU Complexity', explanation: 'Amortized nearly-constant O(α(n)) inverse Ackermann — effectively constant for practical n.', options: ['O(log* n)', 'Almost-constant amortized α(n)', 'O(1) worst-case', 'O(log n log log n)'], correct: 1 },
  ],
  'algorithms': [
    { question: 'Dijkstra fails when:', concept: 'Dijkstra Limitation', explanation: 'Dijkstra relies on non-negative edge weights; negative breaks greedy invariant.', options: ['Graph is undirected', 'Edges have negative weights', 'Vertices large', 'No cycles'], correct: 1 },
    { question: 'Kruskal MST uses which data structure heavily?', concept: 'Kruskal DSU', explanation: 'Kruskal sorts edges, uses DSU (Union-Find) to skip edges that form cycles.', options: ['Bloom filter', 'Union-Find (DSU)', 'Trie', 'Binary heap'], correct: 1 },
    { question: '0/1 Knapsack classic DP time complexity:', concept: 'Knapsack', explanation: 'Standard 0/1 DP table: items × capacity → O(n*W).', options: ['O(n²)', 'O(n log n)', 'O(n * capacity)', 'O(2^n)'], correct: 2 },
    { question: 'Topological sort is possible only on:', concept: 'Toposort', explanation: 'Only DAGs (Directed Acyclic Graphs) admit a topological ordering.', options: ['Any graph', 'Connected graph only', 'DAG (directed acyclic graph)', 'Tree with cycles'], correct: 2 },
    { question: 'Which string-matching algorithm preprocesses pattern with LPS array?', concept: 'KMP', explanation: 'KMP builds longest proper prefix which is also suffix (LPS) to avoid backtracking.', options: ['Naive', 'KMP', 'Rabin-Karp only', 'Boyer-Moore (bad char)'], correct: 1 },
  ],
  'operating-systems': [
    { question: 'Thrashing occurs when:', concept: 'Thrashing', explanation: 'Excessive page faults — system spends more time paging than executing.', options: ['CPU too fast', 'Page faults dominate CPU time (too much paging)', 'Disk full', 'Too much RAM'], correct: 1 },
    { question: 'Banker’s algorithm is a strategy for:', concept: 'Deadlock Avoidance', explanation: 'Banker’s checks safe sequence to prevent deadlock (avoidance, not detection).', options: ['Deadlock detection', 'Deadlock avoidance', 'Deadlock certainty', 'Fragmentation'], correct: 1 },
    { question: 'LRU cache conceptually uses:', concept: 'Page Replacement LRU', explanation: 'Evict Least Recently Used; often approximated by reference bits, or implemented with hashmap+DLL.', options: ['Random', 'LRU: Least Recently Used eviction', 'FIFO always', 'Belady optimal'], correct: 1 },
    { question: 'User threads (ULT) vs Kernel threads (KLT): ULT problem:', concept: 'ULT Blocking', explanation: 'ULT managed in user space: one blocking syscall blocks entire process (unless scheduler activations).', options: ['Too many syscalls', 'A blocking call blocks the entire process', 'Can’t schedule', 'Cannot access RAM'], correct: 1 },
    { question: 'Semaphore count=1 is essentially a:', concept: 'Mutex vs Semaphore', explanation: 'Binary semaphore (count∈{0,1}) ≈ mutex (though ownership semantics differ).', options: ['Condition variable', 'Binary semaphore ~ mutex', 'Monitor', 'Barrier'], correct: 1 },
  ],
  'dbms': [
    { question: 'In MVCC, writes don’t block reads because:', concept: 'MVCC', explanation: 'MVCC keeps multiple versions; readers see consistent snapshot, no lock needed.', options: ['Writes fail silently', 'Readers see a consistent snapshot version', 'Locks held forever', 'No concurrency allowed'], correct: 1 },
    { question: 'Serializable isolation level guarantees:', concept: 'Isolation Levels', explanation: 'Strongest — concurrent transactions appear to execute one-after-another, no anomalies.', options: ['Repeatable reads only', 'No reads possible', 'Equivalent to some serial execution order', 'Row-level locks'], correct: 2 },
    { question: 'Clustered index vs Non-clustered difference:', concept: 'Clustered Index', explanation: 'Clustered leaf = data rows; only one per table. Non-clustered leaf = pointers/keys.', options: ['None; same thing', 'Clustered = rows stored in index order at leaves (1 per table)', 'Clustered slower always', 'Non-clustered has data'], correct: 1 },
    { question: 'CAP theorem says distributed system can simultaneously have at most:', concept: 'CAP', explanation: 'CAP: at most two of Consistency, Availability, Partition tolerance simultaneously. P is mandatory in nets, so trade C vs A.', options: ['2 of Consistency, Availability, Partition-tolerance', 'All 3', 'Only 1', 'None'], correct: 0 },
    { question: 'Which is a NoSQL document store?', concept: 'NoSQL Family', explanation: 'MongoDB = BSON document store; Redis=KV, Neo4j=graph, Cassandra=wide-column.', options: ['Redis', 'MongoDB', 'Neo4j', 'Cassandra'], correct: 1 },
  ],
  'computer-networks': [
    { question: 'TCP slow start phase grows cwnd:', concept: 'TCP Congestion Control', explanation: 'Slow start: cwnd grows exponentially (≈ 1→2→4→8) per RTT until ssthresh.', options: ['Linearly by 1 MSS/RTT', 'Exponentially by ACKs (≈ multiplicative)', 'Randomly', 'Stays constant'], correct: 1 },
    { question: 'CSMA/CD is used in traditional:', concept: 'Ethernet MAC', explanation: 'Carrier Sense Multiple Access / Collision Detection — classic shared Ethernet.', options: ['Token Ring', 'Wireless LAN only', 'Wired Ethernet (IEEE 802.3)', 'Fiber optics always'], correct: 2 },
    { question: 'Subnet mask 255.255.255.192 has how many usable host IPs per subnet?', concept: 'CIDR /26', explanation: '192= /26. Host bits=6. 2⁶−2=62 usable (network & broadcast reserved).', options: ['64', '62', '256', '126'], correct: 1 },
    { question: 'ARP translates:', concept: 'ARP', explanation: 'Address Resolution Protocol: given IP on same LAN → MAC (layer 3 → layer 2).', options: ['MAC→IP', 'IP→MAC on same LAN', 'TCP→UDP', 'IPv4→IPv6'], correct: 1 },
    { question: 'SYN flood exploits:', concept: 'TCP Handshake Attacks', explanation: 'Attacker floods SYNs w/o final ACK; server resources exhausted on half-open connections.', options: ['UDP fragmentation', 'TCP 3-way handshake (half-open connections)', 'ICMP echo', 'DNS recursion'], correct: 1 },
  ],
  'object-oriented-programming': [
    { question: 'Liskov Substitution Principle (LSP) states:', concept: 'SOLID LSP', explanation: 'Subtype objects should be substitutable for supertype objects without breaking correctness.', options: ['Subclasses override everything', 'Subtype must be substitutable for base without breaking invariants', 'Interfaces can’t be used', 'Singletons only'], correct: 1 },
    { question: 'Dependency Inversion Principle (DIP) prefers:', concept: 'SOLID DIP', explanation: 'Depend on abstractions, not concretions — high-level modules independent of low-level details.', options: ['Concretions everywhere', 'Abstractions (interfaces) instead of concrete classes', 'No injections', 'Static classes'], correct: 1 },
    { question: 'Factory Method pattern is:', concept: 'GoF Factory', explanation: 'Factory Method = creational; subclass decides which concrete product to instantiate.', options: ['Behavioral', 'Creational: defer instantiation to subclasses', 'Structural', 'Concurrency pattern'], correct: 1 },
    { question: 'Deep copy vs Shallow copy differs when objects contain:', concept: 'Copy Semantics', explanation: 'Shallow copies top references; deep clones referenced objects recursively (nested mutables matter).', options: ['Primitive ints only', 'Reference-type fields (nested objects / pointers)', 'Final fields', 'Immutable strings'], correct: 1 },
    { question: 'Which pattern adds behavior dynamically without subclass explosion?', concept: 'Decorator', explanation: 'Decorator wraps objects at runtime to add responsibilities — Open/Closed Principle in action.', options: ['Adapter', 'Decorator', 'Singleton', 'Facade'], correct: 1 },
  ],
  'web-development': [
    { question: 'In React, useEffect with dep array [] runs:', concept: 'useEffect deps', explanation: 'Empty deps → runs once after first render, cleanup on unmount only.', options: ['Every render', 'Once after first mount; cleanup on unmount', 'Never', 'Only on state changes'], correct: 1 },
    { question: 'Virtual DOM diffing main benefit:', concept: 'Virtual DOM', explanation: 'Reconciles previous/next trees → computes minimal real DOM mutations → cheaper layouts/repaints.', options: ['No JS execution', 'Minimize expensive real-DOM writes via diff reconciliation', 'Bypasses CSS', 'Handles HTTP directly'], correct: 1 },
    { question: 'CORS preflight request is which HTTP method?', concept: 'CORS', explanation: 'Preflight = OPTIONS request to server to check allowed origins/methods/headers before actual request.', options: ['GET', 'POST', 'OPTIONS', 'PUT'], correct: 2 },
    { question: 'JWT claim typically for user identity:', concept: 'JWT Claims', explanation: '"sub" (subject) = standard registered claim for principal identifier.', options: ['sub', 'pwd', 'role', 'exp'], correct: 0 },
    { question: 'Lighthouse in Chrome DevTools audits:', concept: 'Lighthouse', explanation: 'Lighthouse audits perf, a11y, best practices, SEO, PWA capability.', options: ['Only network requests', 'Perf, a11y, best practices, SEO, PWA', 'Only CSS coverage', 'Backend DB queries'], correct: 1 },
  ],
  'machine-learning': [
    { question: 'Random Forest reduces variance relative to a single decision tree by:', concept: 'Random Forest', explanation: 'Random Forest = ensemble of de-correlated trees via bagging + feature randomization → low variance.', options: ['Deeper single trees', 'Bagging + randomized feature subsets', 'Boosting residual errors', 'Increasing bias'], correct: 1 },
    { question: 'Standardization (z-score) does NOT:', concept: 'Feature Scaling', explanation: 'Standardization → μ=0, σ=1; doesn’t bound values or change relative rank.', options: ['Shift mean to 0', 'Scale variance to 1', 'Bound feature values to [0,1]', 'Preserve rank order'], correct: 2 },
    { question: 'Backpropagation computes gradients using:', concept: 'Backprop', explanation: 'Chain rule applied repeatedly from loss backward through computational graph.', options: ['Forward-only', 'Chain rule & reverse-mode autodiff', 'Finite differences', 'Hessians only'], correct: 1 },
    { question: 'Class imbalance harms accuracy metric; better alternative:', concept: 'Imbalanced Data', explanation: 'F1 / PR-AUC / Recall @ fixed precision more informative than raw accuracy when imbalanced.', options: ['Raw accuracy', 'F1 (or PR-AUC)', 'Loss only', 'Training set size'], correct: 1 },
    { question: 'Dropout at training time primarily fights:', concept: 'Regularization Dropout', explanation: 'Dropout randomly zeroes activations → forces redundant representations → reduces overfitting.', options: ['Data leakage', 'Overfitting (ensemble-like regularization)', 'Vanishing gradients', 'Slow training'], correct: 1 },
  ],
  'cyber-security': [
    { question: 'Salted password hashing with KDF (bcrypt/Argon2) defends against:', concept: 'Password Hashing', explanation: 'Slow KDF + per-user salt defeats rainbow tables & brute force.', options: ['SQLi', 'Rainbow tables + brute force + precomputation', 'XSS only', 'Phishing'], correct: 1 },
    { question: 'OAuth 2.0 "authorization code flow" with PKCE is safer for:', concept: 'OAuth PKCE', explanation: 'PKCE = Proof Key for Code Exchange, protects code intercept in public/native clients.', options: ['Server-only apps', 'Public clients (SPA / mobile) to mitigate code interception', 'Backend cron only', 'No OAuth flow'], correct: 1 },
    { question: 'SOC 2 audits controls over:', concept: 'SOC2', explanation: 'SOC 2 Type II = Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, Privacy.', options: ['Taxes only', 'Security/availability/confidentiality/privacy at cloud vendors', 'Code style', 'Network speed'], correct: 1 },
    { question: 'Zero Trust architecture mantra:', concept: 'Zero Trust', explanation: 'Never Trust, Always Verify — no implicit trust by location.', options: ['Trust on-prem, not cloud', 'Never Trust, Always Verify', 'Trust VPN users implicitly', 'Firewalls are sufficient'], correct: 1 },
    { question: 'HSTS header enforces:', concept: 'HSTS', explanation: 'HTTP Strict Transport Security: browsers upgrade to HTTPS automatically, block insecure connections.', options: ['Cookies secure flag only', 'Strict HTTPS for declared time', 'Compression', 'CORS'], correct: 1 },
  ],
  'compiler-design': [
    { question: 'LL(1) parser is a:', concept: 'Parser Types', explanation: 'LL(1) = Left-to-right scan, Leftmost derivation, 1 lookahead — predictive/top-down.', options: ['Bottom-up shift-reduce', 'Top-down predictive with 1 lookahead', 'General CYK', 'Precedence parser'], correct: 1 },
    { question: 'NFA→DFA conversion uses:', concept: 'NFA DFA Subset', explanation: 'Subset construction (powerset); each DFA state = set of NFA states reachable.', options: ['Pumping lemma', 'Subset construction (ε-closure + transitions)', 'Direct code emission', 'Parse trees'], correct: 1 },
    { question: 'Common subexpression elimination (CSE) is a:', concept: 'Machine-Independent Opts', explanation: 'CSE = classic local/global optimization avoiding recomputation of already-computed values.', options: ['Parser only', 'Machine-independent optimization', 'Register allocation', 'Assembler directive'], correct: 1 },
    { question: 'Register allocation classic algorithm:', concept: 'Graph Coloring Alloc', explanation: 'Chaitin-Briggs interference graph coloring → maps temps to registers.', options: ['Round robin', 'Interference graph coloring (Chaitin)', 'FIFO only', 'Linked list'], correct: 1 },
    { question: 'Static Single Assignment (SSA) means:', concept: 'SSA IR', explanation: 'SSA: every variable assigned exactly once, new versions φ( ) at control-flow merges; simplifies opts.', options: ['Variables can be overwritten freely', 'Each variable assigned exactly once + φ-functions at joins', 'No pointers', 'Stack-only variables'], correct: 1 },
  ],
  'software-engineering': [
    { question: 'Code review best practice for scope:', concept: 'Effective Review', explanation: 'Small diffs (≤400 LoC) get deeper & faster reviews than massive 2k+ line drops.', options: ['As big as possible', '≤ ~400 lines per review session', 'Only complete features', 'Every line auto-approved'], correct: 1 },
    { question: 'Monolith vs Microservices — microservices trade-off:', concept: 'Architectures', explanation: 'Independent scaling + polyglot teams, but distributed systems ops complexity & net calls.', options: ['No trade-offs', 'Independent deployability vs distributed systems complexity', 'Only database is different', 'Slower CI'], correct: 1 },
    { question: 'Which tool in this stack runs TSC typecheck pre-commit?', concept: 'Husky/lint-staged', explanation: 'Husky + lint-staged configured in package.json: pre-commit hooks.', options: ['Jest', 'Husky + lint-staged', 'Vite', 'Prettier alone'], correct: 1 },
    { question: 'Rate limiting (token bucket) protects APIs against:', concept: 'Rate Limiting', explanation: 'Token bucket enforces sustained + burst rate — prevents abuse, brute force, resource exhaustion.', options: ['SQLi only', 'Abusive call volume / brute force / resource exhaustion', 'XSS', 'Wrong data types'], correct: 1 },
    { question: 'Post-incident blameless retrospective focuses on:', concept: 'SRE Blameless', explanation: 'Blameless culture learns from systems, not individuals → fixes, not punishments.', options: ['Firing culprit', 'Systems & process improvements, not people', 'Legal liability', 'Coverage metrics'], correct: 1 },
  ],
};

const EXPERT_BANK: Record<string, QuizBankEntry[]> = {
  'data-structures': [
    { question: 'Fenwick Tree (BIT) is weakest on:', concept: 'Fenwick Range Ops', explanation: 'Standard BIT point updates + prefix sums; range updates + range max not straightforward without augmentation or segment tree.', options: ['Prefix sums', 'Point updates', 'Arbitrary range max + lazy propagation', 'Online queries'], correct: 2 },
    { question: 'Skip list expected search complexity:', concept: 'Skip Lists', explanation: 'Randomized skip lists have expected O(log n) search with low constant factors.', options: ['O(log n) expected', 'O(n) expected', 'O(1)', 'O(n log n) worst-case'], correct: 0 },
    { question: 'Persistent data structures primarily require:', concept: 'Persistence', explanation: 'Persistent DS keeps old versions when updated; path copying + sharing common nodes.', options: ['No mutation allowed', 'Versioning via path copying with structural sharing', 'Full deep copies always', 'Volatile memory'], correct: 1 },
    { question: 'Bloom filter false positive rate depends on:', concept: 'Bloom Filter', explanation: 'FP ≈ (1−e^(−kn/m))^k. Functions of m (bits), k (hashes), n (inserts).', options: ['Only k hash funcs', 'Bit array size m, #hashes k, inserted items n', 'Random seed only', 'Input length'], correct: 1 },
    { question: 'Link-cut trees support:', concept: 'Link-Cut', explanation: 'Link-cut trees support dynamic tree operations (link/cut/path queries) in O(log n) amortized.', options: ['Only static trees', 'Dynamic forest operations: link/cut/path aggregates amortized O(log n)', 'Strings', 'Matrix ops'], correct: 1 },
  ],
  'algorithms': [
    { question: 'Ford-Fulkerson with Edmonds-Karp uses BFS to find augmenting path; complexity:', concept: 'Max Flow EK', explanation: 'E-K runs in O(V·E²) for unit capacities by BFS augment.', options: ['O(E log V)', 'O(V · E²)', 'O(2ⁿ)', 'O(V log V)'], correct: 1 },
    { question: 'Strongly Connected Components via Kosaraju uses:', concept: 'SCC Kosaraju', explanation: 'DFS once, order by finish, reverse graph, DFS on decreasing finish → SCCs.', options: ['Two passes of DFS + reversed graph', 'Union-Find', 'BFS twice', 'Topological order'], correct: 0 },
    { question: 'A* optimality requires heuristic to be:', concept: 'A* Admissible', explanation: 'Admissible (never overestimates true cost) → A* finds optimal path.', options: ['Overestimate', 'Admissible & consistent (preferably)', 'Randomized', 'Zero'], correct: 1 },
    { question: 'Miller-Rabin is a:', concept: 'Primality', explanation: 'Miller-Rabin = probabilistic primality test; deterministic bases for 64-bit ints known.', options: ['Exact factoring', 'Probabilistic primality test', 'Sieve of Eratosthenes', 'Hashing'], correct: 1 },
    { question: 'Fast Fourier Transform (FFT) computes convolution in:', concept: 'FFT Complexity', explanation: 'Cooley-Tukey FFT computes DFT in O(n log n), enabling fast polynomial multiplication/convolution.', options: ['O(n²)', 'O(n log n)', 'O(log n)', 'O(n)'], correct: 1 },
  ],
  'operating-systems': [
    { question: 'RCU synchronization pattern excels when:', concept: 'RCU', explanation: 'Read-Copy-Update: read-mostly workloads, updaters make new copy then atomically swap pointer.', options: ['Writers dominate', 'Read-mostly + low-latency readers (no lock)', 'Only single-threaded', 'Real-time deterministic'], correct: 1 },
    { question: 'SLUB allocator improves over SLAB by:', concept: 'Linux Allocators', explanation: 'SLUB merges per-CPU partial lists, removes per-object queue overhead, faster, debuggable.', options: ['More debugging metadata', 'Simpler design: remove per-CPU queues & simplify layout', 'Always uses IOMMU', 'Smaller memory only'], correct: 1 },
    { question: 'cgroups v2 in Linux controls:', concept: 'cgroups', explanation: 'Control groups = resource isolation/accounting (CPU, mem, I/O, PID) used by containers.', options: ['Permissions ACLs', 'Resource accounting/limits for process hierarchies (CPU, mem, blkio...)', 'Network names only', 'Filesystem only'], correct: 1 },
    { question: 'eBPF verifier ensures:', concept: 'eBPF Safety', explanation: 'Kernel static verifier: safe termination, no OOB, no pointer leak, bounded loops.', options: ['Faster syscalls only', 'Program is safe & always terminates within kernel limits', 'Any arbitrary kernel code', 'TCP offload'], correct: 1 },
    { question: 'Meltdown/Spectre family exploits:', concept: 'Side Channels', explanation: 'Speculative execution side channels leak data via cache timing (transient instructions).', options: ['Buffer overflow', 'Speculative execution side-channels via cache timing', 'SQLi', 'XSS'], correct: 1 },
  ],
  'dbms': [
    { question: 'WAL + checkpoint recovery approach is central to:', concept: 'ARIES', explanation: 'ARIES-style: Write-Ahead Logging + steal/no-force + checkpoints + redo/undo passes.', options: ['Only NoSQL', 'ARIES-style transactional recovery (WAL, steal, no-force)', 'JSON schema', 'Read replicas only'], correct: 1 },
    { question: '2-Phase Commit (2PC) suffers from:', concept: '2PC Blocking', explanation: 'Coordinator failure → participants may block on prepared, uncertain outcome forever.', options: ['Linear scalability', 'Blocking if coordinator fails in uncertain state', 'Strong consistency always', 'No network RPCs'], correct: 1 },
    { question: 'LSM trees (LevelDB/RocksDB) optimize for:', concept: 'LSM Trees', explanation: 'Write-optimized: sequential writes + memtable flush + compaction; writes >> B-tree.', options: ['Read-heavy only', 'High write throughput + sorted range reads via compaction', 'In-memory only', 'SQL stored procedures'], correct: 1 },
    { question: 'Consistent hashing reduces:', concept: 'Consistent Hashing', explanation: 'When a node joins/leaves, only K/n keys remapped; used in caches/DHTs.', options: ['None', 'Number of remappings after node add/remove (virtual nodes)', 'Read throughput', 'CPU load'], correct: 1 },
    { question: 'Raft distinguishes leader election from log replication safety via:', concept: 'Raft', explanation: 'Raft safety: leader completeness + only up-to-date candidates can win election (via log comparison).', options: ['Randomized leaders', 'Up-to-date log comparison for election + matched index/committed index rules', 'Two-phase locking', 'Byzantine peers'], correct: 1 },
  ],
  'computer-networks': [
    { question: 'BGP is a:', concept: 'Interdomain Routing', explanation: 'Border Gateway Protocol — path-vector inter-AS routing protocol, policy-based.', options: ['Intra-AS OSPF', 'Path-vector policy-based inter-AS routing', 'Distance-vector like RIP', 'Link-state intra-domain'], correct: 1 },
    { question: 'QUIC over UDP improves HTTP/3 by:', concept: 'QUIC', explanation: 'QUIC = encrypted multiplexed streams over UDP; 0-RTT resumption; stream HOL blocking solved.', options: ['Reimplementing TLS', 'Multiplexed encrypted streams + 0-RTT + moves TCP logic to userspace', 'Fewer bits over wire', 'Compression only'], correct: 1 },
    { question: 'ECN vs tail drop main win:', concept: 'ECN', explanation: 'Explicit Congestion Notification marks instead of drops, informs endpoints without retransmit storm.', options: ['Drops earlier', 'Signals congestion without loss → less costly recovery', 'Treats flows unequal', 'Only for UDP'], correct: 1 },
    { question: 'MPLS primarily operates between:', concept: 'MPLS', explanation: 'Multiprotocol Label Switching adds short labels, switching between L2 and L3 on provider core; faster forwarding, traffic engineering.', options: ['L5 to L7', 'L2 header & L3 header — label-switched core paths', 'L1 physically', 'Application only'], correct: 1 },
    { question: 'TCP BBR congestion control differs from Reno/CUBIC by:', concept: 'BBR', explanation: 'BBR estimates BDP (bandwidth × RTT min) instead of reacting to loss — more throughput on lossy/long-haul networks.', options: ['Loss-only signal', 'Model-based: max BW × min RTT to set pacing & cwnd, not purely loss-driven', 'Fewer options', 'Only wireless'], correct: 1 },
  ],
  'object-oriented-programming': [
    { question: 'Monad laws are:', concept: 'Monads', explanation: 'Left identity, right identity, associativity. Unit + flatMap satisfying these = lawful monad.', options: ['Specific to Java', 'Left identity · Right identity · Associativity over unit/bind', 'GUI rules', 'Pattern matching only'], correct: 1 },
    { question: 'CRTP (Curiously Recurring Template Pattern) enables:', concept: 'CRTP', explanation: 'Base takes Derived as template param → static polymorphism / mixins without vtable cost.', options: ['Dynamic dispatch only', 'Static polymorphism (compile-time) & mixins without vtable', 'RUNTIME type info', 'Reflection'], correct: 1 },
    { question: 'Visitor pattern solves:', concept: 'Visitor', explanation: 'Add new operations to class hierarchy without touching classes — dispatch via element.accept(visitor).', options: ['Too few classes', 'Adding operations without modifying element classes (double dispatch)', 'Singleton only', 'Thread pools'], correct: 1 },
    { question: 'Value objects (DDD) equality should be based on:', concept: 'DDD Value Objects', explanation: 'Value objects compared by structural equality of all fields, not identity.', options: ['Reference identity', 'All constituent attribute values (structural equality)', 'Creation timestamp', 'UUID only'], correct: 1 },
    { question: 'Reactive Streams JVM specification mandates:', concept: 'Reactive Streams', explanation: 'Async backpressure + non-blocking; Publisher/Subscriber/Subscription/Processor with demand-driven semantics.', options: ['Blocking I/O only', 'Non-blocking backpressured async bounded streams', 'Only JUnit', 'Synchronous calls'], correct: 1 },
  ],
  'web-development': [
    { question: 'React Suspense + streaming server-side rendering enables:', concept: 'SSR Streaming', explanation: 'HTML streams progressively; fallbacks show while components fetch → faster TTFB + interactivity.', options: ['No SSR', 'Progressive HTML streaming with per-component fallbacks', 'Client only', 'Less hydration'], correct: 1 },
    { question: 'HTTP/2 head-of-line blocking comes from:', concept: 'HTTP/2 HOL', explanation: 'One packet loss blocks all multiplexed streams until retransmission (TCP layer).', options: ['TLS', 'TCP-inherent HOL when losses happen over a multiplexed connection', 'Compression', 'DNS'], correct: 1 },
    { question: 'IntersectionObserver is best for:', concept: 'Perf APIs', explanation: 'Efficiently detect when element enters viewport — lazy loading, infinite scroll, view tracking.', options: ['Scroll events polling', 'Efficient viewport-enter detection with async callbacks, no poll', 'AJAX requests', 'DOM sizing'], correct: 1 },
    { question: 'Critical rendering path order:', concept: 'CRP', explanation: 'HTML → CSSOM/JS execution → Render tree (DOM+CSSOM) → Layout → Paint → Composite.', options: ['Paint first', 'HTML parse → CSSOM+JS → Render Tree → Layout → Paint → Composite', 'JS only first', 'Images first'], correct: 1 },
    { question: 'Subresource Integrity (SRI) guarantees:', concept: 'SRI', explanation: 'Browser checks downloaded asset hash matches integrity attribute — detects tampered CDN files.', options: ['Speed', 'Fetched asset bit-exact to expected cryptographic hash', 'Auth', 'Offline cache'], correct: 1 },
  ],
  'machine-learning': [
    { question: 'Residual skip connections in ResNets help train deeper nets by:', concept: 'ResNet', explanation: 'Skip connections allow gradient propagation through identity — solves degradation in very deep nets.', options: ['More parameters', 'Easing gradient flow via identity shortcuts (solve degradation)', 'More non-linearities', 'Smaller model'], correct: 1 },
    { question: 'AdamW decouples:', concept: 'AdamW', explanation: 'AdamW = adam with weight decay separated from gradient update; regularizes better than Adam+L2.', options: ['Momentums', 'Weight decay from gradient update step (decoupled WD)', 'Learning rate', 'Batch norm'], correct: 1 },
    { question: 'Perplexity of a language model is:', concept: 'Perplexity', explanation: '2^(cross-entropy) = weighted branching factor; lower = better predictive distribution.', options: ['Accuracy %', '2^cross_entropy (exponentiated average negative log-likelihood)', 'Recall', 'Latency'], correct: 1 },
    { question: 'Contrastive loss (SimCLR) rewards:', concept: 'Self Supervised', explanation: 'Augmentations of same image = positive; others in batch = negative. Pull positives, push negatives in embedding space.', options: ['Class labels', 'Representational similarity of augmentations of same example vs others in batch', 'Reconstruction', 'Text only'], correct: 1 },
    { question: 'LoRA fine-tuning reduces memory by:', concept: 'LoRA', explanation: 'Injects low-rank matrices into attention layers; train <1% params of full model.', options: ['Deeper activations', 'Injecting low-rank matrices into transformer layers (tiny trainable params)', 'FP16 only', 'LoRA is quantization'], correct: 1 },
  ],
  'cyber-security': [
    { question: 'Kernel ASLR (KASLR) randomizes:', concept: 'ASLR', explanation: 'Randomizes kernel virtual memory base — harder ROP gadget prediction; combined with SMEP/SMAP/KPTI.', options: ['Only stack', 'Kernel code/data base addresses on each boot', 'Heap only', 'File system'], correct: 1 },
    { question: 'ChaCha20-Poly1305 is an AEAD meaning:', concept: 'AEAD', explanation: 'Authenticated Encryption with Associated Data — ciphertext + authentication tag + optional unencrypted AD with integrity.', options: ['Hash only', 'Encrypts + produces auth tag over ciphertext + optional associated data (AEAD)', 'Asymmetric only', 'MAC only'], correct: 1 },
    { question: 'Double-free bugs manifest in which CWE?', concept: 'CWEs', explanation: 'CWE-415 Double Free = CWE of deallocating already-freed pointer; exploitable heap corruption.', options: ['CWE-79', 'CWE-415', 'CWE-200', 'CWE-94'], correct: 1 },
    { question: 'FIDO2 / WebAuthn credential is:', concept: 'Passwordless', explanation: 'Asymmetric public-key credential bound to RP ID + userHandle with user presence/verification — phishing-resistant.', options: ['SMS code', 'Asymmetric site-bound public key credential (phish-resistant)', 'OTP only', 'Shared password'], correct: 1 },
    { question: 'Intel TDX / AMD SEV-SNP are:', concept: 'Confidential Computing', explanation: 'Trusted execution environments encrypt VM memory with attestable integrity — confidential VMs in public cloud.', options: ['SSD caching', 'Confidential VM hardware memory encryption + remote attestation', 'Network tunneling', 'GPU offload'], correct: 1 },
  ],
  'compiler-design': [
    { question: 'Dominance frontier critical for SSA construction because:', concept: 'SSA Dominator', explanation: 'DF identifies exactly where φ-functions must be inserted to keep SSA valid.', options: ['Optimization only', 'It pinpoints where φ-functions need placement', 'Parsing', 'Register spilling'], correct: 1 },
    { question: 'GVN (Global Value Numbering) discovers:', concept: 'GVN', explanation: 'Hash expressions globally; same value number → equivalent expression → eliminate redundant.', options: ['Dead code', 'Expression equivalence across basic blocks to eliminate redundant computation', 'Constants only', 'Loops'], correct: 1 },
    { question: 'Loop-invariant code motion (LICM) must ensure:', concept: 'LICM', explanation: 'Only hoist when loop executes ≥1 time AND dominates all exits AND not exception/observable side effects.', options: ['Anything inside loop', 'Dominates exits, loop executed at least once, safe speculatively (no side effects)', 'Nested loops only', 'Cold code'], correct: 1 },
    { question: 'Escape analysis in a JIT enables:', concept: 'EA', explanation: 'If obj doesn’t escape method → scalar replace / stack alloc → no GC pressure.', options: ['Heap all always', 'Scalar replacement / stack allocation for non-escaping objects', 'Better GC only', 'No more types'], correct: 1 },
    { question: 'SIMD vectorization by compiler auto-vectorizer relies on:', concept: 'SIMD', explanation: 'Loop independent iterations (no loop-carried dependencies) + data alignment / trip count estimation.', options: ['Recurrence', 'Lack of loop-carried dependencies + known trip count & alignment', 'Fork-join parallel only', 'Strings'], correct: 1 },
  ],
  'software-engineering': [
    { question: 'Temporal coupling — which metric warns about?', concept: 'Metrics', explanation: 'Change coupling / temporal co-change patterns mined from git; pairs of files that always change together.', options: ['Cyclomatic', 'Change coupling (commit-time co-change pattern)', 'LOC', 'Coverage %'], correct: 1 },
    { question: 'Chaos engineering game days primarily validate:', concept: 'Resilience Testing', explanation: 'Proactively inject failures (server, network, timeouts) to validate resilience in production-like environments.', options: ['Styling', 'Resilience: steady-state survives realistic failure modes injected experimentally', 'Code style', 'Unit tests'], correct: 1 },
    { question: 'Feature flags at scale (LaunchDarkly/Flipper style) should ship with:', concept: 'Feature Flags', explanation: 'Cleanup rules + short-lived default + targeting rules + kill switch + audit + expiration date.', options: ['Permanent toggles', 'TTL/expiration + cleanup policy + targeting + kill switch + audit log', 'Always-on defaults', 'Only A/B'], correct: 1 },
    { question: 'SLO error budget consumed indicates:', concept: 'SLO / SRE', explanation: 'Remaining reliability margin: high spend → freeze risky releases until service recovers SLO.', options: ['Launch date', 'Remaining reliability margin for risky changes before SLO breach', 'Budget dollars', 'Team size'], correct: 1 },
    { question: 'Distributed tracing span context propagates via headers such as:', concept: 'OpenTelemetry', explanation: 'W3C TraceContext: traceparent + tracestate, enabling vendor-agnostic tracing.', options: ['Cookie', 'W3C traceparent + tracestate (TraceContext)', 'ETag', 'Content-Type'], correct: 1 },
  ],
};

function seededMockQuiz(domain: Domain, difficulty: Difficulty, count: number): Question[] {
  const pool: QuizBankEntry[] =
    difficulty === 'Beginner'
      ? (BEGINNER_BANK[domain] ?? BEGINNER_BANK['data-structures']!)
      : difficulty === 'Intermediate'
        ? (INTERMEDIATE_BANK[domain] ?? INTERMEDIATE_BANK['data-structures']!)
        : (EXPERT_BANK[domain] ?? EXPERT_BANK['data-structures']!);

  const domainLabel = DOMAINS.find(d => d.id === domain)?.label ?? 'CSE';
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
  return shuffled.map((e, idx) => ({
    id: `groq-mock-${domain}-${difficulty}-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    domain,
    difficulty,
    concept: e.concept,
    prompt: `[${domainLabel} · ${difficulty}] ${e.question}`,
    choices: [...e.options],
    correctIndex: e.correct,
    explanation: e.explanation,
  }));
}

export async function generateQuiz(
  domain: Domain,
  difficulty: Difficulty,
  count: number = 5
): Promise<Question[]> {
  const clampedCount = Math.max(1, Math.min(count, 10));
  const fallback = seededMockQuiz(domain, difficulty, clampedCount);
  if (!hasGroqApiKey()) {
    return Promise.resolve(fallback);
  }

  const domainMeta = DOMAINS.find(d => d.id === domain);
  const topics = domainMeta?.description ?? 'Computer Science';
  const systemPrompt = `You are an expert CSE professor creating high-quality MCQ assessments.

TOPIC: ${domainMeta?.label ?? domain} (${topics})
DIFFICULTY: ${difficulty} — adjust depth and distractors accordingly:
  Beginner: definition/factual, clear distractors.
  Intermediate: applied problem-solving, trade-off questions.
  Expert: nuanced edge cases, advanced systems, implementation details.

RULES:
1. Output ONLY a raw JSON array. NO markdown fences, NO prose.
2. Exactly ${clampedCount} objects. Each must contain keys: prompt:string, concept:string, explanation:string, options:[string,string,string,string] (4 unique options), correct:(0|1|2|3).
3. Options MUST be semantically plausible; correct answer must be unequivocally right.
4. Explanation ≤50 words: concise rationale why right answer is correct, plus why top distractor is wrong.
5. concept ≤35 chars: short concept name (e.g. "Kruskal MST Union-Find").
6. Avoid trivial "which is..." — favor scenario-based reasoning when possible.
JSON SCHEMA:
[
  {"prompt":"...","concept":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."},
  ...
]`;

  const userPrompt = `Generate exactly ${clampedCount} high-quality MCQs for:
Subject: ${domainMeta?.label ?? domain}
Curriculum focus: ${topics}
Difficulty target: ${difficulty}
Output a single JSON array with ${clampedCount} items. No commentary.`;

  try {
    const content = await callGroq(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.45,
      GROQ_MODELS.LLAMA_3_70B,
      1800
    );
    const parsed = safeParseJsonArray<Array<{ prompt?: string; concept?: string; options?: unknown; correct?: number; explanation?: string }>>(content, []);
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;

    const produced: Question[] = [];
    for (let i = 0; i < parsed.length && produced.length < clampedCount; i++) {
      const raw = parsed[i];
      if (!raw || typeof raw.prompt !== 'string' || typeof raw.explanation !== 'string') continue;
      const optsArr = Array.isArray(raw.options) ? raw.options.slice(0, 4).map(String) : [];
      if (optsArr.length < 4) continue;
      const correct = typeof raw.correct === 'number' ? raw.correct : -1;
      if (!(correct >= 0 && correct <= 3)) continue;
      const concept = typeof raw.concept === 'string' ? raw.concept.slice(0, 35) : (domainMeta?.label ?? 'Concept');
      produced.push({
        id: `groq-gen-${domain}-${difficulty}-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        domain,
        difficulty,
        concept,
        prompt: `[${domainMeta?.label ?? domain} · ${difficulty}] ${String(raw.prompt)}`.slice(0, 600),
        choices: optsArr as [string, string, string, string],
        correctIndex: correct,
        explanation: String(raw.explanation).slice(0, 220),
      });
    }
    return produced.length >= Math.max(1, Math.floor(clampedCount / 2)) ? produced : fallback;
  } catch {
    return fallback;
  }
}

export function getApiStatus(): { configured: boolean; model: string; provider: string } {
  return {
    configured: hasGroqApiKey(),
    model: DEFAULT_MODEL,
    provider: 'Groq Cloud',
  };
}
