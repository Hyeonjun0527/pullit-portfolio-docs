document.addEventListener('DOMContentLoaded', () => {
    const app = Vue.createApp({
        data() {
            return {
                activeSection: 'introduction',
                isDropdownOpen: {},
                isFabExpanded: false,
                isMobileSidebarOpen: false,
                isSidebarCollapsed: false,
                collapsedSections: {},
                navigation: [],
                sections: {},
                isEditing: {},
                editingContent: {},
                isAuthenticated: false,
                showAuthModal: false,
                authPassword: '',
                authError: '',
                isDragging: {},
                pendingAction: null,
                isFullyLoaded: false
            }
        },
        methods: {
            async initializeApp() {
                try {
                    // 1. 네비게이션으로 UI 뼈대 즉시 생성
                    const navResponse = await fetch(PullitDocsRuntime.withBasePath('/navigation.json'));
                    this.navigation = await navResponse.json();
                    this.generateSectionsFromNavigation(); // 이 함수는 각 섹션에 markdownUrl을 채워줌
            
                    // 2. 초기 화면 렌더링
                    const hash = window.location.hash.substring(1);
                    const initialSection = this.sections[hash] ? hash : '01-introduction';
                    this.showSection(initialSection, false);
            
                    // 3. 백그라운드에서 DB 데이터 로딩 및 캐싱 시작
                    setTimeout(() => {
                        this.fetchAndCacheAllDocuments();
                    }, 100); // UI 렌더링을 방해하지 않도록 약간의 지연 후 실행
            
                } catch (error) {
                    console.error("Initialization failed:", error);
                }
            },
            async fetchAndCacheAllDocuments() {
                try {
                    const docsResponse = await fetch(PullitDocsRuntime.withBasePath('/api/documents'));
                    const allDocsArray = await docsResponse.json();
                    
                    const allDocs = allDocsArray.reduce((acc, doc) => {
                        const [category, id] = doc.path.split('/');
                        acc[doc.path] = { ...doc, category, id };
                        return acc;
                    }, {});
            
                    localStorage.setItem('pullitDocsCache', JSON.stringify(allDocs));
            
                    // DB 데이터로 sections 객체 업데이트
                    Object.values(allDocs).forEach(doc => {
                        if (this.sections[doc.id]) {
                            this.sections[doc.id].markdown = doc.content;
                            this.sections[doc.id].loaded = true; // DB에서 로드되었음을 표시
                        }
                    });
            
                    this.isFullyLoaded = true;
                    console.log("All documents fetched from DB and cached.");
            
                } catch (error) {
                    console.error("Failed to fetch and cache documents from DB:", error);
                }
            },
            generateSectionsFromNavigation() {
                const sections = {};
                this.navigation.forEach(category => {
                    if (category.items) {
                        category.items.forEach(item => {
                            sections[item.id] = {
                                title: item.title,
                                category: category.category, // Explicitly store category
                                markdownUrl: PullitDocsRuntime.withBasePath(`/content/${category.category}/${item.id}.md`),
                                loaded: false,
                                markdown: '',
                            };
                        });
                    }
                });

                sections['maintainers'] = {
                    title: 'Maintainers',
                    html: `
                        <style>
                            .maintainer-grid {
                                display: grid;
                                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                                gap: 24px;
                                text-align: center;
                            }
                            .maintainer-card {
                                background: #f9fafb;
                                border-radius: 12px;
                                padding: 20px;
                                transition: transform 0.2s ease, box-shadow 0.2s ease;
                            }
                            .maintainer-card:hover {
                                transform: translateY(-5px);
                                box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                            }
                            .maintainer-avatar {
                                width: 100px;
                                height: 100px;
                                border-radius: 50%;
                                margin-bottom: 12px;
                                border: 3px solid #fff;
                                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                            }
                            .maintainer-name {
                                font-weight: 600;
                                font-size: 1.1em;
                                color: #111827;
                            }
                            .maintainer-role {
                                font-size: 0.9em;
                                color: #6b7280;
                                margin-top: 4px;
                            }
                            .maintainer-name-link {
                                text-decoration: none;
                            }
                            .maintainer-link {
                                display: inline-block;
                                margin-top: 8px;
                                text-decoration: none;
                            }
                            .maintainer-section-title {
                                font-size: 1.5em;
                                font-weight: bold;
                                color: #374151;
                                margin-bottom: 20px;
                                padding-bottom: 10px;
                                border-bottom: 2px solid #e5e7eb;
                            }
                        </style>
                        
                        <h4 class="maintainer-section-title">Backend Maintainers</h4>
                        <div class="maintainer-grid">
                            <div class="maintainer-card">
                                <a href="https://github.com/xqqldir" target="_blank">
                                    <img src="https://github.com/xqqldir.png" alt="xqqldir avatar" class="maintainer-avatar">
                                </a>
                                <a href="https://github.com/xqqldir" target="_blank" class="maintainer-name-link">
                                    <div class="maintainer-name">xqqldir</div>
                                </a>
                                <a href="https://github.com/xqqldir" target="_blank" class="maintainer-link">
                                    <img src="https://img.shields.io/badge/GitHub-Profile-blue?logo=github" alt="GitHub Profile"/>
                                </a>
                            </div>
                            <div class="maintainer-card">
                                <a href="https://github.com/Hyeonjun0527" target="_blank">
                                    <img src="https://github.com/Hyeonjun0527.png" alt="Hyeonjun0527 avatar" class="maintainer-avatar">
                                </a>
                                <a href="https://github.com/Hyeonjun0527" target="_blank" class="maintainer-name-link">
                                    <div class="maintainer-name">Hyeonjun0527</div>
                                </a>
                                <div class="maintainer-role">Team Leader</div>
                                <a href="https://github.com/Hyeonjun0527" target="_blank" class="maintainer-link">
                                    <img src="https://img.shields.io/badge/GitHub-Profile-green?logo=github" alt="GitHub Profile"/>
                                </a>
                            </div>
                            <div class="maintainer-card">
                                <a href="https://github.com/flareseek" target="_blank">
                                    <img src="https://github.com/flareseek.png" alt="flareseek avatar" class="maintainer-avatar">
                                </a>
                                <a href="https://github.com/flareseek" target="_blank" class="maintainer-name-link">
                                    <div class="maintainer-name">flareseek</div>
                                </a>
                                <div class="maintainer-role">Backend Leader</div>
                                <a href="https://github.com/flareseek" target="_blank" class="maintainer-link">
                                    <img src="https://img.shields.io/badge/GitHub-Profile-orange?logo=github" alt="GitHub Profile"/>
                                </a>
                            </div>
                        </div>

                        <br/><br/>

                        <h4 class="maintainer-section-title">Frontend Maintainers</h4>
                        <div class="maintainer-grid">
                            <div class="maintainer-card">
                                <a href="https://github.com/anseonghyeon" target="_blank">
                                    <img src="https://github.com/anseonghyeon.png" alt="anseonghyeon avatar" class="maintainer-avatar">
                                </a>
                                <a href="https://github.com/anseonghyeon" target="_blank" class="maintainer-name-link">
                                    <div class="maintainer-name">anseonghyeon</div>
                                </a>
                                <a href="https://github.com/anseonghyeon" target="_blank" class="maintainer-link">
                                    <img src="https://img.shields.io/badge/GitHub-Profile-purple?logo=github" alt="GitHub Profile"/>
                                </a>
                            </div>
                            <div class="maintainer-card">
                                <a href="https://github.com/Changhee-Cho" target="_blank">
                                    <img src="https://github.com/Changhee-Cho.png" alt="Changhee-Cho avatar" class="maintainer-avatar">
                                </a>
                                <a href="https://github.com/Changhee-Cho" target="_blank" class="maintainer-name-link">
                                    <div class="maintainer-name">Changhee-Cho</div>
                                </a>
                                <div class="maintainer-role">Frontend Leader</div>
                                <a href="https://github.com/Changhee-Cho" target="_blank" class="maintainer-link">
                                    <img src="https://img.shields.io/badge/GitHub-Profile-red?logo=github" alt="GitHub Profile"/>
                                </a>
                            </div>
                        </div>
                    `
                };

                this.sections = sections;
            },
            async showSection(sectionId, updateHistory = true) {
                const section = this.sections[sectionId];
                if (!section) {
                    console.error(`Section with id '${sectionId}' not found.`);
                    return;
                }

                // DB 데이터가 아직 로드되지 않았다면 로컬 파일을 먼저 보여줌
                if (!section.loaded && section.markdownUrl) {
                    try {
                        const response = await fetch(section.markdownUrl);
                        if (response.ok) {
                            section.markdown = await response.text();
                        } else {
                            section.markdown = "문서를 불러오는 데 실패했습니다.";
                        }
                    } catch (e) {
                        section.markdown = "문서 로딩 중 오류 발생.";
                    }
                }
            
                this.activeSection = sectionId;
            
                if (updateHistory) {
                    history.pushState({ sectionId }, '', `#${sectionId}`);
                }
            
                const contentEl = document.querySelector('.main-content');
                if (contentEl) {
                    contentEl.scrollTop = 0;
                }
            
                this.closeAllDropdowns();
            
                // Vue가 DOM 업데이트를 완료한 후에 플러그인 초기화를 실행하도록 보장
                this.$nextTick(() => {
                    this.initializePlugins();
                });
            },

            initializePlugins() {
                // Mermaid 재렌더링
                if (window.mermaid) {
                    // Find all mermaid blocks in the main content area
                    const mermaidElements = document.querySelectorAll('.main-content .mermaid');
                    
                    // Clear any previous processing artifacts
                    mermaidElements.forEach(el => {
                        el.removeAttribute('data-processed');
                        // Ensure the code is visible for mermaid.run to process
                        const code = decodeURIComponent(el.getAttribute('data-mermaid-code') || '');
                        if(code) el.innerHTML = code;
                    });
                    
                    window.mermaid.run({
                        nodes: mermaidElements
                    });

                    // Add double-click to open in new tab functionality again
                    mermaidElements.forEach(el => {
                        el.ondblclick = () => {
                            const svg = el.querySelector('svg');
                            if (svg) {
                                sessionStorage.setItem('mermaidSVG', svg.outerHTML);
                                window.open('/diagram-viewer.html', '_blank');
                            }
                        };
                        el.style.cursor = 'pointer';
                    });
                }
                
                // Syntax highlighting 적용
                if (typeof hljs !== 'undefined') {
                    hljs.highlightAll();
                }
                
                // Lucide 아이콘 재초기화
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            },
            
            checkAuthentication() {
                const authToken = sessionStorage.getItem('pullitAuth');
                this.isAuthenticated = authToken === 'pullit51!';
                return this.isAuthenticated;
            },

            showAuthenticationModal() {
                this.showAuthModal = true;
                this.authPassword = '';
                this.authError = '';
            },

            authenticate() {
                if (this.authPassword === 'pullit51!') {
                    sessionStorage.setItem('pullitAuth', 'pullit51!');
                    this.isAuthenticated = true;
                    this.showAuthModal = false;
                    this.authError = '';

                    if (this.pendingAction) {
                        this.pendingAction();
                        this.pendingAction = null;
                    }
                } else {
                    this.authError = '잘못된 비밀키입니다.';
                }
            },

            closeAuthModal() {
                this.showAuthModal = false;
                this.authPassword = '';
                this.authError = '';
                this.pendingAction = null;
            },

            requireAuth(callback) {
                if (this.checkAuthentication()) {
                    callback();
                } else {
                    this.pendingAction = callback;
                    this.showAuthenticationModal();
                }
            },

            startEditing(sectionId) {
                this.requireAuth(() => {
                    this.editingContent[sectionId] = this.sections[sectionId].markdown;
                    this.isEditing[sectionId] = true;
                    this.isDragging[sectionId] = false; // 드래그 상태 초기화
                });
            },

            cancelEditing(sectionId) {
                this.isEditing[sectionId] = false;
                this.editingContent[sectionId] = null;
                this.isDragging[sectionId] = false; // 드래그 상태 초기화
            },

            async saveContent(sectionId) {
                this.requireAuth(async () => {
                    const section = this.sections[sectionId];
                    const content = this.editingContent[sectionId];

                    try {
                        const response = await fetch(PullitDocsRuntime.withBasePath(`/api/documents/${section.category}/${sectionId}`), {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ content }),
                        });

                        if (!response.ok) {
                            throw new Error(`API error! status: ${response.status}`);
                        }

                        const updatedDocument = await response.json();
                        
                        // Update the local data
                        this.sections[sectionId].markdown = updatedDocument.content;

                        // Local Storage 캐시 업데이트
                        const cache = JSON.parse(localStorage.getItem('pullitDocsCache')) || {};
                        const cacheKey = `${section.category}/${sectionId}`;
                        if (cache[cacheKey]) {
                            cache[cacheKey].content = updatedDocument.content;
                            localStorage.setItem('pullitDocsCache', JSON.stringify(cache));
                        }

                        // Exit editing mode
                        this.isEditing[sectionId] = false;

                        // Re-render markdown and plugins
                        this.$nextTick(() => {
                            this.initializePlugins();
                        });

                        // Show success message
                        this.showNotification('저장되었습니다!', 'success');

                    } catch (error) {
                        console.error('Failed to save content:', error);
                        this.showNotification('저장에 실패했습니다. 다시 시도해주세요.', 'error');
                    }
                });
            },

            handleFileDropAndImport(sectionId, event) {
                this.isDragging[sectionId] = false;
                const files = event.dataTransfer.files;
            
                if (files.length === 0) return;
                const file = files[0];
            
                if (!file.name.toLowerCase().endsWith('.md') && file.type !== 'text/markdown') {
                    this.showNotification('마크다운(.md) 파일만 업로드할 수 있습니다.', 'error');
                    return;
                }
            
                const importAction = () => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.isEditing[sectionId] = true;
                        this.editingContent[sectionId] = e.target.result;
                        this.showNotification('파일을 성공적으로 불러왔습니다.', 'success');
                    };
                    reader.onerror = () => {
                        this.showNotification('파일을 읽는 중 오류가 발생했습니다.', 'error');
                    };
                    reader.readAsText(file);
                };
            
                this.requireAuth(importAction);
            },

            exportMarkdown(sectionId) {
                const section = this.sections[sectionId];
                const content = section.markdown;
                const filename = `${sectionId}.md`;

                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
                const link = document.createElement("a");

                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('파일이 다운로드되었습니다!', 'success');
            },

            importMarkdown(sectionId) {
                this.requireAuth(() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.md,.txt';
                    input.onchange = (event) => {
                        const file = event.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                this.editingContent[sectionId] = e.target.result;
                                this.isEditing[sectionId] = true;
                                this.showNotification('파일을 불러왔습니다!', 'success');
                            };
                            reader.readAsText(file);
                        }
                    };
                    input.click();
                });
            },

            showNotification(message, type = 'info') {
                // Create notification element
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.textContent = message;
                
                // Add to body
                document.body.appendChild(notification);
                
                // Show with animation
                setTimeout(() => notification.classList.add('show'), 100);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => document.body.removeChild(notification), 300);
                }, 3000);
            },

            renderMarkdown(markdown) {
                if (!markdown) return '';
                
                const renderer = new marked.Renderer();
                const currentSection = this.sections[this.activeSection];

                // 이미지 렌더러 재정의
                renderer.image = (href, title, text) => {
                    let resolvedPath = PullitDocsRuntime.withBasePath(href);
                    // 상대 경로인 경우 (./ 또는 ../ 로 시작)
                    if (currentSection && (href.startsWith('./') || href.startsWith('../'))) {
                        // 현재 문서의 URL 디렉토리 부분을 기준으로 경로 조합
                        const baseUrl = new URL(currentSection.markdownUrl, window.location.origin);
                        const imageUrl = new URL(href, baseUrl);
                        resolvedPath = imageUrl.pathname;
                    }
                    return `<img src="${resolvedPath}" alt="${text}"${title ? ` title="${title}"` : ''}>`;
                };

                // 비디오 렌더러 추가 (MKV 등)
                renderer.link = (href, title, text) => {
                    if (href.endsWith('.mkv') || href.endsWith('.mp4')) {
                         let resolvedPath = PullitDocsRuntime.withBasePath(href);
                        if (currentSection && (href.startsWith('./') || href.startsWith('../'))) {
                            const baseUrl = new URL(currentSection.markdownUrl, window.location.origin);
                            const videoUrl = new URL(href, baseUrl);
                            resolvedPath = videoUrl.pathname;
                        }
                        return `<video controls width="100%"><source src="${resolvedPath}" type="video/mp4">브라우저가 비디오 태그를 지원하지 않습니다.</video>`;
                    }
                    // 기본 링크 처리
                    return `<a href="${href}"${title ? ` title="${title}"` : ''}>${text}</a>`;
                };

                // Mermaid 코드 블록을 그대로 유지 (HTML 변환 방지)
                renderer.code = (code, language) => {
                    if (language === 'mermaid') {
                        const encodedCode = encodeURIComponent(code);
                        return `<div class="mermaid" data-mermaid-code="${encodedCode}">${code}</div>`;
                    }
                    return `<pre><code class="language-${language}">${code}</code></pre>`;
                };
                
                return marked.parse(markdown, { renderer });
            },
            toggleDropdown(menuName) {
                this.isDropdownOpen[menuName] = !this.isDropdownOpen[menuName];
            },
            closeAllDropdowns() {
                for (const key in this.isDropdownOpen) {
                    this.isDropdownOpen[key] = false;
                }
            },
            toggleFab() {
                this.isFabExpanded = !this.isFabExpanded;
            },
            toggleMobileSidebar() {
                this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
            },
            closeMobileSidebar() {
                this.isMobileSidebarOpen = false;
            },
            toggleSidebar() {
                this.isSidebarCollapsed = !this.isSidebarCollapsed;
            },
            handleSectionClick(sectionName) {
                if (this.isSidebarCollapsed) {
                    this.isSidebarCollapsed = false;
                    // 사이드바가 펼쳐지는 애니메이션이 시작된 후
                    // 해당 섹션이 열리도록 nextTick을 사용합니다.
                    this.$nextTick(() => {
                        this.collapsedSections[sectionName] = false;
                    });
                } else {
                    this.collapsedSections[sectionName] = !this.isSectionCollapsed(sectionName);
                }
            },
            isSectionCollapsed(sectionName) {
                return this.collapsedSections[sectionName] || false;
            }
        },
        watch: {
            editingContent: {
                handler(newValue) {
                    const editingSectionId = Object.keys(this.isEditing).find(id => this.isEditing[id]);
                    if (editingSectionId) {
                        this.$nextTick(() => {
                            const sectionEl = document.getElementById(editingSectionId);
                            if (!sectionEl) return;

                            const previewPane = sectionEl.querySelector('.preview-pane');
                            if (!previewPane) return;

                            // Re-render Mermaid diagrams in the preview
                            if (window.mermaid) {
                                const mermaidElements = previewPane.querySelectorAll('.mermaid');
                                mermaidElements.forEach(el => el.removeAttribute('data-processed'));
                                window.mermaid.run({ nodes: mermaidElements });
                            }
                        });
                    }
                },
                deep: true
            }
        },
        async mounted() {
            this.checkAuthentication();
            await this.initializeApp();
            
            window.addEventListener('popstate', (event) => {
                const sectionId = (event.state && event.state.sectionId) 
                    ? event.state.sectionId 
                    : window.location.hash.substring(1);

                if (this.sections[sectionId]) {
                    this.showSection(sectionId, false);
                } else if (sectionId === '' && this.sections['01-introduction']) {
                    this.showSection('01-introduction', false);
                }
            });

            this.$nextTick(() => {
                // 최초 로딩 시 플러그인 초기화
                this.initializePlugins();
                
                // Attach event listeners after the DOM is fully rendered
                window.addEventListener('click', (event) => {
                    const navMenu = document.querySelector('.nav-menu');
                    const fabContainer = document.querySelector('.fab-container');

                    if (navMenu && !navMenu.contains(event.target)) {
                        this.closeAllDropdowns();
                    }
                    
                    if (fabContainer && !fabContainer.contains(event.target)) {
                        this.isFabExpanded = false;
                    }
                });
            });
        }
    });

    app.mount('#app');
});
