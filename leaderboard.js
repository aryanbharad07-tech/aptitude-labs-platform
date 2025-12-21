document.addEventListener('DOMContentLoaded', function () {
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            loadLeaderboard();
            handleDailyLogin(user.uid);
        } else {
            console.log("User is not signed in.");
            window.location.href = 'login.html';
        }
    });
});

async function loadLeaderboard() {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    let users = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
            id: doc.id,
            username: data.username || 'Anonymous',
            xp: data.league ? data.league.lifetimeXP : 0,
            profilePic: data.profilePicUrl || 'https://i.pravatar.cc/100'
        });
    });

    users.sort((a, b) => b.xp - a.xp);

    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = ''; 

    users.forEach((user, index) => {
        const rank = index + 1;
        const entry = document.createElement('div');
        entry.className = `leaderboard-entry rank-${rank}`;

        entry.innerHTML = `
            <div class="rank">#${rank}</div>
            <img src="${user.profilePic}" alt="${user.username}" class="user-avatar">
            <div class="user-info">
                <div class="user-name">${user.username}</div>
            </div>
            <div class="user-xp">${user.xp} XP</div>
        `;
        leaderboardList.appendChild(entry);
    });
}

async function handleDailyLogin(userId) {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) return;

    const userData = doc.data();
    const today = new Date().toDateString();
    const lastLogin = userData.lastLogin ? new Date(userData.lastLogin).toDateString() : null;

    if (today === lastLogin) {
        console.log("Daily bonus already awarded today.");
        return;
    }

    let streak = userData.streak || 0;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastLogin === yesterday) {
        streak++;
    } else {
        streak = 1; 
    }

    let dailyBonus = 10;
    if (streak > 30) {
        dailyBonus = 40;
    } else if (streak > 10) {
        dailyBonus = 20;
    }

    const newLifetimeXP = (userData.league.lifetimeXP || 0) + dailyBonus;

    await userRef.update({
        'league.lifetimeXP': newLifetimeXP,
        'streak': streak,
        'lastLogin': new Date().toISOString()
    });
    
    console.log(`Awarded ${dailyBonus} XP for daily login. New streak: ${streak}`);
    loadLeaderboard(); // Refresh leaderboard
}


function calculateMockScore(correct, incorrect, unattempted) {
    const baseXP = 200;
    const correctXP = correct * 5;
    const incorrectXP = incorrect * -2;
    return baseXP + correctXP + incorrectXP;
}

async function awardMockXP(userId, correct, incorrect, unattempted) {
    const mockXP = calculateMockScore(correct, incorrect, unattempted);
    const userRef = db.collection('users').doc(userId);
    
    await userRef.update({
        'league.lifetimeXP': firebase.firestore.FieldValue.increment(mockXP)
    });

    console.log(`Awarded ${mockXP} XP for completing the mock test.`);
    loadLeaderboard();
}
