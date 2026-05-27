import { GenericThemedStorefront } from "@/components/store/templates/generic-themed-storefront";
import type { StorefrontTemplateProps } from "@/components/store/templates/types";

export function HomeStorefront(props: StorefrontTemplateProps) {
  return <GenericThemedStorefront {...props} themeSlug="casa-clean" />;
}
