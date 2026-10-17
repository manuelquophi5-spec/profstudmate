import { NextRequest } from 'next/server';

export function createRequest(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): NextRequest {
  const method = options?.method || 'GET';
  const headers = new Headers(options?.headers || {});

  if (options?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (options?.body) {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), init as any);
}

export async function parseResponse<T = any>(response: Response): Promise<{
  status: number;
  data: T;
}> {
  const status = response.status;
  const data = await response.json().catch(() => ({}));
  return { status, data };
}
