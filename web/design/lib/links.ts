/* generated from koelony/design@e6933b9b8c1d, do not edit. Change it in koelony/design and sync. */
/**
 * Where the Koelony sites are, and what the cross-site links are called. koelony.com serves the
 * main site and (through a service binding) the blog at /blog/; the demo is its own subdomain.
 * Each site picks the links it shows and their order; this only keeps the URLs and labels the same.
 */
export type Locale = "en" | "zh-hk";
export const LOCALE_KEYS: Locale[] = ["en", "zh-hk"];

export const ORIGIN = "https://koelony.com";
export const DEMO_URL = "https://demo.koelony.com";

export const LINKS = {
  github: "https://github.com/koelony",
  hf: "https://huggingface.co/koelony",
  asrRepo: "https://github.com/koelony/qwen3-asr-cantonese-hk",
} as const;

export const LOCALES: Record<
  Locale,
  { label: string; htmlLang: string; hreflang: string; ogLocale: string }
> = {
  en: { label: "English", htmlLang: "en", hreflang: "en", ogLocale: "en_US" },
  "zh-hk": { label: "廣東話", htmlLang: "zh-Hant-HK", hreflang: "zh-HK", ogLocale: "zh_HK" },
};

/** Labels as the sites already use them. */
export const LABELS: Record<
  Locale,
  {
    home: string;
    asr: string;
    demo: string;
    blog: string;
    github: string;
    hf: string;
    switchLabel: string;
  }
> = {
  en: {
    home: "Home",
    asr: "ASR",
    demo: "Demo",
    blog: "Blog",
    github: "GitHub",
    hf: "Hugging Face",
    switchLabel: "Switch language",
  },
  "zh-hk": {
    home: "主頁",
    asr: "語音識別",
    demo: "試用",
    blog: "網誌",
    github: "GitHub",
    hf: "Hugging Face",
    switchLabel: "轉語言",
  },
};

export type Destination = "home" | "asr" | "demo" | "blog";

/**
 * The URL of a Koelony destination in a locale. Paths are root-relative (for pages on koelony.com);
 * pass `absolute: true` from another origin (the demo). The demo itself has one language.
 */
export function siteHref(
  locale: Locale,
  to: Destination,
  { absolute = false }: { absolute?: boolean } = {},
): string {
  if (to === "demo") return DEMO_URL;
  const prefix = locale === "en" ? "/" : "/zh-hk/";
  const path =
    to === "home"
      ? prefix
      : to === "asr"
        ? `${prefix}asr/`
        : `/blog${locale === "en" ? "/" : "/zh-hk/"}`;
  return absolute ? `${ORIGIN}${path}` : path;
}

/** The four cross-site links (Home, ASR, Demo, Blog) with their labels. */
export function crossSiteLinks(
  locale: Locale,
  options: { absolute?: boolean } = {},
): { key: Destination; href: string; label: string }[] {
  return (["home", "asr", "demo", "blog"] as const).map((key) => ({
    key,
    href: siteHref(locale, key, options),
    label: LABELS[locale][key],
  }));
}
