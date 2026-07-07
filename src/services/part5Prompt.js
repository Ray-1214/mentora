/**
 * Pure Part 5 prompt builder — no SDK / env / network / file access at import or
 * call time, so it can be imported by a plain-node test to assert weakness-routing
 * payload inclusion. DIFFICULTY_MAP / THEMES_LABEL live here (llm.js imports them
 * back) so there is a single definition.
 */

export const DIFFICULTY_MAP = {
  easy:   '~600 score level (basic grammar, common vocabulary)',
  medium: '~730 score level (intermediate grammar, business vocabulary)',
  hard:   '~860 score level (advanced grammar, formal business language)',
};

export const THEMES_LABEL = {
  business:   'office and business operations',
  finance:    'finance and accounting',
  hr:         'human resources and employment',
  travel:     'travel and transportation',
  dining:     'restaurants, events, and catering',
  facilities: 'real estate and facilities management',
  marketing:  'sales, marketing, and advertising',
  technology: 'technology and manufacturing',
  academic:   'academic and general English vocabulary',
};

// grammarHints: top grammar points the user has been getting wrong (e.g. ["verb tense","prepositions"])
export function buildPart5Prompt(count, themes, difficulty, priorityWords = [], grammarHints = [], exam = 'TOEIC') {
  const themeLabels = themes.map(t => THEMES_LABEL[t] || t).join(', ');

  const vocabHint = priorityWords.length
    ? `IMPORTANT: Naturally use some of these words that the user struggles with: ${priorityWords.slice(0, 10).join(', ')}.`
    : '';

  const grammarHint = grammarHints.length
    ? `IMPORTANT: The user has been getting these grammar points wrong — include extra questions on them: ${grammarHints.join(', ')}.`
    : '';

  return `Generate exactly ${count} TOEIC Part 5 (Incomplete Sentences) questions.
Themes: ${themeLabels}
Difficulty: ${DIFFICULTY_MAP[difficulty]}
${vocabHint}
${grammarHint}

Return ONLY a JSON array (no wrapping object) of exactly ${count} items:
[
  {
    "question": "The director _____ the proposal before the board meeting.",
    "correct_answer": "reviewed",
    "incorrect_answers": ["reviews", "reviewing", "to review"],
    "explanation": "Past tense is required because the action was completed before another past event.",
    "grammar_point": "verb tense",
    "vocab_words": ["director", "proposal", "board"]
  }
]
Rules:
- Use exactly _____ (5 underscores) for the blank
- 1 correct + 3 plausible but wrong options
- Context appropriate for ${exam} exam format
- Concise explanations (1-2 sentences)`;
}
