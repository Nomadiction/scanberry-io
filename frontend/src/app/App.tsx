import './lib/console-filter'; // Suppress expected Telegram SDK warnings
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { ThemeProvider } from './providers/ThemeProvider';
import { LocaleProvider } from './providers/LocaleProvider';
import { QueryProvider } from './providers/QueryProvider';
import { ScanProvider } from './features/scan/ScanContext';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { router } from './routes';
import { useEffect } from 'react';
import { useTelegram } from './lib/telegram';

function TelegramInit() {
  const { init } = useTelegram();

  useEffect(() => {
    init();
  }, []);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <LocaleProvider>
      <ThemeProvider>
        <QueryProvider>
          <ScanProvider>
            <MotionConfig reducedMotion="user">
              <TelegramInit />
              <RouterProvider router={router} />
            </MotionConfig>
          </ScanProvider>
        </QueryProvider>
      </ThemeProvider>
      </LocaleProvider>
    </ErrorBoundary>
  );
}