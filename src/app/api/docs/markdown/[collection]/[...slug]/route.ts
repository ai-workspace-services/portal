import { getDocPage } from "@/lib/docsServiceClient";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ collection: string; slug: string[] }> },
): Promise<Response> {
  const { collection, slug } = await params;
  try {
    const page = await getDocPage(collection, slug.join("/"));
    if (!page.version.markdown) {
      return new Response("Markdown source is not available.", { status: 404 });
    }
    const markdown = page.version.markdown ?? "";
    return new Response(markdown, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${slug.at(-1) ?? "document"}.md"`,
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("docs markdown request failed", { collection, slug, error });
    return new Response("Document not found.", { status: 404 });
  }
}
