import { SectionsList } from '@/components/studio/SectionsList';
import { AppSidebar } from '@/components/shared/AppSidebar';

export default function SectionsPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <SectionsList />
    </div>
  );
}
