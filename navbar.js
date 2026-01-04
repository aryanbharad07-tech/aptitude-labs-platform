// navbar.js
document.addEventListener("DOMContentLoaded", function() {
    const navbarHTML = `
    <nav class="top-nav">
        <div class="brand">
            <img src="assets/logo.png" alt="Logo" class="brand-logo" height="36">
            APTITUDE LABS
        </div>

        <div class="nav-links">
            <a href="dashboard.html">Dashboard</a>
            <a href="mocks.html">Mocks</a> 
            <a href="practice.html">Practice</a>
            <a href="leaderboard.html">Leaderboard</a>
            <a href="analysis.html">Analysis</a>
            <a href="mentor.html">Mentor</a>
            <a href="pricing.html">Pricing</a>
        </div>
        
        <div class="nav-actions">
            <a href="profile.html" class="static-profile-btn" title="Go to Profile">
                <span class="material-icons-round">account_circle</span>
            </a>
        </div>
    </nav>
    `;
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // Set Active Link
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) link.classList.add('active');
    });
});

function logoutUser() {
    try { if (typeof firebase !== 'undefined' && firebase.auth()) firebase.auth().signOut(); } catch (e) {}
    window.location.href = 'login.html';
}