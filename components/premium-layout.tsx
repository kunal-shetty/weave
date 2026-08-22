"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShaderBackground } from "@/components/shader-background"
import {
  Wand2,
  Eye,
  Sparkles,
  Code2,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"

const NAV_ITEMS = [
  { href: "/generate", label: "Generator", icon: <Wand2 className="w-4 h-4" /> },
  { href: "/preview/Home", label: "Preview", icon: <Eye className="w-4 h-4" /> },
]

export function PremiumLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isHome = pathname === "/"

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ShaderBackground />

      {/* Navigation — glass header */}
      {!isHome && (
        <header className="relative z-10 border-b border-border/50 backdrop-blur-sm bg-background/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left: Logo + back */}
              <div className="flex items-center gap-3">
                {!isHome && (
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                )}
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-foreground font-[var(--font-heading)] tracking-tight">
                    CodeX
                  </span>
                </Link>
              </div>

              {/* Center: Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const active =
                    item.href === "/preview/Home"
                      ? pathname.startsWith("/preview")
                      : pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className={`btn-3d gap-2 font-medium transition-all ${
                          active
                            ? "bg-white/10 text-white border border-white/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </nav>

              {/* Right: actions */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/generate">
                  <Button className="btn-3d btn-glow gap-2 bg-gradient-to-br from-white/10 to-white/5 text-foreground hover:from-white/15 hover:to-white/10 backdrop-blur-sm border border-white/10 shadow-lg font-medium">
                    <Wand2 className="w-4 h-4" />
                    New Section
                  </Button>
                </Link>
              </div>

              {/* Mobile menu toggle */}
              <button
                className="md:hidden text-foreground/70 hover:text-foreground p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border/30 bg-black/80 backdrop-blur-xl">
              <div className="px-4 py-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active =
                    item.href === "/preview/Home"
                      ? pathname.startsWith("/preview")
                      : pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className={`w-full justify-start gap-3 font-medium ${
                          active
                            ? "bg-white/10 text-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </header>
      )}

      {/* Page content */}
      <main className="relative z-10">{children}</main>
    </div>
  )
}
