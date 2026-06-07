import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { BRAND_LOGO_SRC } from '@/lib/brand-assets';
import { APP_BRAND } from '@/lib/app-brand';
import { cn } from '@/lib/utils';

type Props = {
  href?: string;
  className?: string;
  imageClassName?: string;
  /** Afficher le nom à côté du logo (accessibilité / petits écrans). */
  showName?: boolean;
  priority?: boolean;
};

export function BrandLogo({
  href = '/',
  className,
  imageClassName,
  showName = false,
  priority = false,
}: Props) {
  const content = (
    <>
      <Image
        src={BRAND_LOGO_SRC}
        alt={APP_BRAND}
        width={200}
        height={48}
        priority={priority}
        className={cn('h-8 w-auto max-w-[180px] object-contain object-left sm:h-9', imageClassName)}
      />
      {showName ? <span className="sr-only">{APP_BRAND}</span> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('inline-flex items-center', className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn('inline-flex items-center', className)}>{content}</div>;
}
