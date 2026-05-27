import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { initialStoreTemplates } from "../lib/store-templates";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  for (const item of initialStoreTemplates) {
    const category = await prisma.businessCategory.upsert({
      where: { slug: item.category.slug },
      update: {
        name: item.category.name,
        description: item.category.description,
      },
      create: item.category,
    });

    await prisma.storeTemplate.upsert({
      where: { slug: item.template.slug },
      update: {
        name: item.template.name,
        description: item.template.description,
        businessCategoryId: category.id,
        primaryColor: item.template.primaryColor,
        secondaryColor: item.template.secondaryColor,
        accentColor: item.template.accentColor,
        bannerTitle: item.template.bannerTitle,
        bannerSubtitle: item.template.bannerSubtitle,
        defaultCategories: item.template.defaultCategories,
        defaultProducts: item.template.defaultProducts,
      },
      create: {
        ...item.template,
        businessCategoryId: category.id,
      },
    });
  }

  console.log("Templates iniciais sincronizados.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
