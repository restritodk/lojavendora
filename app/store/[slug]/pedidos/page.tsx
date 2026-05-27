import { notFound } from "next/navigation";
import { InactiveStorePage } from "@/components/store/inactive-store-page";
import { StoreTemporarilyUnavailable } from "@/components/store/store-temporarily-unavailable";
import { requireCustomer } from "@/lib/customer-auth";
import { expireApprovedReturnRequests, expirePendingOrders } from "@/lib/orders/payment-lifecycle";
import { prisma } from "@/lib/prisma";
import { checkStoreSubscription } from "@/lib/store-subscription";
import { CustomerDashboard } from "./customer-dashboard";

export default async function StoreCustomerOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({ where: { subdomain: slug } });

  if (!store) {
    notFound();
  }

  if (!store.active) {
    return <InactiveStorePage store={store} />;
  }
  const subscriptionCheck = await checkStoreSubscription(store.id);
  if (subscriptionCheck.isBlocked) {
    return <StoreTemporarilyUnavailable store={store} />;
  }
  await expirePendingOrders(store.id);
  await expireApprovedReturnRequests(store.id);

  const loginParams = new URLSearchParams({
    error: "Faça login para acessar seus pedidos.",
  });
  const customer = await requireCustomer(
    store.id,
    `/store/${store.subdomain}/login?${loginParams.toString()}`,
  );
  const customerProfile = await prisma.customer.findFirst({
    where: {
      id: customer.id,
      storeId: store.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      accessEmail: true,
      phone: true,
      document: true,
      personType: true,
      zipCode: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      notes: true,
    },
  });

  if (!customerProfile) {
    notFound();
  }

  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      customerId: customer.id,
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
      returnRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          attachments: true,
        },
      },
      reviews: {
        select: {
          id: true,
        },
      },
      cancellations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <CustomerDashboard
      store={{
        name: store.name,
        subdomain: store.subdomain,
        primaryColor: store.primaryColor,
        accentColor: store.accentColor,
        logoUrl: store.logoUrl,
      }}
      customer={customerProfile}
      orders={orders.map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.total.toString(),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        integrationStatus: normalizeOrderJson(order.integrationStatus),
        shippingMethod: order.shippingMethod,
        trackingCode: order.trackingCode,
        shippingDeadline: order.shippingDeadline,
        shippingZipCode: order.shippingZipCode,
        shippingStreet: order.shippingStreet,
        shippingNumber: order.shippingNumber,
        shippingComplement: order.shippingComplement,
        shippingNeighborhood: order.shippingNeighborhood,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          total: item.total.toString(),
        })),
        returnRequests: order.returnRequests.map((request) => ({
          id: request.id,
          status: request.status,
          reason: request.reason,
          otherReason: request.otherReason,
          observation: request.observation,
          merchantCarrier: request.merchantCarrier,
          merchantPostCode: request.merchantPostCode,
          merchantReturnAddress: request.merchantReturnAddress,
          merchantPostDeadline: request.merchantPostDeadline,
          merchantPackageInstructions: request.merchantPackageInstructions,
          merchantNotes: request.merchantNotes,
          customerTrackingCode: request.customerTrackingCode,
          customerReturnNote: request.customerReturnNote,
          refundStatus: request.refundStatus,
          refundMessage: request.refundMessage,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
          attachments: request.attachments.map((attachment) => ({
            id: attachment.id,
            url: attachment.url,
            type: attachment.type,
            fileName: attachment.fileName,
            purpose: attachment.purpose,
          })),
        })),
        cancellation: order.cancellations[0]
          ? {
              reason: order.cancellations[0].reason,
              otherReason: order.cancellations[0].otherReason,
              refundStatus: order.cancellations[0].refundStatus,
              refundMessage: order.cancellations[0].refundMessage,
              createdAt: order.cancellations[0].createdAt.toISOString(),
            }
          : null,
        hasReview: order.reviews.length > 0,
      }))}
    />
  );
}

function normalizeOrderJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
