import type { Metadata } from 'next'
import BoundaryLink from '@/components/common/BoundaryLink'
import { Home, Search, FileQuestion } from 'lucide-react'

export const metadata: Metadata = {
    title: '404 - Page Not Found',
    description: 'The page you are looking for does not exist or has been moved.',
    robots: {
        index: false,
        follow: false,
    },
}

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-24">
            <div className="text-center space-y-6 max-w-2xl">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-surface p-6 border border-surface-border">
                        <FileQuestion className="h-16 w-16 text-text-subtle" aria-hidden="true" />
                    </div>
                </div>

                {/* Error Code */}
                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Error 404
                    </p>
                    <h1 className="text-4xl font-bold text-heading sm:text-5xl">
                        Page not found
                    </h1>
                </div>

                {/* Description */}
                <p className="text-lg text-text-muted max-w-md mx-auto">
                    The page you were looking for could not be found. It may have been moved, deleted, or never existed.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <BoundaryLink
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary-hover transition-all"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        Back to homepage
                    </BoundaryLink>

                    <BoundaryLink
                        href="/docs"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-surface-border bg-surface px-6 py-3 text-sm font-semibold text-text hover:bg-surface-hover transition-all"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                        Browse documentation
                    </BoundaryLink>
                </div>

                {/* Helpful Links */}
                <div className="pt-8 border-t border-surface-border mt-8">
                    <p className="text-sm font-semibold text-text-subtle mb-4">
                        Popular pages
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <BoundaryLink
                            href="/services"
                            className="text-primary hover:text-primary-hover hover:underline"
                        >
                            Services
                        </BoundaryLink>
                        <BoundaryLink
                            href="/docs"
                            className="text-primary hover:text-primary-hover hover:underline"
                        >
                            Documentation
                        </BoundaryLink>
                        <BoundaryLink
                            href="/blogs"
                            className="text-primary hover:text-primary-hover hover:underline"
                        >
                            Blog
                        </BoundaryLink>
                    </div>
                </div>
            </div>
        </main>
    )
}
