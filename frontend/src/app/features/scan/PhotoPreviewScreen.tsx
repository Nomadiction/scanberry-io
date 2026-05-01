import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { useTelegram } from '../../lib/telegram';
import { useScan } from './ScanContext';
import { RotateCcw, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

export const PhotoPreviewScreen = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { previewUrl, file } = useScan();

  useEffect(() => {
    if (!file || !previewUrl) {
      navigate('/scan', { replace: true });
    }
  }, [file, previewUrl, navigate]);

  if (!previewUrl) return null;

  const handleRetake = () => {
    haptic.light();
    navigate(-1);
  };

  const handleAnalyze = () => {
    haptic.medium();
    navigate('/analysis/loading');
  };

  return (
    <div className="min-h-screen-safe bg-black flex flex-col">
      {/* Image preview */}
      <motion.div
        className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <img
          src={previewUrl}
          alt="Captured plant photo"
          className="max-w-full max-h-full object-contain"
        />
      </motion.div>

      {/* Bottom actions */}
      <motion.div
        className="p-6 pb-safe bg-gradient-to-t from-black/90 via-black/50 to-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-center text-white/60 text-[13px] mb-4">
          Review your photo before analysis
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleRetake}
            variant="secondary"
            className="flex-1 bg-white/10 text-white hover:bg-white/20 border-0 rounded-xl"
            size="lg"
            aria-label="Retake photo"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake
          </Button>
          <Button
            onClick={handleAnalyze}
            className="flex-1 rounded-xl"
            size="lg"
          >
            Analyze
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
