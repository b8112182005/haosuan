import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CTA_URLS } from "@/lib/brand";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  redirect(CTA_URLS.lineTemplateRedirect);
}
