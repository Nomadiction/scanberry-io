import { motion } from 'motion/react';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center p-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="primary">
          {retryLabel}
        </Button>
      )}
    </motion.div>
  );
};
