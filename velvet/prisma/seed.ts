import { PrismaClient } from "@prisma/client";
import { serializeTags } from "../src/lib/tags";

const prisma = new PrismaClient();

// Seed a small set of fully-onboarded, compatible demo members so Discover has
// content. All content is wholesome and non-explicit — suitable for a reviewer
// walkthrough (blueprint §2, §16).
const members = [
  {
    email: "rowan@demo.velvet",
    displayName: "Rowan",
    age: 34,
    location: "Portland, OR",
    experienceLevel: "Experienced",
    intentions: ["Long-term connection", "Open / ethically non-monogamous"],
    interests: ["Communication & negotiation", "Trust & vulnerability", "Roles & dynamics"],
    communicationStyle: ["Direct & clear", "Boundaries-first"],
    boundaries: ["Hard limits always respected", "Communication required before meeting"],
    lookingFor: ["An ongoing dynamic", "A like-minded community"],
    values: ["Honesty", "Respect", "Consent culture"],
  },
  {
    email: "sage@demo.velvet",
    displayName: "Sage",
    age: 29,
    location: "Portland, OR",
    experienceLevel: "Exploring",
    intentions: ["Exploring what fits", "Friendship & community"],
    interests: ["Education & learning", "Communication & negotiation", "Trust & vulnerability"],
    communicationStyle: ["Thoughtful & slow-paced", "Frequent check-ins"],
    boundaries: ["Slow to meet in person", "Consent reaffirmed often"],
    lookingFor: ["Education & guidance", "Friendship first"],
    values: ["Kindness", "Curiosity", "Consent culture"],
  },
  {
    email: "kai@demo.velvet",
    displayName: "Kai",
    age: 41,
    location: "Seattle, WA",
    experienceLevel: "Experienced",
    intentions: ["Structured relationship", "Long-term connection"],
    interests: ["Power exchange dynamics", "Aftercare & support", "Mentorship"],
    communicationStyle: ["Direct & clear", "Boundaries-first"],
    boundaries: ["Hard limits always respected", "Discretion essential"],
    lookingFor: ["An ongoing dynamic"],
    values: ["Reliability", "Respect", "Honesty"],
  },
  {
    email: "wren@demo.velvet",
    displayName: "Wren",
    age: 31,
    location: "Portland, OR",
    experienceLevel: "Newcomer",
    intentions: ["Exploring what fits", "Discreet, low-key connection"],
    interests: ["Communication & negotiation", "Sensory exploration", "Education & learning"],
    communicationStyle: ["Async-friendly", "Thoughtful & slow-paced"],
    boundaries: ["Discretion essential", "Sober connection preferred"],
    lookingFor: ["New connections", "Education & guidance"],
    values: ["Curiosity", "Kindness"],
  },
];

async function main() {
  for (const m of members) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      create: {
        email: m.email,
        ageConfirmed: true,
        dobYear: new Date().getFullYear() - m.age,
        verification: "PHOTO_VERIFIED",
        consentPledgeVersion: "1.0",
        consentPledgeAcceptedAt: new Date(),
        standardsVersion: "1.0",
        standardsAcceptedAt: new Date(),
      },
      update: {},
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: m.displayName,
        age: m.age,
        location: m.location,
        experienceLevel: m.experienceLevel,
        visibility: "PUBLIC_MEMBERS",
        completed: true,
        intentions: serializeTags(m.intentions),
        interests: serializeTags(m.interests),
        communicationStyle: serializeTags(m.communicationStyle),
        boundaries: serializeTags(m.boundaries),
        lookingFor: serializeTags(m.lookingFor),
        values: serializeTags(m.values),
        promptCommunication: "Clear, kind, and honest — I say what I mean and listen closely.",
        promptBoundary: "I always check in, and I never treat a 'maybe' as a 'yes'.",
      },
      update: {},
    });
  }
  console.log(`Seeded ${members.length} demo members.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
