import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const POST: APIRoute = async ({ request }) => {
  const cfEnv = env as unknown as {
    TURNSTILE_SECRET_KEY: { get: () => Promise<string> };
  };

  let token: string;
  try {
    const body: { token: string } = await request.json();
    token = body.token;
  } catch {
    return new Response(JSON.stringify({ success: false }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ success: false }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secretKey = await cfEnv.TURNSTILE_SECRET_KEY.get();
  const clientIp = request.headers.get("CF-Connecting-IP") ?? "";

  const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: clientIp,
    }),
  });

  const result: { success: boolean } = await verifyResponse.json();

  return new Response(JSON.stringify({ success: result.success }), {
    status: result.success ? 200 : 403,
    headers: { "Content-Type": "application/json" },
  });
};
