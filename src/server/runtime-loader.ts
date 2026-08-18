import 'server-only'

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { runtimeServiceConfigSources } from '@/config/runtime-service-config.generated'

const FORBIDDEN_IMPORT_CONTEXTS = [
  '/src/components/ui/',
  '\\src\\components\\ui\\',
  'tiptap',
  'mermaid',
  'next-themes',
]

function assertServerOnlyContext() {
  if (typeof window !== 'undefined') {
    throw new Error('runtime-loader.ts is server-only and cannot run in the browser.')
  }

  if (process.env.NODE_ENV !== 'production') {
    const stack = new Error().stack ?? ''
    const forbiddenCaller = FORBIDDEN_IMPORT_CONTEXTS.find((pattern) => stack.includes(pattern))

    if (forbiddenCaller) {
      throw new Error(
        `[runtime-config] runtime-loader.ts must not be imported alongside UI/editor runtimes (${forbiddenCaller}).`,
      )
    }
  }
}

assertServerOnlyContext()

function loadYamlSource(sourceKey: RuntimeSourceKey): string | undefined {
  const source = runtimeServiceConfigSources[sourceKey]
  if (!source) {
    console.warn(`[runtime-config] Generated YAML source "${sourceKey}" is empty.`)
  }
  return source
}

type RuntimeSourceKey = 'base' | 'dev' | 'sit' | 'uat' | 'prod'

export type RuntimeEnvironment = 'dev' | 'uat' | 'prod' | 'sit'
export type RuntimeRegion = 'default' | 'cn' | 'global'

export type RuntimeConfig = {
  apiBaseUrl?: string
  authUrl?: string
  dashboardUrl?: string
  docsServiceUrl?: string
  internalApiBaseUrl?: string
  logLevel?: string
  [key: string]: unknown
} & {
  environment: RuntimeEnvironment
  region: RuntimeRegion
  source: RuntimeSourceKey
  hostname?: string
  detectedBy: string
}

export type RuntimeEnvSettings = {
  environment: RuntimeEnvironment
  region: RuntimeRegion
  detectedBy: string
}

const RUNTIME_ENV_CONFIG_BASENAME = '.runtime-env-config.yaml'

// YAML sources are embedded at build time so the same runtime selection works
// in Node/VPS and Worker environments without relying on a writable filesystem.
function getYamlSource(sourceKey: RuntimeSourceKey): string | undefined {
  return loadYamlSource(sourceKey)
}

const parsedYamlCache: Partial<Record<RuntimeSourceKey, Record<string, unknown>>> = {}
const runtimeConfigCache = new Map<string, RuntimeConfig>()

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseYamlSource(sourceKey: RuntimeSourceKey): Record<string, unknown> {
  if (parsedYamlCache[sourceKey]) {
    return parsedYamlCache[sourceKey]!
  }

  const source = getYamlSource(sourceKey)
  if (!source) {
    return {}
  }

  try {
    const parsed = yaml.load(source)
    if (isPlainRecord(parsed)) {
      parsedYamlCache[sourceKey] = parsed
      return parsed
    }

    console.warn(
      `[runtime-config] YAML source "${sourceKey}" did not produce an object. Falling back to empty object.`,
    )
  } catch (error) {
    console.warn(
      `[runtime-config] Failed to parse YAML source "${sourceKey}", falling back to empty object.`,
      error,
    )
  }

  parsedYamlCache[sourceKey] = {}
  return parsedYamlCache[sourceKey]!
}

function mergeConfigs(base: Record<string, unknown>, override?: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  const assignValue = (target: Record<string, unknown>, key: string, value: unknown) => {
    if (Array.isArray(value)) {
      target[key] = value.map((item) => (isPlainRecord(item) ? mergeConfigs({}, item) : item))
      return
    }

    if (isPlainRecord(value)) {
      const existing = isPlainRecord(target[key]) ? (target[key] as Record<string, unknown>) : {}
      target[key] = mergeConfigs(existing, value)
      return
    }

    target[key] = value
  }

  for (const [key, value] of Object.entries(base)) {
    assignValue(result, key, value)
  }

  if (!override) {
    return result
  }

  for (const [key, value] of Object.entries(override)) {
    assignValue(result, key, value)
  }

  return result
}

function sanitizeHostname(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const maybeUrl = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(maybeUrl)
    const hostname = url.hostname.replace(/\.+$/, '').toLowerCase()
    if (hostname) {
      return hostname
    }
  } catch {
    const sanitized = trimmed
      .replace(/^[^/]+:\/\//, '')
      .split('/')[0]
      .split(':')[0]
      .replace(/\.+$/, '')
      .toLowerCase()
    if (sanitized) {
      return sanitized
    }
  }

  return undefined
}

