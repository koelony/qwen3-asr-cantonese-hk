/* generated from koelony/design@e6933b9b8c1d, do not edit. Change it in koelony/design and sync. */
import type { LinkComponent, NavItem } from "./types.ts";

/** Renders one NavItem as a plain <a>, or with the site's router link when it is internal. */
export function NavLink({
  item,
  className,
  LinkComponent,
}: {
  item: NavItem;
  className?: string;
  LinkComponent?: LinkComponent;
}) {
  const props = {
    className,
    href: item.href,
    ...item.attrs,
    "aria-current": item.current ? ("page" as const) : undefined,
  };
  if (item.internal && LinkComponent) return <LinkComponent {...props}>{item.label}</LinkComponent>;
  return <a {...props}>{item.label}</a>;
}
