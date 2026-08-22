export type CollectibleInvoice = {
  id: string;
  number: string | null;
  issueDate: string;
  dueDate: string | null;
  status: string;
  currency: string;
  totalTtc: number;
  amountPaid: number;
  remaining: number;
  remindersCount: number;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
};
