const NOT_CONFIGURED = {
  configured: false,
  message: "AI provider is not configured. No business data was processed or transmitted.",
};

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(NOT_CONFIGURED, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  return Response.json(NOT_CONFIGURED, {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}
