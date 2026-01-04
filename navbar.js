// navbar.js

document.addEventListener("DOMContentLoaded", function() {
    // 1. Define the Navbar HTML (Exact copy from dashboard.html)
    const navbarHTML = `
    <nav class="top-nav">
        <div class="brand">
            <span class="material-icons-round brand-icon">change_history</span>
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
        <div class="flex align-center gap-2 text-gray-400">
            <span class="material-icons-round" style="cursor:pointer; font-size:24px;">settings</span>
            <span class="material-icons-round" onclick="logoutUser()" style="cursor:pointer; font-size:24px; margin-left:15px; color:#ef4444;">logout</span>
        </div>
    </nav>
    `;

    // 2. Inject Navbar
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    // 3. Set Active Link Logic
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const links = document.querySelectorAll('.nav-links a');
    
    links.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});

// 4. Global Logout Function (Exact copy from dashboard.html head)
function logoutUser() {
    console.log("Attempting Logout...");
    // Try Firebase Logout safely
    try {
        if (typeof firebase !== 'undefined' && firebase.auth()) {
            firebase.auth().signOut();
        }
    } catch (error) {
        console.warn("Firebase logout warning (ignoring to force redirect):", error);
    }
    // FORCE REDIRECT
    window.location.href = 'login.html';
}