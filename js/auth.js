/**
 * Auth Module for iX Platform
 * Uses localStorage to simulate a backend database.
 */

const DB_USERS_KEY = 'ix_users';
const DB_CURRENT_USER_KEY = 'ix_current_user';

const Auth = {
    // Register a new user
    register: (username, email, password) => {
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');

        // Check if user exists
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email already registered.' };
        }
        if (users.find(u => u.username === username)) {
            return { success: false, message: 'Username taken.' };
        }

        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password, // In a real app, hash this!
            avatar: null, // Base64 string
            joinedDate: new Date().toLocaleDateString(),
            stats: {
                problemsSolved: 0,
                quizScore: 0,
                rank: 'Novice'
            },
            solvedProblems: [], // Track unique solved IDs

            // Profile Fields
            isProfileComplete: false,
            fullName: '',
            dob: '',
            gender: '',
            address: '',
            education: '',
            skills: [],
            goal: ''
        };

        users.push(newUser);
        localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
        Auth.setCurrentUser(newUser);
        return { success: true, user: newUser };
    },

    // Login user
    login: (email, password) => {
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            Auth.setCurrentUser(user);
            return { success: true, user };
        } else {
            return { success: false, message: 'Invalid credentials.' };
        }
    },

    // Logout
    logout: () => {
        // Clear User Session
        localStorage.removeItem(DB_CURRENT_USER_KEY);

        // Clear Debug/Session Specific Data (Fixes new user point bug)
        localStorage.removeItem('ix_debug_score');
        localStorage.removeItem('ix_debug_solved');
        localStorage.removeItem('ix_group_session');

        // Force redirect to Login
        const path = window.location.pathname;
        if (path.includes('/problems/') || path.includes('/debug/') || path.includes('/quiz/')) {
            window.location.href = '../login.html';
        } else {
            window.location.href = 'login.html';
        }
    },

    checkNotifications: () => {
        // Check for pending friend requests in localStorage
        const friends = JSON.parse(localStorage.getItem('ix_friends') || '[]');
        const pending = friends.filter(f => f.status === 'pending').length;

        // Find notification badge elements
        const badges = document.querySelectorAll('.notification-badge-global');
        badges.forEach(badge => {
            if (pending > 0) {
                badge.innerText = pending;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });

        return pending;
    },

    // Get currently logged in user
    getUser: () => {
        return JSON.parse(localStorage.getItem(DB_CURRENT_USER_KEY));
    },

    // Set current user session
    setCurrentUser: (user) => {
        // Don't store password in session
        const { password, ...safeUser } = user;
        localStorage.setItem(DB_CURRENT_USER_KEY, JSON.stringify(safeUser));
    },

    // Mark a problem as solved
    markProblemSolved: (problemId, points = 0) => {
        let user = Auth.getUser();
        if (!user) return false;

        // Initialize if missing (backward compatibility)
        if (!user.solvedProblems) user.solvedProblems = [];
        if (!user.stats) user.stats = { problemsSolved: 0, quizScore: 0, rank: 'Novice' };

        // Check if already solved
        const pid = parseInt(problemId);
        if (user.solvedProblems.includes(pid)) {
            return false; // Already solved
        }

        // Add to list
        user.solvedProblems.push(pid);
        user.stats.problemsSolved = user.solvedProblems.length;

        // Add Points
        user.stats.quizScore = (user.stats.quizScore || 0) + points;

        // Update Rank based on count (New Dynamic System)
        const count = user.stats.problemsSolved;
        if (count >= 200) user.stats.rank = 'Diamond';
        else if (count >= 100) user.stats.rank = 'Platinum';
        else if (count >= 50) user.stats.rank = 'Gold';
        else if (count >= 20) user.stats.rank = 'Silver';
        else if (count >= 5) user.stats.rank = 'Bronze';
        else user.stats.rank = 'Novice';

        Auth.updateProfile({
            solvedProblems: user.solvedProblems,
            stats: user.stats
        });
        return true;
    },

    // Update user profile (Avatar, Info)
    updateProfile: (updates) => {
        let currentUser = Auth.getUser();
        if (!currentUser) return false;

        // 1. Update Session
        const updatedUser = { ...currentUser, ...updates };
        Auth.setCurrentUser(updatedUser);

        // 2. Update Database
        const users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
        const index = users.findIndex(u => u.id === currentUser.id);
        if (index !== -1) {
            // Fetch old record to preserve password if not provided
            const oldRecord = users[index];
            const newRecord = { ...oldRecord, ...updates };
            users[index] = newRecord;
            localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
        }
        return true;
    },

    // Guard: Redirect to Login if not authenticated
    requireAuth: () => {
        const user = Auth.getUser();
        const path = window.location.pathname;

        if (!user) {
            // Not logged in -> Login
            // Handle nested paths
            if (path.includes('/problems/') || path.includes('/debug/') || path.includes('/quiz/')) {
                window.location.href = '../login.html';
            } else {
                if (!path.includes('login.html') && !path.includes('register.html')) {
                    window.location.href = 'login.html';
                }
            }
            return;
        }

        // Logged In -> Check Profile Completion
        // Skip check if we are already ON the onboarding page
        if (!user.isProfileComplete && !path.includes('onboarding.html')) {
            // Force onboarding
            if (path.includes('/problems/') || path.includes('/debug/') || path.includes('/quiz/')) {
                window.location.href = '../onboarding.html';
            } else {
                window.location.href = 'onboarding.html';
            }
        }
    },

    // Handle Login Redirects
    redirectIfLoggedIn: () => {
        const user = Auth.getUser();
        if (user) {
            // If profile incomplete, go to onboarding. Else go home.
            if (!user.isProfileComplete) {
                window.location.href = 'onboarding.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    },

    // Mobile Menu Helper
    initMobileMenu: () => {
        const header = document.querySelector('header');
        if (!header) return;

        // Check if already exists
        if (header.querySelector('.menu-toggle')) return;

        // Create Toggle Button
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'menu-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

        // Insert before .user-profile
        const profile = header.querySelector('.user-profile');
        if (profile) {
            header.insertBefore(toggleBtn, profile);
        } else {
            header.appendChild(toggleBtn);
        }

        // Logic
        const nav = document.querySelector('nav');
        toggleBtn.addEventListener('click', () => {
            nav.classList.toggle('nav-active');

            // Toggle Icon
            const icon = toggleBtn.querySelector('i');
            if (nav.classList.contains('nav-active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    },

    // Breadcrumbs Logic
    initBreadcrumbs: () => {
        // Find existing or create new
        let container = document.querySelector('.breadcrumbs');
        if (!container) {
            // Attempt to insert after header
            const header = document.querySelector('header');
            if (header) {
                container = document.createElement('div');
                container.className = 'breadcrumbs';
                header.parentNode.insertBefore(container, header.nextSibling);
            } else {
                return; // No header, maybe login page
            }
        }

        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');

        // Define map
        let crumbs = [];
        crumbs.push({ name: 'Home', link: '../index.html' }); // Default parent

        // Adjust 'Home' link if we are in root
        if (!path.includes('/problems/') && !path.includes('/debug/')) {
            crumbs[0].link = 'index.html';
        }

        if (page === 'index' || page === '') {
            // Home only
            crumbs = [{ name: 'Home', link: '#', current: true }];
        } else if (page === 'solve' && path.includes('problems')) {
            crumbs.push({ name: 'Problems', link: 'index.html' });
            crumbs.push({ name: 'Solve', current: true });
        } else if (page === 'solve' && path.includes('debug')) {
            crumbs.push({ name: 'Debug', link: 'index.html' });
            crumbs.push({ name: 'Solve', current: true });
        } else {
            // Capitalize
            const name = page.charAt(0).toUpperCase() + page.slice(1);
            crumbs.push({ name: name, current: true });
        }

        // Render
        let html = '';
        crumbs.forEach((c, i) => {
            if (c.current) {
                html += `<span class="current">${c.name}</span>`;
            } else {
                html += `<a href="${c.link}">${c.name}</a>`;
            }
            if (i < crumbs.length - 1) {
                html += ` <i class="fas fa-chevron-right separator"></i> `;
            }
        });
        container.innerHTML = html;

        // Inject CSS if needed
        if (!document.getElementById('breadcrumbs-css')) {
            const link = document.createElement('link');
            link.id = 'breadcrumbs-css';
            link.rel = 'stylesheet';
            link.href = path.includes('/problems/') || path.includes('/debug/') ? '../css/breadcrumbs.css' : 'css/breadcrumbs.css';
            document.head.appendChild(link);
        }
    },

    // Get aggregated scores from all modules
    getScores: () => {
        const user = Auth.getUser();
        if (!user) return { quiz: 0, problem: 0, debug: 0, total: 0 };

        // 1. Quiz Points (from quiz_progress)
        const quizData = JSON.parse(localStorage.getItem("quiz_progress") || '{"totalPoints":0}');
        const quizPoints = quizData.totalPoints || 0;

        // 2. Problem Points (from user stats)
        const problemPoints = user.stats ? (user.stats.quizScore || 0) : 0;

        // 3. Debug Points (user specific)
        const debugKey = `ix_debug_score_${user.username}`;
        const debugPoints = parseInt(localStorage.getItem(debugKey) || 0);

        return {
            quiz: quizPoints,
            problem: problemPoints,
            debug: debugPoints,
            total: quizPoints + problemPoints + debugPoints
        };
    },

    // Highlights active mobile bottom nav item
    initMobileNavHighlight: () => {
        const path = window.location.pathname;
        const navItems = document.querySelectorAll('.mobile-nav-item');
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (!href) return;

            // Remove 'active' from all
            item.classList.remove('active');

            // Precise matching
            // We check if the path ends with the href, or if the path contains the component name
            const isHome = (href === 'index.html' || href === '../index.html') && (path.endsWith('index.html') || path.endsWith('/'));
            const isMatch = path.includes(href.replace('../', '')) && href !== 'index.html' && href !== '../index.html';

            if (isHome || isMatch) {
                item.classList.add('active');
            }
        });
    }
};

// Auto-init on DOM load
document.addEventListener('DOMContentLoaded', () => {
    Auth.initMobileMenu();
    Auth.initMobileNavHighlight();
    // Don't show breadcrumbs on login/register/onboarding
    const p = window.location.pathname;
    const isHome = p.endsWith('index.html') || p.endsWith('/');
    if (!p.includes('login') && !p.includes('register') && !p.includes('onboarding') && !isHome) {
        Auth.initBreadcrumbs();
    }
});

// Expose to window
window.Auth = Auth;
