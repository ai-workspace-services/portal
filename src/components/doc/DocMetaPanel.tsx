import ClientTime from "@/app/components/ClientTime";

interface DocMetaPanelProps {
  description?: string;
  updatedAt?: string;
  tags?: string[];
}

export default function DocMetaPanel({
  description,
  updatedAt,
  tags,
}: DocMetaPanelProps) {
  return (
    <div className="flex flex-col gap-4 text-sm text-slate-700">
      {description ? (
        <p className="leading-6 text-text-muted">{description}</p>
      ) : null}

      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-900/10 bg-[#fcfbf8] px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-surface"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {updatedAt ? (
        <p className="text-xs text-text-subtle" suppressHydrationWarning>
          Updated <ClientTime isoString={updatedAt} />
        </p>
      ) : null}
    </div>
  );
}
