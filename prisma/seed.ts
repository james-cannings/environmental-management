import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const agencies = [
    { name: "The Brandtech Group", contactEmail: "sustainability@brandtech.com" },
    { name: "MSQ Partners", contactEmail: "sustainability@msqpartners.com" },
    { name: "Stack", contactEmail: "sustainability@stack.co" },
  ];

  for (const agency of agencies) {
    await prisma.agency.upsert({
      where: { name: agency.name },
      update: {},
      create: agency,
    });
  }

  console.log("Seeded default agencies");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
