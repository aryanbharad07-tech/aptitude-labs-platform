// ---------------------------------------------------------
// 1. FIREBASE CONFIGURATION & INIT
// ---------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBTbfSlz0xvfBzAWmJzXDGbIC6Up0-6eU4",
    authDomain: "aptitudelabs-in.firebaseapp.com",
    projectId: "aptitudelabs-in",
    storageBucket: "aptitudelabs-in.firebasestorage.app",
    messagingSenderId: "175469863880",
    appId: "1:175469863880:web:b7b25ed27120665af716fd"
};

// Initialize via Global Namespace (matches your HTML imports)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// ---------------------------------------------------------
// 2. STATE MANAGEMENT
// ---------------------------------------------------------
let currentQuestionIndex = 0;
let userAnswers = {}; // Stores { 0: { answer: "A", status: "answered" } }
let questions = []; 

// ---------------------------------------------------------
// 3. DUMMY DATA (Includes RC & Short Answer)
// ---------------------------------------------------------
const dummyQuestions = [
    {
        id: "q1",
        type: "MCQ",
        text: "What is the value of 15% of 200?",
        options: ["20", "30", "40", "25"],
        correct: "30",
        marks: 4,
        neg: -1
    },
    {
        id: "q2",
        type: "SA", // Short Answer (Input Box)
        text: "Find the missing number: 2, 4, 8, 16, _? (Type answer)",
        options: [], 
        correct: "32",
        marks: 4,
        neg: 0
    },
    {
        id: "q3",
        type: "RC", // Reading Comprehension (Split Screen)
        passage: `
            <h3>The Economic Problem</h3>
            <p>Economics is a social science concerned with the production, distribution, and consumption of goods and services. It studies how individuals, businesses, governments, and nations make choices on allocating resources to satisfy their wants and needs.</p>
            <p>Macroeconomics analyzes the economy as a system where production, consumption, saving, and investment interact.</p>
        `,
        text: "According to the passage, what does Macroeconomics analyze?",
        options: ["Individual choices", "The economy as a whole system", "Only currency inflation", "Production of goods only"],
        correct: "The economy as a whole system",
        marks: 5,
        neg: -1
    },
    {
        id: "q4",
        type: "RC",
        passage: `
            <h3>The Economic Problem</h3>
            <p>Economics is a social science concerned with the production, distribution, and consumption of goods and services. It studies how individuals, businesses, governments, and nations make choices on allocating resources to satisfy their wants and needs.</p>
            <p>Macroeconomics analyzes the economy as a system where production, consumption, saving, and investment interact.</p>
        `,
        text: "Economics is primarily concerned with:",
        options: ["Warfare", "Allocating resources", "Painting", "Rocket Science"],
        correct: "Allocating resources",
        marks: 5,
        neg: -1
    },
    {
        id: "q5",
        type: "MCQ",
        text: "Which IIM conducts IPMAT Indore?",
        options: ["IIM Rohtak", "IIM Indore", "IIM Ranchi", "IIM Jammu"],
        correct: "IIM Indore",
        marks: 4,
        neg: -1
    }
];

// ---------------------------------------------------------
// 4. CORE ENGINE INITIALIZATION
// ---------------------------------------------------------
window.onload = function() {
    questions = dummyQuestions; // Later we will fetch this from Firestore

    // Auth Listener
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Logged in:", user.email);
            document.getElementById('student-name').innerText = user.email;
        } else {
            // For now, allow guest access or redirect
            // window.location.href = "login.html"; 
            document.getElementById('student-name').innerText = "Guest Candidate";
        }
        initExam();
    });
};

function initExam() {
    renderPalette();
    loadQuestion(0);
    startTimer(40 * 60); // 40 minutes in seconds
}

