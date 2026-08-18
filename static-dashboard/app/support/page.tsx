import Link from "next/link";

import docsHomeContent from "../../../src/data/content/docs-home";

// The primary support center is a dynamic route: it selects a locale from the
// request and reads the live documentation service. Pages static export has no
// request context, so keep a build-time fallback backed by the synchronized
// website-content artifact instead of importing the dynamic route.
export const dynamic = "force-static";

export default function StaticSupportPage() {
  const content = docsHomeContent.zh;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-5xl">
          {content.home.title}
        </h1>
        <p className="text-lg leading-8 text-text-muted">
          {content.home.description}
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {content.collections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/docs/${collection.slug}/${collection.defaultVersionSlug}`}
            className="rounded-2xl border border-surface-border bg-surface p-6 transition-colors hover:border-primary/50 hover:bg-surface-hover"
          >
            <h2 className="text-xl font-semibold text-heading">
              {collection.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              {collection.description}
            </p>
            <ul
              className="mt-5 flex flex-wrap gap-2"
              aria-label={collection.title}
            >
              {collection.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </section>
    </main>
  );
}
