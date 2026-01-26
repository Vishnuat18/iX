const QUIZ_CONFIG = {
    "Fundamentals of Computer": {
        title: "Computer Fundamentals Quiz",
        time: 300,
        questions: [
            {
                q: "What is a computer?",
                options: ["Mechanical device", "Electronic device", "Living thing"],
                answer: 1
            },
            {
                q: "Which is not a component?",
                options: ["CPU", "RAM", "Keyboard Driver"],
                answer: 2
            }
        ]
    }
};

const course = getQueryParam("course");
const quiz = QUIZ_CONFIG[course];

if (!quiz) {
    alert("Quiz not available");
}

setPageTitle(quiz.title);

let index = 0;
let answers = [];
let timeLeft = quiz.time;

const qText = document.getElementById("questionText");
const optionsBox = document.getElementById("options");

function loadQuestion() {
    const q = quiz.questions[index];
    qText.innerText = q.q;
    optionsBox.innerHTML = "";

    q.options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.onclick = () => answers[index] = i;
        optionsBox.appendChild(btn);
    });
}

function nextQuestion() {
    if (index < quiz.questions.length - 1) {
        index++;
        loadQuestion();
    }
}

function prevQuestion() {
    if (index > 0) {
        index--;
        loadQuestion();
    }
}

function submitQuiz() {
    let score = 0;
    quiz.questions.forEach((q, i) => {
        if (answers[i] === q.answer) score++;
    });
    alert(`Score: ${score}/${quiz.questions.length}`);
}

setInterval(() => {
    if (--timeLeft <= 0) submitQuiz();
    document.getElementById("timer").innerText =
        `Time Left: ${timeLeft}s`;
}, 1000);

loadQuestion();
