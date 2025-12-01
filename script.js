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

// Initialize via Global Namespace 
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// ---------------------------------------------------------
// 2. STATE MANAGEMENT & SECURITY CHECK (CRUCIAL)
// ---------------------------------------------------------
let currentQuestionIndex = 0;
let userAnswers = {}; 
let questions = []; 

// --- DUMMY DATA (Includes RC & Short Answer) ---
// Note: This needs to match the structure in solutions.html for marks to align
const dummyQuestions = [
    { id: "q1", type: "MCQ", text: "What is the value of 15% of 200?", options: ["20", "30", "40", "25"], correct: "30", marks: 4, neg: -1 },
    { id: "q2", type: "SA", text: "Find the missing number: 2, 4, 8, 16, _? (Type answer)", options: [], correct: "32", marks: 4, neg: 0 },
    { id: "q3", type: "MCQ", passage: `<h3>The Economic Problem</h3><p>Economics is a social science concerned with the production, distribution, and consumption of goods and services. It studies how individuals, businesses, governments, and nations make choices on allocating resources to satisfy their wants and needs.</p><p>Macroeconomics analyzes the economy as a system where production, consumption, saving, and investment interact.</p>`, text: "According to the passage, what does Macroeconomics analyze?", options: ["Individual choices", "The economy as a whole system", "Only currency inflation", "Production of goods only"], correct: "The economy as a whole system", marks: 4, neg: -1 },
    { id: "q4", type: "MCQ", passage: `<h3>The Economic Problem</h3><p>Economics is a social science concerned with the production, distribution, and consumption of goods and services. It studies how individuals, businesses, governments, and nations make choices on allocating resources to satisfy their wants and needs.</p><p>Macroeconomics analyzes the economy as a system where production, consumption, saving, and investment interact.</p>`, text: "Economics is primarily concerned with:", options: ["Warfare", "Allocating resources", "Painting", "Rocket Science"], correct: "Allocating resources", marks: 4, neg: -1 },
    { id: "q5", type: "MCQ", text: "Which IIM conducts IPMAT Indore?", options: ["IIM Rohtak", "IIM Indore", "IIM Ranchi", "IIM Jammu"], correct: "IIM Indore", marks: 4, neg: -1 }
];


// ---------------------------------------------------------
// 3. CORE ENGINE INITIALIZATION & SECURITY GATE
// ---------------------------------------------------------
window.onload = function() {
    questions = dummyQuestions; // In future, fetch from Firestore here

    // Auth Listener
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is logged in, allow access
            document.getElementById('student-name').innerText = user.email.split('@')[0];
            initExam();
        } else {
            // CRITICAL: User is NOT logged in. Force redirect.
            console.log("Access Denied: Not authenticated. Redirecting to login.html");
            window.location.href = "login.html"; 
        }
    });
};

function initExam() {
    renderPalette();
    loadQuestion(0);
    startTimer(40 * 60); // 40 minutes in seconds
}

// --- REST OF THE CODE REMAINS THE SAME ---

// RENDER LOGIC (Split Screen & Types)
function loadQuestion(index) {
    currentQuestionIndex = index;
    const q = questions[index];
    const savedData = userAnswers[index] || {};

    document.getElementById('q-number-display').innerText = index + 1;
    document.getElementById('q-type-label').innerText = q.type;
    document.getElementById('marks-badge').innerText = `+4 / ${q.neg}`; // Use standard 4/-1 or 4/0

    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    const passageContainer = document.getElementById('passage-container');

    if (q.passage) {
        leftPane.classList.remove('hidden');
        rightPane.classList.remove('full-width');
        passageContainer.innerHTML = q.passage;
    } else {
        leftPane.classList.add('hidden');
        rightPane.classList.add('full-width');
    }

    document.getElementById('question-text').innerText = q.text;
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 

    if (q.type === 'SA') {
        const input = document.createElement('input');
        input.type = "text";
        input.className = "sa-input";
        input.placeholder = "Type numerical answer...";
        
        if (savedData.answer) input.value = savedData.answer;

        input.addEventListener('input', (e) => {
            tempSaveAnswer(index, e.target.value);
        });
        optionsContainer.appendChild(input);

    } else {
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

            row.onclick = () => {
                radio.checked = true;
                tempSaveAnswer(index, opt);
            };

            row.appendChild(radio);
            row.appendChild(label);
            optionsContainer.appendChild(row);
        });
    }

    updatePaletteVisuals();

    if (!userAnswers[index]) {
        userAnswers[index] = { status: 'not-answered' };
    }
}

