import { describe, expect, it } from 'vitest'
import {
  getUserCenterCategories,
  isChannelAllowed,
  isFeatureEnabled,
  isUserCenterFeatureEnabled,
  resolveRuntimeEnvironment,
} from './featureToggles'

describe('featureToggles - Environment and Channel Policy', () => {
  it('UAT environment allows all channels (stable, beta, develop)', () => {
    expect(isChannelAllowed('stable', 'uat')).toBe(true)
    expect(isChannelAllowed('beta', 'uat')).toBe(true)
    expect(isChannelAllowed('develop', 'uat')).toBe(true)
  })

  it('PROD environment only allows stable channel', () => {
    expect(isChannelAllowed('stable', 'prod')).toBe(true)
    expect(isChannelAllowed('beta', 'prod')).toBe(false)
    expect(isChannelAllowed('develop', 'prod')).toBe(false)
  })

  it('cmsExperience homepage remains enabled in both environments without interference', () => {
    expect(isFeatureEnabled('cmsExperience', '/homepage/dynamic', 'uat')).toBe(true)
    expect(isFeatureEnabled('cmsExperience', '/homepage/dynamic', 'prod')).toBe(true)
  })

  it('userCenter categories cover the 4 major categories: xworkmate, xconnect, ai_workspace, open_platform', () => {
    const uatCategories = getUserCenterCategories('uat')
    expect(uatCategories.xworkmate).toBeDefined()
    expect(uatCategories.xconnect).toBeDefined()
    expect(uatCategories.ai_workspace).toBeDefined()
    expect(uatCategories.open_platform).toBeDefined()

    expect(uatCategories.xworkmate.name).toBe('XWorkmate')
    expect(uatCategories.xconnect.name).toBe('XConnect')
    expect(uatCategories.ai_workspace.name).toBe('AI Workspace')
    expect(uatCategories.open_platform.name).toBe('Open Platform')
  })

  it('userCenter AI Aggregator feature is available in UAT but gated in PROD', () => {
    // In UAT: develop channel is allowed
    expect(isUserCenterFeatureEnabled('xconnect', 'ai_aggregator', 'uat')).toBe(true)
    // In PROD: develop channel is gated off
    expect(isUserCenterFeatureEnabled('xconnect', 'ai_aggregator', 'prod')).toBe(false)
    // Stable feature is open in both
    expect(isUserCenterFeatureEnabled('xconnect', 'api', 'uat')).toBe(true)
    expect(isUserCenterFeatureEnabled('xconnect', 'api', 'prod')).toBe(true)
  })
})
