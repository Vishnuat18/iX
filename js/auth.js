/**
 * Auth Module for iX Platform
 * Uses Firebase for authentication and Firestore for database.
 */

const Auth = {
    // Current user local cache
    _cachedUser: null,

    // Helper: Run a promise with a timeout
    _withTimeout: (promise, ms = 15000) => {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error("Request timed out (15s). Check your connection."));
            }, ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    },

    // Helper: Generate unique iXcode
    generateiXcode: () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'IX-' + result;
    },

    // Register a new user with Email/Password
    register: async (username, email, password, adminKey = '') => {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Determine role: default is 'user', unless correct passkey or dedicated email is provided
            const isDedicatedAdmin = email === 'admin@ix.in';
            const role = (adminKey === 'IX_ADMIN_2026' || isDedicatedAdmin) ? 'admin' : 'user';

            const iXcode = Auth.generateiXcode();
            const newUser = {
                id: user.uid,
                username,
                email,
                avatar: null,
                iXcode: iXcode,
                joinedDate: new Date().toLocaleDateString(),
                stats: {
                    problemsSolved: 0,
                    quizScore: 0,
                    rank: 'Novice'
                },
                solvedProblems: [],
                isProfileComplete: false,
                fullName: '',
                dob: '',
                gender: '',
                address: '',
                education: '',
                skills: [],
                goal: '',
                role: role
            };

            await Auth._withTimeout(db.collection('users').doc(user.uid).set(newUser));
            // Immediately sign out after creation to force manual login as per user request
            await auth.signOut();
            localStorage.removeItem('ix_current_user');
            Auth._cachedUser = null;

            const adminMsg = (role === 'admin') ? ' (Admin Account Created)' : '';
            return { success: true, message: `Account created! Your iXcode is ${iXcode}. ${adminMsg} Please log in to continue.` };
        } catch (error) {
            console.error("Registration error:", error);
            if (error.code === 'auth/email-already-in-use') {
                return { success: false, message: 'User already exists. Please login instead.' };
            }
            return { success: false, message: error.message };
        }
    },

    // Login user with Email/Password
    login: async (email, password) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            let userData = null;
            let fetchError = null;

            try {
                const userDoc = await Auth._withTimeout(db.collection('users').doc(user.uid).get());
                if (userDoc.exists) {
                    userData = userDoc.data();
                }
            } catch (e) {
                console.warn("Firestore login fetch error:", e);
                fetchError = e.message;
                // Fallback to local cache
                userData = Auth.getUser();
                if (!userData || userData.id !== user.uid) userData = null;
            }

            if (userData) {
                // Backfill iXcode if missing
                if (!userData.iXcode) {
                    userData.iXcode = Auth.generateiXcode();
                    Auth.updateProfile({ iXcode: userData.iXcode });
                }

                // Force admin role for the dedicated account if it somehow got set to 'user'
                if (user.email === 'admin@ix.in' && userData.role !== 'admin') {
                    userData.role = 'admin';
                    Auth.updateProfile({ role: 'admin' }); // Sync update
                }
                Auth._cachedUser = userData;
                localStorage.setItem('ix_current_user', JSON.stringify(userData));

                // Auto-enable notifications
                if ('Notification' in window && Notification.permission !== 'granted') {
                    Notification.requestPermission();
                }

                return { success: true, user: userData };
            } else if (fetchError) {
                // Case: We had a real error (permissions, network, etc.) - STOP HERE
                let errorMsg = "Database Error: " + fetchError;
                if (fetchError.includes('timed out')) {
                    errorMsg = "Network Timeout: Could not verify your profile. Please check your connection and try again.";
                }
                return { success: false, message: errorMsg };
            } else {
                // Recovery: If authenticated but no doc, create a basic profile
                console.log("No profile record found. Creating default profile for recovery...");
                const isDedicatedAdmin = user.email === 'admin@ix.in';
                const iXcode = Auth.generateiXcode();
                const newUser = {
                    id: user.uid,
                    username: user.email.split('@')[0],
                    email: user.email,
                    avatar: null,
                    iXcode: iXcode,
                    joinedDate: new Date().toLocaleDateString(),
                    stats: { problemsSolved: 0, quizScore: 0, rank: 'Novice' },
                    solvedProblems: [],
                    isProfileComplete: false,
                    role: isDedicatedAdmin ? 'admin' : 'user'
                };

                try {
                    await Auth._withTimeout(db.collection('users').doc(user.uid).set(newUser));
                    Auth._cachedUser = newUser;
                    localStorage.setItem('ix_current_user', JSON.stringify(newUser));
                    return { success: true, user: newUser };
                } catch (saveError) {
                    return { success: false, message: "Profile creation failed: " + saveError.message };
                }
            }
        } catch (error) {
            console.error("Login error:", error);
            const msg = error.code && error.code.includes('auth/') ? 'Invalid credentials.' : error.message;
            return { success: false, message: msg };
        }
    },

    // Login with Google
    loginWithGoogle: async () => {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            let userData = null;
            let docExists = false;
            let fetchFailed = false;

            try {
                const userDoc = await Auth._withTimeout(db.collection('users').doc(user.uid).get());
                if (userDoc.exists) {
                    userData = userDoc.data();
                    docExists = true;
                }
            } catch (e) {
                console.warn("Google login Firestore fetch failed:", e);
                fetchFailed = true;
                userData = Auth.getUser();
                if (!userData || userData.id !== user.uid) userData = null;
            }

            if (userData) {
                // Backfill iXcode if missing
                if (!userData.iXcode) {
                    userData.iXcode = Auth.generateiXcode();
                    Auth.updateProfile({ iXcode: userData.iXcode });
                }

                Auth._cachedUser = userData;
                localStorage.setItem('ix_current_user', JSON.stringify(userData));

                // Auto-enable notifications
                if ('Notification' in window && Notification.permission !== 'granted') {
                    Notification.requestPermission();
                }

                return { success: true, user: userData };
            } else if (fetchFailed) {
                // Database was inaccessible - STOP to avoid overwriting an existing account
                return { success: false, message: "Connection to database failed. Please check your internet or security rules." };
            } else {
                // Truly a new user (docExists is false and no fetch error)
                const iXcode = Auth.generateiXcode();
                const newUser = {
                    id: user.uid,
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    avatar: user.photoURL,
                    iXcode: iXcode,
                    joinedDate: new Date().toLocaleDateString(),
                    stats: { problemsSolved: 0, quizScore: 0, rank: 'Novice' },
                    solvedProblems: [],
                    isProfileComplete: false,
                    fullName: user.displayName || '',
                    dob: '', gender: '', address: '', education: '', skills: [], goal: '',
                    role: 'user'
                };
                try {
                    await Auth._withTimeout(db.collection('users').doc(user.uid).set(newUser));
                } catch (e) {
                    console.warn("Initial Google profile save failed:", e);
                }
                Auth._cachedUser = newUser;
                localStorage.setItem('ix_current_user', JSON.stringify(newUser));
                return { success: true, user: newUser };
            }
        } catch (error) {
            console.error("Google login error:", error);
            return { success: false, message: error.message };
        }
    },

    // Logout
    logout: async () => {
        try {
            await auth.signOut();
            localStorage.removeItem('ix_current_user');
            Auth._cachedUser = null;

            const path = window.location.pathname;
            if (path.includes('/problems/') || path.includes('/debug/') || path.includes('/quiz/') || path.includes('/admin/')) {
                window.location.href = '../login.html';
            } else {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error("Logout error:", error);
        }
    },

    checkNotifications: () => {
        // This could be synced with Firestore in a real app
        const friends = JSON.parse(localStorage.getItem('ix_friends') || '[]');
        const pending = friends.filter(f => f.status === 'pending').length;

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
        if (Auth._cachedUser) return Auth._cachedUser;
        const stored = localStorage.getItem('ix_current_user');
        return stored ? JSON.parse(stored) : null;
    },

    // Update user profile
    updateProfile: async (updates) => {
        const user = Auth.getUser();
        if (!user) return false;

        try {
            await Auth._withTimeout(db.collection('users').doc(user.id).update(updates));
            const updatedUser = { ...user, ...updates };
            Auth._cachedUser = updatedUser;
            localStorage.setItem('ix_current_user', JSON.stringify(updatedUser));
            return true;
        } catch (error) {
            console.error("Update profile error:", error);
            // Even if update fails on server (offline), we update local and let persistence handle it
            const updatedUser = { ...user, ...updates };
            Auth._cachedUser = updatedUser;
            localStorage.setItem('ix_current_user', JSON.stringify(updatedUser));
            return true; // Return true to allow flow to continue while persistence syncs
        }
    },

    // Mark a problem as solved
    markProblemSolved: async (problemId, points = 0) => {
        let user = Auth.getUser();
        if (!user) return false;

        if (!user.solvedProblems) user.solvedProblems = [];

        // Handle both numeric and string IDs (e.g. "d1" for debug)
        const pid = problemId;
        if (user.solvedProblems.includes(pid)) return false;

        user.solvedProblems.push(pid);
        const count = user.solvedProblems.length;

        let newRank = 'Novice';
        if (count >= 200) newRank = 'Diamond';
        else if (count >= 100) newRank = 'Platinum';
        else if (count >= 50) newRank = 'Gold';
        else if (count >= 20) newRank = 'Silver';
        else if (count >= 5) newRank = 'Bronze';

        const update = {
            solvedProblems: user.solvedProblems,
            'stats.problemsSolved': count,
            'stats.quizScore': (user.stats.quizScore || 0) + points,
            'stats.rank': newRank
        };

        return await Auth.updateProfile(update);
    },

    // Unified redirection logic based on user state
    handleAuthRedirect: (userData) => {
        if (!userData) return;

        const path = window.location.pathname;
        const isSubDir = path.includes('/problems/') || path.includes('/debug/') || path.includes('/quiz/') || path.includes('/admin/');

        // 1. Admin Logic: Redirection to Hub
        if (userData.role === 'admin') {
            const isRootIndex = (path.endsWith('index.html') || path.endsWith('/')) && !isSubDir;
            const isAuthPage = path.includes('login.html') || path.includes('register.html') || path.includes('onboarding.html');

            if (isRootIndex || isAuthPage) {
                console.log("Admin detected on root/auth page, redirecting to Admin Hub...");
                window.location.href = isSubDir ? 'adminhome.html' : 'admin/adminhome.html';
            }
            return; // Admins can use any other page (like User Central) freely
        }

        // 2. User Logic: Force onboarding if profile incomplete
        if (!userData.isProfileComplete) {
            if (!path.includes('onboarding.html')) {
                console.log("Enforcing onboarding redirect...");
                window.location.href = isSubDir ? '../onboarding.html' : 'onboarding.html';
            }
        } else {
            // Already complete, keep away from login/register/onboarding
            if (path.includes('login.html') || path.includes('register.html') || path.includes('onboarding.html')) {
                console.log("Profile complete, redirecting to home...");
                window.location.href = isSubDir ? '../index.html' : 'index.html';
            }
        }
    },

    // Guard: Redirect to Login if not authenticated
    requireAuth: () => {
        let isRedirecting = false;
        auth.onAuthStateChanged(async (user) => {
            if (isRedirecting) return;
            const path = window.location.pathname;

            if (!user) {
                if (!path.includes('login.html') && !path.includes('register.html')) {
                    isRedirecting = true;
                    if (path.includes('/problems/') || path.includes('/debug/') || path.includes('/quiz/') || path.includes('/admin/')) {
                        window.location.href = '../login.html';
                    } else {
                        window.location.href = 'login.html';
                    }
                }
            } else {
                // User is authenticated, ensure local storage is in sync
                let userData = Auth.getUser();
                if (!userData || userData.id !== user.uid) {
                    try {
                        const doc = await Auth._withTimeout(db.collection('users').doc(user.uid).get());
                        if (doc.exists) {
                            userData = doc.data();
                            localStorage.setItem('ix_current_user', JSON.stringify(userData));
                            Auth._cachedUser = userData;
                        }
                    } catch (e) {
                        console.error("Firestore sync error:", e);
                    }
                }

                if (userData) {
                    // Enforce onboarding or redirect away from login/register
                    Auth.handleAuthRedirect(userData);

                    // Admin check
                    if (path.includes('/admin/') && userData.role !== 'admin') {
                        // EXCEPTION: If the user IS the dedicated admin email, DO NOT kick them out yet.
                        // Wait for the next sync to potentially fix the role.
                        if (user.email === 'admin@ix.in') {
                            console.warn("Dedicated admin detected with non-admin role. Waiting for sync correction...");
                            // Force an immediate update
                            if (userData.role !== 'admin') {
                                userData.role = 'admin';
                                Auth.updateProfile({ role: 'admin' });
                                Auth._cachedUser = userData;
                                localStorage.setItem('ix_current_user', JSON.stringify(userData));
                            }
                            return;
                        }

                        isRedirecting = true;
                        window.location.href = '../index.html';
                    }
                }
            }
        });
    },

    redirectIfLoggedIn: () => {
        let isRedirecting = false;
        auth.onAuthStateChanged(async (user) => {
            if (isRedirecting) return;
            if (user) {
                let userData = Auth.getUser();
                if (!userData || userData.id !== user.uid) {
                    try {
                        const doc = await Auth._withTimeout(db.collection('users').doc(user.uid).get());
                        if (doc.exists) {
                            userData = doc.data();
                            localStorage.setItem('ix_current_user', JSON.stringify(userData));
                            Auth._cachedUser = userData;
                        }
                    } catch (e) {
                        console.error("Firestore sync error (redirect check):", e);
                    }
                }

                if (userData) {
                    Auth.handleAuthRedirect(userData);
                }
            }
        });
    },

    initMobileMenu: () => {
        const header = document.querySelector('header');
        if (!header || header.querySelector('.menu-toggle')) return;

        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'menu-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

        const profile = header.querySelector('.user-profile') || header.querySelector('.header-right');
        if (profile) header.insertBefore(toggleBtn, profile);
        else header.appendChild(toggleBtn);

        const nav = document.querySelector('nav') || document.querySelector('.home-nav');
        toggleBtn.addEventListener('click', () => {
            nav.classList.toggle('nav-active');
            const icon = toggleBtn.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    },

    initMobileNavHighlight: () => {
        const path = window.location.pathname;
        const navItems = document.querySelectorAll('.mobile-nav-item');
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (!href) return;
            item.classList.remove('active');
            const isHome = (href === 'index.html' || href === '../index.html') && (path.endsWith('index.html') || path.endsWith('/'));
            const isMatch = path.includes(href.replace('../', '')) && href !== 'index.html' && href !== '../index.html';
            if (isHome || isMatch) item.classList.add('active');
        });
    },

    getScores: () => {
        const user = Auth.getUser();
        if (!user) return { quiz: 0, problem: 0, debug: 0, total: 0 };

        // For now, still pulling from user stats which are synced with Firestore
        const quizPoints = user.stats ? (user.stats.quizScore || 0) : 0; // Simplified for now
        const problemPoints = user.stats ? (user.stats.problemsSolved * 10) : 0; // Example calc
        const debugPoints = 0;

        return {
            quiz: quizPoints,
            problem: problemPoints,
            debug: debugPoints,
            total: quizPoints + problemPoints + debugPoints
        };
    },

    // --- Auto-Sync System ---
    syncProfile: async () => {
        const currentUser = Auth.getUser();
        if (!currentUser || !currentUser.id) return;

        try {
            const doc = await db.collection('users').doc(currentUser.id).get();
            if (doc.exists) {
                const newData = doc.data();

                // Only update and dispatch if data changed (naive check or just always update)
                Auth._cachedUser = newData;
                localStorage.setItem('ix_current_user', JSON.stringify(newData));

                // Dispatch event for UI to update
                window.dispatchEvent(new CustomEvent('ix-profile-updated', { detail: newData }));
                console.log("Profile synced.");
            }
        } catch (e) {
            console.warn("Auto-sync failed:", e);
        }
    },

    startAutoSync: () => {
        if (window.profileSyncInterval) clearInterval(window.profileSyncInterval);
        // Initial sync
        Auth.syncProfile();
        // Loop 30s
        window.profileSyncInterval = setInterval(() => Auth.syncProfile(), 30000);
    },

    // --- Session Heartbeat System ---
    initSessionHeartbeat: () => {
        if (window.sessionHeartbeatInterval) clearInterval(window.sessionHeartbeatInterval);

        // Run every 60 seconds
        window.sessionHeartbeatInterval = setInterval(async () => {
            const user = Auth.getUser();
            if (!user || !user.uid) return;

            // Determine current section based on URL
            const path = window.location.pathname;
            let section = 'other';
            if (path.includes('problems')) section = 'coding';
            else if (path.includes('debug')) section = 'debug';
            else if (path.includes('quiz')) section = 'quiz';
            else if (path.includes('interview')) section = 'interview';

            try {
                const now = new Date().toISOString();

                if (typeof firebase !== 'undefined') {
                    const increment = firebase.firestore.FieldValue.increment(1); // 1 minute
                    await db.collection('users').doc(user.uid).update({
                        'stats.totalTime': increment,
                        [`stats.time_${section}`]: increment,
                        'stats.lastSeen': now,
                        'lastLogin': now
                    });
                }
            } catch (err) {
                console.warn("Heartbeat update failed (offline?)", err);
            }
        }, 60000); // 1 minute
    },

    // --- Maintenance Mode System ---
    initMaintenanceListener: () => {
        if (!db) return;
        db.collection('settings').doc('system').onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const user = Auth.getUser();
                const isAdmin = user && (user.email === 'admin@ix.in' || user.role === 'admin');

                // Determine context
                const path = window.location.pathname;
                let isRestricted = false;
                let lockMessage = 'We are improving the platform. Please check back later.';

                if (data.maintenance) { // Global Lock
                    isRestricted = true;
                } else {
                    // Granular Checks
                    if (data.maintenance_coding && (path.includes('/problems/') || path.includes('problems.html'))) isRestricted = true;
                    if (data.maintenance_debug && (path.includes('/debug/') || path.includes('debug.html'))) isRestricted = true;
                    if (data.maintenance_quiz && (path.includes('/quiz/') || path.includes('quiz_landing.html'))) isRestricted = true;
                    if (data.maintenance_community && path.includes('community.html')) isRestricted = true;
                }

                if (isRestricted && !isAdmin) {
                    if (!Swal.isVisible()) {
                        Swal.fire({
                            title: 'System Under Maintenance',
                            text: lockMessage,
                            imageUrl: 'https://cdn-icons-png.flaticon.com/512/3079/3079148.png',
                            imageWidth: 150,
                            imageHeight: 150,
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showConfirmButton: false,
                            background: '#1a1a1a',
                            color: '#fff',
                            backdrop: `rgba(0,0,0,0.9)`
                        });
                    }
                } else {
                    // specific check to close ONLY if it's the maintenance popup
                    if (Swal.isVisible() && Swal.getTitle() && Swal.getTitle().innerText === 'System Under Maintenance') {
                        Swal.close();
                        if (isRestricted && isAdmin) {
                            Swal.fire({
                                icon: 'info', title: 'Admin Access', text: 'Maintenance is active, but you have bypass access.', timer: 2000, showConfirmButton: false, background: '#1e1e1e', color: '#fff'
                            });
                        }
                    }
                }
            }
        });
    }
};

// Auto-start heartbeat and sync on auth state change
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            Auth.initSessionHeartbeat();
            Auth.initSessionHeartbeat();
            Auth.startAutoSync();
        }
        Auth.initMaintenanceListener(); // Run regardless of auth (but inside firebase check)
    });
}

document.addEventListener('DOMContentLoaded', () => {
    Auth.initMobileMenu();
    Auth.initMobileNavHighlight();
});

window.Auth = Auth;
