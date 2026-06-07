import { Suspense } from 'react';
import InviteAcceptClient from './invite-client';

export default function InvitePage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-slate-500">…</p>}>
      <InviteAcceptClient />
    </Suspense>
  );
}
