import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_FORWARD_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'user-agent',
  'x-account-session',
  'x-forwarded-for',
  'x-request-id',
  'x-trace-id',
];

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params);
}
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params);
}
export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params);
}
export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params);
}
export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return handleProxy(request, params);
}

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  const upstreamBaseUrl = 'https://xworkmate-bridge.svc.plus';
  const path = params.path.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${upstreamBaseUrl}/${path}${search}`;

  const forwardHeaders = new Headers();
  for (const name of DEFAULT_FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      forwardHeaders.set(name, value);
    }
  }

  let body: ArrayBuffer | undefined;
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    body = await request.arrayBuffer();
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body ? Buffer.from(body) : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      const normalizedKey = key.toLowerCase();
      if (['connection', 'content-encoding', 'content-length', 'keep-alive', 'transfer-encoding'].includes(normalizedKey)) {
        return;
      }
      responseHeaders.set(key, value);
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('AI Workspace Proxy request failed', error);
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 });
  }
}
