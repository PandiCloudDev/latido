export interface NewsletterSettings {
  enabled: boolean;
  enabledAt: string | null;
}

export interface FixedAd {
  advertiser: string;
  text: string;
  url: string;
  action: string;
}

export interface AdSettings extends FixedAd {
  enabled: boolean;
  mode: "fixed" | "adsense";
  adsenseSlot: string;
}

export interface ManagedTopic {
  slug: string;
  name: string;
  group: "field" | "genre";
  definition: string;
  tags: string[];
  enabled: boolean;
}

export interface EditorialSettings {
  newsletter: NewsletterSettings & { smtpConfigured: boolean; counts: { active: number; pending: number; sent: number; failed: number } };
  ad: AdSettings;
  topics: ManagedTopic[];
  tags: string[];
}

export interface EditorialDisplay {
  signupUrl: string | null;
  ad: ({ mode: "fixed" } & FixedAd) | { mode: "adsense"; slot: string } | null;
}

export const ADSENSE_PUBLISHER = "pub-7039079143625258";
export const ADSENSE_CLIENT = `ca-${ADSENSE_PUBLISHER}`;
export const ADSENSE_SCRIPT = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
export const WEEKLY_RSS = "/feed/weekly.xml";
