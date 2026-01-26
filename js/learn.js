const LEARN_CONFIG = {
  "Fundamentals of Computer": {
    title: "Fundamentals of Computer",
    topics: [
      {
        title: "What is a Computer?",
        content: `
          <p>A computer is an electronic device that accepts input,
          processes data, and produces output.</p>
          <ul>
            <li>Input</li>
            <li>Processing</li>
            <li>Output</li>
            <li>Storage</li>
          </ul>
        `
      },
      {
        title: "Components of a Computer",
        content: `
          <ul>
            <li>CPU</li>
            <li>Memory</li>
            <li>Input Devices</li>
            <li>Output Devices</li>
          </ul>
        `
      }
    ]
  }
};

const course = getQueryParam("course");
const data = LEARN_CONFIG[course];

if (!data) {
  alert("Learn content not found");
}

setPageTitle(data.title);

const list = document.getElementById("topicList");
const content = document.getElementById("topicContent");

data.topics.forEach((t, i) => {
  const div = document.createElement("div");
  div.innerText = t.title;

  if (i === 0) {
    div.classList.add("active");
    content.innerHTML = `<h2>${t.title}</h2>${t.content}`;
  }

  div.onclick = () => {
    document.querySelectorAll("#topicList div")
      .forEach(d => d.classList.remove("active"));
    div.classList.add("active");
    content.innerHTML = `<h2>${t.title}</h2>${t.content}`;
  };

  list.appendChild(div);
});
