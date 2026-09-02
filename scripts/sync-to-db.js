const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// 특정 디렉토리에서 모든 마크다운 파일의 상대 경로와 내용을 재귀적으로 읽는 함수
async function getLocalDocuments(dir, rootDir) {
    let documents = new Map();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const subDocs = await getLocalDocuments(fullPath, rootDir);
            subDocs.forEach((value, key) => documents.set(key, value));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
            const documentPath = relativePath.replace('.md', '');
            const content = await fs.readFile(fullPath, 'utf-8');
            documents.set(documentPath, content);
        }
    }
    return documents;
}

async function main() {
    console.log('🚀 로컬 파일 시스템(public/content)의 내용을 데이터베이스로 동기화합니다...');

    try {
        // 1. 로컬 파일 시스템의 모든 문서 읽기
        const contentDir = path.join(__dirname, '..', 'public', 'content');
        const localDocsMap = await getLocalDocuments(contentDir, contentDir);
        console.log(`📄 로컬에서 ${localDocsMap.size}개의 문서를 읽었습니다.`);

        // 2. 데이터베이스의 모든 문서 경로 가져오기
        const dbDocs = await prisma.document.findMany({ select: { path: true } });
        const dbPaths = new Set(dbDocs.map(doc => doc.path));
        console.log(`🗃️  현재 데이터베이스에 ${dbPaths.size}개의 문서가 있습니다.`);

        // 3. 로컬 파일을 기준으로 DB에 Upsert (생성 또는 업데이트)
        console.log('⏳ 변경된 내용을 데이터베이스에 반영하는 중...');
        const upsertPromises = [];
        for (const [path, content] of localDocsMap.entries()) {
            upsertPromises.push(
                prisma.document.upsert({
                    where: { path },
                    update: { content },
                    create: { path, content },
                })
            );
        }
        await Promise.all(upsertPromises);
        console.log(`✅ ${upsertPromises.length}개의 문서가 데이터베이스에 성공적으로 반영되었습니다.`);

        // 4. 로컬에 없는 파일은 DB에서 삭제
        const pathsToDelete = [...dbPaths].filter(dbPath => !localDocsMap.has(dbPath));
        if (pathsToDelete.length > 0) {
            console.log('🗑️  로컬에서 삭제된 파일을 데이터베이스에서 제거하는 중...');
            const deleteResult = await prisma.document.deleteMany({
                where: {
                    path: {
                        in: pathsToDelete,
                    },
                },
            });
            console.log(`✅ ${deleteResult.count}개의 문서가 데이터베이스에서 삭제되었습니다.`);
        }

        console.log('\n✨ 동기화 완료! 데이터베이스가 로컬 파일 시스템과 동일한 상태가 되었습니다.');

    } catch (error) {
        console.error('❌ 동기화 중 오류가 발생했습니다:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
