import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlatformMercadoPagoForm } from "./platform-mercado-pago-form";

export default async function AdminMercadoPagoPage() {
  await requireAdmin();
  const settings = await prisma.platformPaymentSetting.findUnique({
    where: { provider: "mercado-pago" },
  });

  return (
    <AdminShell>
      <PlatformMercadoPagoForm
        initialValues={{
          publicKey: settings?.publicKey ?? "",
          accessToken: settings?.accessToken ?? "",
          active: settings?.active ?? false,
          sandbox: settings?.sandbox ?? false,
        }}
      />
    </AdminShell>
  );
}
