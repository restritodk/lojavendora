"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import {
  STORE_BUSINESS_SEGMENTS,
  STORE_REGISTRATION_FEATURE_ID,
} from "@/lib/store-registration";
import { savePublicImageUpload } from "@/lib/uploads";

export type StoreRegistrationResult = {
  type: "success" | "error";
  message: string;
};

export async function saveStoreRegistrationAction(
  formData: FormData,
): Promise<StoreRegistrationResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  const personType = getValue(formData, "personType") === "JURIDICA" ? "JURIDICA" : "FISICA";
  const fullName = getValue(formData, "fullName");
  const companyName = getValue(formData, "companyName");
  const representative = getValue(formData, "representative");
  const businessSegment = normalizeBusinessSegment(getValue(formData, "businessSegment"));
  let logoUrl = normalizeLogoUrl(getValue(formData, "logoUrl")) || store.logoUrl || "";
  const logoFile = formData.get("logoFile");

  if (personType === "FISICA" && !fullName) {
    return result("error", "Informe o nome completo.");
  }

  if (personType === "JURIDICA" && (!companyName || !representative)) {
    return result("error", "Informe razão social e representante.");
  }

  if (!businessSegment) {
    return result("error", "Informe o ramo de atividade da loja.");
  }

  try {
    if (logoFile instanceof File && logoFile.size > 0) {
      logoUrl = await savePublicImageUpload(logoFile, `stores/${store.id}/profile`);
    }
  } catch (error) {
    return result("error", error instanceof Error ? error.message : "Não foi possível enviar a logo.");
  }

  const values = {
    personType,
    fullName,
    companyName,
    representative,
    document: onlyDocumentChars(getValue(formData, "document")),
    stateRegistration: getValue(formData, "stateRegistration"),
    email: getValue(formData, "email") || user.email,
    phone: getValue(formData, "phone"),
    secondaryPhone: getValue(formData, "secondaryPhone"),
    whatsapp: getValue(formData, "whatsapp"),
    zipCode: getValue(formData, "zipCode"),
    street: getValue(formData, "street"),
    number: getValue(formData, "number"),
    complement: getValue(formData, "complement"),
    neighborhood: getValue(formData, "neighborhood"),
    city: getValue(formData, "city"),
    state: getValue(formData, "state"),
    logoUrl,
    businessSegment,
    serviceHours: getValue(formData, "serviceHours"),
    physicalAddress: getValue(formData, "physicalAddress") || buildPhysicalAddress({
      street: getValue(formData, "street"),
      number: getValue(formData, "number"),
      complement: getValue(formData, "complement"),
      neighborhood: getValue(formData, "neighborhood"),
      city: getValue(formData, "city"),
      state: getValue(formData, "state"),
      zipCode: getValue(formData, "zipCode"),
    }),
    contactEmail: getValue(formData, "contactEmail"),
    facebookUrl: getValue(formData, "facebookUrl"),
    twitterUrl: getValue(formData, "twitterUrl"),
    youtubeUrl: getValue(formData, "youtubeUrl"),
    instagramUrl: getValue(formData, "instagramUrl"),
    pinterestUrl: getValue(formData, "pinterestUrl"),
    linkedinUrl: getValue(formData, "linkedinUrl"),
    tiktokUrl: getValue(formData, "tiktokUrl"),
  };

  await prisma.$transaction([
    prisma.store.update({
      where: { id: store.id },
      data: { logoUrl },
    }),
    prisma.storeAdvancedSetting.upsert({
      where: {
        storeId_featureId: {
          storeId: store.id,
          featureId: STORE_REGISTRATION_FEATURE_ID,
        },
      },
      update: {
        active: true,
        values,
      },
      create: {
        storeId: store.id,
        featureId: STORE_REGISTRATION_FEATURE_ID,
        active: true,
        values,
      },
    }),
  ]);

  revalidatePath("/dashboard/dados-cadastrais");
  revalidatePath(`/store/${store.subdomain}`);
  revalidatePath(`/store/${store.subdomain}/ajuda`);
  revalidatePath(`/store/${store.subdomain}/contato`);

  return result("success", "Dados cadastrais salvos com sucesso.");
}

function normalizeBusinessSegment(value: string) {
  return STORE_BUSINESS_SEGMENTS.includes(value) ? value : value.trim();
}

function onlyDocumentChars(value: string) {
  return value.replace(/[^\d./-]/g, "");
}

function normalizeLogoUrl(value: string) {
  if (!value || value.startsWith("blob:") || value.startsWith("data:")) {
    return "";
  }

  return value;
}

function buildPhysicalAddress(values: {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}) {
  const streetLine = [values.street, values.number].filter(Boolean).join(", ");
  const complement = values.complement ? ` - ${values.complement}` : "";
  const neighborhood = values.neighborhood ? ` - ${values.neighborhood}` : "";
  const cityLine = [values.city, values.state].filter(Boolean).join(" - ");
  const zipCode = values.zipCode ? `CEP ${values.zipCode}` : "";

  return [streetLine ? `${streetLine}${complement}${neighborhood}` : "", cityLine, zipCode]
    .filter(Boolean)
    .join(" - ");
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function result(type: StoreRegistrationResult["type"], message: string): StoreRegistrationResult {
  return { type, message };
}

