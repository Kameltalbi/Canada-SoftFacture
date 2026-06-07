import { getTranslations } from 'next-intl/server';
import { Card, CardTitle } from '@/components/ui/card';

export default async function HelpPage() {
  const t = await getTranslations('help');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
        <p className="text-s-muted">{t('subtitle')}</p>
      </div>
      <Card>
        <CardTitle className="mb-2">{t('q1')}</CardTitle>
        <p className="text-sm text-s-muted">{t('a1')}</p>
      </Card>
      <Card>
        <CardTitle className="mb-2">{t('q2')}</CardTitle>
        <p className="text-sm text-s-muted">{t('a2')}</p>
      </Card>
    </div>
  );
}
