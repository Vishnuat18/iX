document.addEventListener("DOMContentLoaded", () => {

  /*********************************
   * READ CONTEXT (SINGLE SOURCE)
   *********************************/
  const lang =
    getQueryParam("lang") ||
    localStorage.getItem("lang") ||
    "java";

  const level =
    getQueryParam("level") ||
    "beginner";

  const normalizedLang = lang.toLowerCase();
  const normalizedLevel = level.toLowerCase();

  /*********************************
   * PAGE TITLE
   *********************************/
  document.getElementById("pageTitle").innerText =
    `${normalizedLang.toUpperCase()} Interview – ${normalizedLevel.toUpperCase()}`;

  /*********************************
   * BREADCRUMBS (FINAL STATE)
   *********************************/
  const breadcrumbs = document.getElementById("breadcrumbs");
  if (breadcrumbs) {
    breadcrumbs.innerHTML = `
      <span>Home</span>
      <span>${normalizedLang.toUpperCase()}</span>
      <span>Interview</span>
      <span>${normalizedLevel}</span>
    `;
  }

  /*********************************
   * DOM REFERENCES
   *********************************/
  const qEl = document.getElementById("question");
  const aEl = document.getElementById("answer");
  const levelEl = document.getElementById("level");
  const counterEl = document.getElementById("counter");
  const tryBtn = document.getElementById("tryBtn");

  let questions = [];
  let index = 0;

  /*********************************
   * LOAD QUESTIONS (LANG + LEVEL)
   *********************************/
  fetch(`../data/interview/${normalizedLang}/${normalizedLevel}.json`)
    .then(res => {
      if (!res.ok) {
        throw new Error(
          `Interview data not found for ${normalizedLang}/${normalizedLevel}`
        );
      }
      return res.json();
    })
    .then(data => {
      console.log(
        `Loaded ${data.length} ${normalizedLang} interview questions (${normalizedLevel})`
      );
      questions = data;
      render();
    })
    .catch(err => {
      console.error(err);
      qEl.innerText = "Interview questions not available.";
      aEl.innerHTML = "";
      counterEl.innerText = "";
      tryBtn.style.display = "none";
    });

  /*********************************
   * RENDER CURRENT QUESTION
   *********************************/
  function render() {
    if (!questions.length) return;

    const q = questions[index];

    qEl.innerText = q.question || "Question not available";
    levelEl.innerText = normalizedLevel.toUpperCase();
    counterEl.innerText = `${index + 1} / ${questions.length}`;

    let html = `<p>${q.answer || ""}</p>`;

    if (q.hasCode && q.codeSample) {
      html += `
        <pre><code>${escapeHtml(q.codeSample)}</code></pre>
      `;
    }

    aEl.innerHTML = html;
    tryBtn.style.display = q.hasCode ? "block" : "none";
  }

  /*********************************
   * NAVIGATION (BOUND TO BUTTONS)
   *********************************/
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

  /*********************************
   * TRY IT OUT (EDITOR HOOK)
   *********************************/
  window.openEditor = function () {
    alert(
      `Opening ${normalizedLang.toUpperCase()} editor (${normalizedLevel})`
    );
  };

  /*********************************
   * SAFE HTML ESCAPE FOR CODE
   *********************************/
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

});
