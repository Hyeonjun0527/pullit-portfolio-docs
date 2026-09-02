(function configurePullitDocsRuntime(global) {
    const basePath = '/pull-it/docs';

    function withBasePath(path) {
        if (!path || /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.startsWith('#')) {
            return path;
        }

        if (path === basePath || path.startsWith(`${basePath}/`)) {
            return path;
        }

        return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
    }

    global.PullitDocsRuntime = Object.freeze({
        basePath,
        apiDocsUrl: '/pull-it/api-docs',
        withBasePath,
    });
})(window);
