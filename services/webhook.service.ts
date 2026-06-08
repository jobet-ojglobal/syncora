import { prisma } from "@/lib/prisma";


const events =
  await prisma.inflowWebhookEvent.findMany({
    orderBy: {
      receivedAt: "desc",
    },
    take: 20,
  });