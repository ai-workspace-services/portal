import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('AI workspace proxy isolation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('does not send SIT requests or credentials to the production Bridge', async () => {
    vi.stubEnv('NEXT_PUBLIC_RUNTIME_ENVIRONMENT', 'sit');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('https://feature-sit.onwalk.net/api/ai-workspace/tasks', {
      headers: { authorization: 'Bearer test-token' },
    });
    const response = await GET(request, { params: Promise.resolve({ path: ['tasks'] }) });
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
