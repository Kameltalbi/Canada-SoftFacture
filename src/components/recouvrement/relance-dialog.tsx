'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { apiFetch } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-money';
import { useToast } from '@/components/ui/toast';
import type { CollectibleInvoice } from './types';

type Channel = 'email' | 'whatsapp' | 'phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENT_BYTES = 1.2 * 1024 * 1024;

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return 0;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return 0;
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - startOfToday().getTime()) / 86400000);
}

function pickChannel(invoice: CollectibleInvoice): Channel {
  if (invoice.client.email?.trim()) return 'email';
  if (invoice.client.phone?.trim()) return 'whatsapp';
  return 'phone';
}

function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('1') && digits.length >= 11) return digits;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export function RelanceDialog({
  invoice,
  companyName,
  open,
  onClose,
  onSaved,
}: {
  invoice: CollectibleInvoice | null;
  companyName: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const t = useTranslations('recouvrement');
  const tc = useTranslations('common');
  const locale = useLocale();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channel, setChannel] = useState<Channel>('email');
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [outcome, setOutcome] = useState('contacted');
  const [notes, setNotes] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  const dateLocale = locale === 'en' ? 'en-CA' : 'fr-CA';
  const dueValue = invoice?.dueDate || invoice?.issueDate || '';
  const until = daysUntil(dueValue);
  const isOverdue = until < 0;
  const amountLabel = invoice ? formatCurrency(invoice.remaining, invoice.currency) : '';
  const dueLabel = dueValue ? new Date(dueValue).toLocaleDateString(dateLocale) : '—';

  const delayMeta = useMemo(() => {
    if (until < 0) {
      const count = -until;
      return {
        label: t('delay'),
        value: t(count <= 1 ? 'delayDays' : 'delayDaysPlural', { count }),
      };
    }
    if (until === 0) {
      return { label: t('dueDate'), value: t('dueToday') };
    }
    return {
      label: t('remainingTime'),
      value: t(until <= 1 ? 'dueInDays' : 'dueInDaysPlural', { count: until }),
    };
  }, [until, t]);

  useEffect(() => {
    if (!open || !invoice) return;
    const amount = formatCurrency(invoice.remaining, invoice.currency);
    const due =
      invoice.dueDate || invoice.issueDate
        ? new Date(invoice.dueDate || invoice.issueDate).toLocaleDateString(dateLocale)
        : '—';
    const overdue = daysUntil(invoice.dueDate || invoice.issueDate) < 0;
    const params = {
      client: invoice.client.name,
      number: invoice.number || invoice.id.slice(0, 8),
      amount,
      dueDate: due,
      company: companyName,
    };
    setChannel(pickChannel(invoice));
    setEmailTo(invoice.client.email?.trim() || '');
    setEmailCc('');
    setEmailSubject(t('reminderSubject', { number: params.number }));
    setEmailMessage(t(overdue ? 'emailMessageOverdue' : 'emailMessageUpcoming', params));
    setAttachment(null);
    setWaPhone(invoice.client.phone?.trim() || '');
    setWaMessage(t(overdue ? 'whatsappMessageOverdue' : 'whatsappMessageUpcoming', params));
    setOutcome('contacted');
    setNotes('');
    setPromisedDate('');
    setNextDate('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open, invoice, companyName, dateLocale, t]);

  const validEmail = EMAIL_RE.test(emailTo.trim());
  const validWaPhone = Boolean(waPhone.trim());

  async function logReminder(payload: {
    channel: Channel;
    outcome: string;
    notes?: string;
    promisedPaymentDate?: string | null;
    nextReminderDate?: string | null;
  }) {
    if (!invoice) return;
    await apiFetch('/payment-reminders', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: invoice.id,
        clientId: invoice.client.id,
        ...payload,
      }),
    });
  }

  async function handleSendEmail() {
    if (!invoice || !validEmail) return;
    setSaving(true);
    try {
      let attachmentPayload: { filename: string; contentBase64: string } | undefined;
      if (attachment) {
        attachmentPayload = {
          filename: attachment.name,
          contentBase64: await fileToBase64(attachment),
        };
      }
      await apiFetch('/payment-reminders/email', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: invoice.id,
          clientId: invoice.client.id,
          channel: 'email',
          outcome: 'sent',
          to: emailTo.trim(),
          cc: emailCc.trim() || undefined,
          subject: emailSubject,
          message: emailMessage,
          attachment: attachmentPayload,
        }),
      });
      toast.push(t('emailSent'));
      await onSaved();
      onClose();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : t('emailSendError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleWhatsApp() {
    if (!invoice || !validWaPhone) return;
    setSaving(true);
    try {
      const phone = normalizeWhatsAppPhone(waPhone.trim());
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`,
        '_blank',
        'noopener,noreferrer'
      );
      await logReminder({
        channel: 'whatsapp',
        outcome: 'sent',
        notes: `WhatsApp → ${waPhone.trim()}`,
      });
      toast.push(t('logged'));
      await onSaved();
      onClose();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : t('openError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhone() {
    if (!invoice) return;
    setSaving(true);
    try {
      await logReminder({
        channel: 'phone',
        outcome,
        notes: notes.trim() || undefined,
        promisedPaymentDate: outcome === 'promise' ? promisedDate || null : null,
        nextReminderDate: nextDate || null,
      });
      toast.push(t('logged'));
      await onSaved();
      onClose();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : tc('error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleAttachment(file: File | null) {
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.push(t('attachmentTooLarge'), 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setAttachment(file);
  }

  const channelBtn = (value: Channel, label: string) => (
    <button
      type="button"
      onClick={() => setChannel(value)}
      className={
        channel === value
          ? 'rounded-md bg-white px-2 py-1.5 text-xs font-medium text-brand shadow-sm'
          : 'rounded-md px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800'
      }
    >
      {label}
    </button>
  );

  return (
    <Modal
      open={open}
      title={t('remindClient', { name: invoice?.client.name || '' })}
      onClose={() => !saving && onClose()}
      className="max-w-lg max-h-[92dvh] overflow-y-auto"
      footer={
        channel === 'email' ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => void handleSendEmail()} disabled={saving || !validEmail}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? t('sending') : t('sendReminder')}
            </Button>
          </>
        ) : channel === 'whatsapp' ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => void handleWhatsApp()} disabled={saving || !validWaPhone}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? t('sending') : t('openWhatsapp')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => void handlePhone()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? t('saving') : t('saveReminder')}
            </Button>
          </>
        )
      }
    >
      <p className="mb-3 text-sm text-s-muted">
        {t('invoiceLabel', { number: invoice?.number || '—' })}
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3 border-y border-slate-100 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('amountDue')}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-s-navy">{amountLabel}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t('dueDate')}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-s-navy">{dueLabel}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {delayMeta.label}
          </p>
          <p
            className={`mt-0.5 truncate text-sm font-semibold ${isOverdue ? 'text-red-700' : 'text-s-navy'}`}
          >
            {delayMeta.value}
          </p>
        </div>
      </div>

      <p className="mb-1.5 text-sm font-medium text-s-navy">{t('channel')}</p>
      <div className="mb-4 grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5">
        {channelBtn('email', t('channelEmail'))}
        {channelBtn('whatsapp', t('channelWhatsapp'))}
        {channelBtn('phone', t('channelPhone'))}
      </div>

      {channel === 'email' ? (
        <div className="space-y-3 text-s-navy">
          {!invoice?.client.email?.trim() ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t('missingEmail')}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-to">
              {t('recipient')}
            </label>
            <Input
              id="relance-to"
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-cc">
              {t('cc')}
            </label>
            <Input
              id="relance-cc"
              value={emailCc}
              onChange={(e) => setEmailCc(e.target.value)}
              placeholder={t('ccPlaceholder')}
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-subject">
              {t('subject')}
            </label>
            <Input
              id="relance-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-message">
              {t('message')}
            </label>
            <textarea
              id="relance-message"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={7}
              disabled={saving}
              className="w-full resize-none rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy shadow-sm focus:border-s-accent focus:outline-none focus:ring-2 focus:ring-s-accent/20"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">{t('attachment')}</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => handleAttachment(e.target.files?.[0] || null)}
            />
            {attachment ? (
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <Paperclip className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  aria-label={t('removeAttachment')}
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <Paperclip className="h-4 w-4" />
                {t('attachFile')}
              </Button>
            )}
            <p className="mt-1 text-xs text-slate-400">{t('attachmentHint')}</p>
          </div>
        </div>
      ) : null}

      {channel === 'whatsapp' ? (
        <div className="space-y-3 text-s-navy">
          {!invoice?.client.phone?.trim() ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t('missingPhone')}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-wa-phone">
              {t('phoneNumber')}
            </label>
            <Input
              id="relance-wa-phone"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-wa-message">
              {t('message')}
            </label>
            <textarea
              id="relance-wa-message"
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              rows={6}
              disabled={saving}
              className="w-full resize-none rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy shadow-sm focus:border-s-accent focus:outline-none focus:ring-2 focus:ring-s-accent/20"
            />
          </div>
        </div>
      ) : null}

      {channel === 'phone' ? (
        <div className="space-y-3 text-s-navy">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('phoneNumber')}
            </p>
            {invoice?.client.phone?.trim() ? (
              <a
                href={`tel:${invoice.client.phone}`}
                className="mt-1 inline-block text-lg font-semibold text-brand hover:underline"
              >
                {invoice.client.phone}
              </a>
            ) : (
              <p className="mt-1 text-sm text-amber-800">{t('missingPhone')}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-outcome">
              {t('result')}
            </label>
            <select
              id="relance-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy"
            >
              <option value="contacted">{t('outcomeContacted')}</option>
              <option value="no_answer">{t('outcomeNoAnswer')}</option>
              <option value="callback">{t('outcomeCallback')}</option>
              <option value="promise">{t('outcomePromise')}</option>
              <option value="other">{t('outcomeOther')}</option>
            </select>
          </div>
          {outcome === 'promise' ? (
            <div>
              <label className="mb-1 block text-xs font-medium" htmlFor="relance-promised">
                {t('promisedDate')}
              </label>
              <Input
                id="relance-promised"
                type="date"
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                disabled={saving}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-next">
              {t('nextReminder')}
            </label>
            <Input
              id="relance-next"
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              disabled={saving}
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {[3, 7, 15, 30].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setNextDate(addDays(d))}
                  disabled={saving}
                >
                  {t('plusDays', { count: d })}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="relance-notes">
              {t('internalNote')}
            </label>
            <textarea
              id="relance-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('internalNotePlaceholder')}
              rows={2}
              disabled={saving}
              className="w-full rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
