import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, required, disabled, readOnly, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy shadow-sm transition placeholder:text-s-muted focus:border-s-accent focus:outline-none focus:ring-2 focus:ring-s-accent/20',
        className
      )}
      required={required === true ? true : undefined}
      disabled={disabled === true ? true : undefined}
      readOnly={readOnly === true ? true : undefined}
      {...props}
    />
  )
);
Input.displayName = 'Input';