// Helper to store answer in memory before clicking "Save & Next"
function tempSaveAnswer(index, value) {
    if (!userAnswers[index]) userAnswers[index] = {};
    userAnswers[index].tempAnswer = value;
}

// NAVIGATION & SAVING
function saveAndNext() {
    const qIdx = currentQuestionIndex;
    const entry = userAnswers[qIdx];

    if (entry && entry.tempAnswer) {
        entry.answer = entry.tempAnswer;
        entry.status = 'answered';
    } else if (entry && entry.answer) {
        entry.status = 'answered';
    } else {
        userAnswers[qIdx] = { status: 'not-answered' };
    }

    moveToNext();
}

function markForReview() {
    const qIdx = currentQuestionIndex;
    const entry = userAnswers[qIdx];

    if (entry && (entry.tempAnswer || entry.answer)) {
        if(entry.tempAnswer) entry.answer = entry.tempAnswer;
        entry.status = 'ans-marked';
    } else {
        userAnswers[qIdx] = { status: 'marked' };
    }

    moveToNext();
}

function clearResponse() {
    const qIdx = currentQuestionIndex;
    delete userAnswers[qIdx];
    loadQuestion(qIdx); 
}

function moveToNext() {
    updatePaletteVisuals();
    if (currentQuestionIndex < questions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        // Use a clean modal instead of alert/confirm
        console.log("Reached last question.");
    }
}

// PALETTE LOGIC
function renderPalette() {
    const container = document.getElementById('question-palette');
    container.innerHTML = '';
    
    questions.forEach((q, index) => {
        const btn = document.createElement('button');
        btn.className = 'p-btn not-visited';
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

        btn.className = 'p-btn';

        if (!data) {
            btn.classList.add('not-visited');
        } else {
            btn.classList.add(data.status); 
        }

        if (index === currentQuestionIndex) {
            btn.style.border = "2px solid black";
        } else {
            btn.style.border = "1px solid #ccc";
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

// TIMER & SUBMISSION
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
            submitExam(true); 
        }
    }, 1000);
}

function submitExam(auto = false) {
    if (!auto) {
        // Use a modal window instead of 'confirm'
        if (!window.confirm("Are you sure you want to Submit the Test?")) return;
    }

    // Calculate Score (Based on +4/-1 or +4/0 rules)
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    questions.forEach((q, i) => {
        const entry = userAnswers[i];
        if (entry && (entry.status === 'answered' || entry.status === 'ans-marked')) {
            const wrongMarks = (q.type === 'SA') ? 0 : -1;
            
            if (entry.answer === q.correct) {
                score += 4; // Always +4 for correct
                correctCount++;
            } else {
                score += wrongMarks; // -1 or 0 for wrong
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
        answers: userAnswers
    };

    db.collection("testResults").add(resultData)
    .then((docRef) => {
        localStorage.setItem("lastExamId", docRef.id);
        // Use a simple alert for success (since we can't show a custom modal easily without more HTML/CSS)
        window.alert(`Test Submitted! Your Score: ${score}`);
        window.location.href = "solutions.html";
    })
    .catch((error) => {
        console.error("Error writing document: ", error);
        window.alert("Error submitting. Check console.");
    });
}