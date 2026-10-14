import { promises as fs } from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { generatePublicDiscovery } from './generate-public-discovery'
import { validateReferralLocale } from '../src/lib/referral-content'
import { validateXConnectLocale } from '../src/lib/xconnectContent'

type Language = 'zh' | 'en'

type HeroContent = {
  eyebrow: string
  title: string
  tagline?: string
  description: string
  focusAreas?: string[]
  ctaLabel?: string
  products?: Array<{
    label: string
    headline: string
    description: string
    href: string
  }>
}

const CONTENT_ROOT = path.resolve(
  process.env.WEBSITE_CONTENT_DIR ??
    process.env.CONTENT_SOURCE_DIR ??
    path.join(process.cwd(), 'src', 'content'),
)
const OUTPUT_ROOT = path.join(process.cwd(), 'src', 'data', 'content')

function parseFrontMatter(raw: string): { metadata: Record<string, any> } {
  const frontMatterMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!frontMatterMatch) {
    return { metadata: {} }
  }

  const [, frontMatter] = frontMatterMatch
  try {
    const metadata = yaml.load(frontMatter) as Record<string, any>
    return { metadata: metadata || {} }
  } catch (error) {
    console.error('Failed to parse YAML frontmatter:', error)
    return { metadata: {} }
  }
}

async function generateHomepageContent() {
  const languages: Language[] = ['zh', 'en']
  const content: Record<Language, HeroContent> = {} as any

  for (const lang of languages) {
    try {
      const filePath = path.join(CONTENT_ROOT, 'homepage', lang, 'hero.md')
      const raw = await fs.readFile(filePath, 'utf-8')
      const { metadata } = parseFrontMatter(raw)
      content[lang] = metadata as HeroContent
    } catch (error) {
      console.error(`Failed to read homepage content for ${lang}:`, error)
    }
  }

  return content
}

async function generateHomeMarketingContent() {
  const languages: Language[] = ['zh', 'en']
  const content: Record<Language, any> = {} as any

  for (const lang of languages) {
    try {
      const filePath = path.join(CONTENT_ROOT, 'homepage', lang, 'marketing.md')
      const raw = await fs.readFile(filePath, 'utf-8')
      const { metadata } = parseFrontMatter(raw)
      content[lang] = metadata
    } catch (error) {
      console.error(`Failed to read home-marketing content for ${lang}:`, error)
    }
  }

  return content
}

async function generateProductContent(product: string) {
  const languages: Language[] = ['zh', 'en']
  const content: Record<Language, any> = {} as any

  for (const lang of languages) {
    try {
      const heroPath = path.join(
        CONTENT_ROOT,
        'product',
        product,
        lang,
        'hero.md',
      )
      const raw = await fs.readFile(heroPath, 'utf-8')
      const { metadata } = parseFrontMatter(raw)
      if (product === 'xconnect') validateXConnectLocale(metadata, `${product}/${lang}`)
      if (metadata && Object.keys(metadata).length > 0) {
        content[lang] = metadata
      }
    } catch (error) {
      if (product === 'xconnect') throw error
      // product or language variant might not exist locally
    }
  }

  return content
}

async function generateDocsContent() {
  const languages: Language[] = ['zh', 'en']
  const content: Record<Language, any> = {} as any

  for (const lang of languages) {
    try {
      const filePath = path.join(CONTENT_ROOT, 'docs', lang, 'home.md')
      const raw = await fs.readFile(filePath, 'utf-8')
      const { metadata } = parseFrontMatter(raw)
      content[lang] = metadata
    } catch (error) {
      console.error(`Failed to read docs content for ${lang}:`, error)
    }
  }

  return content
}

async function generateReferralContent() {
  const sourceFiles = ["zh", "en"].map((lang) =>
    path.join(CONTENT_ROOT, "campaign", "referral", `${lang}.json`),
  );
  const exists = await Promise.all(
    sourceFiles.map((file) =>
      fs
        .access(file)
        .then(() => true)
        .catch(() => false),
    ),
  );
  if (!exists.some(Boolean)) {
    const manifestRaw = await fs.readFile(path.join(CONTENT_ROOT, 'content-manifest.yaml'), 'utf8').catch(() => '');
    const manifest = yaml.load(manifestRaw) as { spec?: { entrypoints?: { referral?: unknown } } } | undefined;
    if (manifest?.spec?.entrypoints?.referral) throw new Error('Declared referral content source is missing');
    const generated = JSON.parse(
      await fs.readFile(path.join(OUTPUT_ROOT, "referral.json"), "utf8"),
    );
    validateReferralLocale(generated.zh, "generated referral/zh");
    validateReferralLocale(generated.en, "generated referral/en");
    console.log(
      "Referral source not yet present in content revision; retaining reviewed generated artifact (see docs/referral-2026.md).",
    );
    return;
  }
  if (!exists.every(Boolean))
    throw new Error("Referral content requires both locales");
  const content = Object.fromEntries(
    await Promise.all(
      (["zh", "en"] as const).map(async (lang) => {
        const value = JSON.parse(
          await fs.readFile(
            path.join(CONTENT_ROOT, "campaign", "referral", `${lang}.json`),
            "utf8",
          ),
        );
        validateReferralLocale(value, `referral/${lang}`);
        return [lang, value];
      }),
    ),
  );
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(OUTPUT_ROOT, "referral.json"),
    JSON.stringify(content, null, 2) + "\n",
  );
}

