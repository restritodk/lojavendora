import { GenericThemedStorefront } from "@/components/store/templates/generic-themed-storefront";
import type { StorefrontTemplateProps } from "@/components/store/templates/types";

export function PetStorefront(props: StorefrontTemplateProps) {
  return <GenericThemedStorefront {...props} themeSlug="pet-friendly" />;
}
