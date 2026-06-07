const BELOW_20 = [
  'zéro',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];

const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function underHundred(n: number): string {
  if (n < 20) return BELOW_20[n];
  if (n < 70) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (unit === 0) return TENS[ten];
    if (unit === 1) return `${TENS[ten]} et un`;
    return `${TENS[ten]}-${BELOW_20[unit]}`;
  }
  if (n < 80) {
    if (n === 71) return 'soixante et onze';
    return `soixante-${underHundred(n - 60)}`;
  }
  if (n === 80) return 'quatre-vingts';
  return `quatre-vingt-${underHundred(n - 80)}`;
}

function underThousand(n: number): string {
  if (n < 100) return underHundred(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const prefix = hundred === 1 ? 'cent' : `${BELOW_20[hundred]} cent`;
  if (rest === 0) return hundred > 1 ? `${prefix}s` : prefix;
  return `${prefix} ${underHundred(rest)}`;
}

function integerToFrenchWords(n: number): string {
  if (n === 0) return BELOW_20[0];
  if (n < 0) return `moins ${integerToFrenchWords(Math.abs(n))}`;

  const groups = [
    { value: 1_000_000_000, singular: 'milliard', plural: 'milliards' },
    { value: 1_000_000, singular: 'million', plural: 'millions' },
    { value: 1_000, singular: 'mille', plural: 'mille' },
  ];

  let rest = n;
  const parts: string[] = [];

  for (const group of groups) {
    const count = Math.floor(rest / group.value);
    if (count > 0) {
      if (group.value === 1_000 && count === 1) {
        parts.push(group.singular);
      } else {
        parts.push(`${integerToFrenchWords(count)} ${count > 1 ? group.plural : group.singular}`);
      }
      rest %= group.value;
    }
  }

  if (rest > 0) parts.push(underThousand(rest));
  return parts.join(' ');
}

function label(n: number, singular: string, plural: string): string {
  return n <= 1 ? singular : plural;
}

export function amountToFrenchWords(value: string | number, currency = 'EUR'): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '';

  if (currency === 'EUR') {
    const rounded = Math.round(numeric * 100) / 100;
    const euros = Math.trunc(rounded);
    const cents = Math.round((rounded - euros) * 100);
    const main = `${integerToFrenchWords(euros)} ${label(euros, 'euro', 'euros')}`;
    if (cents <= 0) return main;
    return `${main} et ${integerToFrenchWords(cents)} ${label(cents, 'centime', 'centimes')}`;
  }

  const rounded = Math.round(numeric * 1000) / 1000;
  const integerPart = Math.trunc(rounded);
  const millimes = Math.round((rounded - integerPart) * 1000);

  if (currency === 'TND') {
    const main = `${integerToFrenchWords(integerPart)} ${label(integerPart, 'dinar tunisien', 'dinars tunisiens')}`;
    if (millimes <= 0) return main;
    return `${main} et ${integerToFrenchWords(millimes)} ${label(millimes, 'millime', 'millimes')}`;
  }

  const main = `${integerToFrenchWords(integerPart)} ${currency}`;
  if (millimes <= 0) return main;
  return `${main} et ${integerToFrenchWords(millimes)} millimes`;
}
