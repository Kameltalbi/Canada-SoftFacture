import {
  LEGAL_SITE,
  brandOfCompanySentence,
  companyLegalLabel,
  formatLegalAddress,
} from '@/lib/legal-site';
import { LegalSection } from '@/components/legal/legal-page-layout';
import { Link } from '@/i18n/navigation';

export function MentionsLegalesContent() {
  const L = LEGAL_SITE;

  return (
    <>
      <LegalSection id="editeur" title="1. Éditeur du site">
        <p>
          {brandOfCompanySentence()} Le site et l&apos;application de facturation en ligne{' '}
          <strong>{L.brand}</strong> sont édités par :
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>{companyLegalLabel()}</strong>
          </li>
          <li>Siège social : {formatLegalAddress()}</li>
          <li>SIRET : {L.siret}</li>
          <li>N° TVA intracommunautaire : {L.vatNumber}</li>
          <li>RCS : {L.rcs}</li>
          <li>Capital social : {L.shareCapital}</li>
          <li>
            Contact :{' '}
            <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
              {L.contactEmail}
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="publication" title="2. Directeur de la publication">
        <p>
          Le directeur de la publication est <strong>{L.director}</strong>, en sa qualité de
          représentant légal de {L.companyName}.
        </p>
      </LegalSection>

      <LegalSection id="hebergeur" title="3. Hébergement">
        <p>Le site et l&apos;application sont hébergés par :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>{L.hostName}</strong>
          </li>
          <li>{L.hostAddress}</li>
        </ul>
        <p className="text-slate-600">
          Les données applicatives (comptes clients, factures, devis) peuvent également être
          stockées sur des infrastructures cloud conformes aux exigences de sécurité et de
          localisation définies dans nos contrats d&apos;hébergement.
        </p>
      </LegalSection>

      <LegalSection id="propriete" title="4. Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments composant le service {L.brand} (textes, graphismes,
          logiciels, bases de données, logos, marques) est protégé par le droit de la propriété
          intellectuelle. Toute reproduction, représentation ou exploitation non autorisée est
          interdite.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="5. Données personnelles">
        <p>
          {L.companyName} traite des données personnelles dans le cadre du service {L.brand}. Les
          modalités détaillées (finalités, durées, droits, sous-traitants) figurent dans notre{' '}
          <Link href="/politique-de-confidentialite" className="text-emerald-700 underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <p>
          Pour toute demande relative à vos données :{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies et traceurs">
        <p>
          Le service peut utiliser des cookies strictement nécessaires au fonctionnement (session,
          authentification) et, le cas échéant, des mesures d&apos;audience soumises à votre
          consentement lorsque la réglementation l&apos;exige. Vous pouvez paramétrer votre
          navigateur pour refuser les cookies non essentiels.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="7. Contact">
        <p>
          Pour toute question relative au site ou au service :{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
        <strong>Note :</strong> certains identifiants légaux (SIRET, RCS, hébergeur) sont indiqués
        sous forme de placeholders tant que la société éditrice n&apos;a pas finalisé son
        immatriculation. Mettez à jour les variables{' '}
        <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_LEGAL_*</code> avant la mise en
        production.
      </p>
    </>
  );
}
