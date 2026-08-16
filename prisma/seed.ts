import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create users
  const user1 = await prisma.user.upsert({
    where: { email: "aji@example.com" },
    update: {},
    create: {
      name: "Aji",
      email: "aji@example.com",
      password: "$2a$10$placeholder_hashed_password_1", // placeholder
      readingGoal: 12,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "reader@example.com" },
    update: {},
    create: {
      name: "Book Lover",
      email: "reader@example.com",
      password: "$2a$10$placeholder_hashed_password_2", // placeholder
      readingGoal: 24,
    },
  });

  // Create books
  const book1 = await prisma.book.create({
    data: {
      isbn: "978-0-06-112008-4",
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      publisher: "J. B. Lippincott & Co.",
      publishedYear: 1960,
      pageCount: 281,
      description:
        "A novel about the serious issues of rape and racial inequality narrated by a young girl in the American South.",
    },
  });

  const book2 = await prisma.book.create({
    data: {
      isbn: "978-0-7432-7356-5",
      title: "1984",
      author: "George Orwell",
      publisher: "Secker & Warburg",
      publishedYear: 1949,
      pageCount: 328,
      description:
        "A dystopian novel set in a totalitarian society ruled by Big Brother.",
    },
  });

  const book3 = await prisma.book.create({
    data: {
      isbn: "978-0-14-028329-7",
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      publisher: "Charles Scribner's Sons",
      publishedYear: 1925,
      pageCount: 180,
      description:
        "A story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan.",
    },
  });

  // Create user-book relationships
  const userBook1 = await prisma.userBook.create({
    data: {
      userId: user1.id,
      bookId: book1.id,
      status: "FINISHED",
      currentPage: 281,
      progress: 100,
      rating: 5,
      summary: "A powerful story about justice and moral growth.",
      favoriteQuote:
        "You never really understand a person until you consider things from his point of view.",
    },
  });

  const userBook2 = await prisma.userBook.create({
    data: {
      userId: user1.id,
      bookId: book2.id,
      status: "READING",
      currentPage: 150,
      progress: 45.7,
      startDate: new Date("2026-08-01"),
      targetFinishDate: new Date("2026-08-31"),
    },
  });

  await prisma.userBook.create({
    data: {
      userId: user2.id,
      bookId: book3.id,
      status: "WANT_TO_READ",
    },
  });

  // Create reading sessions
  await prisma.readingSession.createMany({
    data: [
      {
        userBookId: userBook2.id,
        pagesRead: 50,
        durationMinutes: 60,
        notes: "Started the book. Interesting world-building.",
      },
      {
        userBookId: userBook2.id,
        pagesRead: 40,
        durationMinutes: 45,
        notes: "The surveillance themes are unsettling.",
      },
      {
        userBookId: userBook2.id,
        pagesRead: 60,
        durationMinutes: 75,
        notes: "Winston's rebellion is compelling.",
      },
    ],
  });

  console.log("✅ Seeding complete!");
  console.log(`   Users: ${user1.name}, ${user2.name}`);
  console.log(
    `   Books: ${book1.title}, ${book2.title}, ${book3.title}`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
