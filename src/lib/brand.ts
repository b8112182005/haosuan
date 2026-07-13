// NEXT_PUBLIC_HAOTI_LINE_URL is inlined at build time; fallback used when env var is not set.
export const HAOTI_LINE_URL =
  process.env.NEXT_PUBLIC_HAOTI_LINE_URL ?? "https://line.me/R/ti/p/@006mrhbb";

export function withUtm(
  url: string,
  content: string,
  options?: { medium?: string; campaign?: string }
): string {
  const separator = url.includes("?") ? "&" : "?";
  const medium = options?.medium ?? "site_cta";
  const parts = [
    "utm_source=haosuan",
    `utm_medium=${encodeURIComponent(medium)}`,
    `utm_content=${encodeURIComponent(content)}`,
  ];
  if (options?.campaign) {
    parts.push(`utm_campaign=${encodeURIComponent(options.campaign)}`);
  }
  return `${url}${separator}${parts.join("&")}`;
}

// Centralized CTA URLs — import these instead of calling withUtm() inline.
export const CTA_URLS = {
  lineHomeHero: withUtm(HAOTI_LINE_URL, "home-hero"),
  lineCalculatorDefault: withUtm(HAOTI_LINE_URL, "calculator_default_cta", {
    medium: "tool_cta",
    campaign: "free_template_pack",
  }),
  lineFreeTemplate: withUtm(HAOTI_LINE_URL, "free_template_page", {
    medium: "landing",
    campaign: "free_template_pack",
  }),
  lineTemplateRedirect: withUtm(HAOTI_LINE_URL, "line_template_redirect", {
    medium: "redirect",
    campaign: "free_template_pack",
  }),
} as const;
