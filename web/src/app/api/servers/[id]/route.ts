import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";

const testingData: Record<string, { name: string; description: string }> = {
  hermelinen: {
    name: "Hermelinen Convoy",
    description: "Quantum science's trucking convoy",
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
  console.log(server)

  if (!server) return notFound();
  return NextResponse.json({
    ...server,
    slug: id,
  });
}
