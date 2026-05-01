import WebApp from '@twa-dev/sdk';

function safeCall(fn: () => void) {
  try { fn(); } catch { /* not supported */ }
}

const haptic = {
  light: () => safeCall(() => WebApp.HapticFeedback.impactOccurred('light')),
  medium: () => safeCall(() => WebApp.HapticFeedback.impactOccurred('medium')),
  heavy: () => safeCall(() => WebApp.HapticFeedback.impactOccurred('heavy')),
  success: () => safeCall(() => WebApp.HapticFeedback.notificationOccurred('success')),
  warning: () => safeCall(() => WebApp.HapticFeedback.notificationOccurred('warning')),
  error: () => safeCall(() => WebApp.HapticFeedback.notificationOccurred('error')),
  selection: () => safeCall(() => WebApp.HapticFeedback.selectionChanged()),
};

const mainButton = {
  show: (text: string, onClick: () => void) => {
    WebApp.MainButton.setText(text);
    WebApp.MainButton.show();
    WebApp.MainButton.onClick(onClick);
  },
  hide: () => WebApp.MainButton.hide(),
  enable: () => WebApp.MainButton.enable(),
  disable: () => WebApp.MainButton.disable(),
  showProgress: () => safeCall(() => WebApp.MainButton.showProgress(true)),
  hideProgress: () => safeCall(() => WebApp.MainButton.hideProgress()),
};

const backButton = {
  show: (onClick: () => void) => {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(onClick);
  },
  hide: () => WebApp.BackButton.hide(),
};

const init = () => {
  WebApp.ready();
  WebApp.expand();
  safeCall(() => WebApp.enableClosingConfirmation());
};

const close = () => WebApp.close();

const telegramApi = {
  webApp: WebApp,
  init,
  haptic,
  themeParams: WebApp.themeParams,
  colorScheme: WebApp.colorScheme,
  mainButton,
  backButton,
  close,
  user: WebApp.initDataUnsafe?.user,
} as const;

export const useTelegram = () => telegramApi;

export const getTelegramTheme = (): 'light' | 'dark' => {
  return WebApp.colorScheme === 'dark' ? 'dark' : 'light';
};

export default WebApp;
