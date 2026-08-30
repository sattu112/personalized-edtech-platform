import type { QuizResult, GapAnalysis, MicroLearningStep, GeneratedQA, ChatMessage, Difficulty } from '../types';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

export async function generateSocraticResponse(userMessage: string, history: ChatMessage[]): Promise<string> {
  const safeMessage = sanitizeInput(userMessage);

  if (!hasGroqApiKey()) {
    return Promise.resolve(mockSocraticResponse(safeMessage, history));
  }

  const systemPrompt = `You are a Socratic tutor for an EdTech platform.

STRICT RULES:
1. NEVER give direct answers. NEVER solve problems for the student.
2. ALWAYS guide through targeted questions, analogies, and incremental hints.
3. Be encouraging and warm. Use 2-4 sentences max.
4. ALWAYS end with a specific question that moves the student forward.
5. Adapt to their level: if stuck, simplify and give a concrete example; if confident, challenge them.
6. If student says "I don't know", validate that confusion is good learning, then give a small concrete hint and ask a simpler question.
7. Do NOT mention that you are an AI or use phrases like "as an AI". Be a human tutor.

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
    return content;
  } catch {
    return mockSocraticResponse(safeMessage, history);
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

export function getApiStatus(): { configured: boolean; model: string; provider: string } {
  return {
    configured: hasGroqApiKey(),
    model: DEFAULT_MODEL,
    provider: 'Groq Cloud',
  };
}
