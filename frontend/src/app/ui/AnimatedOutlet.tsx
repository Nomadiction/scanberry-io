import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useOutlet } from 'react-router';
import { TRANSITION_PAGE } from '../lib/constants';

// Transform-only: cheap to composite, no layout / paint per frame.
const variants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  // AnimatePresence snapshots the rendered element when the key changes, so the
  // exiting screen keeps its own outlet — no manual ref freeze needed.
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={TRANSITION_PAGE}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
