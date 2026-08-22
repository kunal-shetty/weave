'use client';

import { ChatArea } from '@/components/chat/ChatArea';

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ChatArea />
    </div>
  );
}
