"use client"

import dynamic from "next/dynamic"

const GenerateContent = dynamic(
  () => import("@/components/generate-content").then((m) => m.GenerateContent),
  { ssr: false, loading: () => <LoadingScreen /> }
)

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/30 text-sm animate-pulse">Loading Generator Studio...</div>
    </div>
  )
}

export default function GeneratePage() {
  return <GenerateContent />
}
