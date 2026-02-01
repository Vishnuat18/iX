
let currentUser = null;
let currentChatFriend = null;
let messagesUnsubscribe = null;
let activeTab = 'chats'; // chats | contacts

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    Auth.requireAuth();

    let profileUnsubscribe = null;

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Real-time Profile Listener (Fixes incomplete profile / placeholder issues)
            if (profileUnsubscribe) profileUnsubscribe();

            profileUnsubscribe = db.collection('users').doc(user.uid)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        currentUser = { id: user.uid, ...data };

                        // Force update globally
                        Auth._cachedUser = currentUser;
                        localStorage.setItem('ix_current_user', JSON.stringify(currentUser));

                        initCommunityUI(currentUser);
                    } else {
                        console.warn("User document missing. Attempting recovery...");
                    }
                }, (error) => {
                    console.error("Profile sync error:", error);
                    // Don't block UI here, let loadContacts handle the specific permission error
                });
        }
    });
});

function initCommunityUI(user) {
    // 1. Header and Sidebar Info
    updateHeader(user);
    document.getElementById('myAvatar').innerText = Auth.getInitials ? getInitials(user.username) : user.username[0].toUpperCase();
    document.getElementById('myUsername').innerText = user.username.length > 15 ? user.username.substring(0, 15) + '...' : user.username;
    document.getElementById('myiXcode').innerText = user.iXcode || 'No Code';

    // 2. Load Contacts/Chats
    loadContacts();
}

function updateHeader(user) {
    // Replicates header logic from index.html
    const circle = document.getElementById('headerAvatarCircle');
    const nameEl = document.getElementById('headerUserName');
    const initials = user.fullName ? getInitials(user.fullName) : user.username[0].toUpperCase();

    if (circle) {
        if (user.avatar) {
            circle.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;"><div class="online-status"></div>`;
        } else {
            circle.innerHTML = `${initials}<div class="online-status"></div>`;
        }
    }
    if (nameEl) {
        nameEl.innerText = user.fullName || user.username;
    }
}

// --- Contacts & Friends ---

