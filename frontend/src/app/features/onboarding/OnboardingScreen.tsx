import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { useTelegram } from '../../lib/telegram';
import { SPRING_CONFIG, STAGGER_DELAY } from '../../lib/constants';
import { Leaf, Scan, History, Zap } from 'lucide-react';

const features = [
  {
    icon: Scan,
    title: 'AI-Powered Analysis',
    description: 'Advanced ML pipeline detects plant health in seconds',
  },
  {
    icon: Leaf,
    title: 'Precise Diagnostics',
    description: 'Pixel-level damage segmentation and classification',
  },
  {
    icon: History,
    title: 'Track History',
    description: 'Monitor plant health over time with full analysis history',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    description: 'Get detailed health reports in under 2 seconds',
  },
];

export const OnboardingScreen = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const handleGetStarted = () => {
    haptic.light();
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/home');
  };

  return (
    <div className="min-h-screen-safe bg-background flex flex-col">
      {/* Header */}
      <motion.div
        className="px-6 pt-safe pb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRING_CONFIG, delay: 0.2 }}
        >
          <Leaf className="w-8 h-8 text-primary" />
        </motion.div>
        <h1 className="text-2xl mb-2">Blueberry Health</h1>
        <p className="text-muted-foreground">
          AI-powered plant diagnostics for <em>Vaccinium corymbosum</em> L.
        </p>
      </motion.div>

      {/* Features */}
      <div className="flex-1 px-6 py-8">
        <motion.div
          className="rounded-xl border border-border bg-card overflow-hidden max-w-md mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + index * STAGGER_DELAY * 2 }}
              className={index > 0 ? 'border-t border-border' : ''}
            >
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-[18px] h-[18px] text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-medium">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        className="px-6 pb-safe"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          onClick={handleGetStarted}
          className="w-full"
          size="lg"
        >
          Get Started
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">
          Take a photo or upload an image to analyze plant health
        </p>
      </motion.div>
    </div>
  );
};