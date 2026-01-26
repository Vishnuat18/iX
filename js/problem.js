const PROBLEM_CONFIG = {
  "Basics": {
    title: "Basic Programming Problems",
    problems: [
      {
        title: "Reverse a Number",
        description: "Reverse the digits of a given number.",
        example: "Input: 123 → Output: 321"
      },
      {
        title: "Check Prime",
        description: "Check whether a number is prime.",
        example: "Input: 7 → Output: Prime"
      }
    ]
  }
};

const course = getQueryParam("course");
const data = PROBLEM_CONFIG[course];

if (!data) {
  alert("Problems not available");
}

setPageTitle(data.title);

const list = document.getElementById("problemList");
const title = document.getElementById("problemTitle");
const desc = document.getElementById("problemDescription");
const example = document.getElementById("problemExample");

data.problems.forEach((p, i) => {
  const li = document.createElement("li");
  li.innerText = p.title;
  li.onclick = () => {
    title.innerText = p.title;
    desc.innerText = p.description;
    example.innerText = p.example;
  };
  list.appendChild(li);
});

list.children[0].click();