// ---------------------------------------------------------
// 5. RENDER LOGIC (Split Screen & Types)
// ---------------------------------------------------------
function loadQuestion(index) {
    currentQuestionIndex = index;
    const q = questions[index];
    const savedData = userAnswers[index] || {};

    // A. Update Top Bar Info
    document.getElementById('q-number-display').innerText = index + 1;
    document.getElementById('q-type-label').innerText = q.type;
    document.getElementById('marks-badge').innerText = `+${q.marks} / ${q.neg}`;

    // B. Handle Split Screen (RC/DI)
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    const passageContainer = document.getElementById('passage-container');

    if (q.passage) {
        // Activate Split Screen
        leftPane.classList.remove('hidden');
        rightPane.classList.remove('full-width');
        passageContainer.innerHTML = q.passage;
    } else {
        // Full Width Mode
        leftPane.classList.add('hidden');
        rightPane.classList.add('full-width');
    }

    // C. Render Question Text
    document.getElementById('question-text').innerText = q.text;

    // D. Render Options (MCQ) or Input (SA)
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // Clear previous

    if (q.type === 'SA') {
        // Short Answer Input
        const input = document.createElement('input');
        input.type = "text";
        input.className = "sa-input";
        input.placeholder = "Type numerical answer...";
        
        if (savedData.answer) input.value = savedData.answer;

        // Auto-save on typing
        input.addEventListener('input', (e) => {
            tempSaveAnswer(index, e.target.value);
        });

        optionsContainer.appendChild(input);

    } else {
        // MCQ Radio Buttons
        q.options.forEach((opt, i) => {
            const row = document.createElement('div');
            row.className = "option-row";
            
            const radio = document.createElement('input');
            radio.type = "radio";
            radio.name = "option";
            radio.value = opt;
            radio.id = `opt_${i}`;
            
            if (savedData.answer === opt) radio.checked = true;

            const label = document.createElement('label');
            label.htmlFor = `opt_${i}`;
            label.innerText = opt;

            // Click entire row to select
            row.onclick = () => {
                radio.checked = true;
                tempSaveAnswer(index, opt);
            };

            row.appendChild(radio);
            row.appendChild(label);
            optionsContainer.appendChild(row);
        });
    }

    // E. Update Palette Status (Visually highlight current)
    updatePaletteVisuals();
    
    // Mark as visited if not already
    if (!userAnswers[index]) {
        userAnswers[index] = { status: 'not-answered' };
    }
}

// Helper to store answer in memory before clicking "Save & Next"
function tempSaveAnswer(index, value) {
    if (!userAnswers[index]) userAnswers[index] = {};
    userAnswers[index].tempAnswer = value;
}

// ---------------------------------------------------------
// 6. NAVIGATION & SAVING
// ---------------------------------------------------------

// GREEN BUTTON
function saveAndNext() {
    const qIdx = currentQuestionIndex;
    const entry = userAnswers[qIdx];

    // If there is a tempAnswer (selected option or typed text)
    if (entry && entry.tempAnswer) {
        entry.answer = entry.tempAnswer;
        entry.status = 'answered';
    } else if (entry && entry.answer) {
        // Already answered previously, keep it
        entry.status = 'answered';
    } else {
        // Clicked save without answering
        userAnswers[qIdx] = { status: 'not-answered' };
    }

    moveToNext();
}

// PURPLE BUTTON
function markForReview() {
    const qIdx = currentQuestionIndex;
    const entry = userAnswers[qIdx];

    if (entry && (entry.tempAnswer || entry.answer)) {
        // Answered AND Marked (Purple with Green tick)
        if(entry.tempAnswer) entry.answer = entry.tempAnswer;
        entry.status = 'ans-marked';
    } else {
        // Just Marked (Purple)
        userAnswers[qIdx] = { status: 'marked' };
    }

    moveToNext();
}

// CLEAR BUTTON
function clearResponse() {
    const qIdx = currentQuestionIndex;
    // Wipe data
    userAnswers[qIdx] = { status: 'not-answered' };
    // Re-render to remove selection
    loadQuestion(qIdx);
}

function moveToNext() {
    updatePaletteVisuals(); // Update colors based on new status
    if (currentQuestionIndex < questions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        alert("You have reached the last question.");
    }
}

