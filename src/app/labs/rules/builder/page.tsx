import { Navbar } from '@/components/navbar';
import { RuleBuilderClient } from './_client';

export const dynamic = 'force-dynamic';

export default function RuleBuilderPage() {
  return (
    <>
      <Navbar />
      <RuleBuilderClient />
    </>
  );
}
