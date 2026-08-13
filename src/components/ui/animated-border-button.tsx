'use client';
import * as React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// A glowing dot that chases around the button's border, looping forever.
export function AnimatedBorderButton({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button className={cn('relative', className)} {...props}>
      <div
        className={cn(
          '-inset-px pointer-events-none absolute rounded-[inherit] border-2 border-transparent',
          '[mask-clip:padding-box,border-box] [mask-composite:intersect]',
          '[mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]'
        )}
      >
        <motion.div
          className="absolute aspect-square bg-gradient-to-r from-transparent via-primary to-primary"
          animate={{ offsetDistance: ['0%', '100%'] }}
          style={{ width: 20, offsetPath: 'rect(0 auto auto 0 round 10px)' }}
          transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
        />
      </div>
      {children}
    </Button>
  );
}
