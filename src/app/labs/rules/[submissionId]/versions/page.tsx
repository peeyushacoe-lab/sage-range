import { Navbar } from '@/components/navbar';
import { VersionHistoryClient } from './_client';

export const dynamic = 'force-dynamic';

export default function VersionHistoryPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  return (
    <>
      <Navbar />
      <VersionHistoryClient params={params} />
    </>
  );
}