function detectHostname(hostnameOverride?: string): { hostname?: string; detectedBy: string } {
  const override = sanitizeHostname(hostnameOverride)
  if (override) {
    return { hostname: override, detectedBy: 'parameter' }
  }

  const envCandidates: Array<{ source: string; value?: string }> = [
    { source: 'RUNTIME_HOSTNAME', value: process.env.RUNTIME_HOSTNAME },
    { source: 'NEXT_RUNTIME_HOSTNAME', value: process.env.NEXT_RUNTIME_HOSTNAME },
    { source: 'DEPLOYMENT_HOSTNAME', value: process.env.DEPLOYMENT_HOSTNAME },
    { source: 'VERCEL_URL', value: process.env.VERCEL_URL },
    { source: 'NEXT_PUBLIC_VERCEL_URL', value: process.env.NEXT_PUBLIC_VERCEL_URL },
    { source: 'URL', value: process.env.URL },
    { source: 'HOSTNAME', value: process.env.HOSTNAME },
  ]

  for (const candidate of envCandidates) {
    const hostname = sanitizeHostname(candidate.value)
    if (!hostname) {
      continue
    }

    const likelyMachineHostname = !hostname.includes('.') && !LOCAL_HOSTNAMES.has(hostname)
    if (likelyMachineHostname) {
      continue
    }

    if (hostname) {
      return { hostname, detectedBy: candidate.source }
    }
  }

  return { hostname: undefined, detectedBy: 'default' }
}

function normalizeEnvironmentValue(value: unknown): RuntimeEnvironment | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const mapping: Record<string, RuntimeEnvironment> = {
    prod: 'prod',
    production: 'prod',
    release: 'prod',
    // main 归 uat, 不是 prod。组织的环境路由规范是 main push -> UAT,
    // 生产只经 v* tag(engineering-standards/
    // multi-environment-delivery-and-release §1)。
    main: 'uat',
    live: 'prod',
    sit: 'sit',
    staging: 'sit',
    test: 'sit',
    qa: 'sit',
    uat: 'uat',
    dev: 'dev',
    development: 'dev',
    preview: 'sit',
    preprod: 'sit',
  }

  return mapping[normalized]
}

function normalizeRegionValue(value: unknown): RuntimeRegion | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }

  if (normalized === 'cn' || normalized === 'china') {
    return 'cn'
  }

  if (normalized === 'global') {
    return 'global'
  }

  if (normalized === 'default') {
    return 'default'
  }

  return undefined
}

let runtimeEnvSettingsCache: RuntimeEnvSettings | undefined

export function readRuntimeEnvSettings(hostname?: string): RuntimeEnvSettings {
  if (runtimeEnvSettingsCache && !hostname) {
    return runtimeEnvSettingsCache
  }

  // 首先检查 RUNTIME_ENV 环境变量
  const runtimeEnv = process.env.RUNTIME_ENV
  if (runtimeEnv) {
    const environment = normalizeEnvironmentValue(runtimeEnv)
    if (environment) {
      // 检查 REGION 环境变量
      const regionEnv = process.env.REGION
      const region = regionEnv ? normalizeRegionValue(regionEnv) || 'default' : 'default'

      const settings = {
        environment,
        region,
        detectedBy: 'env:RUNTIME_ENV',
      }
      if (!hostname) {
        runtimeEnvSettingsCache = settings
      }
      return settings
    }
  }

  if (hostname) {
    const lowerHost = hostname.toLowerCase()
    if (lowerHost.includes('uat')) {
      return { environment: 'uat', region: 'default', detectedBy: 'hostname:uat' }
    }
    if (lowerHost.includes('sit')) {
      return { environment: 'sit', region: 'default', detectedBy: 'hostname:sit' }
    }
    if (lowerHost.includes('svc.plus')) {
      return { environment: 'prod', region: 'default', detectedBy: 'hostname:prod' }
    }
  }

  const candidates: Array<{ path: string; detectedBy: string }> = []

  const explicitPath = process.env.RUNTIME_ENV_CONFIG_PATH
  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(process.cwd(), explicitPath)
    candidates.push({ path: resolved, detectedBy: 'env:RUNTIME_ENV_CONFIG_PATH' })
  }

  candidates.push({
    path: path.resolve(process.cwd(), 'dashboard/config', RUNTIME_ENV_CONFIG_BASENAME),
    detectedBy: `file:dashboard/config/${RUNTIME_ENV_CONFIG_BASENAME}`,
  })

  candidates.push({
    path: path.resolve(process.cwd(), 'src', 'config', RUNTIME_ENV_CONFIG_BASENAME),
    detectedBy: `file:config/${RUNTIME_ENV_CONFIG_BASENAME}`,
  })

  candidates.push({
    path: path.resolve(process.cwd(), RUNTIME_ENV_CONFIG_BASENAME),
    detectedBy: `file:${RUNTIME_ENV_CONFIG_BASENAME}`,
  })

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate.path)) {
      continue
    }

    try {
      const content = fs.readFileSync(candidate.path, 'utf8')
      const parsed = yaml.load(content)
      if (!isPlainRecord(parsed)) {
        continue
      }

      const environment = normalizeEnvironmentValue(parsed.environment)
      const regionEnv = process.env.REGION
      const regionFromFile = normalizeRegionValue(parsed.region)
      const region = regionEnv ? (normalizeRegionValue(regionEnv) || 'default') : (regionFromFile ?? 'default')

      if (environment) {
        runtimeEnvSettingsCache = {
          environment,
          region,
          detectedBy: candidate.detectedBy,
        }
        return runtimeEnvSettingsCache
      }
    } catch (error) {
      console.warn(`[runtime-config] Failed to read runtime env config at ${candidate.path}`, error)
    }
  }

  // 检测不出环境时默认 'dev', 不是 'prod'。
  //
  // 原先默认 'prod' 让每一个构建产物都以生产身份运行: RUNTIME_ENV 从未被
  // 设置(CI 传的是另一个名字 NEXT_PUBLIC_RUNTIME_ENVIRONMENT), 而
  // .runtime-env-config.yaml 被 .gitignore 排除且 Dockerfile 不生成它 ——
  // 四个候选路径全部落空, 于是 SIT / UAT / 本地开发全都连生产服务, 且
  // 不报任何错。
  //
  // fail-safe 的方向是最小影响面: 猜错成 dev 只会让本地连不上, 猜错成
  // prod 会让测试流量打到生产。
  console.warn(
    '[runtime-config] Could not determine the runtime environment from ' +
      'RUNTIME_ENV or any .runtime-env-config.yaml candidate; defaulting to ' +
      "'dev'. Set RUNTIME_ENV explicitly for anything other than local development.",
  )
  runtimeEnvSettingsCache = {
    environment: 'dev',
    region: 'default',
    detectedBy: 'default:dev',
  }
  return runtimeEnvSettingsCache
}

