import content from "@/data/content/account-security.json";

export function accountSecurityCopy(language: string) {
  return language === "zh" ? content.zh : content.en;
}
