import content from "@/data/content/email-preferences.json";

export type EmailPreferences = {
  productUpdates: boolean;
  tutorials: boolean;
  offers: boolean;
  frequency: "monthly" | "important";
  version: number;
};
export type EmailManagementSettings = {
  version: number;
  companyName: string;
  postalAddress: string;
  contactEmail: string;
  consoleUrl: string;
};
export function emailCopy(language: string) {
  return language === "zh" ? content.zh : content.en;
}
export async function emailRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
