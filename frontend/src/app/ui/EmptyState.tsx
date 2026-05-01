import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { SPRING_CONFIG } from '../lib/constants';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_CONFIG}
      className="flex flex-col items-center justify-center text-center px-6 py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...SPRING_CONFIG, delay: 0.1 }}
        className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4"
      >
        <Icon className="w-6 h-6 text-muted-foreground/60" />
      </motion.div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </motion.div>
  );
};
