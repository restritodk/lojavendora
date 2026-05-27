import { logoutAction } from "@/lib/actions";

export async function GET() {
  await logoutAction();
}