async function main() {
  if (process.argv.includes("--campaign=referral")) { await generateReferralContent(); return; }
  // A scoped refresh must not overwrite unrelated locally edited products.
  if (process.argv.includes('--product=xconnect')) {
    const content = await generateProductContent('xconnect')
    await fs.mkdir(OUTPUT_ROOT, { recursive: true })
    await fs.writeFile(path.join(OUTPUT_ROOT, 'xconnect.json'), JSON.stringify(content, null, 2))
    await fs.writeFile(path.join(OUTPUT_ROOT, 'xconnect.ts'), 'export default ' + JSON.stringify(content, null, 2) + ';')
    console.log('XConnect content generation complete!')
    return
  }
  await generateReferralContent();
  await generatePublicDiscovery(CONTENT_ROOT)
  // Create output directory
  await fs.mkdir(OUTPUT_ROOT, { recursive: true })

  // Generate homepage content
  console.log('Generating homepage content...')
  const homepageContent = await generateHomepageContent()
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'homepage.ts'),
    'export default ' + JSON.stringify(homepageContent, null, 2) + ';',
  )
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'homepage.json'),
    JSON.stringify(homepageContent, null, 2),
  )

  console.log('Generating home marketing content...')
  const homeMarketingContent = await generateHomeMarketingContent()
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'home-marketing.ts'),
    'export const homeMarketingContentData = ' +
      JSON.stringify(homeMarketingContent, null, 2) +
      ';',
  )

  // Generate product content
  const products = [
    'global-mesh',
    'xconnect',
    'xworkmate',
    'open-platform',
    'ai-workspace',
    'xstream',
    'xcloudflow',
    'xscopehub',
    'operations',
  ]
  for (const product of products) {
    console.log(`Generating ${product} content...`)
    const productContent =
      product === 'operations'
        ? Object.fromEntries(
            await Promise.all(
              (['zh', 'en'] as const).map(async (lang) => {
                const file = path.join(
                  CONTENT_ROOT,
                  'operations',
                  lang,
                  'hero.md',
                )
                return [
                  lang,
                  parseFrontMatter(await fs.readFile(file, 'utf8')).metadata,
                ]
              }),
            ),
          )
        : await generateProductContent(product)
    if (Object.keys(productContent).length > 0) {
      await fs.writeFile(
        path.join(OUTPUT_ROOT, `${product}.ts`),
        'export default ' + JSON.stringify(productContent, null, 2) + ';',
      )
      await fs.writeFile(
        path.join(OUTPUT_ROOT, `${product}.json`),
        JSON.stringify(productContent, null, 2),
      )
    }
  }

  // These static output titles share the reviewed product-copy source.
  const cloudHub = await generateProductContent('global-mesh')
  for (const [file, pattern, replacement] of [
    [
      'public/map-embed.html',
      /<title>[^<]*<\/title>/,
      `<title>${cloudHub.en.ui.mapTitle}</title>`,
    ],
    [
      'public/llms.txt',
      /^### Open Platform & (?:Global Mesh|Cloud hub)$/m,
      `### ${cloudHub.en.ui.llmsHeading}`,
    ],
  ] as const) {
    const source = await fs.readFile(file, 'utf8')
    await fs.writeFile(file, source.replace(pattern, replacement))
  }

  console.log('Generating docs content...')
  const docsContent = await generateDocsContent()
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'docs-home.ts'),
    'export default ' + JSON.stringify(docsContent, null, 2) + ';',
  )
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'docs-home.json'),
    JSON.stringify(docsContent, null, 2),
  )

  console.log('Content generation complete!')
}

main().catch((error) => {
  console.error('Content generation failed:', error)
  process.exit(1)
})
