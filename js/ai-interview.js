/**
 * AI Mock Interview - Consolidated 3-Phase Logic with Talking Animation Engine
 */

const INTERVIEW_MODELS = {
    james: { name: "James", asset: "assets/interviewer.png", gender: "male", age: "young" },
    sarah: { name: "Sarah", asset: "assets/interviewer_woman.png", gender: "female", age: "young" },
    robert: { name: "Robert", asset: "assets/interviewer_old_man.png", gender: "male", age: "old" }
};

const ROLES_DATA = {
    software: ["Frontend Developer", "Backend Developer", "Full Stack Developer", "Mobile Developer"],
    data: ["Data Scientist", "Machine Learning Engineer", "Data Analyst"],
    design: ["UI Designer", "UX Designer", "Product Designer"],
    management: ["Associate PM", "Product Manager", "Tech Lead"]
};

// Comprehensive Question Stacks
const HR_QUESTIONS = [
    "Tell me about yourself.",
    "Why did you apply for this job?",
    "What do you know about our company?",
    "Why should we hire you?",
    "What are your strengths?",
    "What is your biggest weakness?",
    "Where do you see yourself in 5 years?",
    "What motivates you?",
    "Describe your ideal work environment.",
    "Describe a time you worked in a team.",
    "How do you handle conflict with coworkers?",
    "Tell me about a challenge you faced.",
    "Have you ever failed? What did you learn?",
    "How do you handle pressure or deadlines?",
    "Tell me about a time you showed leadership.",
    "How do you respond to criticism?",
    "What are your long-term career goals?",
    "How does this role fit your goals?",
    "What kind of team do you want to work with?",
    "What makes you different from others?",
    "What salary do you expect?",
    "When can you join?",
    "Do you have any questions for us?"
];

const TECHNICAL_QUESTIONS = {
    "Frontend Developer": [
        "How do you optimize a website's performance?",
        "What is the difference between Flexbox and Grid?",
        "Explain the Virtual DOM in React.",
        "What are CSS custom properties?",
        "Explain the difference between '==' and '==='."
    ],
    "Backend Developer": [
        "Explain REST vs GraphQL.",
        "What is connection pooling and why is it important?",
        "How do you handle database migrations?",
        "Explain the CAP theorem.",
        "What is a deadlock and how do you prevent it?"
    ],
    "Data Scientist": [
        "What is the difference between supervised and unsupervised learning?",
        "Explain bias-variance tradeoff.",
        "What is a p-value?",
        "How do you handle missing data in a dataset?"
    ],
    "Product Designer": [
        "What is your design process?",
        "How do you handle negative feedback on your designs?",
        "What is the difference between UI and UX?",
        "How do you ensure accessibility in your designs?"
    ]
};

// State Management
let state = {
    phase: 1,
    domain: "",
    role: "",
    model: null,
    userCameraActive: false,
    userStream: null,
    voiceActive: true,
    useVideoInterviewer: false,
    questions: [],
    currentQIndex: 0,
    startTime: null,
    metrics: {
        communication: 0,
        technical: 0,
        confidence: 9,
        grammar: 0,
        behavior: 0,
        mistakes: []
    },
    chatLogs: []
};

let talkingInterval = null;
const SPRITE_POSITIONS = [
    'translate(0, 0)',      // Closed
    'translate(-50%, 0)',   // Mouth A
    'translate(0, -50%)',   // Mouth O
    'translate(-50%, -50%)' // Mouth Wide
];

document.addEventListener('DOMContentLoaded', () => {
    setupPhase1Listeners();
});

