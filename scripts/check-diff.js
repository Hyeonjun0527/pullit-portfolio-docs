const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const diff = require('diff');

const prisma = new PrismaClient();

// 특정 디렉토리에서 모든 마크다운 파일의 상대 경로를 재귀적으로 찾는 함수
async function getMarkdownFiles(dir, rootDir) {
    let files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await getMarkdownFiles(fullPath, rootDir));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            // content/ 이후의 경로만 사용
            const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
            files.push(relativePath);
        }
    }
    return files;
}

// 파일의 해시를 계산하는 함수
function getFileHash(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function main() {
    console.log('🔍 데이터베이스와 로컬 파일 시스템의 차이점을 확인합니다...');

    try {
        // 1. 데이터베이스에서 모든 문서 가져오기
        const dbDocuments = await prisma.document.findMany();
        const dbDocsMap = new Map(dbDocuments.map(doc => [doc.path, doc]));
        console.log(`🗃️  데이터베이스에서 ${dbDocsMap.size}개의 문서를 찾았습니다.`);

        // 2. 로컬 파일 시스템에서 모든 마크다운 파일 가져오기
        const contentDir = path.join(__dirname, '..', 'public', 'content');
        const localFilesPaths = await getMarkdownFiles(contentDir, contentDir);
        console.log(`📄 로컬 파일 시스템에서 ${localFilesPaths.length}개의 마크다운 파일을 찾았습니다.`);

        const dbPaths = new Set(dbDocsMap.keys());
        const localPaths = new Set(localFilesPaths.map(p => p.replace('.md', '')));

        let differencesFound = false;

        // 3. 데이터베이스에만 있는 문서 찾기
        const inDbOnly = [...dbPaths].filter(p => !localPaths.has(p));
        if (inDbOnly.length > 0) {
            differencesFound = true;
            console.log('\n❌ 데이터베이스에만 존재하는 문서:');
            inDbOnly.forEach(p => console.log(`  - ${p}`));
        }

        // 4. 로컬 파일에만 있는 문서 찾기
        const inLocalOnly = [...localPaths].filter(p => !dbPaths.has(p));
        if (inLocalOnly.length > 0) {
            differencesFound = true;
            console.log('\n❌ 로컬 파일 시스템에만 존재하는 문서:');
            inLocalOnly.forEach(p => console.log(`  - ${p}`));
        }

        // 5. 내용이 다른 문서 찾기
        const contentDiffs = [];
        for (const localPath of localPaths) {
            if (dbPaths.has(localPath)) {
                const dbDoc = dbDocsMap.get(localPath);
                const localFilePath = path.join(contentDir, `${localPath}.md`);
                const localContent = await fs.readFile(localFilePath, 'utf-8');

                // 줄바꿈 차이(CRLF vs LF)를 무시하기 위해 정규화
                const normalizedDbContent = dbDoc.content.replace(/\r\n/g, '\n');
                const normalizedLocalContent = localContent.replace(/\r\n/g, '\n');
                
                if (normalizedDbContent !== normalizedLocalContent) {
                    contentDiffs.push({
                        path: localPath,
                        diff: diff.createPatch(localPath, normalizedDbContent, normalizedLocalContent, 'Database', 'Local File')
                    });
                }
            }
        }

        if (contentDiffs.length > 0) {
            differencesFound = true;
            console.log('\n❌ 내용이 다른 문서:');
            contentDiffs.forEach(item => {
                console.log(`\n\n========================================`);
                console.log(`Diff for: ${item.path}`);
                console.log(`========================================`);
                // Diff 내용을 줄별로 색상으로 표시
                item.diff.split('\n').forEach(line => {
                    if (line.startsWith('+')) {
                        console.log(`\x1b[32m${line}\x1b[0m`); // Green for additions
                    } else if (line.startsWith('-')) {
                        console.log(`\x1b[31m${line}\x1b[0m`); // Red for deletions
                    } else if (line.startsWith('@@')) {
                        console.log(`\x1b[36m${line}\x1b[0m`); // Cyan for hunk headers
                    } else {
                        console.log(line);
                    }
                });
            });
        }

        console.log('\n----------------------------------------');
        if (!differencesFound) {
            console.log('✅ 완벽합니다! 데이터베이스와 로컬 파일이 모두 동기화되었습니다.');
        } else {
            console.log('⚠️  차이점이 발견되었습니다. 위의 로그를 확인해주세요.');
        }

    } catch (error) {
        console.error('오류가 발생했습니다:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
