const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all documents from the database...');
    
    const documents = await prisma.document.findMany({
        // You can add sorting or filtering here if needed
        orderBy: {
            path: 'asc',
        },
    });

    if (documents.length > 0) {
        console.log(`Successfully fetched ${documents.length} documents:`);
        documents.forEach(doc => {
            // Print path and a snippet of the content
            console.log(`  - Path: ${doc.path}, Content Snippet: ${doc.content.substring(0, 50).replace(/\n/g, ' ')}...`);
        });
    } else {
        console.log('No documents found in the database.');
    }
}

main()
    .catch((e) => {
        console.error('An error occurred while fetching documents:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