// --- PHASE 1: SETUP ---
function setupPhase1Listeners() {
    const domainSelect = document.getElementById('domainSelect');
    const roleSelect = document.getElementById('roleSelect');

    domainSelect.onchange = () => {
        const domain = domainSelect.value;
        roleSelect.innerHTML = '<option value="">Select Target Role</option>';
        if (domain && ROLES_DATA[domain]) {
            ROLES_DATA[domain].forEach(role => {
                const opt = document.createElement('option');
                opt.value = role;
                opt.textContent = role;
                roleSelect.appendChild(opt);
            });
            roleSelect.disabled = false;
        } else { roleSelect.disabled = true; }
        validateSetup();
    };

    window.selectSetupInterviewer = (id, el) => {
        document.querySelectorAll('.interviewer-card-v2').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        state.model = INTERVIEW_MODELS[id];
        validateSetup();
    };

    window.validateSetup = () => {
        const domain = document.getElementById('domainSelect').value;
        const role = document.getElementById('roleSelect').value;
        const btn = document.getElementById('startInterviewBtn');
        if (domain && role && state.model) {
            state.domain = domain;
            state.role = role;
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    };

    window.transitionToPhase2 = () => {
        document.getElementById('setupPhase').style.display = 'none';
        document.getElementById('interviewPhase').style.display = 'block';

        const charKey = state.model.name.toLowerCase();
        // Populate Real AI Video (Primary)
        const video = document.getElementById('interviewerVideo');
        const frames = document.getElementById('talkingHead');
        const videoSrc = `assets/${charKey}.mp4`;

        // We attempt to load the video. If it fails or is missing, we use frames.
        video.src = videoSrc;
        video.oncanplay = () => {
            video.style.display = 'block';
            frames.style.display = 'none';
            state.useVideoInterviewer = true;
        };
        video.onerror = () => {
            video.style.display = 'none';
            frames.style.display = 'block';
            state.useVideoInterviewer = false;
        };

        // Populate AI Video Sprite (Fallback to simulation)
        const sprite = document.getElementById('interviewerSprite');
        sprite.src = `assets/${charKey}_video.png`;
        sprite.onerror = () => sprite.src = state.model.asset; // Absolute fallback

        document.getElementById('interviewerTitle').innerText = `${state.model.name}`;

        startInterviewSession();
    };
}

// --- PHASE 2: LIVE INTERVIEW ---
function startInterviewSession() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const voiceBtn = document.getElementById('voiceBtn');

    // Build Question Stack
    state.questions = [...HR_QUESTIONS];
    const techQ = TECHNICAL_QUESTIONS[state.role] || TECHNICAL_QUESTIONS["Backend Developer"];
    techQ.forEach((q, i) => {
        state.questions.splice(3 + i * 4, 0, q);
    });

    // Speech Rec
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.onstart = () => voiceBtn.classList.add('active');
        recognition.onend = () => voiceBtn.classList.remove('active');
        recognition.onresult = (e) => {
            userInput.value = e.results[0][0].transcript;
            handleUserResponse();
        };
    }
    voiceBtn.onclick = () => recognition && recognition.start();

    window.toggleMedia = (type, el) => {
        el.classList.toggle('active');
        const isActive = el.classList.contains('active');
        const icon = el.querySelector('i');

        if (type === 'video') {
            icon.className = isActive ? 'fas fa-video' : 'fas fa-video-slash';
            const display = isActive ? 'block' : 'none';
            if (state.useVideoInterviewer) document.getElementById('interviewerVideo').style.display = display;
            else document.getElementById('talkingHead').style.display = display;
        } else {
            icon.className = isActive ? 'fas fa-microphone' : 'fas fa-microphone-slash';
            state.voiceActive = isActive;
        }
    };

    window.toggleUserCamera = async (btn) => {
        const pip = document.getElementById('userPreview');
        const video = document.getElementById('userLocalVideo');
        const icon = btn.querySelector('i');

        if (state.userCameraActive) {
            if (state.userStream) {
                state.userStream.getTracks().forEach(track => track.stop());
            }
            video.srcObject = null;
            pip.style.display = 'none';
            btn.classList.remove('active');
            icon.className = 'fas fa-video-slash';
            state.userCameraActive = false;
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                state.userStream = stream;
                video.srcObject = stream;
                pip.style.display = 'block';
                btn.classList.add('active');
                icon.className = 'fas fa-video';
                state.userCameraActive = true;
                state.metrics.confidence += 2;
                updateLiveReviewUI();
            } catch (err) {
                console.error("Camera access denied:", err);
                alert("Please allow camera access to use this feature.");
            }
        }
    };

    const handleUserResponse = () => {
        const text = userInput.value.trim();
        if (!text) return;
        appendMessage(text, 'outgoing');
        analyzeLiveMetrics(text);
        userInput.value = '';

        setTimeout(askNextQuestion, 1500);
    };

    sendBtn.onclick = handleUserResponse;
    userInput.onkeypress = (e) => e.key === 'Enter' && handleUserResponse();

    function appendMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerHTML = `<div class="bubble">${text}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTo(0, chatMessages.scrollHeight);
    }

    function analyzeLiveMetrics(text) {
        const mistakes = ["i is", "he go", "they was", "i seen", "don't got"];
        mistakes.forEach(m => {
            if (text.toLowerCase().includes(m)) {
                state.metrics.grammar++;
                state.metrics.mistakes.push(`Incorrect use of "${m}"`);
            }
        });
        if (text.length < 10) state.metrics.behavior++;
        updateLiveReviewUI();
    }

    function updateLiveReviewUI() {
        document.getElementById('grammarCount').innerText = state.metrics.grammar;
        document.getElementById('behaviorCount').innerText = state.metrics.behavior;
        document.getElementById('relevanceScore').innerText = state.metrics.behavior > 5 ? "Medium" : "High";
        document.getElementById('grammarDetails').innerHTML = state.metrics.mistakes.map(m => `<div>• ${m}</div>`).join('');
    }

    function askNextQuestion() {
        if (state.currentQIndex >= state.questions.length) {
            appendMessage("Thank you for your time. Your scorecard is ready. Click the button below to finish.", 'incoming');
            document.getElementById('finishInterviewBtn').style.display = 'block';
            return;
        }
        const q = state.questions[state.currentQIndex++];
        appendMessage(q, 'incoming');
        speakText(q);
    }

    function speakText(text) {
        if (!state.voiceActive) return;
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();
        const feedBox = document.querySelector('.feed-box');

        if (state.model.gender === 'female') {
            utterance.voice = voices.find(v => v.name.includes('Female')) || voices[0];
            utterance.pitch = 1.1;
        } else {
            utterance.voice = voices.find(v => v.name.includes('Male')) || voices[0];
            utterance.pitch = state.model.age === 'old' ? 0.85 : 1.0;
        }

        utterance.onstart = () => {
            if (feedBox) feedBox.classList.add('speaking');
            startTalkingAnimation();
        };
        utterance.onend = () => {
            if (feedBox) feedBox.classList.remove('speaking');
            stopTalkingAnimation();
        };
        synth.speak(utterance);
    }

    function startTalkingAnimation() {
        if (state.useVideoInterviewer) {
            const video = document.getElementById('interviewerVideo');
            video.currentTime = 0;
            video.play();
            return;
        }

        if (talkingInterval) return;
        const sprite = document.getElementById('interviewerSprite');
        talkingInterval = setInterval(() => {
            // Randomly pick a mouth position (excluding closed at index 0)
            const nextPos = SPRITE_POSITIONS[1 + Math.floor(Math.random() * 3)];
            sprite.style.transform = nextPos;
        }, 120);
    }

    function stopTalkingAnimation() {
        if (state.useVideoInterviewer) {
            const video = document.getElementById('interviewerVideo');
            video.pause();
            video.currentTime = 0; // Reset to idle
            return;
        }

        clearInterval(talkingInterval);
        talkingInterval = null;
        document.getElementById('interviewerSprite').style.transform = SPRITE_POSITIONS[0];
    }

    // Initial Session Intro
    setTimeout(() => {
        const greeting = `Hello! I'm ${state.model.name}, your interviewer for today. It's great to meet you. Please let me know when you're ready to begin with your introduction.`;
        appendMessage(greeting, 'incoming');
        speakText(greeting);
    }, 1000);
}

// --- PHASE 3: SCORECARD ---
window.showScorecardPhase = () => {
    document.getElementById('interviewPhase').style.display = 'none';
    document.getElementById('scorecardPhase').style.display = 'block';

    const s = state.metrics;
    const comm = Math.max(0, 10 - s.grammar - (s.behavior / 2));
    const total = ((comm + 9 + 9 + (10 - s.grammar) + (10 - s.behavior)) / 50) * 100;

    document.querySelector('.score-value').innerText = `${Math.round(total)}%`;
    let grade = "Outstanding";
    if (total >= 95) grade = "Legendary";
    else if (total < 80) grade = "Good";

    document.getElementById('gradeBadge').innerText = grade;
    document.getElementById('mainProgress').style.background = `conic-gradient(var(--accent-primary) ${total}%, #1e293b 0)`;
};

window.generatePDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("AI INTERVIEW PERFORMANCE REPORT", 20, 30);
    doc.text(`Role: ${state.role}`, 20, 50);
    doc.text(`Score: ${document.querySelector('.score-value').innerText}`, 20, 60);
    doc.save(`Report_${state.role}.pdf`);
};
