import { NextResponse } from "next/server";
import { getR2Object } from "@/lib/r2-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join("/");
  const object = await getR2Object(objectKey);

  if (!object) {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }

  return new NextResponse(object.body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": object.contentType,
    },
  });
}
