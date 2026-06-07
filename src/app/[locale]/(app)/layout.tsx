import { AppAuthGate } from '@/components/app-auth-gate';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppAuthGate>{children}</AppAuthGate>;
}
