import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import type { FullServerData } from "@/app/app/server/[serverId]/appHooks/types";

const testingData: Record<string, Omit<FullServerData, 'slug'>> = {
  hermelinen: {
    name: "Hermelinen Convoy",
    description: "Quantum science's trucking convoy",

    discoveryId: "85568392935210120",
    password: "jamesisgay",
    requiredMods: [
      {
        name: "Steam collection",
        href: "https://steamcommunity.com/sharedfiles/filedetails/?id=3558497537"
      },
      {
        name: "Edison BDE",
        href: "https://serve.realsgii2.dev/u/edison-bde.scs"
      }
    ]
  }
};

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const server = testingData[id];

  if (!server) return notFound();

  if (request.nextUrl.searchParams.get("full") == "true")
    return NextResponse.json({
      ...server,
      slug: id
    })

  return NextResponse.json({
    name: server.name,
    description: server.description,
    slug: id,
  });
}
