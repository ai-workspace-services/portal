import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/server/account/session', () => ({ getAccountSession: vi.fn() }));
vi.mock('@server/account/session', () => ({ getAccountSession: vi.fn() }));
vi.mock('@/server/xworkmate/profile', () => ({ getXWorkmateSessionContext: vi.fn() }));
vi.mock('@server/ai-workspace/trial', () => ({ consumeTrialTask: vi.fn(), getTrialState: vi.fn(), trialResponseHeaders: vi.fn() }));

import * as bridge from './bridge/route';
import * as trial from './trial/route';
import * as catalog from './tasks/catalog/route';
import * as sessions from './sessions/[...segments]/route';
import * as xworkmate from '../xworkmate/bridge/route';

describe('SIT Bridge isolation', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it('blocks every known Bridge handler before forwarding', async () => {
    vi.stubEnv('NEXT_PUBLIC_RUNTIME_ENVIRONMENT', 'sit');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('https://feature-sit.onwalk.net/api/test');
    const context = { params: Promise.resolve({ segments: ['test'] }) };
    const results = await Promise.all([
      bridge.GET(request), bridge.POST(request), trial.GET(request), trial.POST(request),
      catalog.GET(request), sessions.GET(request, context), sessions.POST(request, context),
      xworkmate.GET(request), xworkmate.POST(request),
    ]);
    expect(results.map((result) => result.status)).toEqual(Array(9).fill(503));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
