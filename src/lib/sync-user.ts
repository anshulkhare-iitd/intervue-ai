import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";

/** Ensures a `User` row exists for the signed-in Clerk user. Call from server code after auth. */
export async function syncCurrentUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;
  const email = primaryEmail ?? clerkUser.emailAddresses[0]?.emailAddress ?? null;
  const fromParts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
  const name = clerkUser.fullName || fromParts || null;

  return prisma.user.upsert({
    where: { id: clerkUser.id },
    create: {
      id: clerkUser.id,
      email,
      name,
    },
    update: {
      email,
      name,
    },
  });
}
