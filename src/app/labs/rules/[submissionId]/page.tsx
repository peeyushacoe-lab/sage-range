import { Navbar } from '@/components/navbar';
import { RuleDetailsClient } from './_client';

export const dynamic = 'force-dynamic';

export default function RuleDetailsPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  return (
    <>
      <Navbar />
      <RuleDetailsClient params={params} />
    </>
  );
}
