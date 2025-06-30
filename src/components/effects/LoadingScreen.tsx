import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  isLoading: boolean;
  className?: string;
}

export function LoadingScreen({ isLoading, className }: LoadingScreenProps) {
  const [loadingText, setLoadingText] = useState('Initializing');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isLoading) return;

    const messages = [
      'Initializing',
      'Loading neural networks',
      'Establishing connections',
      'Synchronizing agents',
      'Preparing interface',
      'Almost ready'
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingText(messages[messageIndex]);
    }, 2000);

    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(dotsInterval);
    };
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={cn(
            'fixed inset-0 z-50 bg-background flex items-center justify-center',
            className
          )}
        >
          <div className="relative">
            {/* Animated logo */}
            <motion.div
              className="relative w-48 h-48 mb-8"
              animate={{
                rotate: 360
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear'
              }}
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              
              {/* Middle ring */}
              <motion.div
                className="absolute inset-4 rounded-full border-4 border-primary/40"
                animate={{
                  rotate: -720
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
              
              {/* Inner ring */}
              <motion.div
                className="absolute inset-8 rounded-full border-4 border-primary/60"
                animate={{
                  rotate: 1080
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
              
              {/* Center logo */}
              <div className="absolute inset-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">LEX</span>
              </div>
            </motion.div>

            {/* Loading text */}
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">
                <span className="text-primary">LEXOS</span> Genesis
              </h1>
              <p className="text-muted-foreground text-lg">
                {loadingText}{dots}
              </p>
            </div>

            {/* Progress indicators */}
            <div className="flex justify-center mt-8 space-x-2">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>

            {/* Tech details */}
            <motion.div
              className="mt-12 text-center text-xs text-muted-foreground/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <p>Advanced AI Operating System</p>
              <p>Version 1.0.0</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}