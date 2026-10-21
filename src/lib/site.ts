// Single source of truth for the public site URL.
// Set NEXT_PUBLIC_SITE_URL in Vercel when a custom domain is attached;
// until then the Vercel production host is the canonical origin.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://haosuan.vercel.app"
).replace(/\/+$/, "");

export function absUrl(path: string): string {
  return path.startsWith("/") ? `${SITE_URL}${path}` : `${SITE_URL}/${path}`;
}
