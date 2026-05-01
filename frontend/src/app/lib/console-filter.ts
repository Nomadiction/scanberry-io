const originalWarn = console.warn;

const suppressedMessages = [
  'HapticFeedback is not supported',
  'Closing confirmation is not supported',
  '[Telegram.WebApp] HapticFeedback',
  '[Telegram.WebApp] Closing confirmation',
];

console.warn = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (!suppressedMessages.some(s => message.includes(s))) {
    originalWarn.apply(console, args);
  }
};

export {};
