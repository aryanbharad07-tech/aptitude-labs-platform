document.addEventListener('DOMContentLoaded', function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const mockId = localStorage.getItem("activeMockId");
    if (!mockId) {
        document.querySelector('.analysis-grid').innerHTML = "<p>No mock selected for analysis.</p>";
        return;
    }

    const db = firebase.firestore();
    const mockResultRef = db.collection("mocks").doc(`${user.uid}_${mockId}`);

    mockResultRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            renderAnalysis(data);
        } else {
            document.querySelector('.analysis-grid').innerHTML = "<p>No analysis found for this mock.</p>";
        }
    }).catch((error) => {
        console.error("Error fetching analysis:", error);
        document.querySelector('.analysis-grid').innerHTML = "<p>Error loading analysis.</p>";
    });
});

function renderAnalysis(data) {
    const analysisGrid = document.querySelector('.analysis-grid');
    analysisGrid.innerHTML = `
        <div class="analysis-card score-card">
            <h3>Total Score</h3>
            <p class="score">${data.score}</p>
        </div>
        <div class="analysis-card correct-card">
            <h3>Correct</h3>
            <p class="count">${data.correct}</p>
        </div>
        <div class="analysis-card incorrect-card">
            <h3>Incorrect</h3>
            <p class="count">${data.wrong}</p>
        </div>
        <div class="analysis-card attempted-card">
            <h3>Attempted</h3>
            <p class="count">${data.attempted}</p>
        </div>
        <div class="analysis-card xp-card">
            <h3>XP Gained</h3>
            <p class="xp">+${data.xpGained} XP</p>
        </div>
    `;
}
