// #js/dashboard.js

const db = firebase.firestore();
const auth = firebase.auth();

const LEAGUES = [
    { name: "ROOKIE", limit: 1000, img: "assets/ROOKIE.png" },
    { name: "SCHOLAR", limit: 2500, img: "assets/SCHOLAR.png" },
    { name: "ACHIEVER", limit: 5000, img: "assets/ACHIEVER.png" },
    { name: "PRODIGY", limit: 10000, img: "assets/PRODIGY.png" },
    { name: "ELITE", limit: 20000, img: "assets/ELITE.png" },
    { name: "MASTER", limit: 35000, img: "assets/MASTER.png" },
    { name: "LEGEND", limit: 1000000, img: "assets/LEGEND.png" }
];

window.onload = function() {
    auth.onAuthStateChanged(user => {
        if(user) {
            const userDocRef = db.collection('users').doc(user.uid);

            userDocRef.onSnapshot(async doc => {
                if (!doc.exists || !doc.data().profileComplete) {
                    window.location.href = "create-profile.html";
                    return;
                }

                let userData = doc.data();

                // Safe data migration for users with old 'totalXP' structure
                if (userData.totalXP !== undefined && userData.league === undefined) {
                    await userDocRef.update({
                        'league.lifetimeXP': userData.totalXP,
                        'totalXP': firebase.firestore.FieldValue.delete()
                    });
                    // The onSnapshot listener will automatically pick up this change and re-render
                    return; // Exit this snapshot handler to avoid rendering with old data
                }

                const displayName = userData.username || userData.displayName || user.email.split('@')[0];

                document.getElementById('display-name').innerText = displayName.toUpperCase();
                document.getElementById('user-rank-display').innerText = `@${displayName}`;

                const xp = (userData.league && userData.league.lifetimeXP) ? userData.league.lifetimeXP : 0;
                const streak = userData.streak || 0;

                updateGamification(xp);
                document.getElementById('user-rank-xp').innerText = `${xp.toLocaleString()} XP`;
                document.getElementById('streak-count').innerText = streak;
            });

            fetchLeaderboard();
            loadQuests(user.uid);
        } else {
            window.location.href = "login.html";
        }
    });
};

function fetchLeaderboard() {
    db.collection('users').orderBy('league.lifetimeXP', 'desc').limit(3).onSnapshot(snapshot => {
        const docs = snapshot.docs;
        const ranks = ['1', '2', '3'];

        ranks.forEach((r, i) => {
            if (docs[i]) {
                const d = docs[i].data();
                const name = d.username || d.displayName || "User";
                document.getElementById(`rank-${r}-name`).innerText = name;
                const xp = (d.league && d.league.lifetimeXP) ? d.league.lifetimeXP : 0;
                document.getElementById(`rank-${r}-score`).innerText = xp.toLocaleString();
            } else {
                document.getElementById(`rank-${r}-name`).innerText = "--";
                document.getElementById(`rank-${r}-score`).innerText = "0";
            }
        });
    });
}

function updateGamification(xp) {
    let currentLeagueIndex = 0;
    for(let i=0; i<LEAGUES.length; i++) {
        if(xp < LEAGUES[i].limit) {
            currentLeagueIndex = i;
            if(i > 0 && xp >= LEAGUES[i-1].limit) currentLeagueIndex = i;
            break;
        }
        if(i === LEAGUES.length - 1) currentLeagueIndex = i;
    }

    const currentLeague = LEAGUES[currentLeagueIndex];
    const prevLimit = currentLeagueIndex === 0 ? 0 : LEAGUES[currentLeagueIndex-1].limit;
    const nextLimit = currentLeague.limit;

    document.getElementById('league-name').innerText = currentLeague.name;
    document.getElementById('league-img').src = currentLeague.img;

    const range = nextLimit - prevLimit;
    const progress = xp - prevLimit;
    const percentage = Math.min((progress / range) * 100, 100);

    document.getElementById('xp-bar').style.width = percentage + "%";
    document.getElementById('xp-text').innerText = `${xp} / ${nextLimit} XP`;

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

function saveQuests() {
    const user = auth.currentUser;
    if (!user) return;
    const questsData = {
        'quest-1': {
            text: document.querySelector('#quest-1 .quest-text').innerText,
            checked: document.querySelector('#quest-1 .checkbox').textContent === 'check_box'
        },
        'quest-2': {
            text: document.querySelector('#quest-2 .quest-text').innerText,
            checked: document.querySelector('#quest-2 .checkbox').textContent === 'check_box'
        },
        'quest-3': {
            text: document.querySelector('#quest-3 .quest-text').innerText,
            checked: document.querySelector('#quest-3 .checkbox').textContent === 'check_box'
        }
    };
    db.collection('quests').doc(user.uid).set(questsData);
}

function loadQuests(userId) {
    db.collection('quests').doc(userId).get().then(doc => {
        if (doc.exists) {
            const quests = doc.data();
            for (const id in quests) {
                const questEl = document.getElementById(id);
                if (questEl) {
                    questEl.querySelector('.quest-text').innerText = quests[id].text;
                    const icon = questEl.querySelector('.material-icons-round');
                    if (quests[id].checked) {
                        icon.textContent = 'check_box';
                        icon.classList.add('checkbox'); icon.classList.remove('checkbox-unchecked');
                        questEl.querySelector('.quest-text').classList.add('strikethrough');
                    } else {
                        icon.textContent = 'check_box_outline_blank';
                        icon.classList.remove('checkbox'); icon.classList.add('checkbox-unchecked');
                        questEl.querySelector('.quest-text').classList.remove('strikethrough');
                    }
                }
            }
        }
    });
}
