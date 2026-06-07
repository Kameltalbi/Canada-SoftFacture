import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Wordmark texte « softfacture. » (logo marketing / auth). */
export function BrandWordmark({ className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline text-[1.65rem] font-bold tracking-tight',
        className
      )}
      aria-label="softfacture"
    >
      <span className="text-s-navy">soft</span>
      <span className="text-brand-blue">facture</span>
      <span
        className="ms-0.5 inline-block h-2 w-2 translate-y-[-2px] rounded-full bg-brand"
        aria-hidden
      />
    </span>
  );
}
