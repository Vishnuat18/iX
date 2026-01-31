/*************************
 * GLOBAL NAVIGATION
 *************************/
function goBack() {
  window.history.back();
}

function goHome() {
  window.location.href = "index.html";
}

function logout() {
  alert("Logged out successfully");
  goHome();
}

/*************************
 * DRAWER (LEFT MENU)
 *************************/
function openDrawer() {
  document.getElementById("drawer")?.classList.add("open");
  document.getElementById("overlay")?.classList.add("show");
}

function closeDrawer() {
  document.getElementById("drawer")?.classList.remove("open");
  document.getElementById("overlay")?.classList.remove("show");
}

/*************************
 * DOMAIN → LANGUAGE FLOW
 *************************/
function openDomain(domainKey) {
  localStorage.setItem("domain", domainKey);
  localStorage.removeItem("lang");
  window.location.href = "domain.html";
}

function openSubdomain(languageName) {
  // languageName = Java / Python / C
  localStorage.setItem("lang", languageName.toLowerCase());
  window.location.href = "section.html";
}

function switchSubdomain(languageName) {
  localStorage.setItem("lang", languageName.toLowerCase());
  location.reload();
}

/*************************
 * ACTION ROUTING (LANGUAGE AWARE)
 *************************/
function openAction(actionType) {
  const lang = localStorage.getItem("lang");

  if (!lang) {
    alert("Please select a programming language first");
    return;
  }

  switch (actionType) {
    case "learn":
      window.location.href = `learn/?lang=${lang}`;
      break;

    case "quiz":
      window.location.href = `quiz/?lang=${lang}`;
      break;

    case "practice":
      window.location.href = `problems/?lang=${lang}`;
      break;

    case "interview":
      window.location.href = `interview/?lang=${lang}`;
      break;

    case "mock":
      window.location.href = "ai-interview.html";
      break;

    default:
      alert("Invalid action");
  }
}

/*************************
 * DOMAIN + LANGUAGE DATA
 *************************/
const domainTitles = {
  cs: "Computer Science Fundamentals",
  languages: "Programming Languages",
  dsa: "Data Structures & Algorithms",
  web: "Web Development",
  fullstack: "Full Stack Development"
};

const domainSubdomains = {
  cs: [
    "Fundamentals of Computer",
    "Operating Systems",
    "DBMS",
    "Computer Networks"
  ],

  // 🔑 PROGRAMMING LANGUAGES
  languages: ["Java", "Python", "C"],

  dsa: ["Basics", "Intermediate", "Advanced"],

  web: [
    "HTML",
    "CSS",
    "JavaScript (Basics)",
    "JavaScript (Advanced)"
  ],

  fullstack: [
    "Full Stack Java",
    "Full Stack Python",
    "MERN Stack"
  ]
};

/*************************
 * PAGE INITIALIZATION
 *************************/
document.addEventListener("DOMContentLoaded", () => {
  const domainKey = localStorage.getItem("domain");
  const lang = localStorage.getItem("lang");

  /******** DOMAIN PAGE ********/
  if (document.getElementById("subdomains") && domainKey) {
    document.getElementById("domainTitle").innerText =
      domainTitles[domainKey];

    document.getElementById("breadcrumbs").innerHTML = `
      <span>Home</span>
      <span>${domainTitles[domainKey]}</span>
    `;

    const container = document.getElementById("subdomains");
    container.innerHTML = "";

    domainSubdomains[domainKey].forEach(item => {
      const card = document.createElement("div");
      card.className = "domain-card";
      card.innerHTML = `<h3>${item}</h3>`;
      card.onclick = () => openSubdomain(item);
      container.appendChild(card);
    });
  }

  /******** SECTION PAGE ********/
  if (document.getElementById("currentSubdomain") && domainKey && lang) {
    document.getElementById("currentSubdomain").innerText =
      lang.toUpperCase();

    document.getElementById("breadcrumbs").innerHTML = `
      <span>Home</span>
      <span>${domainTitles[domainKey]}</span>
      <span>${lang.toUpperCase()}</span>
    `;
  }
});

/*************************
 * QUERY PARAM HELPERS
 *************************/
function getQueryParam(key, fallback = null) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || fallback;
}

/*************************
 * COMMON MODULE LOADER
 *************************/
function loadModule(CONFIG, paramKey) {
  const key = getQueryParam(paramKey);

  if (!CONFIG[key]) {
    alert("Invalid configuration");
    return;
  }

  document.getElementById("pageTitle").innerText =
    CONFIG[key].title;

  window.moduleData = CONFIG[key];
}

/*********************************
 * SECTION PAGE – INTERVIEW LEVEL UI
 *********************************/
function openInterviewLevels() {
  const lang = localStorage.getItem("lang");

  if (!lang) {
    alert("Language not selected");
    return;
  }

  // Toggle sections
  document.getElementById("actionButtons").style.display = "none";
  document.getElementById("interviewLevels").style.display = "grid";
  document.getElementById("sectionBackBtn").style.display = "inline-block";

  // Update breadcrumbs
  document.getElementById("breadcrumbs").innerHTML = `
    <span>Home</span>
    <span>${lang.toUpperCase()}</span>
    <span>Interview</span>
  `;
}

function backToActions() {
  const lang = localStorage.getItem("lang");

  // Toggle sections back
  document.getElementById("interviewLevels").style.display = "none";
  document.getElementById("actionButtons").style.display = "grid";
  document.getElementById("sectionBackBtn").style.display = "none";

  // Restore breadcrumbs
  document.getElementById("breadcrumbs").innerHTML = `
    <span>Home</span>
    <span>${lang.toUpperCase()}</span>
  `;
}

function openInterview(level) {
  const lang = localStorage.getItem("lang");

  if (!lang) {
    alert("Language not selected");
    return;
  }

  window.location.href =
    `interview/?lang=${lang}&level=${level}`;
}