// ---------------------------------------------------------
// 7. PALETTE LOGIC (The TCS Grid)
// ---------------------------------------------------------
function renderPalette() {
    const container = document.getElementById('question-palette');
    container.innerHTML = '';
    
    questions.forEach((q, index) => {
        const btn = document.createElement('button');
        btn.className = 'p-btn not-visited'; // Default start
        btn.innerText = index + 1;
        btn.onclick = () => loadQuestion(index);
        btn.id = `p-btn-${index}`;
        container.appendChild(btn);
    });
}

function updatePaletteVisuals() {
    questions.forEach((q, index) => {
        const btn = document.getElementById(`p-btn-${index}`);
        const data = userAnswers[index];

        // 1. Reset Classes
        btn.className = 'p-btn';

        // 2. Apply Status Class
        if (!data) {
            btn.classList.add('not-visited');
        } else {
            // "status" matches the CSS classes: answered, not-answered, marked, ans-marked
            btn.classList.add(data.status); 
        }

        // 3. Highlight Current Question Border
        if (index === currentQuestionIndex) {
            btn.style.border = "2px solid black";
        }
    });

    updateCounts();
}

function updateCounts() {
    const counts = { answered: 0, notAnswered: 0, marked: 0, ansMarked: 0, notVisited: 0 };

    questions.forEach((q, i) => {
        const status = userAnswers[i]?.status;
        if (!status) counts.notVisited++;
        else if (status === 'answered') counts.answered++;
        else if (status === 'marked') counts.marked++;
        else if (status === 'ans-marked') counts.ansMarked++;
        else counts.notAnswered++;
    });

    // Update the legend numbers
    document.querySelector('.circle.answered').innerText = counts.answered;
    document.querySelector('.circle.not-answered').innerText = counts.notAnswered;
    document.querySelector('.circle.not-visited').innerText = counts.notVisited;
    document.querySelector('.circle.marked').innerText = counts.marked;
    document.querySelector('.circle.ans-marked').innerText = counts.ansMarked;
}

// ---------------------------------------------------------
// 8. TIMER & SUBMISSION
// ---------------------------------------------------------
function startTimer(duration) {
    let timer = duration;
    const display = document.getElementById('timer');
    
    const interval = setInterval(function () {
        const hours = Math.floor(timer / 3600);
        const minutes = Math.floor((timer % 3600) / 60);
        const seconds = timer % 60;

        display.textContent = 
            (hours < 10 ? "0" + hours : hours) + ":" +
            (minutes < 10 ? "0" + minutes : minutes) + ":" +
            (seconds < 10 ? "0" + seconds : seconds);

        if (--timer < 0) {
            clearInterval(interval);
            submitExam(true); // Auto submit
        }
    }, 1000);
}

function submitExam(auto = false) {
    if (!auto && !confirm("Are you sure you want to Submit the Test?")) return;

    // Calculate Score (Simple Client Side)
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    questions.forEach((q, i) => {
        const entry = userAnswers[i];
        if (entry && (entry.status === 'answered' || entry.status === 'ans-marked')) {
            if (entry.answer === q.correct) {
                score += q.marks;
                correctCount++;
            } else {
                score += q.neg; // e.g. -1
                wrongCount++;
            }
        }
    });

    // Save to Firestore
    const resultData = {
        studentName: auth.currentUser ? auth.currentUser.email : "Guest",
        score: score,
        totalMarks: questions.length * 4,
        correct: correctCount,
        wrong: wrongCount,
        timestamp: new Date(),
        answers: userAnswers // detailed breakdown
    };

    db.collection("testResults").add(resultData)
    .then((docRef) => {
        localStorage.setItem("lastExamId", docRef.id);
        alert(`Test Submitted! Your Score: ${score}`);
        window.location.href = "solutions.html";
    })
    .catch((error) => {
        console.error("Error writing document: ", error);
        alert("Error submitting. Check console.");
    });
}