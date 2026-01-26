import pdfplumber
import json
import re

PDF_PATH = "../assets/Advanced-java.pdf"
OUTPUT_JSON = "../data/Advanced_java_questions.json"

questions = []
current = None
qid = 1

# --------------------
# HELPERS
# --------------------

QUESTION_REGEX = re.compile(r"^(Q?\d+[\.\)]\s+)(.+)")
CODE_REGEX = re.compile(
    r"\b(public|private|protected|class|static|void|int|String|System\.out)\b"
)

NOISE_PATTERNS = [
    r"java interview questions",
    r"page \d+",
    r"copyright",
]

def is_noise(line):
    return any(re.search(pat, line.lower()) for pat in NOISE_PATTERNS)

def is_code(line):
    return bool(CODE_REGEX.search(line))

# --------------------
# EXTRACTION
# --------------------

with pdfplumber.open(PDF_PATH) as pdf:
    for page in pdf.pages:
        raw = page.extract_text()
        if not raw:
            continue

        lines = [l.strip() for l in raw.split("\n") if l.strip()]

        for line in lines:

            # Skip headings / noise
            if is_noise(line):
                continue

            # Detect question start
            q_match = QUESTION_REGEX.match(line)
            if q_match:
                # Save previous
                if current:
                    current["answer"] = current["answer"].strip()
                    current["codeSample"] = current["codeSample"].strip()
                    questions.append(current)

                current = {
                    "id": qid,
                    "level": "Basic",  # update later
                    "question": q_match.group(2).strip(),
                    "answer": "",
                    "hasCode": False,
                    "codeSample": ""
                }
                qid += 1
                continue

            # If inside question
            if current:
                if is_code(line):
                    current["hasCode"] = True
                    current["codeSample"] += line + "\n"
                else:
                    current["answer"] += line + " "

# Append last
if current:
    current["answer"] = current["answer"].strip()
    current["codeSample"] = current["codeSample"].strip()
    questions.append(current)

# --------------------
# OUTPUT
# --------------------

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"Extracted {len(questions)} questions")
