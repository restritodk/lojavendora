import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const CUSTOMER_SESSION_COOKIE_NAME = "vendora_customer_session";

const CUSTOMER_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const customerSecret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "vendora-development-secret-change-me",
);

type CustomerSessionPayload = {
  customerId: string;
  storeId: string;
  accessEmail: string;
};

export async function createCustomerSession(payload: CustomerSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_SESSION_DURATION_SECONDS}s`)
    .sign(customerSecret);

  const cookieStore = await cookies();

  cookieStore.set({
    name: CUSTOMER_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CUSTOMER_SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function deleteCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE_NAME);
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, customerSecret);

    if (
      typeof payload.customerId !== "string" ||
      typeof payload.storeId !== "string" ||
      typeof payload.accessEmail !== "string"
    ) {
      return null;
    }

    return {
      customerId: payload.customerId,
      storeId: payload.storeId,
      accessEmail: payload.accessEmail,
    };
  } catch {
    return null;
  }
}

export async function getCurrentCustomer(storeId?: string) {
  const session = await getCustomerSession();

  if (!session) {
    return null;
  }

  if (storeId && session.storeId !== storeId) {
    return null;
  }

  return prisma.customer.findFirst({
    where: {
      id: session.customerId,
      storeId: session.storeId,
      accessEmail: session.accessEmail,
    },
    select: {
      id: true,
      name: true,
      accessEmail: true,
      email: true,
      storeId: true,
    },
  });
}

export async function requireCustomer(storeId: string, loginPath: string) {
  const customer = await getCurrentCustomer(storeId);

  if (!customer) {
    redirect(loginPath);
  }

  return customer;
}
