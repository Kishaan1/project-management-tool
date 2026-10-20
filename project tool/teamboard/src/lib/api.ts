import { NextResponse } from "next/server";
import type { z } from "zod";

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });
export const notFound = (what = "Resource") => NextResponse.json({ error: `${what} not found` }, { status: 404 });
export const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function readJson<T>(
  req: Request,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse }> {
  const raw = await req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, res: badRequest(result.error.issues[0]?.message ?? "Invalid input") };
  }
  return { ok: true, data: result.data };
}
