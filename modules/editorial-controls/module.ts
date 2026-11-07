import { defineModule } from "@aihot/contracts/modules";

export const EDITORIAL_CONTROLS = defineModule({
  name: "editorial-controls",
  adminPages: [{ path: "admin/editorial", file: "web/admin.tsx" }],
  pages: [{ path: "boletin/:intent?", file: "web/signup.tsx" }],
  apiPaths: [/^\/api\/site\/editorial-display$/, /^\/api\/site\/newsletter\/(?:signup|confirm|unsubscribe)$/],
});
