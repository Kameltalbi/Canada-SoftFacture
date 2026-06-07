import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsSectionHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex items-start gap-4 border-b border-s-border/60 pb-5', className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-brand shadow-sm ring-1 ring-blue-100">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-s-navy">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-s-muted">{description}</p> : null}
      </div>
    </div>
  );
}
