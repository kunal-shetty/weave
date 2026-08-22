import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/health
 * Liveness check endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "CodeX API",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
}
