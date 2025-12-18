const db = firebase.firestore();
const auth = firebase.auth();

// --- GAMIFICATION CONFIG ---
const LEAGUES = [
    { name: "ROOKIE", limit: 1000, img: "assets/rookie.png" },
    { name: "SCHOLAR", limit: 2500, img: "assets/scholar.png" },
    { name: "ACHIEVER", limit: 5000, img: "assets/achiever.png" },
    { name: "PRODIGY", limit: 10000, img: "assets/prodigy.png" },
    { name: "ELITE", limit: 20000, img: "assets/elite.png" },
    { name: "MASTER", limit: 35000, img: "assets/master.png" },
    { name: "LEGEND", limit: 1000000, img: "assets/legend.png" } 
];

window.onload = function() {
    auth.onAuthStateChanged(user => {
        if(user) {
            const username = user.email.split('@')[0].toUpperCase();
            document.getElementById('display-name').innerText = username;
            document.getElementById('user-rank-display').innerText = `#?? ${username}`;
            
            // SAVE USER NAME TO DB (Required for Leaderboard)
            db.collection('users').doc(user.uid).set({ 
                displayName: username 
            }, { merge: true });

            // Listen to XP Changes
            db.collection('users').doc(user.uid).onSnapshot(doc => {
                if(doc.exists) {
                    const xp = doc.data().totalXP || 0;
                    updateGamification(xp);
                    // Update the "User Rank Row" in the Podium card
                    document.getElementById('user-rank-xp').innerText = `${xp.toLocaleString()} XP`;
                } else {
                    // Init user if not exists
                    db.collection('users').doc(user.uid).set({ totalXP: 0, displayName: username }, { merge: true });
                    updateGamification(0);
                }
            });

            // FETCH LEADERBOARD FOR PODIUM
            fetchLeaderboard();
        } else { window.location.href = "login.html"; }
    });
};

function fetchLeaderboard() {
    // Get Top 3 Users ordered by totalXP Descending
    db.collection('users').orderBy('totalXP', 'desc').limit(3).onSnapshot(snapshot => {
        const docs = snapshot.docs;
        
        // Rank 1 (Gold)
        if(docs[0]) {
            document.getElementById('rank-1-name').innerText = docs[0].data().displayName || "User";
            document.getElementById('rank-1-score').innerText = (docs[0].data().totalXP || 0).toLocaleString();
        }

        // Rank 2 (Silver)
        if(docs[1]) {
            document.getElementById('rank-2-name').innerText = docs[1].data().displayName || "User";
            document.getElementById('rank-2-score').innerText = (docs[1].data().totalXP || 0).toLocaleString();
        } else {
            document.getElementById('rank-2-name').innerText = "--";
            document.getElementById('rank-2-score').innerText = "0";
        }

        // Rank 3 (Bronze)
        if(docs[2]) {
            document.getElementById('rank-3-name').innerText = docs[2].data().displayName || "User";
            document.getElementById('rank-3-score').innerText = (docs[2].data().totalXP || 0).toLocaleString();
        } else {
            document.getElementById('rank-3-name').innerText = "--";
            document.getElementById('rank-3-score').innerText = "0";
        }
    });
}

function updateGamification(xp) {
    document.getElementById('total-xp').innerText = xp.toLocaleString();
    
    // Determine League
    let currentLeagueIndex = 0;
    for(let i=0; i<LEAGUES.length; i++) {
        if(xp < LEAGUES[i].limit) {
            currentLeagueIndex = i; 
            if(i > 0 && xp >= LEAGUES[i-1].limit) {
               currentLeagueIndex = i;
            }
            break; 
        }
        if(i === LEAGUES.length - 1) currentLeagueIndex = i; 
    }
    
    const currentLeague = LEAGUES[currentLeagueIndex];
    const prevLimit = currentLeagueIndex === 0 ? 0 : LEAGUES[currentLeagueIndex-1].limit;
    const nextLimit = currentLeague.limit;
    
    // Update Card UI
    document.getElementById('league-name').innerText = currentLeague.name;
    document.getElementById('league-img').src = currentLeague.img;
    
    // Calculate Progress Bar
    const range = nextLimit - prevLimit;
    const progress = xp - prevLimit;
    const percentage = Math.min((progress / range) * 100, 100);
    
    document.getElementById('xp-bar').style.width = percentage + "%";
    document.getElementById('xp-text').innerText = `${xp} / ${nextLimit} XP`;

    // Store for Modal
    window.currentLeagueIndex = currentLeagueIndex;
}

function openLeagueModal() {
    const container = document.getElementById('league-list-container');
    container.innerHTML = '';
    
    LEAGUES.forEach((lg, idx) => {
        const isCurrent = idx === window.currentLeagueIndex;
        const isUnlocked = idx <= window.currentLeagueIndex;
        const prevLim = idx === 0 ? 0 : LEAGUES[idx-1].limit;
        
        let rowClass = 'league-row';
        if(isCurrent) rowClass += ' current active';
        else if(isUnlocked) rowClass += ' active';
        
        container.innerHTML += `
            <div class="${rowClass}">
                <img src="${lg.img}" class="lr-icon">
                <div class="lr-info">
                    <div class="lr-name">${lg.name}</div>
                    <div class="lr-req">${prevLim} - ${lg.limit} XP</div>
                </div>
                ${isCurrent ? '<span class="lr-badge">CURRENT</span>' : ''}
                ${!isUnlocked ? '<i class="material-icons-round" style="color:#aaa;">lock</i>' : ''}
            </div>
        `;
    });
    
    document.getElementById('league-modal').style.display = 'flex';
}

function closeLeagueModal() { document.getElementById('league-modal').style.display = 'none'; }

function toggleCheck(el) {
    const icon = el.querySelector('.material-icons-round');
    const text = el.querySelector('.quest-text');
    if (icon.textContent === 'check_box') {
        icon.textContent = 'check_box_outline_blank';
        icon.classList.remove('checkbox'); icon.classList.add('checkbox-unchecked');
        text.classList.remove('strikethrough');
    } else {
        icon.textContent = 'check_box';
        icon.classList.add('checkbox'); icon.classList.remove('checkbox-unchecked');
        text.classList.add('strikethrough');
    }
}