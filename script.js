// --- The Scroll Listener for the Glass Nav ---
window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-nav');
    const heroHeight = document.getElementById('hero').offsetHeight;
    
    // If we scroll past 60% of the hero, show the nav
    if (window.scrollY > (heroHeight * 0.6)) {
        nav.classList.remove('hidden-nav');
    } else {
        nav.classList.add('hidden-nav');
    }
});

// --- Post Fetching & Modal Logic (Same as before) ---
fetch('data/posts.json')
    .then(response => response.json())
    .then(posts => {
        const grid = document.getElementById('photo-grid');
        const modal = document.getElementById('photo-modal');
        const closeModal = document.getElementById('close-modal');
        const modalImage = document.getElementById('modal-image');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (posts.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%;">No photos yet.</p>';
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            // We removed the title from the grid so it's just photos
            card.innerHTML = `<img src="${post.image}" alt="${post.title}">`;
            
            card.addEventListener('click', () => {
                modalImage.src = post.image;
                modalTitle.textContent = post.title;
                modalBody.textContent = post.body;
                modal.style.display = 'flex';
            });

            grid.appendChild(card);
        });

        closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
        window.addEventListener('click', (event) => {
            if (event.target === modal) { modal.style.display = 'none'; }
        });
    })
    .catch(error => console.error('Error loading posts:', error));

// Placeholder for Phase 3 (Tabs)
function filterPosts(category, element) {
    // We will make this work later!
    console.log("Filtering by: " + category);
    
    // Update active state on nav
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    element.classList.add('active');
}
