import featureToggleData from '@/config/feature-toggles.json'
import { capabilities } from '@/config/capabilities.generated'
import { builtinExtensions } from '@/modules/extensions/builtin'

type RuntimeEnvironment = 'dev' | 'uat' | 'prod'

const isChannelAllowed = (channel: string | undefined, environment: RuntimeEnvironment) =>
  !channel || environment === 'dev' || environment === 'uat' || channel === 'stable'

describe('capability manifest parity', () => {
  it('covers the current appModules and builtin extensions', () => {
    const appModuleIds = Object.keys(featureToggleData.appModules.children ?? {}).map(
      (id) => `portal.app.${id}`,
    )
    const builtinIds = builtinExtensions.map((extension) =>
      `portal.builtin.${extension.id.replace(/^builtin\./, '').replaceAll('-', '_')}`,
    )
    const runtimeManifestIds = capabilities.modules
      .filter((module) => module.source === 'appModules' || module.source === 'builtinExtension')
      .map((module) => module.id)

    expect(runtimeManifestIds).toEqual([...appModuleIds, ...builtinIds])
  })

  it.each(['dev', 'uat', 'prod'] as const)(
    'derives the same visible module set for %s',
    (environment) => {
      const appModules = featureToggleData.appModules.children ?? {}
      const expectedAppModuleIds = Object.entries(appModules)
        .filter(
          ([, node]) =>
            node.enabled !== false && isChannelAllowed(node.channel, environment),
        )
        .map(([id]) => `portal.app.${id}`)
      const expectedBuiltinIds = builtinExtensions.map((extension) =>
        `portal.builtin.${extension.id.replace(/^builtin\./, '').replaceAll('-', '_')}`,
      )

      expect(capabilities.visibleModuleIds[environment]).toEqual([
        ...expectedAppModuleIds,
        ...expectedBuiltinIds,
      ])
    },
  )

  it('keeps public products and the authenticated workspace on distinct surfaces', () => {
    const products = capabilities.modules.find((module) => module.id === 'portal.route.products')
    const workspace = capabilities.modules.find((module) => module.id === 'portal.route.ai_workspace')

    expect(products?.surface).toBe('public')
    expect(products?.routes).toContain('/products/*')
    expect(workspace?.surface).toBe('app')
    expect(workspace?.routes).toContain('/ai-workspace')
  })
})
