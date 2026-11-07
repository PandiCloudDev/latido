// Site navigation in one place: the desktop sidebar's sections and the phone tab bar's tabs, the engine's
// and the site's modules'.
import type { ReactNode } from "react";
import { NAV, subjectAfter, withSubject } from "@aihot/site";
import { webModules } from "../../site-modules";
import {
  IconBolt, IconBookmark, IconDoc, IconFlame, IconGrid, IconHeart, IconHistory, IconList, IconMessage, IconPlug, IconUser,
} from "../icons";

export interface NavItem {
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  /** Match the path exactly (the home page). */
  end?: boolean;
  /** Shows the unread dot while the changelog has news. */
  changelog?: boolean;
}

const SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Contenido",
    items: [
      { to: "/", label: "Destacadas", icon: IconBolt, end: true },
      { to: "/all", label: "Todas las notas", icon: IconList },
      { to: "/hot", label: "Tendencias", icon: IconFlame },
      { to: "/daily", label: withSubject("Boletín diario"), icon: IconDoc },
      { to: "/topics", label: "Temas", icon: IconGrid },
      { to: "/starred", label: "Guardar", icon: IconBookmark },
    ],
  },
  {
    title: "Más",
    items: [
      { to: "/agent", label: "Para agentes IA", icon: IconPlug },
      { to: "/about", label: "Acerca de", icon: IconHeart },
      { to: "/changelog", label: "Novedades", icon: IconHistory, changelog: true },
      { to: "/feedback", label: "Comentarios", icon: IconMessage },
    ],
  },
];

/** Whether an engine page is a way in from the navigation (site.ts NAV.hidden); a hidden page still opens. */
export const inNav = (to: string) => !(NAV.hidden as readonly string[]).includes(to);

const UP = {
  "/hot": { name: "Lo más comentado", back: "Lo más comentado", tab: "hot" },
  "/topics": { name: "Temas", back: "Todos los temas", tab: "me" },
} as const;

/**
 * Where pages under a navigation entry lead back up to: the entry, or "Selección" in its place while the site hides
 * it. `name` is for breadcrumbs and desktop back links ("Tendencias"), `back` for the phone bar ("Tendencias"), `tab` the
 * phone tab it sits under, `crumbs` its breadcrumb after the site's home.
 */
export function navUp(entry: keyof typeof UP): { to: string; name: string; back: string; tab: TabKey; crumbs: Array<{ name: string; path: string }> } {
  if (!inNav(entry)) return { to: "/", name: "Destacadas", back: "Destacadas", tab: "featured", crumbs: [] };
  return { to: entry, ...UP[entry], crumbs: [{ name: UP[entry].name, path: entry }] };
}

/**
 * The sidebar: the engine's sections with the modules' between "Contenido" and "Más"; a module naming a section
 * that is already there adds to it.
 */
export function sidebar(): Array<{ title: string; items: NavItem[] }> {
  const [content, ...rest] = SECTIONS;
  const more = rest.pop()!;
  const sections = [content!, ...rest].map((s) => ({ ...s, items: s.items.filter((i) => inNav(i.to)) }));
  for (const m of webModules()) {
    if (!m.sidebar) continue;
    const section = sections.find((s) => s.title === m.sidebar!.section);
    if (section) section.items.push(...m.sidebar.items);
    else sections.push({ title: m.sidebar.section, items: [...m.sidebar.items] });
  }
  return [...sections, more];
}

/** A sidebar entry is lit on its pages; daily also covers weekly and monthly reports. */
export function sidebarIsActive(item: Pick<NavItem, "to" | "end">, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  if (item.to === "/daily") return /^\/(daily|weekly|monthly)(\/|$)/.test(pathname);
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/**
 * The deepest entry a path belongs to: a page can sit under more than one entry of its section (a module's
 * list and a detail page under it), and only the most specific one is lit.
 */
export function activeSidebarItem(items: readonly NavItem[], pathname: string): NavItem | null {
  let lit: NavItem | null = null;
  for (const item of items) {
    if (sidebarIsActive(item, pathname) && (!lit || item.to.length > lit.to.length)) lit = item;
  }
  return lit;
}

/**
 * The phone tab bar: "Todo" lives beside "Selección" as a switch, "Tendencias" and daily are tabs, and "Más" at /more holds
 * "Guardados", "Apariencia", the tools and the site's own pages. Which tab a page sits under is declared by the page
 * itself (components/shell/screens.ts).
 */
export type TabKey =
  | "featured"
  | "hot"
  | "daily"
  | "me"
  // A module's tab.
  | (string & {});

export interface Tab {
  key: TabKey;
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  changelog?: boolean;
}

const ENGINE_TABS: Tab[] = [
  { key: "featured", to: "/", label: "Destacadas", icon: IconBolt },
  { key: "hot", to: "/hot", label: "Tendencias", icon: IconFlame },
  { key: "daily", to: "/daily", label: "Boletín diario", icon: IconDoc },
  { key: "me", to: "/more", label: "Más", icon: IconUser, changelog: true },
];

/** The tab bar: the engine's, the modules' before "Mi espacio". */
export function tabs(): Tab[] {
  return [...ENGINE_TABS.slice(0, -1).filter((t) => inNav(t.to)), ...webModules().flatMap((m) => m.tabs ?? []), ENGINE_TABS.at(-1)!];
}

/**
 * The rail that stands in for the sidebar on narrow desktops (unfolded foldables, tablets upright): the
 * tabs, with "Todo" after "Selección" since desktop pages have no "Selección" | "Todo" switch.
 */
export function rail(): Tab[] {
  const all = tabs();
  if (!inNav("/all")) return all;
  const at = all.findIndex((t) => t.key === "featured") + 1;
  return [...all.slice(0, at), { key: "all", to: "/all", label: "Todo", icon: IconList }, ...all.slice(at)];
}

/** A rail entry is lit on its pages; "Mi espacio" also on the pages that sit under it on phones. */
export function railIsActive(tab: Tab, pathname: string, screenTab: TabKey | undefined): boolean {
  if (tab.key === "me") return pathname === tab.to || screenTab === "me";
  return sidebarIsActive({ to: tab.to, end: tab.to === "/" }, pathname);
}
