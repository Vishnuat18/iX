/**
 * Admin Logic for iX Platform
 */

const Admin = {
    init: async () => {
        console.log("Admin Dashboard Initializing...");
        await Admin.loadStats();
        await Admin.loadUsers();

        // Auto-refresh every 30 seconds
        setInterval(() => {
            console.log("Auto-refreshing admin data...");
            Admin.loadStats();
            Admin.loadUsers();
        }, 30000);
    },

    loadStats: async () => {
        try {
            const usersSnapshot = await db.collection('users').get();
            const users = usersSnapshot.docs.map(doc => doc.data());

            // 1. Total Users
            document.getElementById('totalUsers').innerText = users.length;

            // 2. Total Problems Solved
            const totalSolved = users.reduce((acc, user) => acc + (user.solvedProblems ? user.solvedProblems.length : 0), 0);
            document.getElementById('totalSolved').innerText = totalSolved;

            // 3. Average Score
            const totalScore = users.reduce((acc, user) => acc + (user.stats ? (user.stats.quizScore || 0) : 0), 0);
            const avgScore = users.length > 0 ? (totalScore / users.length).toFixed(1) : 0;
            document.getElementById('avgScore').innerText = avgScore;

            // 4. Active Today (Simulated for now based on join date)
            const today = new Date().toLocaleDateString();
            const activeToday = users.filter(user => user.joinedDate === today).length;
            document.getElementById('activeToday').innerText = activeToday;

            Admin.renderCharts(users);
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    },

    loadUsers: async () => {
        try {
            const usersSnapshot = await db.collection('users').orderBy('joinedDate', 'desc').limit(50).get();
            const tableBody = document.getElementById('userTableBody');
            tableBody.innerHTML = '';

            usersSnapshot.forEach(doc => {
                const user = doc.data();
                const row = document.createElement('tr');
                row.className = 'user-row';
                row.style.cursor = 'pointer';
                row.onclick = () => Admin.viewUserDetails(doc.id);
                row.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${user.avatar || '../assets/default-avatar.png'}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; background:#333;">
                            <span>${user.fullName || user.username}</span>
                        </div>
                    </td>
                    <td style="color:#888;">${user.email}</td>
                    <td><span class="rank-badge rank-${user.stats?.rank || 'Novice'}">${user.stats?.rank || 'Novice'}</span></td>
                    <td>${user.solvedProblems?.length || 0}</td>
                    <td style="font-weight:700; color:var(--accent-primary)">${user.stats?.quizScore || 0}</td>
                    <td style="color:#666; font-size:0.85rem;">${user.joinedDate}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error("Error loading users:", error);
        }
    },

    renderCharts: (users) => {
        // Rank Distribution
        const rankCounts = {
            Diamond: 0, Platinum: 0, Gold: 0, Silver: 0, Bronze: 0, Novice: 0
        };
        users.forEach(u => rankCounts[u.stats?.rank || 'Novice']++);

        new Chart(document.getElementById('rankDistributionChart'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(rankCounts),
                datasets: [{
                    data: Object.values(rankCounts),
                    backgroundColor: ['#b9f2ff', '#e5e4e2', '#ffd700', '#c0c0c0', '#cd7f32', '#555'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'User Rank Distribution', color: '#fff' },
                    legend: { position: 'bottom', labels: { color: '#888' } }
                }
            }
        });

        // Activity (Score vs Problems) - Scatter Plot Example
        const scatterData = users.map(u => ({ x: u.solvedProblems?.length || 0, y: u.stats?.quizScore || 0 }));

        new Chart(document.getElementById('activityChart'), {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Score vs Solved',
                    data: scatterData,
                    backgroundColor: 'rgba(0, 242, 255, 0.5)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Problems Solved', color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { title: { display: true, text: 'Accumulated Score', color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    },

    // Database Seeding Logic
    seedCollection: async (collectionName, filePath) => {
        try {
            console.log(`Starting seed for ${collectionName} from ${filePath}...`);
            const response = await fetch(filePath);
            const data = await response.json();

            if (!Array.isArray(data)) throw new Error("Invalid JSON format: expected array");

            let count = 0;
            const batchSize = 50;

            for (let i = 0; i < data.length; i += batchSize) {
                const batch = db.batch();
                const chunk = data.slice(i, i + batchSize);

                chunk.forEach(item => {
                    const docId = String(item.id);
                    const docRef = db.collection(collectionName).doc(docId);
                    batch.set(docRef, item);
                    count++;
                });

                await Auth._withTimeout(batch.commit());
                console.log(`Uploaded ${count}/${data.length} items to ${collectionName}...`);
            }

            return { success: true, count };
        } catch (error) {
            console.error(`Seed error for ${collectionName}:`, error);
            return { success: false, message: error.message };
        }
    },

    performSeeding: async () => {
        const result = await Swal.fire({
            title: 'Seeding Engine',
            text: "This will upload local JSON data to Firestore. Existing IDs will be updated (upsert).",
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Seed Now',
            background: '#1e1e1e',
            color: '#fff'
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Seeding in Progress...',
            html: '<div id="seed-progress">Connecting to Firestore...</div>',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const progressEl = document.getElementById('seed-progress');

        progressEl.innerText = "Seeding Coding Problems...";
        const res1 = await Admin.seedCollection('problems', '../data/problems.json');

        progressEl.innerText = "Seeding Debugging Challenges...";
        const res2 = await Admin.seedCollection('debug_problems', '../data/debug_problems.json');

        if (res1.success && res2.success) {
            Swal.fire({
                title: 'Sync Complete! 🚀',
                text: `Successfully synchronized ${res1.count} problems and ${res2.count} debugging challenges.`,
                icon: 'success',
                background: '#1e1e1e',
                color: '#fff',
                confirmButtonColor: '#00f2ff'
            });
        } else {
            Swal.fire({
                title: 'Sync Error',
                text: 'Some datasets failed to upload. Check logs.',
                icon: 'error',
                background: '#1e1e1e',
                color: '#fff'
            });
        }
    },

    // --- New Workable Tools ---

    manageCollection: async (name) => {
        const snapshot = await db.collection(name).get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let html = `
            <div style="max-height: 500px; overflow-y: auto; text-align: left;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn-premium" onclick="Admin.addItem('${name}')" style="flex: 2;">+ Add New Item</button>
                    <button class="btn-premium" onclick="Admin.manageCollection('${name}')" style="flex: 1; background: #333; border: 1px solid #444;"><i class="fas fa-sync"></i></button>
                </div>
                <table style="width: 100%; color: #fff; font-size: 0.85rem; border-collapse: collapse;">
                    <thead style="background: rgba(255,255,255,0.05);">
                        <tr><th style="padding: 10px;">ID</th><th style="padding: 10px;">Title</th><th style="padding: 10px;">Actions</th></tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                                <td style="padding: 10px; font-family: monospace;">${item.id}</td>
                                <td style="padding: 10px;">${item.title || item.name || 'No Title'}</td>
                                <td style="padding: 10px;">
                                    <button onclick="Admin.editItem('${name}', '${item.id}')" style="background: none; border: none; color: var(--accent-primary); cursor: pointer;"><i class="fas fa-edit"></i></button>
                                    <button onclick="Admin.deleteItem('${name}', '${item.id}')" style="background: none; border: none; color: #ff5252; cursor: pointer; margin-left: 10px;"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: `Manage ${name.replace('_', ' ').toUpperCase()}`,
            html: html,
            width: '600px',
            background: '#1e1e1e',
            color: '#fff',
            showConfirmButton: false,
            showCloseButton: true
        });
    },

    addItem: async (collection) => {
        const { value: id } = await Swal.fire({
            title: `Add to ${collection}`,
            input: 'text',
            inputLabel: 'Unique ID (e.g. 101)',
            inputPlaceholder: 'Must not exist in database',
            background: '#1e1e1e',
            color: '#fff',
            showCancelButton: true
        });

        if (id) {
            // Check if ID exists
            const doc = await db.collection(collection).doc(id).get();
            if (doc.exists) {
                Swal.fire('Error', 'This ID already exists!', 'error');
                return;
            }

            const template = Admin.getTemplate(collection);
            Admin.editItem(collection, id, true, template);
        }
    },

    getTemplate: (collection) => {
        if (collection === 'problems') {
            return {
                title: "New Problem",
                difficulty: "Easy",
                tags: ["Java", "Basics"],
                description: "Describe the problem here.",
                initialCode: "public class Main {\n    public static void main(String[] args) {\n        \n    }\n}",
                solution: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello\");\n    }\n}",
                score: 10
            };
        } else if (collection === 'debug_problems') {
            return {
                title: "New Debug Challenge",
                difficulty: "Medium",
                description: "Describe the bug here.",
                buggyCode: "public class Bug {\n    public static void main(String[] args) {\n        // Buggy code\n    }\n}",
                solutionPattern: "correct code pattern",
                expectedOutput: "Expected result"
            };
        }
        return {};
    },

    editItem: async (collection, id, isNew = false, template = null) => {
        let existingData = template || {};
        if (!isNew) {
            const doc = await db.collection(collection).doc(id).get();
            existingData = doc.data();
        }

        const { value: json } = await Swal.fire({
            title: isNew ? `New ${collection} Entry` : `Edit ${id}`,
            input: 'textarea',
            inputValue: JSON.stringify(existingData, null, 4),
            inputPlaceholder: 'Paste JSON representation here...',
            inputAttributes: {
                style: 'height: 400px; font-family: monospace; font-size: 0.8rem; background: #000; color: #00ff00;'
            },
            footer: '<span style="color:#888; font-size:0.75rem;">Validate JSON format before saving</span>',
            background: '#1e1e1e',
            color: '#fff',
            width: '800px',
            showCancelButton: true,
            confirmButtonText: 'Save to Cloud'
        });

        if (json) {
            try {
                const data = JSON.parse(json);
                data.id = isNew ? id : (data.id || id);
                await db.collection(collection).doc(id).set(data);
                Swal.fire('Saved!', 'Collection updated successfully.', 'success');
                Admin.manageCollection(collection);
            } catch (e) {
                Swal.fire('Error', 'Invalid JSON: ' + e.message, 'error');
            }
        }
    },

    deleteItem: async (collection, id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Deleting item ${id} is permanent.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff5252',
            cancelButtonColor: '#444',
            confirmButtonText: 'Yes, delete it!',
            background: '#1e1e1e',
            color: '#fff'
        });

        if (result.isConfirmed) {
            await db.collection(collection).doc(id).delete();
            Swal.fire('Deleted', 'Item removed from database.', 'success');
            Admin.manageCollection(collection);
        }
    },

    openSettingsModal: async () => {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'flex';

        // Fetch current settings
        try {
            const doc = await db.collection('settings').doc('system').get();
            const settings = doc.exists ? doc.data() : {};

            document.getElementById('maint_global').checked = settings.maintenance || false;
            document.getElementById('maint_coding').checked = settings.maintenance_coding || false;
            document.getElementById('maint_debug').checked = settings.maintenance_debug || false;
            document.getElementById('maint_quiz').checked = settings.maintenance_quiz || false;
            document.getElementById('maint_community').checked = settings.maintenance_community || false;

        } catch (e) {
            console.error("Error fetching settings:", e);
            Swal.fire('Error', 'Could not load settings.', 'error');
        }
    },

    saveMaintenanceSettings: async () => {
        const updates = {
            maintenance: document.getElementById('maint_global').checked,
            maintenance_coding: document.getElementById('maint_coding').checked,
            maintenance_debug: document.getElementById('maint_debug').checked,
            maintenance_quiz: document.getElementById('maint_quiz').checked,
            maintenance_community: document.getElementById('maint_community').checked,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('settings').doc('system').set(updates, { merge: true });
            document.getElementById('settingsModal').style.display = 'none';
            Swal.fire('Saved!', 'Maintenance settings updated.', 'success');
        } catch (e) {
            console.error("Error saving settings:", e);
            Swal.fire('Error', 'Failed to save settings.', 'error');
        }
    },

    sendBroadcast: async () => {
        const { value: formValues } = await Swal.fire({
            title: 'New Global Broadcast',
            html:
                '<input id="swal-title" class="swal2-input" placeholder="Title (Optional)">' +
                '<textarea id="swal-message" class="swal2-textarea" placeholder="Message content..." style="margin-top:10px;"></textarea>' +
                '<input id="swal-image" class="swal2-input" placeholder="Image URL (Optional)" style="margin-top:10px;">' +
                '<input id="swal-video" class="swal2-input" placeholder="Video URL (YouTube/MP4) (Optional)" style="margin-top:10px;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Post Update',
            background: '#1e1e1e',
            color: '#fff',
            preConfirm: () => {
                return {
                    title: document.getElementById('swal-title').value,
                    message: document.getElementById('swal-message').value,
                    imageUrl: document.getElementById('swal-image').value,
                    videoUrl: document.getElementById('swal-video').value
                }
            }
        });

        if (formValues && formValues.message) {
            try {
                await db.collection('broadcasts').add({
                    title: formValues.title || 'Platform Update',
                    message: formValues.message,
                    imageUrl: formValues.imageUrl || null,
                    videoUrl: formValues.videoUrl || null,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    author: auth.currentUser?.email || 'System'
                });

                // Also trigger a local storage update so users see the popup if they are online
                // (Though index.html listener handles the popup via snapshot)

                Swal.fire('Broadcast Sent', 'Update posted to user feed.', 'success');
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    // --- User Management A-Z ---

    // --- User Management A-Z ---

    // Helper to format minutes to nice strings
    formatTime: (minutes) => {
        if (!minutes) return '0m';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    },

    viewUserDetails: async (userId) => {
        // Show Loading State in Modal
        const modal = document.getElementById('userDetailsModal');
        modal.style.display = 'flex';

        // Reset/Loading State
        document.getElementById('modalUserName').innerText = 'Loading...';
        document.getElementById('modalReportsList').innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Fetching data...</div>';

        try {
            // 1. Fetch User Data
            const doc = await db.collection('users').doc(userId).get();
            const user = doc.data();

            // 2. Fetch Interview Reports (Now from Array in User Doc)
            // No need for separate fetch since 'user' doc is already fetched above.
            // Sorting descending by timestamp manually since it's an array.
            const rawReports = user.interviewReports || [];
            const reports = rawReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // 3. Populate Header
            document.getElementById('modalUserName').innerText = user.fullName || user.username || 'Unknown User';
            document.getElementById('modalUserEmail').innerText = user.email || 'No Email';
            document.getElementById('modalUserInitials').innerText = (user.fullName || user.username || 'U').charAt(0).toUpperCase();

            const rankEl = document.getElementById('modalUserRank');
            rankEl.className = `rank-badge rank-${user.stats?.rank || 'Novice'}`;
            rankEl.innerText = (user.stats?.rank || 'Novice').toUpperCase();

            // 4. Populate Analytics
            document.getElementById('modalTotalTime').innerText = Admin.formatTime(user.stats?.totalTime || 0);
            document.getElementById('modalTimeCoding').innerText = Admin.formatTime(user.stats?.time_coding || 0);
            document.getElementById('modalTimeDebug').innerText = Admin.formatTime(user.stats?.time_debug || 0);
            document.getElementById('modalTimeQuiz').innerText = Admin.formatTime(user.stats?.time_quizScore || user.stats?.time_quiz || 0);

            // 5. Populate Reports List
            const listContainer = document.getElementById('modalReportsList');
            if (reports.length === 0) {
                listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No interview reports found for this user.</div>';
            } else {
                listContainer.innerHTML = reports.map(r => `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: #fff;">${r.role || 'Mock Interview'} <span style="font-size: 0.8rem; color: var(--accent-secondary);">(${r.grade})</span></div>
                            <div style="font-size: 0.8rem; color: #666;">${new Date(r.timestamp).toLocaleString()}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #fff;">${r.overallScore}%</div>
                            <div style="font-size: 0.75rem; color: #888;">Overall Score</div>
                        </div>
                    </div>
                `).join('');
            }

            // Re-attach button handlers (since we are not regenerating button HTML, checking if we need to update onclicks is not needed for static buttons,
            // BUT the specific 'Account Controls' buttons I removed from the HTML string in previous Swal logic need to be present somewhere or I need to add them to the Modal HTML).
            // Wait, in Step 1221 I added the Modal HTML to admin/index.html but I didn't include the 'Account Controls' buttons there! 
            // I should add them dynamically or have them in the static HTML.

            // Let's add them dynamically to the bottom for now to ensure they work with the specific userID.
            // Or better, update the onclick of existing static buttons? I didn't add static buttons.
            // I will inject the control buttons at the bottom of the modal content.

            const controlsHtml = `
                <h4 style="color: #ff5252; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;">Account Controls</h4>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-premium" style="flex: 1; font-size: 0.8rem; background: #333; border: 1px solid #444;" onclick="Admin.updateRank('${userId}')">Override Rank</button>
                    <button class="btn-premium" style="flex: 1; font-size: 0.8rem; background: #ff5252; border: none; color: #fff;" onclick="Admin.resetProgress('${userId}')">Reset Progress</button>
                </div>
            `;

            // Append if not exists or replace? 
            // Simplest is to append a container div in the HTML, but I can't edit HTML from here.
            // I'll append to modalReportsList parent.

            let controlsDiv = document.getElementById('userControlsArea');
            if (!controlsDiv) {
                controlsDiv = document.createElement('div');
                controlsDiv.id = 'userControlsArea';
                document.querySelector('.modal-content').appendChild(controlsDiv);
            }
            controlsDiv.innerHTML = controlsHtml;


        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to load user details: ' + e.message, 'error');
            modal.style.display = 'none';
        }
    },

    updateRank: async (userId) => {
        const { value: rank } = await Swal.fire({
            title: 'Override User Rank',
            input: 'select',
            inputOptions: {
                'Novice': 'Novice',
                'Bronze': 'Bronze',
                'Silver': 'Silver',
                'Gold': 'Gold',
                'Platinum': 'Platinum',
                'Diamond': 'Diamond'
            },
            background: '#1e1e1e',
            color: '#fff',
            showCancelButton: true
        });

        if (rank) {
            await db.collection('users').doc(userId).set({
                stats: { rank: rank }
            }, { merge: true });

            Swal.fire('Updated!', `Rank set to ${rank}.`, 'success').then(() => {
                Admin.viewUserDetails(userId); // Refresh modal
                Admin.loadUsers(); // Refresh table
            });
        }
    },

    resetProgress: async (userId) => {
        const result = await Swal.fire({
            title: 'Wipe All Progress?',
            text: "This will remove all solved problems and reset scores to zero!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff5252',
            confirmButtonText: 'Yes, Wipe It!',
            background: '#1e1e1e',
            color: '#fff'
        });

        if (result.isConfirmed) {
            await db.collection('users').doc(userId).set({
                solvedProblems: [],
                stats: { problemsSolved: 0, quizScore: 0, rank: 'Novice' }
            }, { merge: true });

            Swal.fire('Reset!', 'User data has been cleared.', 'success').then(() => {
                Admin.viewUserDetails(userId);
                Admin.loadUsers();
            });
        }
    },

    // --- Support Desk & Chat Bridge ---

    openSupportDesk: async () => {
        Swal.fire({
            title: 'Opening Support Desk...',
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const snapshot = await db.collection('feedback').orderBy('timestamp', 'desc').get();
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let html = `
                <div style="max-height: 500px; overflow-y: auto; text-align: left;">
                    ${items.length === 0 ? '<p style="text-align:center; color:#888;">No feedback messages yet.</p>' : ''}
                    ${items.map(item => `
                        <div style="background: ${item.status === 'unread' ? 'rgba(0,170,255,0.05)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${item.status === 'unread' ? 'var(--accent-primary)' : '#333'}; padding: 15px; border-radius: 8px; margin-bottom: 15px; position: relative;">
                            ${item.status === 'unread' ? '<span style="position:absolute; top:10px; right:10px; background:var(--accent-primary); color:#000; font-size:0.6rem; padding:2px 6px; border-radius:4px; font-weight:bold;">NEW</span>' : ''}
                            <div style="font-weight: bold; color: #fff; margin-bottom: 5px;">${item.userName} <span style="font-weight:normal; color:#666; font-size:0.8rem;">(${item.email})</span></div>
                            <div style="color: #ddd; font-size: 0.9rem; margin-bottom: 15px; line-height: 1.4;">"${item.message}"</div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn-premium" style="padding: 5px 15px; font-size: 0.75rem;" onclick="Admin.replyToFeedback('${item.id}', '${item.userId}', '${item.userName.replace(/'/g, "\\'")}')">Reply via Chat</button>
                                ${item.status === 'unread' ? `<button class="btn-premium" style="padding: 5px 15px; font-size: 0.75rem; background:#333; border: 1px solid #444;" onclick="Admin.markFeedbackRead('${item.id}')">Dismiss</button>` : ''}
                            </div>
                            <div style="font-size: 0.7rem; color: #555; margin-top: 10px; text-align: right;">${item.timestamp ? item.timestamp.toDate().toLocaleString() : 'Just now'}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            Swal.fire({
                title: 'iX Support Desk',
                html: html,
                width: '700px',
                background: '#1e1e1e',
                color: '#fff',
                showConfirmButton: false,
                showCloseButton: true
            });
        } catch (e) {
            Swal.fire('Error', 'Failed to load feedback: ' + e.message, 'error');
        }
    },

    markFeedbackRead: async (id) => {
        await db.collection('feedback').doc(id).update({ status: 'read' });
        Admin.openSupportDesk(); // Refresh
    },

    replyToFeedback: async (feedbackId, userId, userName) => {
        const { value: reply } = await Swal.fire({
            title: `Reply to ${userName}`,
            input: 'textarea',
            inputPlaceholder: 'Write your message to the user...',
            background: '#1e1e1e',
            color: '#fff',
            showCancelButton: true,
            confirmButtonText: 'Send via iXadmin'
        });

        if (reply) {
            try {
                // 1. Send to "Support Database" (Chat Bridge)
                // We'll use a standardized bridge for 'iXadmin' replies.
                // This mimics the global_db structure but in Firestore for persistence.

                const messageData = {
                    from: 'iX-ADMIN',
                    fromName: 'iX Owner',
                    to: userId,
                    text: reply,
                    time: Date.now(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    isSupportReply: true,
                    originalFeedbackId: feedbackId
                };

                await db.collection('support_messages').add(messageData);

                // 2. Mark feedback as replied
                await db.collection('feedback').doc(feedbackId).update({
                    status: 'replied',
                    adminReply: reply,
                    repliedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                Swal.fire('Sent!', 'Your reply has been sent to the user\'s chat.', 'success').then(() => {
                    Admin.openSupportDesk();
                });
            } catch (e) {
                Swal.fire('Error', 'Failed to send reply: ' + e.message, 'error');
            }
        }
    },
    // --- Modern Broadcast Implementation ---
    openBroadcastModal: () => {
        const modal = document.getElementById('postCreatorModal');
        if (modal) modal.style.display = 'flex';

        document.getElementById('postTitle').value = '';
        document.getElementById('postMessage').value = '';
        Admin.clearFileSelection();

        const fileInput = document.getElementById('postFileInput');
        if (fileInput) fileInput.onchange = Admin.handleFileSelect;
    },

    handleFileSelect: (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'video/mp4', 'video/webm'];
        if (!validTypes.includes(file.type)) {
            Swal.fire('Invalid File', 'Please upload a PNG/JPG image or MP4/WebM video.', 'error');
            return;
        }

        Admin._pendingBroadcastFile = file;

        document.getElementById('fileDropZone').style.display = 'none';
        document.getElementById('mediaPreview').style.display = 'block';

        const imgPreview = document.getElementById('imagePreview');
        const vidPreview = document.getElementById('videoPreview');

        imgPreview.style.display = 'none';
        vidPreview.style.display = 'none';

        const url = URL.createObjectURL(file);

        if (file.type.startsWith('image/')) {
            imgPreview.src = url;
            imgPreview.style.display = 'block';
        } else {
            vidPreview.src = url;
            vidPreview.style.display = 'block';
        }
    },

    clearFileSelection: () => {
        Admin._pendingBroadcastFile = null;
        document.getElementById('postFileInput').value = '';
        document.getElementById('fileDropZone').style.display = 'block';
        document.getElementById('mediaPreview').style.display = 'none';
        document.getElementById('uploadProgress').style.width = '0%';
        const img = document.getElementById('imagePreview');
        if (img) img.src = '';
        const vid = document.getElementById('videoPreview');
        if (vid) vid.src = '';
    },

    submitBroadcast: async () => {
        const title = document.getElementById('postTitle').value;
        const message = document.getElementById('postMessage').value;
        const file = Admin._pendingBroadcastFile;

        if (!message) {
            Swal.fire('Missing Content', 'Please enter a message for the broadcast.', 'warning');
            return;
        }

        const btn = document.querySelector('#postCreatorModal button:last-child');
        const originalText = btn.innerText;
        btn.innerText = 'Posting...';
        btn.disabled = true;

        try {
            let downloadUrl = null;
            let fileType = null;

            if (file) {
                fileType = file.type.startsWith('image/') ? 'imageUrl' : 'videoUrl';
                const filename = `broadcasts/${Date.now()}_${file.name}`;
                const uploadTask = storage.ref(filename).put(file);

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            document.getElementById('uploadProgress').style.width = progress + '%';
                        },
                        (error) => reject(error),
                        () => resolve()
                    );
                });

                downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
            }

            const postData = {
                title: title || 'System Update',
                message: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                author: auth.currentUser?.email || 'System'
            };

            if (downloadUrl) {
                postData[fileType] = downloadUrl;
            }

            await db.collection('broadcasts').add(postData);

            Swal.fire({
                title: 'Published!',
                text: 'Your update is live on the user feed.',
                icon: 'success',
                background: '#1e1e1e',
                color: '#fff'
            });

            document.getElementById('postCreatorModal').style.display = 'none';

        } catch (error) {
            console.error(error);
            Swal.fire('Upload Failed', error.message, 'error');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', Admin.init);
window.Admin = Admin;
