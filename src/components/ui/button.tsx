import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'hero' | 'heroOutline';
  size?: 'sm' | 'md' | 'lg';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, type, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const sizes = {
      sm: 'rounded-md px-4 py-2 text-sm',
      md: 'rounded-md px-5 py-2.5 text-sm',
      lg: 'rounded-md px-8 py-3.5 text-base',
    };
    const variants = {
      primary:
        'bg-s-accent text-white shadow-lg shadow-s-accent/25 hover:bg-s-accent-hover focus-visible:outline-s-accent',
      secondary: 'bg-s-navy text-white shadow-md hover:bg-s-navy-soft focus-visible:outline-s-navy',
      ghost:
        'rounded-md bg-transparent text-s-navy hover:bg-slate-100 border border-s-border/80 hover:border-s-border',
      danger: 'rounded-md bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
      hero: 'rounded-md bg-white text-brand shadow-xl hover:bg-white/95 focus-visible:outline-white',
      heroOutline:
        'rounded-md border-2 border-white/70 bg-transparent text-white hover:bg-white/10 focus-visible:outline-white',
    };
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
        disabled={disabled === true}
      />
    );
  }
);
Button.displayName = 'Button';
