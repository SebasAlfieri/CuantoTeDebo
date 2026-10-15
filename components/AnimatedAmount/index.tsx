'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

import { formatNumber } from '@/lib/split';

interface AnimatedAmountProps {
  value: number;
  className?: string;
}

// Muestra un monto que "cuenta" hasta su nuevo valor cuando cambia.
const AnimatedAmount = ({ value, className }: AnimatedAmountProps) => {
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const text = useTransform(
    motionValue,
    (latest) => `$${formatNumber(Math.round(latest * 100) / 100)}`
  );

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, motionValue, shouldReduceMotion]);

  return <motion.span className={className}>{text}</motion.span>;
};

export default AnimatedAmount;
