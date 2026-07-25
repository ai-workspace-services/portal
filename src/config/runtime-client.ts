import type { RuntimeEnvironment, RuntimeRegion } from '../server/runtime-loader'

type RuntimeEnvGlobal = {
  environment?: unknown
  region?: unknown
}

export type ClientRuntimeEnv = {
  environment: RuntimeEnvironment
  region: RuntimeRegion
}

export type ClientRuntimeEnvSettings = ClientRuntimeEnv & {
  detectedBy: string
}

// 客户端默认 'dev', 与 server 侧 runtime-loader 一致。
//
// 这里原本是 'prod': 客户端的解析顺序是
// window.__XCONTROL_RUNTIME_ENV__ -> NEXT_PUBLIC_RUNTIME_ENVIRONMENT -> 默认值,
// 而那个 window 全局量在整个代码库里只被读取、从未被任何地方注入 —— 于是
// 只要构建时没传 NEXT_PUBLIC_RUNTIME_ENVIRONMENT, 浏览器侧就把自己当生产。
//
// 与 server 侧同一个判据: 猜错成 dev 只是连不上, 猜错成 prod 会把测试流量
// 打进生产。
const DEFAULT_ENVIRONMENT: RuntimeEnvironment = 'dev'
const DEFAULT_REGION: RuntimeRegion = 'default'

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
    main: 'prod',
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

export function readClientRuntimeEnvSettings(): ClientRuntimeEnvSettings {
  if (typeof window === 'undefined') {
    return {
      environment: DEFAULT_ENVIRONMENT,
      region: DEFAULT_REGION,
      detectedBy: 'client-default',
    }
  }

  const globalCandidate = (window as typeof window & { __XCONTROL_RUNTIME_ENV__?: RuntimeEnvGlobal })
    .__XCONTROL_RUNTIME_ENV__
  const environmentFromGlobal = normalizeEnvironmentValue(globalCandidate?.environment)
  const regionFromGlobal = normalizeRegionValue(globalCandidate?.region)

  if (environmentFromGlobal) {
    return {
      environment: environmentFromGlobal,
      region: regionFromGlobal ?? DEFAULT_REGION,
      detectedBy: 'window.__XCONTROL_RUNTIME_ENV__',
    }
  }

  const environmentFromEnv = normalizeEnvironmentValue(process.env.NEXT_PUBLIC_RUNTIME_ENVIRONMENT)
  const regionFromEnv = normalizeRegionValue(process.env.NEXT_PUBLIC_RUNTIME_REGION)

  const detectedBy = environmentFromEnv
    ? 'client-env'
    : regionFromEnv
      ? 'client-region-env'
      : 'client-default'

  return {
    environment: environmentFromEnv ?? DEFAULT_ENVIRONMENT,
    region: regionFromEnv ?? DEFAULT_REGION,
    detectedBy,
  }
}

export function readClientRuntimeEnv(): ClientRuntimeEnv {
  const { environment, region } = readClientRuntimeEnvSettings()
  return { environment, region }
}
