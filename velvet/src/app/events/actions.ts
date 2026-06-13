"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isValidCategory } from "@/lib/events";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Members apply to become a verified host (blueprint §27). Approval is manual.
export async function applyToHost(formData: FormData) {
  const user = await requireUser();
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 1000);
  const experience = String(formData.get("experience") ?? "").trim().slice(0, 1000) || null;
  if (!bio) redirect("/events/host?error=1");

  await prisma.hostApplication.upsert({
    where: { userId: user.id },
    create: { userId: user.id, bio, experience, status: "PENDING" },
    update: { bio, experience, status: "PENDING", reviewedAt: null, reviewedById: null, note: null },
  });
  redirect("/events/host?applied=1");
}

// Verified hosts create events. Events publish only after admin approval
// (blueprint §12, §26) — they start PENDING and are never publicly listed until APPROVED.
export async function createEvent(formData: FormData) {
  const user = await requireUser();
  if (!user.isHost) redirect("/events/host");

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 4000);
  const category = String(formData.get("category") ?? "");
  const format = String(formData.get("format") ?? "IN_PERSON") === "ONLINE" ? "ONLINE" : "IN_PERSON";
  const location = String(formData.get("location") ?? "").trim().slice(0, 120);
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const capacity = Math.min(1000, Math.max(1, Number(formData.get("capacity") ?? 20)));
  const priceDollars = Math.max(0, Number(formData.get("price") ?? 0));
  const priceCents = Math.round(priceDollars * 100);

  const startsAt = new Date(startsAtRaw);
  if (!title || !description || !isValidCategory(category) || !location || isNaN(startsAt.getTime())) {
    redirect("/events/new?error=1");
  }

  await prisma.event.create({
    data: { hostId: user.id, title, description, category, format, location, startsAt, capacity, priceCents, status: "PENDING" },
  });
  redirect("/events?created=1");
}

export async function rsvp(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { rsvps: true } });
  if (!event || event.status !== "APPROVED") redirect("/events");

  // NOTE: a paid event would create a Stripe Checkout session here and confirm
  // the RSVP on payment webhook. In this demo we record the reservation directly.
  const reserved = event.rsvps.filter((r) => r.status === "RESERVED").length;
  const status = reserved < event.capacity ? "RESERVED" : "WAITLIST";

  await prisma.rsvp.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, status },
    update: { status },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function cancelRsvp(eventId: string) {
  const user = await requireUser();
  await prisma.rsvp.updateMany({
    where: { eventId, userId: user.id },
    data: { status: "CANCELED" },
  });
  // Promote the earliest waitlisted attendee, if any.
  const waiter = await prisma.rsvp.findFirst({
    where: { eventId, status: "WAITLIST" },
    orderBy: { createdAt: "asc" },
  });
  if (waiter) await prisma.rsvp.update({ where: { id: waiter.id }, data: { status: "RESERVED" } });
  revalidatePath(`/events/${eventId}`);
}

// Reporting an event records a report against its host with event context
// (blueprint §12 event reporting) — routed to the same moderation queue.
export async function reportEvent(formData: FormData) {
  const user = await requireUser();
  const eventId = String(formData.get("eventId"));
  const detail = String(formData.get("detail") ?? "").slice(0, 1000);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  await prisma.report.create({
    data: {
      reporterId: user.id,
      reportedId: event.hostId,
      category: "OFF_PLATFORM",
      detail: `[EVENT ${eventId}] ${detail}`,
    },
  });
  revalidatePath(`/events/${eventId}`);
}
