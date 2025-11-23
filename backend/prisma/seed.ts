const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('FreelanceFlow2024', 10);

  // Create Admin User with Team
  console.log('Creating admin user and team...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@freelanceflow.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      ownedTeam: {
        create: {
          name: 'FreelanceFlow Team',
        },
      },
    },
    include: {
      ownedTeam: true,
    },
  });

  // Update admin to be part of their own team
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { teamId: adminUser.ownedTeam!.id },
  });

  // Create Team Members
  console.log('Creating team members...');
  const sarahUser = await prisma.user.create({
    data: {
      email: 'sarah@freelanceflow.com',
      name: 'Sarah Miller',
      password: hashedPassword,
      role: 'MEMBER',
      teamId: adminUser.ownedTeam!.id,
    },
  });

  const johnUser = await prisma.user.create({
    data: {
      email: 'john@freelanceflow.com',
      name: 'John Smith',
      password: hashedPassword,
      role: 'VIEWER',
      teamId: adminUser.ownedTeam!.id,
    },
  });

  // Create Clients
  console.log('Creating clients...');
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'TechCorp Inc.',
        email: 'contact@techcorp.com',
        phone: '+1-555-0101',
        tags: ['VIP', 'Enterprise'],
        totalRevenue: 45000,
        lastContact: new Date('2024-11-15'),
        notes: 'Large enterprise client, high priority',
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.client.create({
      data: {
        name: 'StartupHub',
        email: 'hello@startuphub.io',
        phone: '+1-555-0102',
        tags: ['Recurring', 'Startup'],
        totalRevenue: 12500,
        lastContact: new Date('2024-11-20'),
        notes: 'Fast-growing startup, monthly retainer',
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.client.create({
      data: {
        name: 'DesignStudio',
        email: 'info@designstudio.com',
        phone: '+1-555-0103',
        tags: ['Creative', 'VIP'],
        totalRevenue: 28000,
        lastContact: new Date('2024-11-18'),
        notes: 'Award-winning design agency',
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.client.create({
      data: {
        name: 'E-Commerce Plus',
        email: 'support@ecommerceplus.com',
        phone: '+1-555-0104',
        tags: ['E-commerce'],
        totalRevenue: 18500,
        lastContact: new Date('2024-11-10'),
        notes: 'Online retail platform',
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.client.create({
      data: {
        name: 'Marketing Pro',
        email: 'team@marketingpro.com',
        phone: '+1-555-0105',
        tags: ['Marketing'],
        totalRevenue: 9500,
        lastContact: new Date('2024-11-12'),
        notes: 'Digital marketing agency',
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
  ]);

  // Create Projects
  console.log('Creating projects...');
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Website Redesign',
        description: 'Complete overhaul of corporate website with modern UI/UX',
        type: 'Web Development',
        budget: 25000,
        status: 'IN_PROGRESS',
        dueDate: new Date('2024-12-31'),
        clientId: clients[0].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.project.create({
      data: {
        name: 'Mobile App Development',
        description: 'iOS and Android app for customer engagement',
        type: 'Mobile Development',
        budget: 50000,
        status: 'IN_PROGRESS',
        dueDate: new Date('2025-02-28'),
        clientId: clients[1].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.project.create({
      data: {
        name: 'Brand Identity Package',
        description: 'Logo, brand guidelines, and marketing materials',
        type: 'Design',
        budget: 15000,
        status: 'ON_REVIEW',
        dueDate: new Date('2024-11-30'),
        clientId: clients[2].id,
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.project.create({
      data: {
        name: 'E-commerce Platform',
        description: 'Custom e-commerce solution with payment integration',
        type: 'Web Development',
        budget: 35000,
        status: 'DRAFT',
        dueDate: new Date('2025-03-15'),
        clientId: clients[3].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.project.create({
      data: {
        name: 'SEO Optimization',
        description: 'Comprehensive SEO audit and implementation',
        type: 'Marketing',
        budget: 8000,
        status: 'COMPLETED',
        dueDate: new Date('2024-10-31'),
        clientId: clients[4].id,
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.project.create({
      data: {
        name: 'CRM Integration',
        description: 'Integrate third-party CRM with existing systems',
        type: 'Consulting',
        budget: 12000,
        status: 'IN_PROGRESS',
        dueDate: new Date('2024-12-15'),
        clientId: clients[0].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
  ]);

  // Create Tasks
  console.log('Creating tasks...');
  await Promise.all([
    // Tasks for Website Redesign
    prisma.task.create({
      data: {
        name: 'Design homepage mockup',
        description: 'Create initial design concepts for homepage',
        priority: 5,
        status: 'COMPLETED',
        progress: 100,
        category: 'Design',
        projectId: projects[0].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Implement responsive navigation',
        description: 'Build mobile-friendly navigation component',
        priority: 4,
        status: 'IN_PROGRESS',
        progress: 60,
        category: 'Development',
        dueDate: new Date('2024-11-25'),
        projectId: projects[0].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Content migration',
        description: 'Migrate existing content to new CMS',
        priority: 3,
        status: 'PENDING',
        progress: 0,
        category: 'Content',
        dueDate: new Date('2024-12-10'),
        projectId: projects[0].id,
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),

    // Tasks for Mobile App
    prisma.task.create({
      data: {
        name: 'User authentication flow',
        description: 'Implement login/signup screens and logic',
        priority: 5,
        status: 'IN_PROGRESS',
        progress: 75,
        category: 'Development',
        dueDate: new Date('2024-11-28'),
        projectId: projects[1].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Push notification setup',
        description: 'Configure Firebase Cloud Messaging',
        priority: 3,
        status: 'PENDING',
        progress: 0,
        category: 'Development',
        dueDate: new Date('2024-12-05'),
        projectId: projects[1].id,
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),

    // Tasks for Brand Identity
    prisma.task.create({
      data: {
        name: 'Logo variations',
        description: 'Create 3 logo concepts for client review',
        priority: 5,
        status: 'COMPLETED',
        progress: 100,
        category: 'Design',
        projectId: projects[2].id,
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Brand guidelines document',
        description: 'Compile comprehensive brand guide',
        priority: 4,
        status: 'IN_PROGRESS',
        progress: 80,
        category: 'Documentation',
        dueDate: new Date('2024-11-26'),
        projectId: projects[2].id,
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),

    // Standalone tasks (not tied to projects)
    prisma.task.create({
      data: {
        name: 'Follow up with potential client',
        description: 'Schedule call with FinTech Innovations',
        priority: 4,
        status: 'PENDING',
        progress: 0,
        category: 'Follow-up',
        dueDate: new Date('2024-11-24'),
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Prepare monthly invoice',
        description: 'Generate invoices for recurring clients',
        priority: 5,
        status: 'PENDING',
        progress: 0,
        category: 'Invoice',
        dueDate: new Date('2024-11-30'),
        userId: adminUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Update portfolio website',
        description: 'Add recent projects to portfolio',
        priority: 2,
        status: 'PENDING',
        progress: 0,
        category: 'Marketing',
        userId: sarahUser.id,
        teamId: adminUser.ownedTeam!.id,
      },
    }),
  ]);

  // Create Invoices with historical data
  console.log('Creating invoices...');
  const now = new Date();

  // Historical paid invoices spanning 6 months
  const historicalInvoices = [
    { amount: 8000, monthsAgo: 5, projectId: projects[4].id },
    { amount: 12500, monthsAgo: 4, projectId: projects[0].id },
    { amount: 15000, monthsAgo: 4, projectId: projects[2].id },
    { amount: 7200, monthsAgo: 3, projectId: projects[5].id },
    { amount: 18000, monthsAgo: 3, projectId: projects[1].id },
    { amount: 9500, monthsAgo: 2, projectId: projects[0].id },
    { amount: 11000, monthsAgo: 2, projectId: projects[3].id },
    { amount: 6800, monthsAgo: 1, projectId: projects[4].id },
    { amount: 13500, monthsAgo: 1, projectId: projects[2].id },
    { amount: 10200, monthsAgo: 0, projectId: projects[5].id },
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

  // Current invoices (sent/draft)
  await Promise.all([
    prisma.invoice.create({
      data: {
        amount: 25000,
        status: 'SENT',
        dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        projectId: projects[1].id,
      },
    }),
    prisma.invoice.create({
      data: {
        amount: 7500,
        status: 'DRAFT',
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        projectId: projects[3].id,
      },
    }),
  ]);

  console.log(`✅ Created ${historicalInvoices.length + 2} invoices`);

  // Create Messages
  console.log('Creating messages...');
  await Promise.all([
    prisma.message.create({
      data: {
        content: 'Looking forward to seeing the initial designs!',
        isFromAI: false,
        read: true,
        clientId: clients[0].id,
      },
    }),
    prisma.message.create({
      data: {
        content: 'Can we schedule a call to discuss the mobile app features?',
        isFromAI: false,
        read: false,
        clientId: clients[1].id,
      },
    }),
    prisma.message.create({
      data: {
        content: 'The logo concepts look great! Minor feedback attached.',
        isFromAI: false,
        read: true,
        clientId: clients[2].id,
        projectId: projects[2].id,
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('\n📝 Demo credentials:');
  console.log('   Email: admin@freelanceflow.com');
  console.log('   Password: FreelanceFlow2024');
  console.log('\n   Email: sarah@freelanceflow.com');
  console.log('   Password: FreelanceFlow2024');
  console.log('\n   Email: john@freelanceflow.com');
  console.log('   Password: FreelanceFlow2024');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
