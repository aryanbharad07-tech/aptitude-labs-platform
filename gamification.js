/* gamification.js */

// 1. League Configuration
const LEAGUE_CONFIG = {
    1: {
        name: "ROOKIE LEAGUE",
        class: "theme-rookie",
        icon: "security", // Material Icon
        color: "#5C4033",
        perks: [
            { icon: "card_giftcard", text: "1 Free Basic Sectional" },
            { icon: "forum", text: "Rookie Community" },
            { icon: "emoji_events", text: "Eligible for Promotion" }
        ],
        promoText: "Top 25% Promote to Apprentice ⬆"
    },
    // We can add Apprentice, Warrior, etc. here later
};

// 2. Initialize Gamification (Call this from dashboard.html)
async function initGamification(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    let userData = doc.data();

    // If user has no league data, create it (The "Rookie" default)
    if (!userData || !userData.league) {
        const defaultLeague = {
            id: 1, // Rookie
            currentXP: 0,
            lifetimeXP: 0,
            lastReset: new Date().toISOString()
        };
        await userRef.set({ league: defaultLeague }, { merge: true });
        userData = { ...userData, league: defaultLeague };
        console.log("Created Rookie League data for user.");
    }

    renderLeagueCard(userData.league);
}

// 3. Render the Card HTML
function renderLeagueCard(leagueData) {
    const container = document.getElementById('gamification-container');
    const config = LEAGUE_CONFIG[leagueData.id] || LEAGUE_CONFIG[1]; // Fallback to Rookie

    // Generate HTML
    const html = `
        <div class="league-card ${config.class}">
            <div class="lc-header">
                <span>✨ ${config.name} ✨</span>
            </div>

            <div class="lc-emblem-area">
                <span class="material-icons-round shield-icon">${config.icon}</span>
                <span class="material-icons-round watermark">${config.icon}</span>
            </div>

            <div class="lc-stats-strip">
                <div>XP BOOST: <span style="color:white">0%</span></div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <span>${leagueData.currentXP} XP</span>
                    <span class="material-icons-round" style="font-size:1rem; color:green;">trending_up</span>
                </div>
            </div>

            <div class="lc-perks-box">
                <div class="lc-perks-title">WEEKLY PERKS</div>
                ${config.perks.map(p => `
                    <div class="lc-perk-item">
                        <span class="material-icons-round" style="font-size:1rem;">${p.icon}</span>
                        ${p.text}
                    </div>
                `).join('')}
            </div>

            <div class="lc-footer">
                ${config.promoText}
            </div>
        </div>
    `;

    container.innerHTML = html;
}