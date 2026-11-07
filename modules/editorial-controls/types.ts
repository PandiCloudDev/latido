export interface NewsletterSettings {
  enabled: boolean;
  enabledAt: string | null;
}

export interface AdSettings {
  enabled: boolean;
  advertiser: string;
  text: string;
  url: string;
  action: string;
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
  ad: Omit<AdSettings, "enabled"> | null;
}

export const WEEKLY_RSS = "/feed/weekly.xml";
