"use client";

import { useSession } from "@/lib/auth/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { useParams, useRouter } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { BlogEditor } from "@/components/blog/blog-editor";
import { getPublicSiteBaseFromOrgMetadata } from "@/lib/blog-public-url";

export default function EditBlogPostPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { organization, loading: orgLoading } = useOrganization();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const postId = params.postId as string;

  if (sessionPending || orgLoading) return <LoadingAnimation />;
  if (!session) {
    router.push("/sign-in");
    return null;
  }
  if (!organization) return <LoadingAnimation />;

  // Route guard: blogs feature not enabled (direct URL access blocked)
  if (!organization.blogs_enabled) {
    router.replace(`/${slug}/dashboard`);
    return null;
  }

  return (
    <BlogEditor
      organizationId={organization.id}
      orgSlug={slug}
      postId={postId}
      publicSiteBaseUrl={getPublicSiteBaseFromOrgMetadata(organization.metadata)}
    />
  );
}
