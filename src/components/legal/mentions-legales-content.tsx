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
      <LegalSection id="editeur" title="1. Fournisseur du service">
        <p>
          {brandOfCompanySentence()} Le site et l&apos;application de facturation en ligne{' '}
          <strong>{L.brand}</strong> sont fournis par :
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>{companyLegalLabel()}</strong>
          </li>
          <li>Siège social : {formatLegalAddress()}</li>
          <li>NEQ (Registre des entreprises du Québec) : {L.neq}</li>
          <li>Numéro d&apos;entreprise fédéral (BN) : {L.bn}</li>
          <li>Numéro TPS : {L.tpsNumber}</li>
          <li>Numéro TVQ : {L.tvqNumber}</li>
          <li>
            Courriel :{' '}
            <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
              {L.contactEmail}
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="responsable" title="2. Responsable des communications">
        <p>
          Le responsable des communications est <strong>{L.director}</strong>, à titre de
          représentant de {L.companyName}.
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
          Les données applicatives (comptes, factures, soumissions) peuvent être stockées sur des
          infrastructures infonuagiques conformes à nos exigences de sécurité. Lorsque les données
          sont hébergées hors du {L.province}, des mesures contractuelles appropriées sont mises en
          place conformément à la Loi 25 (Québec) et à la LPRPDE.
        </p>
      </LegalSection>

      <LegalSection id="propriete" title="4. Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments composant le service {L.brand} (textes, graphismes,
          logiciels, bases de données, logos, marques) est protégé par les lois canadiennes sur le
          droit d&apos;auteur et les marques de commerce. Toute reproduction, représentation ou
          exploitation non autorisée est interdite.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="5. Renseignements personnels">
        <p>
          {L.companyName} traite des renseignements personnels dans le cadre du service {L.brand}{' '}
          conformément à la Loi sur la protection des renseignements personnels et les documents
          électroniques (LPRPDE) et à la Loi modernisant des dispositions législatives en matière de
          protection des renseignements personnels (Loi 25, Québec). Les modalités détaillées
          figurent dans notre{' '}
          <Link href="/politique-de-confidentialite" className="text-emerald-700 underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <p>
          Pour toute demande relative à vos renseignements personnels :{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="6. Témoins de connexion (cookies)">
        <p>
          Le service peut utiliser des témoins strictement nécessaires au fonctionnement (session,
          authentification) et, le cas échéant, des outils de mesure d&apos;audience soumis à votre
          consentement. Vous pouvez configurer votre navigateur pour refuser les témoins non
          essentiels.
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
        <strong>Note :</strong> certains identifiants légaux (NEQ, BN, TPS, TVQ, hébergeur) sont
        indiqués sous forme de placeholders. Mettez à jour les variables{' '}
        <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_LEGAL_*</code> avant la mise en
        production.
      </p>
    </>
  );
}
