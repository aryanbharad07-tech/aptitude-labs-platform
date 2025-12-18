// #js/dashboard.js

// #js.01: Firebase Initialization
const db = firebase.firestore();
const auth = firebase.auth();

// #js.02: Gamification Configuration
// #js.02.01: LEAGUES Array
const LEAGUES = [
    { name: "ROOKIE", limit: 1000, img: "assets/ROOKIE.png" },
    { name: "SCHOLAR", limit: 2500, img: "assets/SCHOLAR.png" },
    { name: "ACHIEVER", limit: 5000, img: "assets/ACHIEVER.png" },
    { name: "PRODIGY", limit: 10000, img: "assets/PRODIGY.png" },
    { name: "ELITE", limit: 20000, img: "assets/ELITE.png" },
    { name: "MASTER", limit: 35000, img: "assets/MASTER.png" },
    { name: "LEGEND", limit: 1000000, img: "assets/LEGEND.png" } 
];

// #js.03: Page Load & Auth State
window.onload = function() {
    // #js.03.01: Auth State Change Listener
    auth.onAuthStateChanged(user => {
        if(user) {
            // #js.03.01.01: User is signed in
            const username = user.email.split('@')[0].toUpperCase();
            document.getElementById('display-name').innerText = username;
            document.getElementById('user-rank-display').innerText = `#?? ${username}`;
            
            // #js.03.01.02: Save user data to Firestore
            db.collection('users').doc(user.uid).set({ 
                displayName: username 
            }, { merge: true });

            // #js.03.01.03: Listen for XP changes in real-time
            db.collection('users').doc(user.uid).onSnapshot(doc => {
                if(doc.exists) {
                    const xp = doc.data().totalXP || 0;
                    updateGamification(xp);
                    document.getElementById('user-rank-xp').innerText = `${xp.toLocaleString()} XP`;
                } else {
                    // #js.03.01.03.01: Initialize user if they don't exist in Firestore
                    db.collection('users').doc(user.uid).set({ totalXP: 0, displayName: username }, { merge: true });
                    updateGamification(0);
                }
            });

            // #js.03.01.04: Fetch leaderboard data
            fetchLeaderboard();
            // #js.03.01.05: Load user's quests
            loadQuests(user.uid);
        } else { 
            // #js.03.01.06: User is not signed in, redirect to login
            window.location.href = "login.html"; 
        }
    });
};

// #js.04: Leaderboard Functions
function fetchLeaderboard() {
    // #js.04.01: Fetch top 3 users from Firestore
    db.collection('users').orderBy('totalXP', 'desc').limit(3).onSnapshot(snapshot => {
        const docs = snapshot.docs;
        
        // #js.04.01.01: Update Rank 1 (Gold)
        if(docs[0]) {
            document.getElementById('rank-1-name').innerText = docs[0].data().displayName || "User";
            document.getElementById('rank-1-score').innerText = (docs[0].data().totalXP || 0).toLocaleString();
        }

        // #js.04.01.02: Update Rank 2 (Silver)
        if(docs[1]) {
            document.getElementById('rank-2-name').innerText = docs[1].data().displayName || "User";
            document.getElementById('rank-2-score').innerText = (docs[1].data().totalXP || 0).toLocaleString();
        } else {
            document.getElementById('rank-2-name').innerText = "--";
            document.getElementById('rank-2-score').innerText = "0";
        }

        // #js.04.01.03: Update Rank 3 (Bronze)
        if(docs[2]) {
            document.getElementById('rank-3-name').innerText = docs[2].data().displayName || "User";
            document.getElementById('rank-3-score').innerText = (docs[2].data().totalXP || 0).toLocaleString();
        } else {
            document.getElementById('rank-3-name').innerText = "--";
            document.getElementById('rank-3-score').innerText = "0";
        }
    });
}

// #js.05: Gamification UI Update
function updateGamification(xp) {
    document.getElementById('total-xp').innerText = xp.toLocaleString();
    
    // #js.05.01: Determine user's current league based on XP
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
    
    // #js.05.02: Update League Card UI elements
    document.getElementById('league-name').innerText = currentLeague.name;
    document.getElementById('league-img').src = currentLeague.img;
    
    // #js.05.03: Calculate and update XP progress bar
    const range = nextLimit - prevLimit;
    const progress = xp - prevLimit;
    const percentage = Math.min((progress / range) * 100, 100);
    
    document.getElementById('xp-bar').style.width = percentage + "%";
    document.getElementById('xp-text').innerText = `${xp} / ${nextLimit} XP`;

    // #js.05.04: Store current league index for the modal
    window.currentLeagueIndex = currentLeagueIndex;
}

// #js.06: Modal Functions
function openLeagueModal() {
    const container = document.getElementById('league-list-container');
    container.innerHTML = '';
    
    // #js.06.01: Populate league list in the modal
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

// #js.07: Daily Quest Interaction
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

// #js.08: Editable Quests
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

    db.collection('quests').doc(user.uid).set(questsData).then(() => {
        console.log("Quests saved!");
        // Optional: Add a visual confirmation
    }).catch(error => {
        console.error("Error saving quests: ", error);
    });
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
                        icon.classList.add('checkbox');
                        icon.classList.remove('checkbox-unchecked');
                        questEl.querySelector('.quest-text').classList.add('strikethrough');
                    } else {
                        icon.textContent = 'check_box_outline_blank';
                        icon.classList.remove('checkbox');
                        icon.classList.add('checkbox-unchecked');
                        questEl.querySelector('.quest-text').classList.remove('strikethrough');
                    }
                }
            }
        } else {
            // No saved quests, do nothing and leave the default quests.
        }
    }).catch(error => {
        console.error("Error loading quests: ", error);
    });
}