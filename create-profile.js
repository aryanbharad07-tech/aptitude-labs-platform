const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const profileForm = document.getElementById('profile-form');
const usernameInput = document.getElementById('username');
const statusDiv = document.getElementById('username-status');
const submitBtn = document.getElementById('submit-btn');
const photoUpload = document.getElementById('photo-upload');
const profilePicPreview = document.getElementById('profile-pic-preview');

let isUsernameAvailable = false;
let debounceTimer;

// Init
window.onload = () => {
    auth.onAuthStateChanged(user => {
        if(user) document.getElementById('email').value = user.email;
        else window.location.href = 'login.html';
    });
};

// 1. Image Compression
photoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        compressImage(file, 300, 0.7).then(base64 => {
            profilePicPreview.src = base64;
        });
    }
});

function compressImage(file, maxWidth, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, maxWidth / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        };
    });
}

// 2. Username Check
usernameInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = usernameInput.value.trim().toLowerCase();

    if(val.length < 4) {
        setStatus('Too short', '#94A3B8'); // Gray
        return;
    }

    setStatus('Checking...', '#94A3B8');
    debounceTimer = setTimeout(async () => {
        try {
            const snap = await db.collection('users').where('username', '==', val).get();
            if(snap.empty) {
                setStatus('Available', '#34d399'); // Green
                isUsernameAvailable = true;
            } else {
                setStatus('Taken', '#f87171'); // Red
                isUsernameAvailable = false;
            }
        } catch(e) {
            console.error(e);
            setStatus('Error', '#f87171');
        }
    }, 500);
});

function setStatus(msg, color) {
    statusDiv.innerText = msg;
    statusDiv.style.color = color;
}

// 3. Submit & Morph Animation
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!isUsernameAvailable) return alert("Please choose a valid available username.");

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').innerText = "SAVING PROFILE...";

    const user = auth.currentUser;

    // Updated Data Structure for Educational Platform
    const data = {
        displayName: document.getElementById('name').value.trim(),
        username: usernameInput.value.trim().toLowerCase(),
        phone: document.getElementById('phone').value.trim(),
        email: user.email,

        // Academic Details
        studentType: document.getElementById('student-type').value,
        targetYear: document.getElementById('target-year').value,
        coaching: document.getElementById('coaching').value.trim() || "Self Study",

        // Demographics
        city: document.getElementById('city').value.trim(),
        gender: document.getElementById('gender').value,

        photoURL: profilePicPreview.src,
        profileComplete: true,
        league: { lifetimeXP: 0 },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(user.uid).set(data, { merge: true });

        // Trigger Morph Animation
        document.body.classList.add('morph-active');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);

    } catch (err) {
        console.error(err);
        alert("Error saving profile: " + err.message);
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').innerText = "SAVE & CONTINUE";
    }
});