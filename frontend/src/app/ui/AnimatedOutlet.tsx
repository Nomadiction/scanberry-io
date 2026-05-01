import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useOutlet } from 'react-router';
import { useRef } from 'react';
import { TRANSITION_PAGE } from '../lib/constants';

const variants = {
  enter: { opacity: 0, y: 10, scale: 0.995 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.995 },
};

export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  // Freeze the outlet element for exit animation
  const outletRef = useRef(outlet);
  const keyRef = useRef(location.pathname);

  if (location.pathname !== keyRef.current) {
    outletRef.current = outlet;
    keyRef.current = location.pathname;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={TRANSITION_PAGE}
        style={{ willChange: 'opacity, transform' }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
