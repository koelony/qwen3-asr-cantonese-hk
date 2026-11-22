/* generated from koelony/design@977596b7da6d, do not edit. Change it in koelony/design and sync. */
import type { ReactNode } from "react";
import { NavLink } from "./NavLink.tsx";
import type { LinkComponent, NavItem } from "./types.ts";

/**
 * The cross-site header: pinned, a hairline under it, the brand on the left, the menu and the
 * language toggle on the right (on a phone the menu is a second row). Styles: `.site-header` in
 * components.css. Markup:
 *
 *   <header class="site-header">{before}<div class="wrap header-row">{brand}<nav class="nav">…</nav>
 *   <a class="lang">…</a>{after}</div></header>
 *
 * `brand` is the site's own (koelony.com shows the mark and wordmark, the blog adds "Blog");
 * `before` takes the read-progress bar or birds standing on the rule; `after` a perched koel.
 */
export function SiteHeader({
  brand,
  navLabel,
  nav,
  lang,
  before,
  after,
  LinkComponent,
}: {
  brand: ReactNode;
  /** Accessible name of the menu, e.g. "Main". */
  navLabel: string;
  nav: NavItem[];
  /** The language toggle: the same page in the other language, labelled in that language. */
  lang?: NavItem;
  before?: ReactNode;
  after?: ReactNode;
  LinkComponent?: LinkComponent;
}) {
  return (
    <header className="site-header">
      {before}
      <div className="wrap header-row">
        {brand}
        <nav aria-label={navLabel} className="nav">
          {nav.map((item) => (
            <NavLink key={item.key ?? item.href} item={item} LinkComponent={LinkComponent} />
          ))}
        </nav>
        {lang ? <NavLink item={lang} className="lang" LinkComponent={LinkComponent} /> : null}
        {after}
      </div>
    </header>
  );
}
