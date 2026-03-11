"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, TrendingUp } from "lucide-react"
import type { MetricCount } from "@/lib/analytics/client"

interface TopPagesTableProps {
  pages: MetricCount[]
}

function getCleanPath(url: string): string {
  try {
    if (url.startsWith("/")) {
      return url === "" ? "/" : url
    }
    const urlObj = new URL(url)
    return urlObj.pathname === "" ? "/" : urlObj.pathname
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, "") || "/"
  }
}

export function TopPagesTable({ pages: initialPages }: TopPagesTableProps) {
  const pages = Array.isArray(initialPages) ? initialPages : []
  const safePages = pages.length > 0 ? pages.sort((a, b) => (b.count || 0) - (a.count || 0)) : []

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-blue-600" />
          Top Pages
        </CardTitle>
        <CardDescription>Most visited pages on your website</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {safePages.length > 0 ? (
          <div className="space-y-2">
            {safePages.map((page, index) => {
              const cleanPath = getCleanPath(page?.key || "/")
              const totalViews = safePages.reduce((sum, p) => sum + (p?.count || 0), 0)
              const percentage = totalViews > 0 ? ((page?.count || 0) / totalViews) * 100 : 0

              return (
                <div
                  key={index}
                  className="group flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium flex-shrink-0 bg-blue-100 text-blue-600">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{cleanPath}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {percentage.toFixed(1)}% of total views
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="font-medium">
                      {(page?.count || 0).toLocaleString()}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No page data available</p>
            <p className="text-sm">Data will appear here once visitors start browsing your site</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
