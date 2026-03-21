"use client";

import * as React from "react";
import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { BlogEditor } from "@/components/blog/blog-editor";
import {
  getPublicSiteBaseFromOrgMetadata,
  normalizePublicSiteInput,
} from "@/lib/blog-public-url";
import { api } from "@/lib/api";

export default function EditBlogPostPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const postId = params.postId as string;

  const [liveSiteUrl, setLiveSiteUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    (async () => {
      const fromMeta = getPublicSiteBaseFromOrgMetadata(organization.metadata);
      if (fromMeta) {
        if (!cancelled) setLiveSiteUrl(fromMeta);
        return;
      }
      try {
        const res = (await api.websites.list(organization.id)) as {
          data?: Array<{ domain?: string }>;
        };
        const domain = res?.data?.[0]?.domain;
        if (domain && !cancelled) {
          setLiveSiteUrl(normalizePublicSiteInput(domain));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organization?.id, organization?.metadata]);

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) {
    router.push("/sign-in");
    return null;
  }
  if (!organization) return <LoadingAnimation />;

  if (!organization.blogs_enabled) {
    router.replace(`/${slug}/dashboard`);
    return null;
  }

  return (
    <BlogEditor
      organizationId={organization.id}
      orgSlug={slug}
      postId={postId}
      publicSiteBaseUrl={liveSiteUrl}
    />
  );
}
