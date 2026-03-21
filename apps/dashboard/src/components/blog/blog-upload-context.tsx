"use client";

import * as React from "react";

/** Upload a blog image and return a URL suitable for embedding (dashboard proxy URL). */
export const BlogAssetUploadContext = React.createContext<
  ((file: File) => Promise<string>) | null
>(null);

export function useBlogAssetUpload(): ((file: File) => Promise<string>) | null {
  return React.useContext(BlogAssetUploadContext);
}
