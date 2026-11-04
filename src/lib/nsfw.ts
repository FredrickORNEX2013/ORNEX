const NSFW_KEYWORDS = [
  // Sexual content
  'porn', 'xxx', 'nude', 'nudity', 'naked', 'sex', 'sexual', 'erotic', 'masturbat',
  'orgasm', 'genital', 'penis', 'vagina', 'breast', 'boob', 'topless', 'lingerie',
  'strip', 'fetish', 'hentai', 'aroused', 'cleavage', 'thong', 'camel',
  'cum', 'milf', 'dildo', 'anal', 'oral sex', 'blowjob', 'handjob', 'hookup',
  'escort', 'onlyfans', 'cam girl', 'camgirl', 'playboy', 'playmate',
  'gay sex', 'lesbian sex', 'bisexual', 'queer sex', 'transsexual',
  // Violence
  'gore', 'gory', 'beheading', 'decapitat', 'massacre', 'execution', 'torture',
  'mutilat', 'dismember', 'bloodbath', 'snuff', 'self-harm', 'suicide method',
  'shoot up', 'school shooting', 'mass shooting', 'terrorist attack',
  // Hate speech / bad language
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'asshole', 'bastard', 'slut',
  'whore', 'retard', 'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'tranny',
  'chink', 'spic', 'kike', 'nazi', 'racist slur',
  // Copyright
  'pirated', 'torrent', 'cracked', 'leaked movie', 'leaked film',
  'full movie free', 'watch free movie', 'download movie free',
  'copyright infringement', 'unauthorized copy',
];

export type NsfwResult = {
  flagged: boolean;
  reason: string | null;
  matchedKeywords: string[];
};

export function checkNsfw(text: string): NsfwResult {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const keyword of NSFW_KEYWORDS) {
    if (lower.includes(keyword)) {
      matched.push(keyword);
    }
  }

  if (matched.length > 0) {
    const category = categorizeKeyword(matched[0]);
    return {
      flagged: true,
      reason: `Auto-flagged: ${category} content detected (${matched.length} match${matched.length > 1 ? 'es' : ''})`,
      matchedKeywords: matched,
    };
  }

  return { flagged: false, reason: null, matchedKeywords: [] };
}

function categorizeKeyword(keyword: string): string {
  const sexual = ['porn', 'xxx', 'nude', 'nudity', 'naked', 'sex', 'sexual', 'erotic',
    'masturbat', 'orgasm', 'genital', 'penis', 'vagina', 'breast', 'boob', 'topless',
    'lingerie', 'strip', 'fetish', 'hentai', 'aroused', 'cleavage', 'thong', 'camel',
    'cum', 'milf', 'dildo', 'anal', 'oral sex', 'blowjob', 'handjob', 'hookup',
    'escort', 'onlyfans', 'cam girl', 'camgirl', 'playboy', 'playmate',
    'gay sex', 'lesbian sex', 'bisexual', 'queer sex', 'transsexual'];
  const violence = ['gore', 'gory', 'beheading', 'decapitat', 'massacre', 'execution',
    'torture', 'mutilat', 'dismember', 'bloodbath', 'snuff', 'self-harm', 'suicide method',
    'shoot up', 'school shooting', 'mass shooting', 'terrorist attack'];
  const language = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'asshole', 'bastard',
    'slut', 'whore', 'retard', 'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'tranny',
    'chink', 'spic', 'kike', 'nazi', 'racist slur'];
  const copyright = ['pirated', 'torrent', 'cracked', 'leaked movie', 'leaked film',
    'full movie free', 'watch free movie', 'download movie free',
    'copyright infringement', 'unauthorized copy'];

  if (sexual.includes(keyword)) return 'sexual/nudity';
  if (violence.includes(keyword)) return 'violence';
  if (language.includes(keyword)) return 'profanity/hate speech';
  if (copyright.includes(keyword)) return 'copyright violation';
  return 'inappropriate';
}
