const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding historical invoice data...');

  // Get the admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@freelanceflow.com' },
  });

  if (!adminUser) {
    console.error('Admin user not found');
    return;
  }

  // Get existing projects
  const projects = await prisma.project.findMany({
    where: { userId: adminUser.id },
  });

  if (projects.length === 0) {
    console.error('No projects found');
    return;
  }

  console.log(`Found ${projects.length} projects`);

  const now = new Date();

  // Historical paid invoices spanning 6 months
  const historicalInvoices = [
    { amount: 8000, monthsAgo: 5, projectId: projects[Math.min(4, projects.length - 1)].id },
    { amount: 12500, monthsAgo: 4, projectId: projects[0].id },
    { amount: 15000, monthsAgo: 4, projectId: projects[Math.min(2, projects.length - 1)].id },
    { amount: 7200, monthsAgo: 3, projectId: projects[Math.min(5, projects.length - 1)].id },
    { amount: 18000, monthsAgo: 3, projectId: projects[Math.min(1, projects.length - 1)].id },
    { amount: 9500, monthsAgo: 2, projectId: projects[0].id },
    { amount: 11000, monthsAgo: 2, projectId: projects[Math.min(3, projects.length - 1)].id },
    { amount: 6800, monthsAgo: 1, projectId: projects[Math.min(4, projects.length - 1)].id },
    { amount: 13500, monthsAgo: 1, projectId: projects[Math.min(2, projects.length - 1)].id },
    { amount: 10200, monthsAgo: 0, projectId: projects[Math.min(5, projects.length - 1)].id },
  ];

  for (const inv of historicalInvoices) {
    const paidDate = new Date(now);
    paidDate.setMonth(paidDate.getMonth() - inv.monthsAgo);
    paidDate.setDate(15 + Math.floor(Math.random() * 10));

    await prisma.invoice.create({
      data: {
        amount: inv.amount,
        status: 'PAID',
        dueDate: new Date(paidDate.getTime() - 15 * 24 * 60 * 60 * 1000),
        paidDate,
        projectId: inv.projectId,
      },
    });
  }

  console.log(`✅ Created ${historicalInvoices.length} historical invoices`);

  // Update client total revenues based on paid invoices
  const clients = await prisma.client.findMany({
    where: { userId: adminUser.id },
    include: {
      projects: {
        include: {
          invoices: {
            where: { status: 'PAID' },
          },
        },
      },
    },
  });

  for (const client of clients) {
    const totalRevenue = client.projects.reduce(
      (sum, project) =>
        sum +
        project.invoices.reduce((invSum, inv) => invSum + inv.amount, 0),
      0
    );

    await prisma.client.update({
      where: { id: client.id },
      data: { totalRevenue },
    });
  }

  console.log(`✅ Updated ${clients.length} client total revenues`);
  console.log('🎉 Historical data added successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error adding historical data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
