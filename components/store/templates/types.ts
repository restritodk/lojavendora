import type {
  Category,
  Product,
  ProductImage,
  Store,
  StoreTemplate,
} from "@/app/generated/prisma/client";
import type { StoreAdvancedSettingMap } from "@/lib/store-advanced-settings";

export type StorefrontProduct = Product & {
  category: Category | null;
  images?: ProductImage[];
};

export type StorefrontStore = Store & {
  storeTemplate?: Pick<StoreTemplate, "slug" | "name"> | null;
  products: StorefrontProduct[];
  categories: StorefrontCategory[];
  pages?: StorefrontPage[];
  banners?: StorefrontBanner[];
};

export type StorefrontTemplateProps = {
  store: StorefrontStore;
  advancedSettings?: StoreAdvancedSettingMap;
};

export type ProductDetailProduct = Product & {
  category: Category | null;
  images: ProductImage[];
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    customer: {
      name: string;
    } | null;
    attachments: Array<{
      id: string;
      url: string;
      type: string;
    }>;
  }>;
};

export type RelatedProduct = Product & {
  images: ProductImage[];
};

export type ProductDetailStore = Store & {
  storeTemplate?: Pick<StoreTemplate, "slug" | "name"> | null;
  categories: StorefrontCategory[];
  pages?: StorefrontPage[];
};

export type StorefrontPage = {
  id: string;
  title: string;
  slug: string;
};

export type StorefrontBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
};

export type StorefrontCategory = Category & {
  children?: Category[];
};

export type ProductDetailTemplateProps = {
  store: ProductDetailStore;
  product: ProductDetailProduct;
  relatedProducts: RelatedProduct[];
  advancedSettings?: StoreAdvancedSettingMap;
};
