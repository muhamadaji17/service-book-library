import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const userCount = await prisma.user.count();
  const bookCount = await prisma.book.count();
  const userBookCount = await prisma.userBook.count();
  const sessionCount = await prisma.readingSession.count();

  console.log("✅ Connected to Prisma Postgres!");
  console.log(`   Users: ${userCount}`);
  console.log(`   Books: ${bookCount}`);
  console.log(`   UserBooks: ${userBookCount}`);
  console.log(`   ReadingSessions: ${sessionCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Connection failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
