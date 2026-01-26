const MOCK_CONFIG = {
  "Fundamentals of Computer": {
    title: "Mock Interview – Computer Fundamentals",
    duration: 600,
    rounds: [
      {
        title: "MCQ Round",
        description: "10 MCQs in 10 minutes"
      },
      {
        title: "Theory Round",
        description: "Explain core concepts verbally"
      },
      {
        title: "HR Round",
        description: "Basic HR questions"
      }
    ]
  }
};

const role = getQueryParam("role");
const data = MOCK_CONFIG[role];

if (!data) {
  alert("Mock interview not available");
}

setPageTitle(data.title);

let timeLeft = data.duration;

setInterval(() => {
  if (--timeLeft <= 0) {
    alert("Mock Interview Time Over");
  }
}, 1000);

const list = document.getElementById("roundList");
const rTitle = document.getElementById("roundTitle");
const rDesc = document.getElementById("roundDescription");

data.rounds.forEach((r, i) => {
  const li = document.createElement("li");
  li.innerText = r.title;
  li.onclick = () => {
    rTitle.innerText = r.title;
    rDesc.innerText = r.description;
  };
  list.appendChild(li);
});

list.children[0].click();
