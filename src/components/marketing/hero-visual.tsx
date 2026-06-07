import Image from 'next/image';

/** Visuel hero fourni (indépendant + tablette SoftFacture). */
const HERO_IMAGE = '/hero-softfacture-france.png';

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none lg:ms-auto">
      <div className="relative overflow-hidden rounded-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200/80">
        <Image
          src={HERO_IMAGE}
          alt="Indépendant utilisant SoftFacture sur tablette pour gérer ses devis et factures"
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
