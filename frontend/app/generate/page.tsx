import { GeneratorStudio } from '@/components/studio/GeneratorStudio';
import { AppSidebar } from '@/components/shared/AppSidebar';

export default function GeneratePage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <GeneratorStudio />
    </div>
  );
}
