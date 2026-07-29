// Local "AI" content generation utilities.
// These analyze user-provided text to produce summaries, key points, quizzes,
// and flashcards using lightweight text heuristics. They run fully client-side.

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function extractWords(text: string): Map<string, number> {
  const stop = new Set([
    'the','a','an','and','or','but','of','to','in','for','on','at','by','with','from','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','it','its','as','into','about','than','then','so','such','not','no','yes','if','when','while','because','also','more','most','some','any','all','each','every','other','which','who','whom','whose','what','where','why','how','very','just','only','up','down','out','over','under','again','between','through','during','before','after','above','below','there','here','their','they','them','he','she','we','you','your','our','i','me','my','one','two','three','use','using','used','like','via','per','upon','within','without','off','them','themselves','him','his','her','hers','ours','yours','mine','theirs','its']
  );
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []) {
    if (stop.has(raw) || raw.length < 4) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return counts;
}

export function summarize(text: string, maxSentences = 3): string {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  const words = extractWords(text);
  const scored = sentences.map((s, i) => {
    let score = 0;
    for (const w of s.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []) {
      score += words.get(w) ?? 0;
    }
    // Boost earlier sentences (typical summary position).
    score *= 1 + (1 - i / sentences.length) * 0.4;
    return { s, score, i };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(' ');
}

export function keyPoints(text: string, max = 5): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];
  const words = extractWords(text);
  // Prefer sentences with definition markers / lists / important keywords.
  const marker = /(?:^(firstly|secondly|thirdly|finally|first|second|third|most important|importantly|note that|key|main|the key|in summary|in conclusion)[,:]? )|^(the |a |an )?\w+ (is|are|means|refers|consists|involves|requires|includes|defines) /i;
  const scored = sentences.map((s, i) => {
    let score = 0;
    for (const w of s.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []) {
      score += words.get(w) ?? 0;
    }
    if (marker.test(s)) score *= 1.5;
    score *= 1 + (1 - i / sentences.length) * 0.3;
    return { s, score, i };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s.replace(/\s+/g, ' ').trim());
}

export type GeneratedQuiz = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export function generateQuiz(text: string, count = 5, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): GeneratedQuiz[] {
  const sentences = splitSentences(text);
  const facts = keyPoints(text, count * 3);
  const quizzes: GeneratedQuiz[] = [];
  const used = new Set<string>();

  for (const fact of facts) {
    if (quizzes.length >= count) break;
    if (used.has(fact)) continue;
    used.add(fact);

    // Identify the key noun/term in the fact.
    const words = extractWords(fact);
    const sortedWords = [...words.entries()].sort((a, b) => b[1] - a[1]);
    const keyTerm = sortedWords.find(([w]) => w.length > 4 && fact.toLowerCase().includes(w))?.[0];
    if (!keyTerm) continue;

    // Build a question by blanking or asking about the key term.
    const re = new RegExp(`\\b${keyTerm}\\b`, 'i');
    const blanked = re.test(fact) ? fact.replace(re, '_____') : fact;
    const answerText = keyTerm;

    // Collect distractors from other key words in the full text.
    const distractors = sortedWords
      .filter(([w]) => w !== answerText && w.length > 4)
      .slice(0, 6)
      .map(([w]) => w)
      .filter((w, idx, arr) => arr.indexOf(w) === idx)
      .slice(0, 3);

    if (distractors.length < 3) continue;

    const options = shuffle([answerText, ...distractors]).map(capitalize);
    const answer = options.findIndex((o) => o.toLowerCase() === answerText);

    const question =
      difficulty === 'easy'
        ? `Which term best fills the blank: "${blanked}"?`
        : difficulty === 'hard'
          ? `Based on the material, complete the statement: "${blanked}". Which option is the most precise fit?`
          : `Fill in the blank: "${blanked}"`;

    quizzes.push({
      question,
      options,
      answer,
      explanation: `The correct answer is "${capitalize(answerText)}". Original statement: "${fact}"`,
    });
  }

  // Fallback: definition-style questions if we couldn't extract enough.
  if (quizzes.length < count) {
    for (const s of sentences) {
      if (quizzes.length >= count) break;
      const defMatch = s.match(/^(.{3,60}?) (?:is|are|was|were|means|refers to|consists of) (.+)$/i);
      if (!defMatch) continue;
      const term = defMatch[1].trim();
      const definition = defMatch[2].trim().replace(/\.$/, '');
      const distractorPool = sentences
        .map((x) => x.match(/^(.{3,60}?) (?:is|are|was|were|means|refers to|consists of)/i)?.[1]?.trim())
        .filter((x): x is string => !!x && x.toLowerCase() !== term.toLowerCase())
        .slice(0, 3);
      if (distractorPool.length < 3) continue;
      const options = shuffle([term, ...distractorPool]);
      const answer = options.findIndex((o) => o.toLowerCase() === term.toLowerCase());
      quizzes.push({
        question: `Which of the following is defined as: "${definition}"?`,
        options,
        answer,
        explanation: `"${term}" is defined as "${definition}".`,
      });
    }
  }

  return quizzes.slice(0, count);
}

export type GeneratedCard = { question: string; answer: string };

export function generateFlashcards(text: string, count = 8): GeneratedCard[] {
  const cards: GeneratedCard[] = [];
  const sentences = splitSentences(text);
  const facts = keyPoints(text, count * 2);

  for (const fact of facts) {
    if (cards.length >= count) break;
    const words = extractWords(fact);
    const sortedWords = [...words.entries()].sort((a, b) => b[1] - a[1]);
    const keyTerm = sortedWords.find(([w]) => w.length > 4 && fact.toLowerCase().includes(w))?.[0];
    if (!keyTerm) continue;
    const re = new RegExp(`\\b${keyTerm}\\b`, 'i');
    if (!re.test(fact)) continue;
    const blanked = fact.replace(re, '[ ? ]');
    cards.push({ question: blanked, answer: capitalize(keyTerm) });
  }

  // Definition-style fallback
  for (const s of sentences) {
    if (cards.length >= count) break;
    const defMatch = s.match(/^(.{3,60}?) (?:is|are|was|were|means|refers to|consists of) (.+)$/i);
    if (!defMatch) continue;
    cards.push({ question: `What ${defMatch[1].trim()}?`, answer: defMatch[2].trim().replace(/\.$/, '') });
  }

  return cards.slice(0, count);
}

// AI Tutor reply generator — produces helpful, structured study responses locally.
export function generateTutorReply(prompt: string, subject?: string): string {
  const p = prompt.toLowerCase().trim();
  const subj = subject ? ` (in ${subject})` : '';

  if (/^(hi|hello|hey|good (morning|evening|afternoon))/.test(p)) {
    return `Hi there! I'm ScholarAI, your personal study tutor. I can explain concepts, break down problems step by step, define terms, and quiz you${subj}. What would you like to study today?`;
  }

  if (/help|how do you work|what can you do/.test(p)) {
    return `Here's how I can help:\n\n1. **Explain a concept** — "Explain photosynthesis"\n2. **Step-by-step solution** — "Solve: 3x + 7 = 22"\n3. **Compare** — "Difference between mitosis and meiosis"\n4. **Summarize** — "Summarize the water cycle"\n5. **Quiz me** — "Give me 3 MCQs on Newton's laws"\n\nJust ask a question and I'll guide you through it.`;
  }

  if (p.startsWith('quiz me') || p.includes('mcq') || p.includes('multiple choice')) {
    return `Sure! Here's a practice question${subj} to start:\n\n**Q:** Which of these is a vector quantity?\n- A) Speed\n- B) Mass\n- C) Velocity\n- D) Temperature\n\n*(Answer: C — Velocity has both magnitude and direction.)*\n\nWant more questions, or want to explain the reasoning in depth?`;
  }

  if (/step.?by.?step|solve|calculate|how (do|to)|solution/.test(p)) {
    return `Let's work through this step by step:\n\n**1. Understand the problem** — Restate what's being asked so the goal is clear.\n**2. Identify given info** — List known values, formulas, or definitions${subj}.\n**3. Choose a strategy** — Pick the relevant rule (substitution, definition, formula).\n**4. Execute** — Apply the steps carefully, checking units/signs.\n**5. Verify** — Sanity-check the answer against the original question.\n\nShare the exact problem and I'll run these steps with real values.`;
  }

  if (p.includes('difference between') || p.includes('vs') || p.includes('compare')) {
    return `Great comparison question. A strong way to answer it:\n\n- **Definition of A** — what it is and when it applies.\n- **Definition of B** — what it is and when it applies.\n- **Key differences** — point out contrasting properties (e.g. size, process, outcome).\n- **Similarities** — note what they share.\n- **Example** — a concrete case of each.\n\nTell me the two terms you're comparing and I'll fill this in precisely.`;
  }

  // Generic structured study response
  const topic = prompt.replace(/[?.!]+$/g, '').trim();
  return `Here's a structured explanation of "${topic}"${subj}:\n\n**1. Definition** — "${topic}" refers to a core concept that's important to understand in context.\n\n**2. Why it matters** — It connects to broader ideas and shows up frequently in problems and applications.\n\n**3. Key idea / formula**\n> Summarize the central principle in one sentence.\n\n**4. Worked example**\n> Walk through one concrete case applying the concept.\n\n**5. Common mistakes**\n> Note the typical errors students make here.\n\nThat's the framework. Tell me the exact topic and I'll fill each section with real content — or paste your notes and I'll summarize them.`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
