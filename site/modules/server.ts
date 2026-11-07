// The backend of the site's modules, installed by the api and the worker when they start (site/modules/index.ts).
import type { ServerModule } from "@aihot/backend/modules";

import { EDITORIAL_SERVER } from "@aihot/editorial-controls/server";

export const SERVER_MODULES: readonly ServerModule[] = [EDITORIAL_SERVER];
