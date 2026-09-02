const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// 특정 디렉토리에서 모든 마크다운 파일의 상대 경로를 재귀적으로 찾는 함수
async function getLocalFilePaths(dir, rootDir) {
    let files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files = files.concat(await getLocalFilePaths(fullPath, rootDir));
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
                files.push(relativePath.replace('.md', ''));
            }
        }
    } catch (error) {
        // 디렉토리가 없어도 오류를 발생시키지 않음
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    return files;
}

async function main() {
    console.log('🚀 데이터베이스의 내용을 로컬 파일 시스템(public/content)으로 동기화합니다...');

    try {
        // 1. 데이터베이스의 모든 문서 가져오기
        const dbDocuments = await prisma.document.findMany();
        const dbDocsMap = new Map(dbDocuments.map(doc => [doc.path, doc.content]));
        console.log(`🗃️  데이터베이스에서 ${dbDocsMap.size}개의 문서를 읽었습니다.`);

        const contentDir = path.join(__dirname, '..', 'public', 'content');

        // 2. DB 문서를 로컬 파일로 쓰기
        console.log('⏳ 데이터베이스 내용을 로컬 파일로 쓰는 중...');
        let filesWritten = 0;
        for (const [docPath, content] of dbDocsMap.entries()) {
            const filePath = path.join(contentDir, `${docPath}.md`);
            const dirName = path.dirname(filePath);

            // 디렉토리가 없으면 생성
            await fs.mkdir(dirName, { recursive: true });
            await fs.writeFile(filePath, content, 'utf-8');
            filesWritten++;
        }
        console.log(`✅ ${filesWritten}개의 파일을 로컬에 성공적으로 썼습니다.`);

        // 3. DB에 없는 로컬 파일은 삭제
        const localFilePaths = await getLocalFilePaths(contentDir, contentDir);
        const pathsToDelete = localFilePaths.filter(localPath => !dbDocsMap.has(localPath));

        if (pathsToDelete.length > 0) {
            console.log('🗑️  데이터베이스에 없는 로컬 파일을 제거하는 중...');
            let filesDeleted = 0;
            for (const docPath of pathsToDelete) {
                const filePath = path.join(contentDir, `${docPath}.md`);
                try {
                    await fs.unlink(filePath);
                    filesDeleted++;
                } catch (error) {
                    console.error(`  - 파일 삭제 실패: ${filePath}`, error);
                }
            }
            console.log(`✅ ${filesDeleted}개의 불필요한 로컬 파일이 삭제되었습니다.`);
        }

        console.log('\n✨ 동기화 완료! 로컬 파일 시스템이 데이터베이스와 동일한 상태가 되었습니다.');

    } catch (error) {
        console.error('❌ 동기화 중 오류가 발생했습니다:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
