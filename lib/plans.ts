export type VendoraPlan = {
  name: string;
  slug: string;
  price: number;
  priceLabel: string;
  description: string;
  maxProducts: number | null;
  maxMonthlyVisits: number | null;
  maxUsers: number | null;
  isUnlimited?: boolean;
  features: string[];
  highlighted?: boolean;
};

export const vendoraPlans: VendoraPlan[] = [
  {
    name: "Loja Grátis",
    slug: "loja-gratis",
    price: 0,
    priceLabel: "Grátis para sempre",
    description: "Para validar sua ideia e começar a vender sem custo.",
    maxProducts: 50,
    maxMonthlyVisits: 10000,
    maxUsers: 1,
    features: [
      "Até 50 produtos",
      "10 mil visitas por mês",
      "Grátis para sempre",
    ],
  },
  {
    name: "Loja Inicial",
    slug: "loja-inicial",
    price: 49.99,
    priceLabel: "R$49,99 /mês",
    description: "Para quem quer uma loja pronta com recursos essenciais.",
    maxProducts: 100,
    maxMonthlyVisits: 100000,
    maxUsers: 5,
    features: [
      "Até 100 produtos",
      "100 mil visitas por mês",
      "Recursos básicos",
      "Sua loja criada por nós",
    ],
  },
  {
    name: "Loja Mais",
    slug: "loja-mais",
    price: 89.93,
    priceLabel: "R$89,93 /mês",
    description: "Para lojas em crescimento que precisam vender mais.",
    maxProducts: 400,
    maxMonthlyVisits: 250000,
    maxUsers: 10,
    highlighted: true,
    features: [
      "Até 400 produtos",
      "250 mil visitas por mês",
      "Recursos intermediários",
      "Sua loja criada por nós",
    ],
  },
  {
    name: "Loja Completa",
    slug: "loja-completa",
    price: 119.99,
    priceLabel: "R$119,99 /mês",
    description: "Para operações mais robustas com catálogo amplo.",
    maxProducts: 1500,
    maxMonthlyVisits: 500000,
    maxUsers: 15,
    features: [
      "Até 1500 produtos",
      "500 mil visitas por mês",
      "Recursos completos",
      "Sua loja criada por nós",
    ],
  },
  {
    name: "Loja Ilimitada",
    slug: "loja-ilimitada",
    price: 199.99,
    priceLabel: "R$199,99 /mês",
    description: "Para marcas que precisam escalar sem limite de catálogo.",
    maxProducts: null,
    maxMonthlyVisits: null,
    maxUsers: null,
    isUnlimited: true,
    features: [
      "Produtos ilimitados",
      "1 milhão de visitas por mês",
      "Sua loja criada por nós",
      "Consultoria de Marketing",
      "Consultoria de Negócios",
    ],
  },
];
