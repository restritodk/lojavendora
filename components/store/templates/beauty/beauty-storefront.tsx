import { GenericThemedStorefront } from "@/components/store/templates/generic-themed-storefront";
import type { StorefrontTemplateProps } from "@/components/store/templates/types";

export function BeautyStorefront(props: StorefrontTemplateProps) {
  return <GenericThemedStorefront {...props} themeSlug="beauty-glow" />;
}
