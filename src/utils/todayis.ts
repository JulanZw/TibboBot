import { BotAction } from './typesAndInterfaces';

const funnyWrongAnswers = [
  'Yesterday',
  'Tomorrow',
  'Opposite Day',
  'Error 404: Day Not Found',
  'Caturday 🐱',
  'Waffle Wednesday',
  'Smonday',
  'National Nap Day',
  'Second Friday of the week',
  'Pizza Day (every day tbh)',
  'Daylight Saving Time Again?!',
  'Insert Day Here',
  'The Day After Never',
  'Monday 2: Electric Boogaloo',
  'Groundhog Day (again...)',
  'Free Taco Day 🌮',
  'Half-Past Tuesday',
  'Some Random Tuesday in 1997',
  'Pre-Friday Eve',
  'The Day The WiFi Died',
  'International Procrastination Day',
  'Today Jr.!',
];

function getRandomFunnyAnswer(): string {
  return funnyWrongAnswers[
    Math.floor(Math.random() * funnyWrongAnswers.length)
  ];
}

export function getBotAction(dumbScore: number): BotAction {
  dumbScore = Math.max(0, Math.min(10, dumbScore));

  const roll = Math.random(); // 0..1

  if (dumbScore >= 10) {
    return { type: 'skip', answer: '😴' };
  } else if (dumbScore >= 7) {
    if (roll < 0.4) return { type: 'skip', answer: '😴' };
    if (roll < 0.4 + 0.5)
      return { type: 'funny', answer: getRandomFunnyAnswer() };
  } else if (dumbScore >= 4) {
    if (roll < 0.3) return { type: 'skip', answer: '😴' };
    if (roll < 0.3 + 0.4)
      return { type: 'funny', answer: getRandomFunnyAnswer() };
  } else {
    if (roll < 0.05) return { type: 'skip', answer: '😴' };
    if (roll < 0.05 + 0.05)
      return { type: 'funny', answer: getRandomFunnyAnswer() };
  }

  return { type: 'correct' };
}

const defeatedMessages = {
  playful: [
    'You win this time... 😔',
    "Foiled again! I'll get you tomorrow!",
    'Heh, lucky guess! 😉',
    'A worthy opponent, gg! ✨',
    'You’re fast! But I’m learning... slowly...',
  ],
  salty: [
    'Argh, bested by a human!',
    'Fine... today belongs to you.',
    'Okay, okay, take your victory... for now.',
    'Tch. I was distracted. Doesn’t count!',
  ],
  dramatic: [
    'You may have won the battle, but the war isn’t over!',
    'Today is-',
    'Dang it! I was *so* close this time!',
    'Defeat... it stings. But I’ll rise again.',
    'CURSES! Foiled at the final second!',
  ],
};

export function getDefeatedMessage(dumbScore: number): string {
  let category: keyof typeof defeatedMessages;

  if (dumbScore >= 7) {
    category = 'playful';
  } else if (dumbScore >= 4) {
    category = 'salty';
  } else {
    category = 'dramatic';
  }

  const options = defeatedMessages[category];
  return options[Math.floor(Math.random() * options.length)];
}
