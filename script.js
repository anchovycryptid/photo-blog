// Fetch the real posts from the JSON file your admin panel just created
fetch('data/posts.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(posts => {
        const grid = document.getElementById('photo-grid');
        const modal = document.getElementById('photo-modal');
        const closeModal = document.getElementById('close-modal');
        const modalImage = document.getElementById('modal-image');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        // If the database is empty (like on your very first test)
        if (posts.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%;">No photos yet. Go to /admin to add one!</p>';
            return;
        }

        // 1. Build the Grid using your real posts!
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            // Note: We are now using post.image which is the path to your uploaded photo
            card.innerHTML = `
                <img src="${post.image}" alt="${post.title}">
                <div class="title">${post.title}</div>
            `;
            
            // Add click event to open modal
            card.addEventListener('click', () => {
                modalImage.src = post.image;
                modalTitle.textContent = post.title;
                modalBody.textContent = post.body;
                modal.style.display = 'flex';
            });

            grid.appendChild(card);
        });

        // 2. Close the Modal when clicking the 'X'
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 3. Close Modal when clicking outside the white box
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    })
    .catch(error => {
        console.error('Error loading posts:', error);
        document.getElementById('photo-grid').innerHTML = '<p style="text-align:center; width:100%;">Error loading posts. Please check back later.</p>';
    });
