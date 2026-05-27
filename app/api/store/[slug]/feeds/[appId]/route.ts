import { NextResponse } from "next/server";
import {
  buildStoreProductFeed,
  productFeedToXml,
} from "@/lib/integrations/feeds";

const feedAppIds = new Set(["google-shopping", "facebook-xml", "mercado-livre"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; appId: string }> },
) {
  const { slug, appId } = await context.params;

  if (!feedAppIds.has(appId)) {
    return NextResponse.json({ error: "Feed inválido." }, { status: 404 });
  }

  const feed = await buildStoreProductFeed(slug, appId);

  if (!feed) {
    return NextResponse.json({ error: "Feed não encontrado ou aplicativo desativado." }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format");

  if (format === "json") {
    return NextResponse.json(feed);
  }

  return new NextResponse(productFeedToXml(feed), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
