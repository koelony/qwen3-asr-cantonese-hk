/* generated from koelony/design@e6933b9b8c1d, do not edit. Change it in koelony/design and sync. */
import type { HTMLAttributes, ReactNode } from "react";
import { NavLink } from "./NavLink.tsx";
import type { LinkComponent, NavItem } from "./types.ts";

/**
 * The cross-site footer: the brand and one line about Koelony, the links in two columns, and the
 * fine print under both. Styles: `.footer-grid` in components.css (the site sets the footer's own
 * padding, background and rule). Markup:
 *
 *   <footer class="site-footer">{before}<div class="wrap footer-grid">
 *   <div class="footer-about">{brand}<p>{tagline}</p></div><nav class="footer-links">…</nav>
 *   <ul class="footer-fine"><li>…</li></ul></div>{after}</footer>
 *
 * `fine` as an array renders a list; as a single node, one <p class="footer-fine">.
 */
export function SiteFooter({
  brand,
  tagline,
  linksLabel,
  links,
  fine,
  before,
  after,
  LinkComponent,
  ...rest
}: {
  brand: ReactNode;
  tagline: ReactNode;
  /** Accessible name of the link list, e.g. "Links". */
  linksLabel: string;
  links: NavItem[];
  fine?: ReactNode | ReactNode[];
  before?: ReactNode;
  after?: ReactNode;
  LinkComponent?: LinkComponent;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  return (
    <footer className="site-footer" {...rest}>
      {before}
      <div className="wrap footer-grid">
        <div className="footer-about">
          {brand}
          <p>{tagline}</p>
        </div>
        <nav aria-label={linksLabel} className="footer-links">
          {links.map((item) => (
            <NavLink key={item.key ?? item.href} item={item} LinkComponent={LinkComponent} />
          ))}
        </nav>
        {Array.isArray(fine) ? (
          <ul className="footer-fine">
            {fine.map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a static list of lines
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : fine ? (
          <p className="footer-fine">{fine}</p>
        ) : null}
      </div>
      {after}
    </footer>
  );
}
