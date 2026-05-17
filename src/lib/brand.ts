export const HAOTI_LINE_URL = "https://line.me/R/ti/p/@006mrhbb";

export function withUtm(url: string, content: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=haosuan&utm_medium=site_cta&utm_content=${encodeURIComponent(content)}`;
}
