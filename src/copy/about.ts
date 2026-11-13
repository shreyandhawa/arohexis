export const about = {
  title: 'About',
  intro:
    "Arohexis helps you practice one thing: starting. When you're stuck, tap the button, name the feeling, and take a two-minute first step.",
  notMedicalAdvice:
    "Arohexis is a self-help tool, not medical advice. It doesn't diagnose or treat ADHD, depression, anxiety or any other condition. If procrastination is seriously affecting your life, consider talking to a qualified professional.",
  brainSpaceTitle: 'Brain space',
  brainSpace:
    "Brain space draws your starts as lines of light in the shape of a brain. It's a picture of your starts, not a scan, and the shape is the same for everyone. Arohexis makes no claim that your brain changes. How automatic starting feels is what the weekly check-in measures.",
  evidenceTitle: 'What the evidence says',
  evidenceIntro:
    'Each claim below comes from a published source, with the limits we know of. Wording stays cautious on purpose.',
  sourceLabel: 'Source',
  caveatLabel: 'Limits',
  basisTitle: 'Where the responses come from',
  basisIntro: 'Each built-in response has one basis. Here is the source for each.',
  checkinTitle: 'The weekly check-in',
  version: (version: string, sha: string): string => `Version ${version}, build ${sha}`,
} as const;

export type Source = { text: string; href?: string };
export type Evidence = {
  id: string;
  claim: string;
  sources: readonly Source[];
  caveat: string;
};

export const evidence: readonly Evidence[] = [
  {
    id: 'mood-repair',
    claim:
      'Procrastination is mostly about avoiding the bad feeling a task brings: a short-term mood repair.',
    sources: [
      {
        text: 'Sirois, F. & Pychyl, T. (2013). Procrastination and the priority of short-term mood regulation. Social and Personality Psychology Compass, 7(2), 115–127.',
        href: 'https://doi.org/10.1111/spc3.12011',
      },
      {
        text: 'APA Speaking of Psychology, "Why we procrastinate and what to do about it," with Fuschia Sirois (2022).',
        href: 'https://www.apa.org/news/podcasts/speaking-of-psychology/procrastinate',
      },
    ],
    caveat: 'Theoretical review. The podcast is an interview, not a study.',
  },
  {
    id: 'effort-discounting',
    claim: 'People discount future effort more steeply than future reward.',
    sources: [
      {
        text: 'Le Bouc, R. & Pessiglione, M. (2022). A neuro-computational account of procrastination behavior. Nature Communications, 13, 5639.',
        href: 'https://doi.org/10.1038/s41467-022-33119-w',
      },
    ],
    caveat: 'Small lab study (N=51).',
  },
  {
    id: 'treatments',
    claim:
      'Psychological treatments show small benefits for procrastination; CBT looks promising in a few trials.',
    sources: [
      {
        text: 'Rozental, A. et al. (2018). Targeting procrastination using psychological treatments: a systematic review and meta-analysis. Frontiers in Psychology, 9, 1588.',
        href: 'https://www.frontiersin.org/article/10.3389/fpsyg.2018.01588/full',
      },
    ],
    caveat:
      'Overall g=0.34; the CBT estimate (g=0.55) rests on 3 studies; the authors call CBT\'s superiority "unclear".',
  },
  {
    id: 'if-then',
    claim: 'If-then plans help people act on their goals.',
    sources: [
      {
        text: 'Gollwitzer, P. M. & Sheeran, P. (2006). Implementation intentions and goal achievement: a meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69–119.',
        href: 'https://doi.org/10.1016/S0065-2601(06)38002-1',
      },
    ],
    caveat: 'd=.65 across 94 tests, on goal attainment in general rather than procrastination.',
  },
  {
    id: 'self-forgiveness',
    claim: 'Forgiving yourself for procrastinating is associated with less procrastination later.',
    sources: [
      {
        text: 'Wohl, M. J. A., Pychyl, T. A. & Bennett, S. H. (2010). I forgive myself, now I can study. Personality and Individual Differences, 48(7), 803–808.',
        href: 'https://doi.org/10.1016/j.paid.2010.01.029',
      },
    ],
    caveat: 'Correlational; one student sample.',
  },
  {
    id: 'habit-time',
    claim:
      'In one review, habits took a median of about two months (59–66 days) to form, with a range of 4–335 days.',
    sources: [
      {
        text: 'Singh, Murphy, Maher & Smith (2024). Time to form a habit: a systematic review and meta-analysis of health behaviour habit formation and its determinants. Healthcare, 12(23), 2488.',
        href: 'https://doi.org/10.3390/healthcare12232488',
      },
    ],
    caveat: 'Only 4 studies reported timing; a stable cue is thought to help but was not tested.',
  },
  {
    id: 'naming-feelings',
    claim:
      'Naming your feelings and breaking a task into a first step made people feel more likely to start.',
    sources: [
      {
        text: 'Garg, Shelat & Schooler (2025). "Now I feel like I\'m going to get to it soon…" BMC Psychology, 13, 1158 (RCT, N=1,035).',
      },
    ],
    caveat: 'Measured self-reported likelihood, not actual completion.',
  },
  {
    id: 'weekly-check-in',
    claim: 'The weekly check-in uses a published habit measure.',
    sources: [
      {
        text: 'Gardner, B., Abraham, C., Lally, P. & de Bruijn, G.-J. (2012). Towards parsimony in habit measurement: the Self-Report Behavioural Automaticity Index. IJBNPA, 9, 102. (CC BY)',
        href: 'https://doi.org/10.1186/1479-5868-9-102',
      },
    ],
    caveat: 'Self-report.',
  },
  {
    id: 'two-minute-start',
    claim: 'The two-minute start.',
    sources: [{ text: 'None.' }],
    caveat: 'Presented as a practical technique. No trial has tested it.',
  },
];
