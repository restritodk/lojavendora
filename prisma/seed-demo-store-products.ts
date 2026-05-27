import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const stores = await prisma.store.findMany({
    where: {
      storeTemplateId: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      storeTemplateId: true,
    },
  });

  for (const store of stores) {
    if (!store.storeTemplateId) {
      continue;
    }

    const template = await prisma.storeTemplate.findUnique({
      where: { id: store.storeTemplateId },
    });

    if (!template) {
      continue;
    }

    const defaultProducts = template.defaultProducts as Array<
      [string, string, number, string?]
    >;

    await prisma.$transaction(async (tx) => {
      const categoriesBySlug = new Map<string, string>();

      for (const categoryName of template.defaultCategories) {
        const category = await tx.category.upsert({
          where: {
            storeId_slug: {
              storeId: store.id,
              slug: slugify(categoryName),
            },
          },
          update: {},
          create: {
            storeId: store.id,
            name: categoryName,
            slug: slugify(categoryName),
          },
        });

        categoriesBySlug.set(category.slug, category.id);
      }

      for (const [name, description, price, categoryName] of defaultProducts) {
        const categoryId = categoryName
          ? categoriesBySlug.get(slugify(categoryName))
          : undefined;

        await tx.product.upsert({
          where: {
            storeId_slug: {
              storeId: store.id,
              slug: slugify(name),
            },
          },
          update: {
            description,
            price,
            categoryId,
          },
          create: {
            storeId: store.id,
            name,
            slug: slugify(name),
            description,
            price,
            categoryId,
            stock: 10,
          },
        });
      }
    });

    console.log(`Produtos demo sincronizados para ${store.name}.`);
  }

  console.log(`${stores.length} loja(s) sincronizada(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
