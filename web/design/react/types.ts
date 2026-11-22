/* generated from koelony/design@977596b7da6d, do not edit. Change it in koelony/design and sync. */
import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";

/** One link in a header or footer menu. */
export type NavItem = {
  href: string;
  label: ReactNode;
  /** React key; defaults to href. */
  key?: string;
  /** Marks the current page (aria-current="page"). */
  current?: boolean;
  /** Render with the site's router link (LinkComponent) instead of a plain <a>. */
  internal?: boolean;
  /** Any other attributes for the <a>: rel, hrefLang, lang, type, data-*. */
  attrs?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children"> &
    Record<`data-${string}`, string | undefined>;
};

/** The site's router link, called with `href` (e.g. wrap React Router's <Link to>). */
export type LinkComponent = ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }
>;
