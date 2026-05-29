import { motion } from 'motion/react';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';
import { useLocale } from '../lib/i18n';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState = ({
  title,
  message,
  onRetry,
  retryLabel,
}: ErrorStateProps) => {
  const { t } = useLocale();
  const titleText = title ?? t('common.somethingWentWrong');
  const messageText = message ?? t('common.unexpectedError');
  const retryText = retryLabel ?? t('common.tryAgain');
  return (
    <motion.div
      className="flex flex-col items-center justify-center p-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold mb-2">{titleText}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{messageText}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="primary">
          {retryText}
        </Button>
      )}
    </motion.div>
  );
};
