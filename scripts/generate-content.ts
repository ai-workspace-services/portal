import { promises as fs } from 'fs'
import path from 'path'
import yaml from 'js-yaml'

type Language = 'zh' | 'en'

const CONTENT_ROOT = path.resolve(
  process.env.WEBSITE_CONTENT_DIR ??
    process.env.CONTENT_SOURCE_DIR ??
    path.join(process.cwd(), 'src', 'content')
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
      const heroPath = path.join(CONTENT_ROOT, 'product', product, lang, 'hero.md')
      const raw = await fs.readFile(heroPath, 'utf-8')
      const { metadata } = parseFrontMatter(raw)
      if (metadata && Object.keys(metadata).length > 0) {
        content[lang] = metadata
      }
    } catch (error) {
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

async function main() {
  // Create output directory
  await fs.mkdir(OUTPUT_ROOT, { recursive: true })

  console.log('Generating home marketing content...')
  const homeMarketingContent = await generateHomeMarketingContent()
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'home-marketing.ts'),
    'export const homeMarketingContentData = ' + JSON.stringify(homeMarketingContent, null, 2) + ';'
  )

  // Generate product content
  const products = [
    'xconnect',
    'xworkmate',
    'open-platform',
    'ai-workspace',
    'xstream',
    'xcloudflow',
    'xscopehub',
  ]
  for (const product of products) {
    console.log(`Generating ${product} content...`)
    const productContent = await generateProductContent(product)
    if (Object.keys(productContent).length > 0) {
      await fs.writeFile(
        path.join(OUTPUT_ROOT, `${product}.ts`),
        'export default ' + JSON.stringify(productContent, null, 2) + ';'
      )
      await fs.writeFile(
        path.join(OUTPUT_ROOT, `${product}.json`),
        JSON.stringify(productContent, null, 2)
      )
    }
  }

  console.log('Generating docs content...')
  const docsContent = await generateDocsContent()
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'docs-home.ts'),
    'export default ' + JSON.stringify(docsContent, null, 2) + ';'
  )
  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'docs-home.json'),
    JSON.stringify(docsContent, null, 2)
  )

  console.log('Content generation complete!')
}

main().catch((error) => {
  console.error('Content generation failed:', error)
  process.exit(1)
})
