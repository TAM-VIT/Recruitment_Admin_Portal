import { PrismaClient } from "@prisma/client";

async function test(url: string) {
  console.log("Testing:", url.replace(/:([^@]+)@/, ":****@"));
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    const count = await p.admin.count();
    console.log("SUCCESS! Admin count:", count);
    return true;
  } catch (err: any) {
    console.log("FAILED:", err.message);
    return false;
  } finally {
    await p.$disconnect();
  }
}

async function run() {
  const url1 = "mongodb+srv://disha_frontend:99P9jcYRG2Dzodln@cluster0.edw0occ.mongodb.net/recruitment?retryWrites=true&w=majority";
  const url2 = "mongodb+srv://disha_frontend:99P9jcYRG2Dzodln@cluster0.edw0occ.mongodb.net/recruitment?authSource=admin&retryWrites=true&w=majority";
  const url3 = "mongodb+srv://disha_frontend:99P9jcYRG2Dzodln@cluster0.edw0occ.mongodb.net/?retryWrites=true&w=majority";

  await test(url1);
  await test(url2);
  await test(url3);
}

run();
