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

async function generateEmailPreferencesContent() {
  const locales = ["zh", "en"] as const;
  const generatedPath = path.join(OUTPUT_ROOT, "email-preferences.json");
  const files = locales.map((locale) => path.join(CONTENT_ROOT, "account", "email-preferences", `${locale}.json`));
  const exists = await Promise.all(files.map((file) => fs.access(file).then(() => true).catch(() => false)));
  if (!exists.some(Boolean)) {
    const generated = JSON.parse(await fs.readFile(generatedPath, "utf8"));
    if (!generated.zh?.tab || !generated.en?.tab) throw new Error("Missing reviewed email preferences content");
    console.log("Email preferences source not present; retaining reviewed generated artifact.");
    return;
  }
  if (!exists.every(Boolean)) throw new Error("Email preferences requires both locales");
  const values = await Promise.all(files.map(async (file) => JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>));
  if (values.every(value => value.templates === undefined)) {
    const generated = JSON.parse(await fs.readFile(generatedPath, "utf8"));
    if (!Array.isArray(generated.zh?.templates) || !Array.isArray(generated.en?.templates)) throw new Error("Missing reviewed email campaign content");
    console.log("Email campaign content not yet in source revision; retaining reviewed generated artifact.");
    return;
  }
  for (const value of values) {
    if (!Array.isArray(value.templates) || value.templates.length !== 3 || value.templates.map((step: { id?: string }) => step.id).join(",") !== "hello,first_steps,discover_more") throw new Error("Invalid onboarding template identities");
    for (const step of value.templates) {
      if (!Number.isInteger(step.delayHours) || step.delayHours < 0 || step.delayHours > 720 || ["subject", "body", "actionLabel", "path"].some(key => typeof step[key] !== "string" || !step[key].trim())) throw new Error("Invalid onboarding template content");
    }
  }
  const keys = Object.keys(values[0]).sort().join(",");
  for (const value of values) {
    if (Object.keys(value).sort().join(",") !== keys || Object.entries(value).some(([key, text]) => key !== "templates" && (typeof text !== "string" || !text.trim()))) throw new Error("Invalid email preferences content");
  }
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(generatedPath, JSON.stringify(Object.fromEntries(locales.map((locale, i) => [locale, values[i]])), null, 2) + "\n");
}

async function generateBillingPolicyContent() {
  const locales = ["zh", "en"] as const;
  const entries = await Promise.all(
    locales.map(async (locale) => {
      const value = JSON.parse(
        await fs.readFile(
          path.join(
            CONTENT_ROOT,
            "account",
            "billing-policy",
            `${locale}.json`,
          ),
          "utf8",
        ),
      );
      if (
        typeof value.refundSummary !== "string" ||
        !value.refundSummary.trim()
      ) {
        throw new Error(`Missing billing policy refundSummary for ${locale}`);
      }
      const keys = ["refundSummary", "subscriptionSummary", "planSelectionDescription", "purchaseHelp", "assignedPlanHelp", "unassignedPlanHelp"];
      for (const key of keys) {
        if (typeof value[key] !== "string" || !value[key].trim()) {
          throw new Error(`Missing billing policy ${key} for ${locale}`);
        }
      }
      return [locale, Object.fromEntries(keys.map(key => [key, value[key]]))];
    }),
  );
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(
    path.join(OUTPUT_ROOT, "billing-policy.json"),
    JSON.stringify(Object.fromEntries(entries), null, 2) + "\n",
  );
}

async function generateTeamAgentEnrollmentsContent() {
  const generatedPath = path.join(OUTPUT_ROOT, "team-agent-enrollments.json");
  const files = ["zh", "en"].map(locale => path.join(CONTENT_ROOT, "account/team-agent-enrollments", `${locale}.json`));
  const exists = await Promise.all(files.map(file => fs.access(file).then(() => true).catch(() => false)));
  if (!exists.some(Boolean)) {
    const generated = JSON.parse(await fs.readFile(generatedPath, "utf8"));
    if (!generated.zh?.title || !generated.en?.title) throw new Error("Missing team node assignment content");
    return;
  }
  if (!exists.every(Boolean)) throw new Error("Team node assignments require both locales");
  const values = await Promise.all(files.map(async file => JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>));
  const keys = Object.keys(values[0]).sort().join(",");
  if (values.some(value => Object.keys(value).sort().join(",") !== keys || Object.values(value).some(text => typeof text !== "string" || !text.trim()))) throw new Error("Invalid team node assignment content");
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(generatedPath, JSON.stringify({ zh: values[0], en: values[1] }, null, 2) + "\n");
}

async function main() {
  const securityLocales = await Promise.all((["zh", "en"] as const).map(async locale => {
    const value = JSON.parse(await fs.readFile(path.join(CONTENT_ROOT, "account", "security", `${locale}.json`), "utf8")) as Record<string, string>;
    if (Object.values(value).some(text => typeof text !== "string" || !text.trim()) || !value.paymentRisk || !value.authorize || !value.reviewDescription) throw new Error("Invalid account security content");
    return value;
  }));
  if (Object.keys(securityLocales[0]).sort().join() !== Object.keys(securityLocales[1]).sort().join()) throw new Error("Account security locales must have identical keys");
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_ROOT, "account-security.json"), JSON.stringify({ zh: securityLocales[0], en: securityLocales[1] }, null, 2) + "\n");
  if (process.argv.includes("--account=security")) return;
  await generateTeamAgentEnrollmentsContent();
  if (process.argv.includes("--account=team-agent-enrollments")) return;
  if (process.argv.includes("--account=billing-policy")) { await generateBillingPolicyContent(); return; }
  await generateBillingPolicyContent();
  if (process.argv.includes("--account=email-preferences")) { await generateEmailPreferencesContent(); return; }
  await generateEmailPreferencesContent();
  if (process.argv.includes("--campaign=referral")) { await generateReferralContent(); return; }
  // A scoped refresh must not overwrite unrelated locally edited products.
  if (process.argv.includes('--product=xconnect')) {
    const content = await generateProductContent('xconnect')
    await fs.mkdir(OUTPUT_ROOT, { recursive: true })
    await fs.writeFile(path.join(OUTPUT_ROOT, 'xconnect.json'), JSON.stringify(content, null, 2))
    await fs.writeFile(path.join(OUTPUT_ROOT, 'xconnect.ts'), 'const content = ' + JSON.stringify(content, null, 2) + ';\n\nexport default content;\n')
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
    'const content = ' + JSON.stringify(homepageContent, null, 2) + ';\n\nexport default content;\n',
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
        'const content = ' + JSON.stringify(productContent, null, 2) + ';\n\nexport default content;\n',
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
    'const content = ' + JSON.stringify(docsContent, null, 2) + ';\n\nexport default content;\n',
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
