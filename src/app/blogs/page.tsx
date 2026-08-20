// Prerendered at build time and refreshed in the background on the shared
// content window, so a listing view costs no Worker render and no content
// service round trip.
export const revalidate = 300;

import type { Metadata } from "next";
import { Suspense } from "react";

import BlogList from "@components/blog/BlogList";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getBlogList, type BlogListPayload } from "@lib/docsServiceClient";

export const metadata: Metadata = {
  title: "Blog | XWork Tech",
  description:
    "Latest updates, releases, and insights from the XWork Tech community.",
};

const EMPTY_LISTING: BlogListPayload = {
  posts: [],
  categories: [],
  page: 1,
  pageSize: 0,
  total: 0,
  totalPages: 0,
};

export default async function BlogPage() {
  // A content service that is unreachable while the page is being prerendered
  // must not fail the build: render the empty state and let the revalidation
  // window pick the listing up.
  const listing = await getBlogList({ page: 1, pageSize: 200 }).catch((error) => {
    console.warn("Blog listing unavailable, rendering empty state", error);
    return EMPTY_LISTING;
  });

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
