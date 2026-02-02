/* iX Platform - Mobile Menu Logic */

const MobileMenu = {
    init: () => {
        // Only initialize on mobile screens
        if (window.innerWidth > 991) {
            MobileMenu.cleanup();
            return;
        }

        // Create Drawer HTML if not exists
        if (!document.querySelector('.mobile-drawer')) {
            MobileMenu.injectDrawer();
        }

        // Listen for Menu Trigger
        if (!MobileMenu._listenerAttached) {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.mobile-menu-trigger')) {
                    MobileMenu.toggle(true);
                }
                if (e.target.closest('.drawer-overlay') || e.target.closest('.drawer-close')) {
                    MobileMenu.toggle(false);
                }
            });
            MobileMenu._listenerAttached = true;
        }
    },

    cleanup: () => {
        const drawer = document.querySelector('.mobile-drawer');
        const overlay = document.querySelector('.drawer-overlay');
        if (drawer) drawer.remove();
        if (overlay) overlay.remove();
        document.body.style.overflow = '';
    },

    injectDrawer: () => {
        const user = Auth.getUser() || { username: 'User', avatar: '' };
        const initials = user.username ? user.username[0].toUpperCase() : 'U';

        const drawerHTML = `
            <div class="drawer-overlay"></div>
            <div class="mobile-drawer">
                <div class="drawer-header">
                    <div class="mobile-section-logo">iX <span style="font-weight:300;">Menu</span></div>
                    <i class="fas fa-times drawer-close" style="font-size: 1.5rem; color: #888; cursor:pointer;"></i>
                </div>

                <div class="drawer-profile" onclick="window.location.href='/profile.html'">
                    <div class="user-avatar-circle" style="width:50px; height:50px; font-size:1.2rem;">
                        ${user.avatar ? `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%;">` : initials}
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:1.1rem;">${user.username}</div>
                        <div style="font-size:0.8rem; color:var(--accent-primary);">View Profile</div>
                    </div>
                </div>

                <div class="drawer-nav-list">
                    <a href="/index.html" class="drawer-nav-item"><i class="fas fa-home"></i> Home</a>
                    <a href="/admin/adminhome.html" class="drawer-nav-item" id="drawerAdminLink" style="display:none; color: var(--accent-secondary);"><i class="fas fa-user-shield"></i> Admin Panel</a>
                    <a href="/problems/index.html" class="drawer-nav-item"><i class="fas fa-code"></i> coding Problems</a>
                    <a href="/quiz_landing.html" class="drawer-nav-item"><i class="fas fa-brain"></i> iX Quiz</a>
                    <a href="/community.html" class="drawer-nav-item"><i class="fas fa-users"></i> Community</a>
                    <hr style="border:none; border-top: 1px solid var(--glass-border); margin: 10px 0;">
                    <a href="#" class="drawer-nav-item" onclick="Auth.logout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>

                <div style="margin-top:auto; padding:20px 0; text-align:center; color:#444; font-size:0.8rem;">
                    iX Platform v2.0
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', drawerHTML);

        // Show Admin link if applicable
        if (user.role === 'admin') {
            const adminLink = document.getElementById('drawerAdminLink');
            if (adminLink) adminLink.style.display = 'flex';
        }
    },

    toggle: (open) => {
        const drawer = document.querySelector('.mobile-drawer');
        const overlay = document.querySelector('.drawer-overlay');
        if (open) {
            drawer.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            drawer.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', MobileMenu.init);
