import { Env } from "./types";

export function verifyWorkerToken(request: Request, env: Env): boolean {
  const token = request.headers.get("X-Worker-Token");
  return token === env.WORKER_TOKEN;
}

export function verifyConfirmApiKey(request: Request, env: Env): boolean {
  const key = request.headers.get("X-API-Key");
  return key === env.CONFIRM_API_KEY;
}

export function unauthorized(message: string = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export function json(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function conflict(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 409,
    headers: { "Content-Type": "application/json" },
  });
}

export function notFound(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

export function tooManyRequests(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}
