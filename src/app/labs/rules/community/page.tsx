import { Navbar } from '@/components/navbar';
import { CommunityRulesClient } from './_client';

export const dynamic = 'force-dynamic';

export default function CommunityRulesPage() {
  return (
    <>
      <Navbar />
      <CommunityRulesClient />
    </>
  );
}