function splitEnvironmentOverrides(
  environment: RuntimeEnvironment,
  region: RuntimeRegion,
): { environmentOverrides: Record<string, unknown>; regionOverrides?: Record<string, unknown> } {
  // 每个环境映射到同名配置源, 不再是"非 prod 即 sit"。
  //
  // 那个三元表达式让 uat 与 dev 静默使用 SIT 的端点 —— UAT 会去连
  // 127.0.0.1:8080(在 UAT 主机上不存在), 而 RuntimeEnvironment 声明了 4 个
  // 值、RuntimeSourceKey 只有 3 个, 类型本身就暴露了这个不匹配。
  // 现在新增环境时缺配置文件会让 parseYamlSource 报 warn 并返回空对象,
  // 端点缺失由下游断言暴露, 而不是安静地落到另一个环境的配置上。
  const source: RuntimeSourceKey = environment
  const envConfig = parseYamlSource(source)
  const environmentOverrides = mergeConfigs({}, envConfig)
  let regionOverrides: Record<string, unknown> | undefined

  const maybeRegions = environmentOverrides['regions']
  if (isPlainRecord(maybeRegions)) {
    const normalizedRegion = region.toLowerCase()
    for (const [regionKey, regionValue] of Object.entries(maybeRegions)) {
      if (!isPlainRecord(regionValue)) {
        continue
      }

      if (regionKey.trim().toLowerCase() === normalizedRegion) {
        regionOverrides = mergeConfigs({}, regionValue)
        break
      }
    }
  }

  delete environmentOverrides['regions']

  return { environmentOverrides, regionOverrides }
}

function buildCacheKey(
  hostname?: string,
  environment?: RuntimeEnvironment,
  region?: RuntimeRegion,
): string {
  return [hostname || '<unknown>', environment || '<env>', region || '<region>'].join('|')
}

export function loadRuntimeConfig(options?: { hostname?: string }): RuntimeConfig {
  const { hostname, detectedBy: hostnameDetectedBy } = detectHostname(options?.hostname)
  const { environment, region, detectedBy: envDetectedBy } = readRuntimeEnvSettings(hostname)

  const cacheKey = buildCacheKey(hostname, environment, region)
  const cached = runtimeConfigCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const baseConfig = parseYamlSource('base')
  const { environmentOverrides, regionOverrides } = splitEnvironmentOverrides(environment, region)
  const merged = mergeConfigs(baseConfig, environmentOverrides)
  const finalConfig = regionOverrides ? mergeConfigs(merged, regionOverrides) : merged

  const detectionLabel = hostname
    ? `${envDetectedBy}|hostname:${hostnameDetectedBy}`
    : envDetectedBy

  const result: RuntimeConfig = {
    ...(finalConfig as RuntimeConfig),
    environment,
    region,
    // 与上面 splitEnvironmentOverrides 实际选用的源保持一致。
    // 这里原本也是 `environment === 'prod' ? 'prod' : 'sit'` —— 那是个只用于
    // 上报的字段, 在源选择改成一环境一源之后, 它会在 uat/dev 下报告
    // source: 'sit' 而实际读的是 uat.yaml/dev.yaml, 排障时正好指向错误的文件。
    source: environment,
    hostname,
    detectedBy: detectionLabel,
  }

  runtimeConfigCache.set(cacheKey, result)

  const regionLabel = region === 'default' ? '' : `/${region.toUpperCase()} region`
  const hostLabel = hostname ? ` @ ${hostname}` : ''
  console.info(`[runtime-config] Loaded env: ${environment.toUpperCase()}${regionLabel}${hostLabel}`)

  return result
}
