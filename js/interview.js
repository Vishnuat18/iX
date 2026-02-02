/*********************************
 * HELPERS
 *********************************/
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

document.addEventListener("DOMContentLoaded", () => {
  const lang = getQueryParam("lang");
  const level = getQueryParam("level") || "beginner";

  if (lang) {
    startPrep(lang, level);
  }
});

/*********************************
 * CORE LOGIC
 *********************************/
let questions = [];
let index = 0;
let normalizedLang = "";
let normalizedLevel = "";

window.startPrep = function (lang, level = "beginner") {
  normalizedLang = lang.toLowerCase();
  normalizedLevel = level.toLowerCase();

  // 1. Update UI Visibility
  document.getElementById("prepSelection").style.display = "none";
  document.getElementById("prepContent").style.display = "block";
  document.getElementById("prepNav").style.display = "flex";

  // 2. Update Page Titles & Breadcrumbs
  const title = document.getElementById("pageTitle");
  if (title) title.innerText = `${normalizedLang.toUpperCase()} Interview – ${normalizedLevel.toUpperCase()}`;

  const breadcrumbs = document.getElementById("breadcrumbs");
  if (breadcrumbs) {
    breadcrumbs.innerHTML = `
        <span>Home</span>
        <span>Career</span>
        <span class="separator">/</span>
        <span class="current">${normalizedLang.toUpperCase()}</span>
      `;
  }

  // 3. Load Questions
  const qEl = document.getElementById("question");
  const aEl = document.getElementById("answer");
  const counterEl = document.getElementById("counter");
  const tryBtn = document.getElementById("tryBtn");

  fetch(`../data/interview/${normalizedLang}/${normalizedLevel}.json`)
    .then(res => {
      if (!res.ok) throw new Error("Questions not found");
      return res.json();
    })
    .then(data => {
      questions = data;
      index = 0;
      render();
    })
    .catch(err => {
      console.error(err);
      qEl.innerText = "Questions currently unavailable for this domain.";
      aEl.innerHTML = "";
      counterEl.innerText = "";
      tryBtn.style.display = "none";
    });
}

function render() {
  if (!questions.length) return;

  const qEl = document.getElementById("question");
  const aEl = document.getElementById("answer");
  const levelEl = document.getElementById("level");
  const counterEl = document.getElementById("counter");
  const tryBtn = document.getElementById("tryBtn");

  const q = questions[index];

  if (qEl) qEl.innerText = q.question || "Question not available";
  if (levelEl) levelEl.innerText = normalizedLevel.toUpperCase();
  if (counterEl) counterEl.innerText = `${index + 1} / ${questions.length}`;

  let html = `<p>${q.answer || ""}</p>`;

  if (q.hasCode && q.codeSample) {
    html += `<pre><code>${escapeHtml(q.codeSample)}</code></pre>`;
  }

  if (aEl) aEl.innerHTML = html;
  if (tryBtn) tryBtn.style.display = q.hasCode ? "block" : "none";
}

window.next = function () {
  if (index < questions.length - 1) {
    index++;
    render();
  }
};

window.prev = function () {
  if (index > 0) {
    index--;
    render();
  }
};

window.openEditor = function () {
  // Integration point for coding editor
  Swal.fire({
    title: 'Developer Editor',
    text: `Opening ${normalizedLang.toUpperCase()} playground for this challenge.`,
    icon: 'info',
    background: '#1e1e1e',
    color: '#fff',
    confirmButtonColor: '#3b82f6'
  });
};

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
