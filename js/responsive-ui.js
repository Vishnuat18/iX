/* iX Platform - Responsive UI & Navigation Switches */

const ResponsiveUI = {
    init: () => {
        if (window.innerWidth > 991) {
            ResponsiveUI.cleanup();
            return;
        }

        ResponsiveUI.injectMobileHeader();
        ResponsiveUI.injectBottomNav();
        ResponsiveUI.injectSwitches();
    },

    cleanup: () => {
        // Remove all mobile-specific injections
        const elements = [
            '.mobile-header',
            '.mobile-bottom-nav',
            '.mobile-switch-container'
        ];
        elements.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.remove();
        });

        // Also trigger MobileMenu cleanup if available
        if (typeof MobileMenu !== 'undefined' && MobileMenu.cleanup) {
            MobileMenu.cleanup();
        }
    },

    injectMobileHeader: () => {
        const path = window.location.pathname;
        let section = "Platform";
        let icon = "fa-layer-group";
        let breadcrumb = "Home";

        // Determine Section Context
        if (path.includes('quiz')) { section = "Quiz"; icon = "fa-brain"; breadcrumb = "Practice"; }
        else if (path.includes('problems')) { section = "Problems"; icon = "fa-code"; breadcrumb = "Coding"; }
        else if (path.includes('debug')) { section = "Debug"; icon = "fa-bug"; breadcrumb = "Coding"; }
        else if (path.includes('interview')) { section = "Interview"; icon = "fa-user-tie"; breadcrumb = "Career"; }
        else if (path.includes('courses')) { section = "Learn"; icon = "fa-book-reader"; breadcrumb = "Academy"; }
        else if (path.includes('community')) { section = "Link"; icon = "fa-users"; breadcrumb = "Community"; }

        const headerHTML = `
            <div class="mobile-header">
                <div class="mobile-header-left">
                    <a href="/index.html">Home</a>
                    <span class="separator">/</span>
                    <span class="current">${breadcrumb}</span>
                </div>
                <div class="mobile-header-right">
                    <div class="mobile-section-logo">
                        <i class="fas ${icon}" style="font-size: 1rem;"></i>
                        iX ${section}
                    </div>
                    <i class="fas fa-bars mobile-menu-trigger"></i>
                </div>
            </div>
        `;

        // Only inject if not already present
        if (!document.querySelector('.mobile-header')) {
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
        }
    },

    injectBottomNav: () => {
        const path = window.location.pathname;
        const navHTML = `
            <div class="mobile-bottom-nav">
                <a href="/courses.html" class="mobile-nav-item ${path.includes('courses') ? 'active' : ''}">
                    <i class="fas fa-graduation-cap"></i>
                    <span>Learn</span>
                </a>
                <a href="/problems/index.html" class="mobile-nav-item ${(path.includes('problems') || path.includes('debug')) ? 'active' : ''}">
                    <i class="fas fa-code"></i>
                    <span>Solve</span>
                </a>
                <a href="/ai-interview.html" class="mobile-nav-item ${path.includes('interview') ? 'active' : ''}">
                    <i class="fas fa-microphone-alt"></i>
                    <span>Prep</span>
                </a>
                <a href="/community.html" class="mobile-nav-item ${path.includes('community') ? 'active' : ''}">
                    <i class="fas fa-comments"></i>
                    <span>Chat</span>
                </a>
                <a href="/profile.html" class="mobile-nav-item ${path.includes('profile') ? 'active' : ''}">
                    <i class="fas fa-user-circle"></i>
                    <span>Me</span>
                </a>
            </div>
        `;

        if (!document.querySelector('.mobile-bottom-nav')) {
            document.body.insertAdjacentHTML('beforeend', navHTML);
        }
    },

    injectSwitches: () => {
        const path = window.location.pathname;
        let switchHTML = "";

        // Learn <-> Quiz
        if (path.includes('courses.html') || path.includes('quiz')) {
            switchHTML = `
                <div class="mobile-switch-container">
                    <div class="switch-pill">
                        <div class="switch-option ${path.includes('courses') ? 'active' : ''}" onclick="window.location.href='/courses.html'">Learn</div>
                        <div class="switch-option ${path.includes('quiz') ? 'active' : ''}" onclick="window.location.href='/quiz_landing.html'">Quiz</div>
                    </div>
                </div>
            `;
        }
        // Problems <-> Debug
        else if (path.includes('problems') || path.includes('debug')) {
            switchHTML = `
                <div class="mobile-switch-container">
                    <div class="switch-pill">
                        <div class="switch-option ${path.includes('problems') ? 'active' : ''}" onclick="window.location.href='/problems/index.html'">Solve</div>
                        <div class="switch-option ${path.includes('debug') ? 'active' : ''}" onclick="window.location.href='/debug/index.html'">Debug</div>
                    </div>
                </div>
            `;
        }
        // Interview <-> Mock (AI)
        else if (path.includes('interview')) {
            switchHTML = `
                <div class="mobile-switch-container">
                    <div class="switch-pill">
                        <div class="switch-option ${path.includes('interview/') ? 'active' : ''}" onclick="window.location.href='/interview/index.html'">Interview</div>
                        <div class="switch-option ${path.includes('ai-interview') ? 'active' : ''}" onclick="window.location.href='/ai-interview.html'">Mock (AI)</div>
                    </div>
                </div>
            `;
        }

        if (switchHTML && !document.querySelector('.mobile-switch-container')) {
            // Find a good place to inject - usually after the header
            document.body.insertAdjacentHTML('afterbegin', switchHTML);
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', ResponsiveUI.init);
window.addEventListener('resize', () => {
    if (window.innerWidth <= 991) {
        ResponsiveUI.init();
    } else {
        ResponsiveUI.cleanup();
    }
});
