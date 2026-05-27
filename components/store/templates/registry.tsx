import { Storefront } from "@/components/store/storefront";
import { BeautyStorefront } from "@/components/store/templates/beauty/beauty-storefront";
import { DefaultProductDetail } from "@/components/store/templates/default-product-detail";
import { FashionStorefront } from "@/components/store/templates/fashion/fashion-storefront";
import { HomeStorefront } from "@/components/store/templates/home/home-storefront";
import { PetStorefront } from "@/components/store/templates/pet/pet-storefront";
import { TechProductDetail } from "@/components/store/templates/tech/tech-product-detail";
import { TechStorefront } from "@/components/store/templates/tech/tech-storefront";
import type {
  ProductDetailTemplateProps,
  StorefrontTemplateProps,
} from "@/components/store/templates/types";

export function StorefrontRenderer(props: StorefrontTemplateProps) {
  switch (props.store.storeTemplate?.slug) {
    case "tech-store":
      return <TechStorefront {...props} />;
    case "fashion-premium":
      return <FashionStorefront {...props} />;
    case "beauty-glow":
      return <BeautyStorefront {...props} />;
    case "pet-friendly":
      return <PetStorefront {...props} />;
    case "casa-clean":
      return <HomeStorefront {...props} />;
    default:
      return <Storefront store={props.store} advancedSettings={props.advancedSettings} />;
  }
}

export function ProductDetailRenderer(props: ProductDetailTemplateProps) {
  switch (props.store.storeTemplate?.slug) {
    case "tech-store":
      return <TechProductDetail {...props} />;
    default:
      return <DefaultProductDetail {...props} />;
  }
}
