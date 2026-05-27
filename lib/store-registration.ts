export const STORE_REGISTRATION_FEATURE_ID = "profile:registration-data";

export const STORE_BUSINESS_SEGMENTS = [
  "Alimentação, confeitaria, bebidas",
  "Artes e Artesanato",
  "Autopeças e acessórios de veículos",
  "Bebês e maternidade",
  "Casa, Móveis, Decoração e Eletrodomésticos",
  "Eletrônicos, jogos, games e brinquedos",
  "Esporte, Fitness e suplementos",
  "Farmácia e produtos de saúde",
  "Gráficas, Livraria e papelaria",
  "Informática e tecnologia",
  "Joias e bijuterias",
  "Moda feminina",
  "Moda masculina",
  "Moda infantil",
  "Perfumaria, cosméticos, beleza e saúde",
  "Petshop",
  "Presentes, brindes, festas e produtos personalizados",
  "Produtos digitais e cursos",
  "Roupas, calçados e acessórios",
  "Sexshop",
  "Serviços profissionais",
  "Supermercado e mercearia",
  "Utensílios domésticos",
  "Outros",
];

export type StoreRegistrationValues = {
  personType: string;
  fullName: string;
  companyName: string;
  representative: string;
  document: string;
  stateRegistration: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  whatsapp: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  logoUrl: string;
  businessSegment: string;
  serviceHours: string;
  physicalAddress: string;
  contactEmail: string;
  facebookUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  pinterestUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
};

export const emptyStoreRegistrationValues: StoreRegistrationValues = {
  personType: "FISICA",
  fullName: "",
  companyName: "",
  representative: "",
  document: "",
  stateRegistration: "",
  email: "",
  phone: "",
  secondaryPhone: "",
  whatsapp: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  logoUrl: "",
  businessSegment: "",
  serviceHours: "",
  physicalAddress: "",
  contactEmail: "",
  facebookUrl: "",
  twitterUrl: "",
  youtubeUrl: "",
  instagramUrl: "",
  pinterestUrl: "",
  linkedinUrl: "",
  tiktokUrl: "",
};

export function normalizeStoreRegistrationValues(value: unknown): StoreRegistrationValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyStoreRegistrationValues;
  }

  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(emptyStoreRegistrationValues).map(([key, fallback]) => [
      key,
      typeof source[key] === "string" ? source[key] : fallback,
    ]),
  ) as StoreRegistrationValues;
}

