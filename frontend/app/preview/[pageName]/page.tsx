import { AppSidebar } from '@/components/shared/AppSidebar';
import { PreviewShell } from '@/components/preview/PreviewShell';

interface PreviewPageProps {
  params: Promise<{ pageName: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { pageName } = await params;
  const decoded = decodeURIComponent(pageName);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <PreviewShell pageName={decoded} />
    </div>
  );
}
