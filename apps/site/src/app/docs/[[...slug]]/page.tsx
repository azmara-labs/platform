import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentMeta } from "@/components/component-meta";
import { markdownUrl } from "@/lib/markdown-url";
import { getMDXComponents } from "@/lib/mdx-components";
import { source } from "@/lib/source";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) notFound();

  const MDXContent = page.data.body;

  return (
    <DocsPage
      // The page shell is an <article>; this makes it the page's main landmark, which Fumadocs does not.
      role="main"
      toc={page.data.toc}
      // Fumadocs renders the table of contents as a plain <div>, so it sits outside every landmark.
      tableOfContent={{ container: { role: "navigation", "aria-label": "On this page" } }}
      className="max-w-300"
      editOnGithub={{
        owner: "azmara-labs",
        repo: "platform",
        sha: "main",
        path: `apps/site/content/docs/${slug && slug.length > 0 ? slug.join("/") : "index"}.mdx`,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <p className="not-prose mb-4 text-sm text-fd-muted-foreground">
        <a href={markdownUrl(page.url)} className="underline underline-offset-2">
          View as Markdown
        </a>{" "}
        for coding assistants, or see{" "}
        <a href="/llms.txt" className="underline underline-offset-2">
          llms.txt
        </a>
        .
      </p>
      {page.data.group && page.data.status && page.data.since ? (
        <ComponentMeta group={page.data.group} status={page.data.status} since={page.data.since} />
      ) : null}
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) return {};

  const { title, description } = page.data;

  return {
    title,
    description,
    alternates: { canonical: page.url, types: { "text/markdown": markdownUrl(page.url) } },
    openGraph: { title, description, url: page.url },
    twitter: { title, description },
  };
}
