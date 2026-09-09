// Redoc 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refresh-btn');
    const autoRefreshBtn = document.getElementById('auto-refresh-btn');
    const fabToggle = document.getElementById('fab-toggle');
    const fabMenu = document.getElementById('fab-menu');
    let isRefreshing = false;
    let autoRefreshInterval = null;
    let isFabExpanded = false;
    let currentETag = null;
    let isAutoRefreshEnabled = false;
    let toastTimeout;//

    function showToast(message) {
        if (toastTimeout) clearTimeout(toastTimeout);

        const toastContainer = document.getElementById('toast-container');
        let toast = document.querySelector('.toast-notification');
        
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            if (toastContainer) {
                toastContainer.appendChild(toast);
            } else {
                document.body.appendChild(toast);
            }
        }

        toast.textContent = message;
        toast.classList.add('show');

        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // FAB toggle functionality
    fabToggle.addEventListener('click', () => {
        isFabExpanded = !isFabExpanded;
        fabMenu.classList.toggle('show', isFabExpanded);
        fabToggle.classList.toggle('expanded', isFabExpanded);
    });

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    const SPEC_URL = PullitDocsRuntime.apiDocsUrl;

    function loadDocs() {
        if (isRefreshing) return;
        isRefreshing = true;
        if(refreshBtn) refreshBtn.disabled = true;
        showToast('페이지 새로고침 중...');
        
        // 페이지를 완전히 새로고침하여 Redoc을 다시 로드합니다.
        window.location.reload();
    }

    // 초기 로드는 Redoc.init을 직접 호출합니다.
    async function initialLoad() {
        showToast('문서 로딩 중...');
        const redocContainer = document.getElementById('redoc');
        if (!redocContainer) return;
        let specification;

        try {
            if (typeof Redoc === 'undefined') {
                throw new Error('API 문서 뷰어를 불러오지 못했습니다.');
            }
            const response = await fetch(SPEC_URL, { redirect: 'error' });
            if (!response.ok) {
                throw new Error(`API 명세 로드 실패: ${response.statusText}`);
            }
            specification = await response.json();
            if (!specification.openapi && !specification.swagger) {
                throw new Error('올바른 OpenAPI 명세가 아닙니다.');
            }
            currentETag = response.headers.get('ETag');
            console.log(`초기 ETag: ${currentETag}`);
        } catch (error) {
            console.error(error);
            redocContainer.textContent = 'API 문서를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
            redocContainer.setAttribute('role', 'alert');
            showToast('API 명세를 불러오지 못했습니다.');
            return;
        }

        Redoc.init(
            specification,
            {
                scrollYOffset: 50,
                theme: {
                    colors: {
                        primary: {
                            main: '#16a34a',
                            light: '#22c55e',
                            dark: '#15803d',
                        },
                    },
                },
            },
            redocContainer,
            (error) => {
                if (error) {
                    console.error('API 문서 렌더링 실패:', error);
                    showToast('API 문서를 표시하지 못했습니다.');
                    return;
                }
                const now = new Date();
                showToast(`갱신 완료 (${now.toLocaleTimeString()})`);
                
                // Re-initialize Lucide icons after Redoc loads
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        );
    }
    
    async function checkForUpdates() {
        if (!currentETag) return;

        showToast('변경 사항 확인 중...');
        try {
            const response = await fetch(SPEC_URL, {
                headers: {
                    'If-None-Match': currentETag
                }
            });

            if (response.status === 200) {
                showToast('새로운 버전 발견! 페이지를 새로고칩니다...');
                setTimeout(() => window.location.reload(), 1500);
            } else if (response.status === 304) {
                const now = new Date();
                showToast(`변경 없음 (${now.toLocaleTimeString()})`);
            }
        } catch (error) {
            console.error('업데이트 확인 중 오류:', error);
            showToast('업데이트 확인 실패');
        }
    }

    if(refreshBtn) refreshBtn.addEventListener('click', loadDocs);

    if(autoRefreshBtn) autoRefreshBtn.addEventListener('click', () => {
        isAutoRefreshEnabled = !isAutoRefreshEnabled; // 상태 토글
        autoRefreshBtn.classList.toggle('active', isAutoRefreshEnabled);

        if (isAutoRefreshEnabled) {
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            autoRefreshInterval = setInterval(checkForUpdates, 10000);
            showToast('자동 갱신 활성화됨');
            checkForUpdates(); // 활성화 시 즉시 확인
        } else {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
            showToast('자동 갱신 비활성화됨');
        }
    });

    // Initial load
    initialLoad();
});
