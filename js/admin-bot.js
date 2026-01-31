/**
 * iX Admin Bot Logic
 * Handles automated responses for the "iX Owner" admin account.
 */

const AdminBot = {
    ID: 'IX-ADMIN',
    Name: 'iX Owner',
    Avatar: '👑', // Default placeholder

    // Response Database
    responses: {
        greetings: [
            "Hello! Welcome to iX Platform.",
            "Hi there! How can I help you today?",
            "Greetings, developer! Ready to code?",
            "Hey! Good to see you here.",
            "Welcome! I'm the admin of this platform."
        ],
        help: [
            "For password resets, please check your email settings.",
            "If you found a bug, you can report it in the 'Debug' section.",
            "Need help with a problem? Try checking the 'Community' tab.",
            "I'm here to assist! What do you need help with?",
            "Technical support is available 24/7 (well, via me!)."
        ],
        code: [
            "Javascript is the language of the web!",
            "Have you tried using 'console.log' to debug?",
            "Python is great for data science and backend.",
            "Remember to always close your tags in HTML.",
            "CSS Grid is a powerful layout system."
        ],
        compliments: [
            "You're doing great! Keep up the good work.",
            "I see you're leveling up fast!",
            "That's the spirit of a true coder.",
            "Impressive progress so far.",
            "You are a valuable member of iX."
        ],
        fallback: [
            "That's interesting! Tell me more.",
            "I see.",
            "Could you elaborate on that?",
            "I'm constantly learning new things.",
            "Can you explain that in code terms?"
        ]
    },

    // 100+ specific keyword triggers (simulated large DB)
    triggers: {
        'hi': 'greetings', 'hello': 'greetings', 'hey': 'greetings', 'yo': 'greetings',
        'help': 'help', 'support': 'help', 'stuck': 'help', 'bug': 'help',
        'js': 'code', 'javascript': 'code', 'python': 'code', 'css': 'code', 'html': 'code',
        'good': 'compliments', 'great': 'compliments', 'thanks': 'compliments', 'cool': 'compliments',
        'who are you': "I am the iX Owner and Admin Bot.",
        'what is ix': "iX is the ultimate ecosystem for developers to learn and practice.",
        'points': "You earn points by solving problems and quizzes.",
        'rank': "Your rank upgrades as you solve more problems. Aim for Diamond!",
        'password': "We don't store plain text passwords. Safety first!",
        'admin': "Yes, I am the admin.",
        'owner': "I built this platform for developers like you.",
        'bye': "Goodbye! Happy coding!",
        'joke': "Why do programmers prefer dark mode? Because light attracts bugs!",
        'love': "I love code!",
        'hate': "Hate is a strong word. Try 'debugging' instead.",
        'time': "It's always time to code.",
        'date': "Today is a good day to deploy.",
        'weather': "The cloud forecast looks good.",
        'music': "I prefer Lo-Fi beats for coding.",
        'coffee': "Java is my favorite drink.",
        'react': "React is a popular library for building UIs.",
        'vue': "Vue.js is known for its simplicity.",
        'angular': "Angular is a robust framework.",
        'node': "Node.js lets you run JS on the server.",
        'database': "SQL or NoSQL? That is the question.",
        'api': "APIs connect the world.",
        'rest': "RESTful services are standard.",
        'graphql': "GraphQL gives you exactly what you ask for.",
        'git': "Git is essential for version control.",
        'github': "GitHub is where code lives.",
        'vscode': "VS Code is the best editor.",
        'sublime': "Sublime Text is fast.",
        'atom': "Atom had a good run.",
        'vim': "Can you exit Vim though?",
        'emacs': "Emacs is an operating system.",
        'linux': "I run on Linux.",
        'windows': "Windows has WSL now.",
        'mac': "Macs are popular among devs.",
        'iphone': "iOS development uses Swift.",
        'android': "Android uses Kotlin or Java.",
        'cloud': " The cloud is just someone else's computer.",
        'aws': "AWS is huge.",
        'azure': "Microsoft Azure is a strong competitor.",
        'google': "Google Cloud Platform is powerful.",
        'docker': "Containers make deployment easy.",
        'kubernetes': "K8s orchestrates containers.",
        'serverless': "Serverless means less ops.",
        'frontend': "Frontend is what you see.",
        'backend': "Backend is how it works.",
        'fullstack': "Fullstack means you do it all.",
        'salary': "Developers are in high demand.",
        'job': "Keep practicing to land your dream job.",
        'interview': "We have an interview prep section coming soon.",
        'resume': "Make your GitHub your resume.",
        'portfolio': "Build projects for your portfolio.",
        'networking': "Networking is key.",
        'linkedin': "Update your LinkedIn.",
        'twitter': "Tech Twitter is active.",
        'stack overflow': "Copy paste is an art.",
        'chatgpt': "AI is changing the game.",
        'ai': "Artificial Intelligence is the future.",
        'ml': "Machine Learning requires math.",
        'data': "Data is the new oil.",
        'security': "Always sanitize your inputs.",
        'hack': "White hat hacking is legal.",
        'crypto': "Blockchain is decentralized.",
        'nft': "NFTs are unique tokens.",
        'web3': "Web3 is the decentralized web.",
        'metaverse': "The Metaverse is virtual reality.",
        'vr': "Virtual Reality is immersive.",
        'ar': "Augmented Reality overlays info.",
        'game': "Game dev is hard.",
        'unity': "Unity is great for games.",
        'unreal': "Unreal Engine looks realistic.",
        'c++': "C++ is fast.",
        'c#': "C# is used in Unity.",
        'java': "Java runs everywhere.",
        'php': "PHP powers the web.",
        'ruby': "Ruby on Rails is elegant.",
        'go': "Go is built by Google.",
        'rust': "Rust is memory safe.",
        'swift': "Swift is for Apple devices.",
        'kotlin': "Kotlin is preferred for Android.",
        'scala': "Scala is functional.",
        'perl': "Perl is old school.",
        'bash': "Bash scripts automate tasks.",
        'powershell': "PowerShell is for Windows.",
        'terminal': "The CLI is powerful.",
        'gui': "GUIs are user friendly.",
        'ux': "User Experience matters.",
        'ui': "User Interface design is art.",
        'design': "Good design solves problems.",
        'figma': "Figma is the industry standard."
    },

    getReply: (msg) => {
        const lower = msg.toLowerCase().trim();

        // Check exact/keyword triggers
        for (const [key, value] of Object.entries(AdminBot.triggers)) {
            if (lower.includes(key)) {
                // If value is a category, pick random from it
                if (AdminBot.responses[value]) {
                    const arr = AdminBot.responses[value];
                    return arr[Math.floor(Math.random() * arr.length)];
                }
                // Else return direct string
                return value;
            }
        }

        // Default Fallback
        const fallback = AdminBot.responses.fallback;
        return fallback[Math.floor(Math.random() * fallback.length)];
    }
};
