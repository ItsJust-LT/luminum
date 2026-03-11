import { MetadataRoute } from "next";
import fs from "fs";
import path from "path";

const baseUrl = "https://luminum.agency";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];
  const appDir = path.join(process.cwd(), "src", "app");

  // Helper function to recursively find all page.tsx files
  function findPages(dir: string, baseRoute: string = ""): string[] {
    const routes: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return routes;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip special directories and files
      if (entry.name.startsWith("_") || entry.name.startsWith(".") || entry.name === "api") {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively search in subdirectories
        const subRoute = baseRoute ? `${baseRoute}/${entry.name}` : `/${entry.name}`;
        routes.push(...findPages(fullPath, subRoute));
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        // Found a page file
        const route = baseRoute || "/";
        routes.push(route);
      }
    }

    return routes;
  }

  // Discover all pages automatically
  const discoveredRoutes = findPages(appDir);

  // Create sitemap entries for all discovered routes
  for (const route of discoveredRoutes) {
    // Automatically determine priority based on route depth and type
    const depth = route.split("/").filter(Boolean).length;
    const isHomepage = route === "/";
    const isLegalPage = route.includes("privacy") || route.includes("terms") || route.includes("cookies");
    
    const priority = isHomepage 
      ? 1.0 
      : isLegalPage 
        ? 0.3 
        : depth === 1 
          ? 0.8 
          : 0.7;
    
    const changeFrequency = isLegalPage 
      ? "yearly" 
      : isHomepage || depth === 1 
        ? "weekly" 
        : "monthly";

    sitemapEntries.push({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: changeFrequency as "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never",
      priority: priority,
    });
  }

  return sitemapEntries;
}


