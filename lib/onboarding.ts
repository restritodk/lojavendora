import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getBusinessCategoriesWithTemplates() {
  return prisma.businessCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      templates: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function getUserPrimaryStore(userId: string) {
  const session = await getSession();

  if (session?.storeId) {
    const sessionStore = await prisma.store.findFirst({
      where: {
        id: session.storeId,
        OR: [
          { ownerId: userId },
          {
            staffUsers: {
              some: {
                userId,
                active: true,
              },
            },
          },
        ],
      },
    });

    if (sessionStore) {
      return sessionStore;
    }
  }

  const ownedStore = await prisma.store.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });

  if (ownedStore) {
    return ownedStore;
  }

  const staffStore = await prisma.storeStaffUser.findFirst({
    where: {
      userId,
      active: true,
      store: { active: true },
    },
    orderBy: { createdAt: "asc" },
    include: { store: true },
  });

  return staffStore?.store ?? null;
}

export async function applyTemplateToStore({
  storeId,
  templateId,
}: {
  storeId: string;
  templateId: string;
}) {
  const template = await prisma.storeTemplate.findUnique({
    where: { id: templateId },
    include: { businessCategory: true },
  });

  if (!template) {
    throw new Error("Template não encontrado.");
  }

  const defaultProducts = template.defaultProducts as Array<
    [string, string, number, string?]
  >;

  await prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id: storeId },
      data: {
        businessCategoryId: template.businessCategoryId,
        storeTemplateId: template.id,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        accentColor: template.accentColor,
        bannerTitle: template.bannerTitle,
        bannerSubtitle: template.bannerSubtitle,
        onboardingCompleted: true,
      },
    });

    const categoriesBySlug = new Map<string, string>();

    for (const categoryName of template.defaultCategories) {
      const category = await tx.category.upsert({
        where: {
          storeId_slug: {
            storeId,
            slug: slugify(categoryName),
          },
        },
        update: {},
        create: {
          storeId,
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
            storeId,
            slug: slugify(name),
          },
        },
        update: {
          description,
          price,
          categoryId,
        },
        create: {
          storeId,
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
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
