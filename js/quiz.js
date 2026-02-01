// QUIZ ENGINE
const URL_PARAMS = new URLSearchParams(window.location.search);
const LANG = URL_PARAMS.get("lang") || localStorage.getItem("lang");

// State
let currentData = null; // Loaded JSON data
let currentSetId = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // { qId: optionIndex }
let score = 0;
let timerInterval;

// DOM Elements
const views = {
    topics: document.getElementById("view-topics"),
    sets: document.getElementById("view-sets"),
    quiz: document.getElementById("view-quiz"),
    result: document.getElementById("view-result")
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    if (!LANG) {
        alert("No Language Selected. Redirecting...");
        window.location.href = "../index.html";
        return;
    }
    loadQuizData();
});

async function loadQuizData() {
    // Mapping 'lang' to file paths. 
    // In a real app, this might be dynamic, but for now we map known langs to files.
    // We'll normalize lang to lowercase.
    const langKey = LANG.toLowerCase();

    // Try to fetch the specific JSON for this language/topic
    // Convention: data/quiz/{domain}/{lang}.json
    // But wait, the main 'lang' might be "java", "python", "html".
    // We need to find which domain it belongs to, or just search a flat structure?
    // Easier: We'll put them in data/quiz/languages/java.json, data/quiz/web/html.json etc.
    // Since we don't know the parent folder easily without a map, let's try a map.

    const pathMap = {
        // CS
        "fundamentals of computer": "cs/fundamentals.json",
        "operating systems": "cs/os.json",
        "dbms": "cs/dbms.json",
        "computer networks": "cs/networks.json",
        // Languages
        "java": "languages/java.json",
        "python": "languages/python.json",
        "c": "languages/c.json",
        "sql": "languages/sql.json",
        "mongodb": "languages/mongodb.json",
        // DSA
        "basics": "dsa/basics.json",
        "intermediate": "dsa/intermediate.json",
        "advanced": "dsa/advanced.json",
        // Web
        "html": "web/html.json",
        "css": "web/css.json",
        "javascript (basics)": "web/js_basics.json",
        "javascript (advanced)": "web/js_advanced.json",
        // Fullstack Components
        "react": "fullstack/react.json",
        "node.js": "fullstack/node.json",
        "express": "fullstack/express.json",
        // Fullstack Bundles
        "full stack java": "fullstack/java_fullstack.json",
        "full stack python": "fullstack/python_fullstack.json",
        "mern stack": "fullstack/mern.json"
    };

    const relPath = pathMap[langKey];
    if (!relPath) {
        alert("Quiz content coming soon for: " + LANG);
        return;
    }

    try {
        const response = await fetch(`../data/quiz/${relPath}`);
        if (!response.ok) throw new Error("Failed to load");
        const data = await response.json();
        currentData = data;
        renderTopicList(); // Actually we might jump straight to sets if the file represents one "Topic" with multiple "Sets"
    } catch (e) {
        console.error(e);
        document.getElementById("page-title").innerText = "Error loading quiz data";
    }
}

// --- VIEW NAVIGATION ---
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.add("hidden"));
    views[viewName].classList.remove("hidden");
}

// --- RENDER: SETS LIST (The JSON is organized as Sets) ---
function renderTopicList() {
    showView("sets");
    const container = document.getElementById("sets-list");
    container.innerHTML = "";
    document.getElementById("page-title").innerText = `Quiz: ${currentData.topic}`;

    // Get User Progress
    const progress = getProgress();

    currentData.sets.forEach((set, index) => {
        const isUnlocked = index === 0 || progress.completedSets.includes(currentData.sets[index - 1].setId);
        const isCompleted = progress.completedSets.includes(set.setId);

        const card = document.createElement("div");
        card.className = `set-card ${isUnlocked ? '' : 'locked'} ${isCompleted ? 'completed' : ''}`;

        let statusIcon = isUnlocked ? "🔓" : "🔒";
        if (isCompleted) statusIcon = "✅";

        card.innerHTML = `
      <div class="set-info">
        <h3>${set.title}</h3>
        <p>${set.questions.length} Questions</p>
      </div>
      <div class="set-status">${statusIcon}</div>
    `;

        if (isUnlocked) {
            card.onclick = () => startSet(set);
        }

        container.appendChild(card);
    });
}

// --- QUIZ LOGIC ---
function startSet(set) {
    currentSetId = set.setId;
    currentQuestions = set.questions;
    currentQuestionIndex = 0;
    userAnswers = {};
    score = 0;

    showView("quiz");
    loadQuestion(0);
    startTimer();
}

function loadQuestion(index) {
    const q = currentQuestions[index];
    document.getElementById("q-number").innerText = `Question ${index + 1}/${currentQuestions.length}`;
    document.getElementById("q-text").innerText = q.text;

    const optionsDiv = document.getElementById("options-container");
    optionsDiv.innerHTML = "";

    q.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerText = opt;
        if (userAnswers[q.id] === i) btn.classList.add("selected");

        btn.onclick = () => selectOption(q.id, i);
        optionsDiv.appendChild(btn);
    });

    // Buttons
    document.getElementById("prev-btn").disabled = index === 0;
    const nextBtn = document.getElementById("next-btn");
    if (index === currentQuestions.length - 1) {
        nextBtn.innerText = "Finish";
        nextBtn.onclick = finishQuiz;
    } else {
        nextBtn.innerText = "Next";
        nextBtn.onclick = () => {
            currentQuestionIndex++;
            loadQuestion(currentQuestionIndex);
        };
    }
}

function selectOption(qId, optionIndex) {
    userAnswers[qId] = optionIndex;
    loadQuestion(currentQuestionIndex); // Re-render to show selection
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion(currentQuestionIndex);
    }
}

// --- TIMER ---
function startTimer() {
    let timeLeft = 600; // 10 mins per set
    const timerDisplay = document.getElementById("timer-display");
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timerDisplay.innerText = `${m}:${s < 10 ? '0' + s : s}`;

        if (timeLeft <= 0) finishQuiz();
    }, 1000);
}

// --- FINISH & SCORING ---
function finishQuiz() {
    clearInterval(timerInterval);

    let correctCount = 0;
    currentQuestions.forEach(q => {
        if (userAnswers[q.id] === q.correct) correctCount++;
    });

    const total = currentQuestions.length;
    const percentage = (correctCount / total) * 100;

    // Update Progress
    if (percentage >= 70) {
        const p = getProgress();
        if (!p.completedSets.includes(currentSetId)) {
            p.completedSets.push(currentSetId);
            p.totalPoints += (correctCount * 10); // 10 pts per question
            saveProgress(p);
        }
    }

    showResult(correctCount, total, percentage);
}

function showResult(correct, total, percentage) {
    showView("result");

    const passed = percentage >= 70;
    document.getElementById("result-title").innerText = passed ? "🎉 Set Completed!" : "try again";
    document.getElementById("result-score").innerText = `You scored ${correct} / ${total}`;
    document.getElementById("result-msg").innerText = passed
        ? "You have unlocked the next set!"
        : "You need 70% to unlock the next set.";

    document.getElementById("back-to-sets").onclick = () => {
        renderTopicList();
    };
}

// --- LOCAL STORAGE HELPERS ---
function getProgress() {
    const stored = localStorage.getItem("quiz_progress");
    if (stored) return JSON.parse(stored);
    return { totalPoints: 0, completedSets: [] };
}

function saveProgress(p) {
    localStorage.setItem("quiz_progress", JSON.stringify(p));
}
