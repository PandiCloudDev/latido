import { POLICY, SITE } from "@aihot/site";
import copy from "@aihot/site/pages/privacy.md?raw";
import { edgeTtl } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { prepareCopy } from "../lib/site-copy";
import { CopyPage, LegalFooterLinks } from "../features/copy/CopyPage";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "me" };

const PRIVACY = prepareCopy(copy);

export function headers() {
  return edgeTtl(300);
}

export function meta() {
  return pageMeta({ title: "Aviso de privacidad", description: POLICY.privacy.description, path: "/privacy", image: "/og/pages/privacy.png" });
}

export default function PrivacyPage() {
  return (
    <CopyPage
      doc={PRIVACY.doc}
      rendered={PRIVACY.rendered}
      eyebrow={SITE.name}
      footer={<LegalFooterLinks links={[{ to: "/terms", label: POLICY.terms.name }, { to: "/feedback", label: "Página de comentarios" }]} note={`Aviso de privacidad ${PRIVACY.doc.meta["Versión"] ?? ""} · ${PRIVACY.doc.meta["Vigencia"] ?? ""}`} />}
    />
  );
}
