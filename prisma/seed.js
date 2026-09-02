const { PrismaClient } = require('@prisma/client');
const { glob } = require('glob');
const fs = require('fs/promises');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seeding...');

    // 1. Find all markdown files
    const contentRoot = path.join(__dirname, '..', 'public', 'content');
    const files = await glob('**/*.md', { cwd: contentRoot });
    console.log(`Found ${files.length} markdown files to seed.`);

    // 2. Read each file and upsert into the database
    for (const file of files) {
        try {
            const filePath = path.join(contentRoot, file);
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Convert file system path to URL-like path
            const urlPath = file.replace(/\\/g, '/').replace(/\.md$/, '');

            const document = await prisma.document.upsert({
                where: { path: urlPath },
                update: { content }, // Simplified update
                create: {
                    path: urlPath,
                    content,
                },
            });
            console.log(`  - Upserted: ${document.path}`);
        } catch (error) {
            console.error(`  - Failed to process file ${file}:`, error);
        }
    }

    console.log('Database seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
