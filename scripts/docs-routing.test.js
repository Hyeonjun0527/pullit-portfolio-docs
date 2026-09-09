const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = require('../api');

let server;
let origin;
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

for (const prefix of ['', '/pull-it-docs', '/pull-it/docs']) {
    test(`${prefix || '/'}: 포털, 가이드, API 페이지, 정적 파일 조회`, async () => {
        for (const suffix of ['', '/', '?from=pullit']) {
            const response = await fetch(`${origin}${prefix}${suffix}`);
            assert.equal(response.status, 200);
            const html = await response.text();
            assert.match(html, /Pullit 문서 포털/);
            assert.match(html, /href="\/pull-it-docs\/redoc.html"/);
            assert.match(html, /href="\/pull-it" class="service-link"/);
        }
        for (const [suffix, expected] of [
            ['/index.html', 'Pullit 온보딩'],
            ['/redoc.html', 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js'],
            ['/js/runtime-config.js', '/pull-it-docs'],
            ['/navigation.json', '01-introduction'],
            ['/css/main.css', 'portal-card'],
        ]) {
            const response = await fetch(`${origin}${prefix}${suffix}`);
            assert.equal(response.status, 200);
            assert.ok((await response.text()).includes(expected), suffix);
        }
    });
}

test('유사 접두어를 문서 루트로 오인하지 않는다', async () => {
    assert.equal((await fetch(`${origin}/pull-it-docs-other`)).status, 404);
});

test('가이드와 API 문서에서도 서비스로 돌아갈 수 있다', async () => {
    for (const page of ['index.html', 'redoc.html']) {
        const response = await fetch(`${origin}/pull-it-docs/${page}`);
        assert.match(await response.text(), /href="\/pull-it" class="fab-item"/);
    }
});

test('Redoc에만 즉시 스크롤을 적용하고 일반 페이지의 smooth 스크롤은 유지한다', async () => {
    const redoc = await (await fetch(`${origin}/pull-it-docs/redoc.html`)).text();
    assert.match(redoc, /<html lang="ko" class="redoc-root">/);
    const css = await (await fetch(`${origin}/pull-it-docs/css/main.css`)).text();
    assert.match(css, /html\.redoc-root\s*\{\s*scroll-behavior:\s*auto\s*;?\s*\}/);
    assert.match(css, /(?:^|\})\s*html\s*\{\s*scroll-behavior:\s*smooth\s*;?\s*\}/);
    for (const page of ['', '/index.html']) {
        const html = await (await fetch(`${origin}/pull-it-docs${page}`)).text();
        assert.doesNotMatch(html, /class="redoc-root"/);
    }
});

test('런타임 경로는 canonical 문서 경로를 사용하고 외부 주소는 보존한다', () => {
    const window = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/runtime-config.js'), 'utf8'), { window });
    const runtime = window.PullitDocsRuntime;
    assert.equal(runtime.apiDocsUrl, '/pull-it/api-docs');
    assert.equal(runtime.withBasePath('/content/a.md'), '/pull-it-docs/content/a.md');
    assert.equal(runtime.withBasePath('/pull-it-docs/content/a.md'), '/pull-it-docs/content/a.md');
    assert.equal(runtime.withBasePath('https://example.com/a'), 'https://example.com/a');
    assert.equal(runtime.withBasePath('#section'), '#section');
});
