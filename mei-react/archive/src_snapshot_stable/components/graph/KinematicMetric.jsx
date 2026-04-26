import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function KinematicMetric({ value, decimals = 1, prefix = '', suffix = '' }) {
  // A stiff, non-bouncing spring that feels like a precision industrial instrument racing to its target
  const spring = useSpring(0, { stiffness: 60, damping: 18, bounce: 0 });
  
  // Hook the raw changing float into an accurately formatted UI display string 
  const display = useTransform(spring, (v) => {
    const formatted = v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    // For specific locales/apple aesthetics, swap commas for thin spaces if preferred, but en-US commas are standard
    return `${prefix}${formatted}${suffix}`;
  });
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  
  return <motion.span>{display}</motion.span>;
}
