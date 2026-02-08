export type BotAction =
  | { type: 'skip'; answer: string }
  | { type: 'funny'; answer: string }
  | { type: 'correct' };
