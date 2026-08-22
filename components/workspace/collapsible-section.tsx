"use client"

import { ReactNode, useRef, useState, useEffect, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  /** Optional content shown to the right of the header */
  accessory?: ReactNode
  /** Visual variant */
  variant?: "default" | "inset"
  className?: string
}

/**
 * Premium collapsible section — used inside workspace panels.
 * Measures the content height so the open/close animation can be exact.
 */
export function CollapsibleSection({
  title,
  subtitle,
  icon,
  badge,
  accessory,
  defaultOpen = true,
  children,
  variant = "default",
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [height, setHeight] = useState<number | null>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  const measure = useCallback(() => {
    if (innerRef.current) {
      setHeight(innerRef.current.scrollHeight)
    }
  }, [])

  useEffect(() => {
    measure()
    if (typeof window === "undefined") return
    const ro = new ResizeObserver(measure)
    if (innerRef.current) ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [measure, children])

  const isInset = variant === "inset"

  return (
    <div
      className={cn(
        "group/section",
        isInset
          ? "rounded-xl bg-white/[0.02] border border-white/[0.05]"
          : "border-b border-white/[0.06] last:border-b-0",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "relative w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer",
          "transition-colors duration-200",
          "hover:bg-white/[0.025]",
          isInset && "rounded-t-xl last:rounded-b-xl"
        )}
      >
        {/* Left accent line that animates in on hover */}
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full",
            "bg-gradient-to-b from-white/50 via-white/20 to-transparent",
            "transition-all duration-300 ease-out",
            open ? "h-7 opacity-100" : "h-0 opacity-0 group-hover/section:h-5 group-hover/section:opacity-60"
          )}
        />

        {icon && (
          <span
            className={cn(
              "shrink-0 grid place-items-center w-7 h-7 rounded-lg",
              "bg-white/[0.04] border border-white/[0.06] text-white/50",
              "transition-all duration-300",
              open ? "text-white/80 bg-white/[0.07] border-white/[0.1]" : "group-hover/section:text-white/70"
            )}
          >
            {icon}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.08em] truncate",
                "transition-colors duration-200",
                open ? "text-white/80" : "text-white/45 group-hover/section:text-white/60"
              )}
            >
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[10px] text-white/30 mt-0.5 truncate font-mono">{subtitle}</p>
          )}
        </div>

        {accessory && (
          <div
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {accessory}
          </div>
        )}

        <ChevronDown
          className={cn(
            "shrink-0 w-3.5 h-3.5 text-white/30 transition-all duration-300",
            open && "rotate-180 text-white/60"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          open ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: open ? (height ?? "auto") : 0,
        }}
      >
        <div ref={innerRef} className={cn(isInset ? "px-3 pb-3" : "pb-3")}>
          {children}
        </div>
      </div>
    </div>
  )
}
