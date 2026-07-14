export const dynamic = "force-dynamic";
export const revalidate = false;

import type { Metadata } from "next";
import { Suspense } from "react";

import BlogList from "@components/blog/BlogList";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getBlogList } from "@lib/docsServiceClient";

export const metadata: Metadata = {
  title: "Blog | Cloud-Neutral",
  description:
    "Latest updates, releases, and insights from the Cloud-Neutral community.",
};

export default async function BlogPage() {
  const listing = await getBlogList({ page: 1, pageSize: 200 });
  
  const categories = listing.categories;
  const postsWithoutContent = listing.posts.map(
    ({
      html: _html,
      plaintext: _plaintext,
      sourcePath: _sourcePath,
      language: _language,
      ...post
    }: any) => post,
  );

  return (
    <PublicPageShell>
      <Suspense
        fallback={
          <div className="rounded-[2rem] border border-slate-900/10 bg-white/90 p-6 text-center text-sm text-slate-500">
            Loading blog content...
          </div>
        }
      >
        <BlogList posts={postsWithoutContent} categories={categories} />
      </Suspense>
    </PublicPageShell>
  );
}