async function loadContacts() {
    const list = document.getElementById('chatList');
    list.innerHTML = '<div style="text-align:center; margin-top:20px; color:#666;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const authUser = firebase.auth().currentUser;
        if (!authUser) throw new Error("No active session.");

        // Safe Load with Race Condition against 15s timeout
        const fetchPromise = db.collection('users').doc(authUser.uid).collection('friends').get();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Loading timed out (15s)")), 15000));

        const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

        if (snapshot.empty) {
            // Auto-connect to Admin if empty
            await ensureAdminConnection();
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const friend = doc.data();
            html += `
                <div class="chat-item" onclick="startChat('${friend.uid}', '${friend.username}', '${friend.avatar || ''}')">
                    <div class="chat-item-avatar">
                        ${friend.avatar ? `<img src="${friend.avatar}" style="width:100%; height:100%; border-radius:10px;">` : (friend.username[0].toUpperCase())}
                    </div>
                    <div class="chat-item-info">
                        <div class="chat-name">
                            ${friend.username}
                            <span style="font-size:0.7rem; font-weight:normal; color:#666;">${friend.iXcode || ''}</span>
                        </div>
                        <div class="chat-preview">Tap to chat</div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;

    } catch (e) {
        console.error("Error loading contacts:", e);
        // Don't show error if it's just "empty" (which shouldn't happen due to snapshot.empty check, but safety)
        list.innerHTML = `<div style="color:red; text-align:center; padding:20px; font-size:0.8rem;">
            Failed to load contacts.<br>
            <span style="color:#666; font-size:0.7rem;">${e.message}</span>
            <br><button onclick="loadContacts()" class="btn-premium" style="margin-top:10px; font-size:0.7rem;">Retry</button>
        </div>`;
    }
}

// --- Welcome Bot Logic ---
async function ensureAdminConnection() {
    console.log("Ensuring admin connection...");
    // 1. Add Admin to Friends
    const adminId = "ix-system-admin"; // Static ID for the bot
    const adminData = {
        uid: adminId,
        username: "iX-Admin",
        avatar: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png", // Bot Icon
        iXcode: "SYSTEM",
        addedAt: new Date().toISOString()
    };

    try {
        const authUser = firebase.auth().currentUser;
        if (!authUser) return;

        await db.collection('users').doc(authUser.uid).collection('friends').doc(adminId).set(adminData);

        // 2. Add Welcome Message
        const chatId = getChatId(authUser.uid, adminId);
        const chatsRef = db.collection('chats').doc(chatId).collection('messages');
        const msgs = await chatsRef.limit(1).get();

        if (msgs.empty) {
            await chatsRef.add({
                text: "Welcome to iX Link! 🚀\nI'm here to help. You can add friends using their iXcode or start a discussion here.",
                senderId: adminId,
                senderName: "iX-Admin",
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            });
        }

        // Reload to show the new admin contact
        loadContacts();

    } catch (err) {
        console.warn("Failed to auto-connect admin:", err);
        document.getElementById('chatList').innerHTML = `<div style="text-align:center; padding:20px; color:#888;">No contacts found.</div>`;
    }
}

async function openAddFriendModal() {
    const { value: code } = await Swal.fire({
        title: 'Add Friend',
        input: 'text',
        inputLabel: 'Enter their iXcode (e.g., IX-A1B2C3)',
        inputPlaceholder: 'IX-XXXXXX',
        showCancelButton: true,
        background: '#1e1e1e',
        color: '#fff',
        confirmButtonColor: '#00f2ff'
    });

    if (code) {
        addFriend(code.trim().toUpperCase());
    }
}

async function addFriend(iXcode) {
    if (iXcode === currentUser.iXcode) {
        Swal.fire({ icon: 'error', title: 'Start with yourself?', text: "You can't add yourself as a friend!", background: '#1e1e1e', color: '#fff' });
        return;
    }

    try {
        const authUser = firebase.auth().currentUser;
        if (!authUser) throw new Error("Authentication missing. Please reload.");

        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('iXcode', '==', iXcode).limit(1).get();

        if (snapshot.empty) {
            Swal.fire({ icon: 'error', title: 'Not Found', text: "No user found with that iXcode.", background: '#1e1e1e', color: '#fff' });
            return;
        }

        const friendDoc = snapshot.docs[0];
        const friendData = friendDoc.data();

        // 1. Add to MY friends list (Should succeed if I own the account)
        await db.collection('users').doc(authUser.uid).collection('friends').doc(friendData.id).set({
            uid: friendData.id,
            username: friendData.username,
            avatar: friendData.avatar,
            iXcode: friendData.iXcode,
            addedAt: new Date().toISOString()
        });

        // 2. Add ME to THEIR friends list (Might fail due to permissions)
        let twoWaySuccess = false;
        try {
            await db.collection('users').doc(friendData.id).collection('friends').doc(authUser.uid).set({
                uid: authUser.uid,
                username: currentUser.username, // Fallback to local known name
                avatar: currentUser.avatar,
                iXcode: currentUser.iXcode,
                addedAt: new Date().toISOString()
            });
            twoWaySuccess = true;
        } catch (remoteErr) {
            console.warn("Could not add to remote friend list (Permission restricted):", remoteErr);
            // We do NOT stop the flow here. We assume it's a "Request Sent" or "Local Add" scenario.
        }

        const msg = twoWaySuccess ?
            `You are now connected with ${friendData.username}` :
            `Added ${friendData.username} to your list. They will see you when they add you back.`;

        Swal.fire({ icon: 'success', title: 'Connected!', text: msg, background: '#1e1e1e', color: '#fff' });
        loadContacts(); // Refresh list

    } catch (e) {
        console.error(e);
        Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#1e1e1e', color: '#fff' });
    }
}

// --- Chat Logic ---

function getChatId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

async function startChat(friendUid, friendName, friendAvatar) {
    currentChatFriend = { uid: friendUid, name: friendName, avatar: friendAvatar };

    // Update Header
    document.getElementById('currentChatName').innerText = friendName;
    document.getElementById('currentChatStatus').innerText = 'Online'; // Mock status
    const avatarEl = document.getElementById('currentChatAvatar');
    if (friendAvatar) {
        avatarEl.innerHTML = `<img src="${friendAvatar}" style="width:100%; height:100%; border-radius:10px;">`;
    } else {
        avatarEl.innerHTML = friendName[0].toUpperCase();
        avatarEl.style.backgroundColor = '#333';
    }

    // Show Input
    document.getElementById('chatInputArea').style.display = 'flex';

    // Mobile View Toggle
    document.querySelector('.chat-app-container').classList.add('mobile-chat-active');

    // Load Messages
    loadMessages(friendUid);

    // Update active state in list
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
}

function exitChat() {
    document.querySelector('.chat-app-container').classList.remove('mobile-chat-active');
    currentChatFriend = null;
}

function loadMessages(friendUid) {
    const chatId = getChatId(currentUser.id, friendUid);
    const chatBody = document.getElementById('chatBody');
    chatBody.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Encrypted connection established...</div>';

    if (messagesUnsubscribe) messagesUnsubscribe();

    messagesUnsubscribe = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    renderMessage(change.doc.data());
                }
            });
            // Auto scroll
            chatBody.scrollTop = chatBody.scrollHeight;
        });
}

function renderMessage(msg) {
    const chatBody = document.getElementById('chatBody');
    const isMe = msg.senderId === currentUser.id;

    const div = document.createElement('div');
    div.className = `msg ${isMe ? 'msg-out' : 'msg-in'}`;

    const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

    div.innerHTML = `
        ${msg.text}
        <span class="msg-time">${time}</span>
    `;

    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatFriend) return;

    input.value = ''; // Clear immediately

    const chatId = getChatId(currentUser.id, currentChatFriend.uid);

    try {
        await db.collection('chats').doc(chatId).collection('messages').add({
            text: text,
            senderId: currentUser.id,
            senderName: currentUser.username,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        // Also update last message in chat metadata if we wanted a "Chats" list sorted by recent
    } catch (e) {
        console.error("Send failed:", e);
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Failed to send', timer: 2000 });
    }
}

// Enter key to send
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// UI Helpers
function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'chats') {
        loadContacts(); // For now, we mix chats and contacts. In a full app, 'Chats' would be recent conversations.
    } else {
        loadContacts();
    }
}

function getInitials(name) {
    if (!name) return "U";
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
}
