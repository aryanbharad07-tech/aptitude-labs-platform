/* gamification.js */
const LEAGUE_CONFIG = {
    1: { name: "ROOKIE", theme: "theme-rookie", image: "assets/rookie.png", xpBoost: 5, perks: "Daily Bonus", color: "#D97706" },
    2: { name: "SCHOLAR", theme: "theme-scholar", image: "assets/scholar.png", xpBoost: 10, perks: "Access Library", color: "#059669" },
    3: { name: "ACHIEVER", theme: "theme-achiever", image: "assets/achiever.png", xpBoost: 15, perks: "Weekly Challenges", color: "#B45309" },
    4: { name: "PRODIGY", theme: "theme-prodigy", image: "assets/prodigy.png", xpBoost: 20, perks: "Mentor Access", color: "#6D28D9" },
    5: { name: "ELITE", theme: "theme-elite", image: "assets/elite.png", xpBoost: 25, perks: "VIP Events", color: "#065F46" },
    6: { name: "MASTER", theme: "theme-master", image: "assets/master.png", xpBoost: 30, perks: "Elite Rewards", color: "#1E40AF" },
    7: { name: "LEGEND", theme: "theme-legend", image: "assets/legend.png", xpBoost: 50, perks: "Hall of Fame", color: "#312E81" }
};

async function initGamification(user, username) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    let userData = doc.data();

    if (!userData || !userData.league) {
        const defaultLeague = { id: 1, currentXP: 0, lifetimeXP: 0 };
        await userRef.set({ league: defaultLeague }, { merge: true });
        userData = { ...userData, league: defaultLeague };
    }
    renderLeagueCard(userData.league, username);
}

function renderLeagueCard(leagueData, username) {
    const container = document.getElementById('league-card-root');
    const config = LEAGUE_CONFIG[leagueData.id] || LEAGUE_CONFIG[1];
    const targetXP = 1000;
    const progress = Math.min((leagueData.currentXP / targetXP) * 100, 100);
    const displayName = username ? username : "ASPIRANT";

    container.innerHTML = `
        <div class="card-flipper ${config.theme}" id="active-card">
            <div class="card-front">
                <div class="user-nameplate">${displayName}</div>
                <img src="${config.image}" class="league-asset" alt="${config.name}">
                <div class="league-title">${config.name}</div>
                <div class="stats-container">
                    <div class="xp-track">
                        <div class="xp-bar" style="width:${progress}%;"></div>
                    </div>
                    <div class="xp-text">${leagueData.currentXP} / ${targetXP} XP</div>
                </div>
                <div class="info-btn" onclick="event.stopPropagation(); alert('Open Roadmap')">i</div>
            </div>
            <div class="card-back">
                <h2 style="font-family:'Rajdhani'; font-weight:800; font-size:2rem; margin-bottom:20px; color:${config.color};">${config.name}</h2>
                <div style="background:#F9FAFB; padding:15px; border-radius:12px; width:90%; margin-bottom:15px; border:1px solid #eee;">
                    <div style="font-size:0.7rem; color:#666; font-weight:700;">ACTIVE PERK</div>
                    <div style="font-size:1.1rem; color:#333; font-weight:600;">${config.perks}</div>
                </div>
                <div style="font-size:0.9rem; color:var(--text-color); border:2px solid ${config.color}; padding:8px 20px; border-radius:30px; font-weight:700;">
                    XP BOOST: +${config.xpBoost}%
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const card = document.getElementById('active-card');
        const wrapper = document.getElementById('league-card-root');
        wrapper.onmousemove = (e) => {
            if(card.classList.contains('is-flipped')) return;
            const rect = wrapper.getBoundingClientRect();
            const x = e.clientX - rect.left; const y = e.clientY - rect.top;
            const centerX = rect.width / 2; const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -15; 
            const rotateY = ((x - centerX) / centerX) * 15;
            card.style.setProperty('--rx', `${rotateX}deg`);
            card.style.setProperty('--ry', `${rotateY}deg`);
        };
        wrapper.onmouseleave = () => { card.style.setProperty('--rx', `0deg`); card.style.setProperty('--ry', `0deg`); };
        wrapper.onclick = (e) => { if(!e.target.classList.contains('info-btn')) card.classList.toggle('is-flipped'); };
    }, 100);
}