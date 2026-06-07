'use client';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export type InvoiceOperationNature = 'GOODS' | 'SERVICES' | 'MIXED';

export type InvoiceEinvoiceFields = {
  operationNature: InvoiceOperationNature;
  vatOnDebits: boolean;
  useDifferentDeliveryAddress: boolean;
  deliveryAddress: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
};

export const defaultInvoiceEinvoiceFields = (): InvoiceEinvoiceFields => ({
  operationNature: 'SERVICES',
  vatOnDebits: false,
  useDifferentDeliveryAddress: false,
  deliveryAddress: '',
  deliveryPostalCode: '',
  deliveryCity: '',
  deliveryCountry: 'FR',
});

type Props = {
  value: InvoiceEinvoiceFields;
  onChange: (value: InvoiceEinvoiceFields) => void;
  vatOnDebitsAvailable: boolean;
  labels: {
    title: string;
    operationNature: string;
    operationGoods: string;
    operationServices: string;
    operationMixed: string;
    vatOnDebits: string;
    vatOnDebitsHint: string;
    differentDelivery: string;
    deliveryAddress: string;
    deliveryPostalCode: string;
    deliveryCity: string;
    deliveryCountry: string;
  };
};

export function InvoiceEinvoiceFieldsSection({
  value,
  onChange,
  vatOnDebitsAvailable,
  labels,
}: Props) {
  return (
    <section className="rounded-lg border border-s-border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-s-muted">
        {labels.title}
      </h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-s-muted">
            {labels.operationNature}
          </label>
          <select
            className="w-full rounded-lg border border-s-border bg-white px-3 py-2.5 text-sm"
            value={value.operationNature}
            onChange={(e) =>
              onChange({ ...value, operationNature: e.target.value as InvoiceOperationNature })
            }
          >
            <option value="GOODS">{labels.operationGoods}</option>
            <option value="SERVICES">{labels.operationServices}</option>
            <option value="MIXED">{labels.operationMixed}</option>
          </select>
        </div>

        {vatOnDebitsAvailable ? (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-s-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-s-navy">{labels.vatOnDebits}</p>
              <p className="text-xs text-s-muted">{labels.vatOnDebitsHint}</p>
            </div>
            <Switch
              checked={value.vatOnDebits}
              onCheckedChange={(checked) => onChange({ ...value, vatOnDebits: checked })}
            />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 rounded-xl border border-s-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-s-navy">{labels.differentDelivery}</p>
          </div>
          <Switch
            checked={value.useDifferentDeliveryAddress}
            onCheckedChange={(checked) =>
              onChange({ ...value, useDifferentDeliveryAddress: checked })
            }
          />
        </div>

        {value.useDifferentDeliveryAddress ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {labels.deliveryAddress}
              </label>
              <Input
                value={value.deliveryAddress}
                onChange={(e) => onChange({ ...value, deliveryAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {labels.deliveryPostalCode}
              </label>
              <Input
                value={value.deliveryPostalCode}
                onChange={(e) => onChange({ ...value, deliveryPostalCode: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {labels.deliveryCity}
              </label>
              <Input
                value={value.deliveryCity}
                onChange={(e) => onChange({ ...value, deliveryCity: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {labels.deliveryCountry}
              </label>
              <Input
                value={value.deliveryCountry}
                onChange={(e) =>
                  onChange({ ...value, deliveryCountry: e.target.value.toUpperCase() })
                }
                maxLength={2}
                placeholder="FR"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
