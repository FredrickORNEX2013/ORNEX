const BAD_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'cunt', 'dick',
  'piss', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard', 'rape',
];

export function checkBadWords(text: string): { flagged: boolean; reason: string } {
  const lower = text.toLowerCase();
  for (const word of BAD_WORDS) {
    if (lower.includes(word)) {
      return { flagged: true, reason: `Contains prohibited word: "${word}"` };
    }
  }
  return { flagged: false, reason: '' };
}
