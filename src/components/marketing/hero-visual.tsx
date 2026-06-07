import Image from 'next/image';

/** Visuel hero SoftFacture Canada. */
const HERO_IMAGE = '/image softfacture Canada.png';

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none lg:ms-auto">
      <div className="relative overflow-hidden rounded-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200/80">
        <Image
          src={HERO_IMAGE}
          alt="PME canadienne utilisant SoftFacture pour gérer ses soumissions, factures et paiements"
          width={1200}
          height={900}
          className="h-auto w-full object-contain"
          priority
          sizes="(max-width: 1024px) 100vw, 560px"
        />
      </div>
    </div>
  );
}
