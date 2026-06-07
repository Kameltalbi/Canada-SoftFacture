import {
  LEGAL_SITE,
  brandOfCompanySentence,
  companyLegalLabel,
  formatLegalAddress,
} from '@/lib/legal-site';
import { LegalSection } from '@/components/legal/legal-page-layout';
import { Link } from '@/i18n/navigation';

export function PolitiqueConfidentialiteContent() {
  const L = LEGAL_SITE;
  const dpoEmail = process.env.NEXT_PUBLIC_LEGAL_DPO_EMAIL ?? L.contactEmail;

  return (
    <>
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          {brandOfCompanySentence()} La présente politique de confidentialité décrit comment{' '}
          <strong>{companyLegalLabel()}</strong> (ci-après « nous », la « Société »), éditeur de la
          marque <strong>{L.brand}</strong>, collecte et traite les données à caractère personnel
          dans le cadre du service en ligne de facturation et de devis, accessible depuis le site et
          l&apos;application web.
        </p>
        <p>
          Nous nous engageons à respecter le Règlement (UE) 2016/679 (RGPD) et la loi n° 78-17 du 6
          janvier 1978 modifiée (« Informatique et Libertés »).
        </p>
      </LegalSection>

      <LegalSection id="roles" title="2. Responsable de traitement et sous-traitance">
        <p>
          <strong>Données de compte et d&apos;abonnement</strong> (inscription, facturation SaaS,
          support) : {L.companyName}, {formatLegalAddress()} —{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
          .
        </p>
        <p>
          <strong>Données saisies par l&apos;Utilisateur dans le Service</strong> (clients finaux,
          factures, devis, produits, coordonnées bancaires sur documents, etc.) : en principe,{' '}
          l&apos;Utilisateur (votre entreprise) agit en <strong>responsable de traitement</strong>{' '}
          pour ses propres clients et contacts ; {L.companyName} agit en{' '}
          <strong>sous-traitant</strong> au sens de l&apos;article 28 du RGPD, pour héberger et
          traiter ces données selon vos instructions et notre documentation contractuelle (
          <Link href="/cgv" className="text-emerald-700 underline">
            CGV/CGU
          </Link>
          ).
        </p>
      </LegalSection>

      <LegalSection id="donnees-collectees" title="3. Données collectées">
        <p>
          <strong>3.1 Compte utilisateur et abonnement</strong>
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Identité : nom, prénom, raison sociale</li>
          <li>Contact : adresse email, téléphone (si renseigné)</li>
          <li>Connexion : mot de passe (stocké de manière hachée), journaux techniques</li>
          <li>Facturation : SIRET, n° TVA, adresse de facturation, historique d&apos;abonnement</li>
          <li>
            Paiement : données gérées par le prestataire de paiement (ex. Stripe), non stockées en
            clair par {L.brand}
          </li>
        </ul>
        <p>
          <strong>3.2 Utilisation du Service</strong>
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Données relatives à vos clients, produits, factures, devis, paiements enregistrés</li>
          <li>Paramètres organisation (logo, mentions, modèles PDF, langue des documents)</li>
          <li>
            Données de connexion : adresse IP, horodatages, type de navigateur (sécurité et support)
          </li>
        </ul>
        <p>
          <strong>3.3 Données que nous ne collectons pas volontairement</strong>
        </p>
        <p>
          Nous ne demandons pas de données sensibles au sens de l&apos;article 9 du RGPD (origine
          raciale, santé, etc.). Évitez d&apos;en saisir dans les champs libres du Service.
        </p>
      </LegalSection>

      <LegalSection id="finalites" title="4. Finalités et bases légales">
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[480px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-2 py-2 font-semibold">Finalité</th>
                <th className="px-2 py-2 font-semibold">Base légale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-2 py-2">Création et gestion du compte</td>
                <td className="px-2 py-2">Exécution du contrat (art. 6.1.b RGPD)</td>
              </tr>
              <tr>
                <td className="px-2 py-2">Fourniture du Service (facturation, devis)</td>
                <td className="px-2 py-2">Exécution du contrat</td>
              </tr>
              <tr>
                <td className="px-2 py-2">Facturation et recouvrement de l&apos;abonnement</td>
                <td className="px-2 py-2">Contrat / obligation légale comptable</td>
              </tr>
              <tr>
                <td className="px-2 py-2">Support client et sécurité</td>
                <td className="px-2 py-2">Intérêt légitime / contrat</td>
              </tr>
              <tr>
                <td className="px-2 py-2">Amélioration du Service (statistiques agrégées)</td>
                <td className="px-2 py-2">Intérêt légitime</td>
              </tr>
              <tr>
                <td className="px-2 py-2">Prospection B2B (newsletter, si consentement)</td>
                <td className="px-2 py-2">Consentement (art. 6.1.a)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="destinataires" title="5. Destinataires et sous-traitants">
        <p>Les données peuvent être communiquées à :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Personnel habilité de {L.companyName}</li>
          <li>
            Hébergeur et prestataires techniques : {L.hostName} ({L.hostAddress})
          </li>
          <li>Prestataire de paiement (abonnement en ligne)</li>
          <li>Autorités compétentes sur demande légale</li>
        </ul>
        <p>
          Nos sous-traitants sont choisis pour leurs garanties de sécurité et, lorsque requis, font
          l&apos;objet de clauses contractuelles types (transferts hors UE) ou sont situés dans
          l&apos;Union européenne.
        </p>
      </LegalSection>

      <LegalSection id="duree" title="6. Durée de conservation">
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            <strong>Compte actif</strong> : pendant la durée de l&apos;abonnement puis archivage
            limité.
          </li>
          <li>
            <strong>Compte fermé</strong> : suppression ou anonymisation sous 3 ans après clôture,
            sauf obligation légale de conservation (comptabilité : 10 ans pour pièces comptables
            liées à la relation commerciale avec {L.companyName}).
          </li>
          <li>
            <strong>Journaux techniques</strong> : jusqu&apos;à 12 mois sauf incident de sécurité.
          </li>
          <li>
            <strong>Données de vos clients</strong> (saisies par vous) : selon vos propres
            obligations ; vous pouvez exporter ou supprimer vos données depuis le Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="securite" title="7. Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
          chiffrement des communications (HTTPS), hachage des mots de passe, contrôle d&apos;accès
          par rôles, sauvegardes, journalisation. Aucun système n&apos;étant infaillible, nous vous
          invitons à utiliser un mot de passe robuste et à le garder confidentiel.
        </p>
      </LegalSection>

      <LegalSection id="droits" title="8. Vos droits">
        <p>Vous disposez des droits suivants sur vos données personnelles :</p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Accès, rectification, effacement</li>
          <li>Limitation du traitement, opposition</li>
          <li>Portabilité (données fournies dans un format structuré)</li>
          <li>Retrait du consentement (sans affecter la licéité antérieure)</li>
          <li>Directives post-mortem (France)</li>
        </ul>
        <p>
          Pour exercer vos droits :{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
          {dpoEmail !== L.contactEmail ? (
            <>
              {' '}
              ou le délégué à la protection des données :{' '}
              <a href={`mailto:${dpoEmail}`} className="text-emerald-700 underline">
                {dpoEmail}
              </a>
            </>
          ) : null}
          . Une pièce d&apos;identité pourra être demandée en cas de doute raisonnable. Réponse sous
          un mois (prolongation possible de deux mois si complexité).
        </p>
        <p>
          Réclamation auprès de la CNIL :{' '}
          <a
            href="https://www.cnil.fr/fr/plaintes"
            className="text-emerald-700 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.cnil.fr/fr/plaintes
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="9. Cookies et traceurs">
        <p>
          <strong>Cookies strictement nécessaires</strong> : session, authentification, préférences
          essentielles — dispensés de consentement.
        </p>
        <p>
          <strong>Cookies de mesure d&apos;audience ou marketing</strong> : le cas échéant, soumis à
          votre consentement via un bandeau (à déployer si des outils tiers sont activés).
        </p>
        <p>
          Vous pouvez configurer votre navigateur pour refuser les cookies ; certaines
          fonctionnalités du Service pourraient alors être indisponibles.
        </p>
      </LegalSection>

      <LegalSection id="mineurs" title="10. Mineurs">
        <p>
          Le Service s&apos;adresse aux professionnels et aux adultes. Il n&apos;est pas destiné aux
          mineurs de moins de 15 ans sans autorisation parentale.
        </p>
      </LegalSection>

      <LegalSection id="modifications" title="11. Modifications">
        <p>
          Nous pouvons mettre à jour cette politique. La date en tête de page sera révisée ; en cas
          de changement substantiel, nous vous en informerons par email ou notification dans
          l&apos;application.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          <strong>{L.companyName}</strong> — {formatLegalAddress()}
          <br />
          Email :{' '}
          <a href={`mailto:${L.contactEmail}`} className="text-emerald-700 underline">
            {L.contactEmail}
          </a>
        </p>
        <p className="text-slate-600">
          Voir aussi nos{' '}
          <Link href="/mentions-legales" className="text-emerald-700 underline">
            mentions légales
          </Link>{' '}
          et nos{' '}
          <Link href="/cgv" className="text-emerald-700 underline">
            CGV/CGU
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
