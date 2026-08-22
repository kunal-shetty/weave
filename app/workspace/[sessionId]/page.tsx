"use client"

import dynamic from "next/dynamic"

const WorkspaceContent = dynamic(
  () => import("@/components/workspace/workspace-content").then((m) => m.WorkspaceContent),
  { ssr: false, loading: () => <LoadingScreen /> }
)

function LoadingScreen() {
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-white/30 text-sm animate-pulse">Loading workspace...</div>
    </div>
  )
}

export default function WorkspacePage() {
  return <WorkspaceContent />
}
