// Our dummy data. Later, we will pull this from a JSON file!
const posts = [
    {
        id: 1,
        title: "Morning Mist at Taman Tasik",
        image: "https://picsum.photos/id/1018/800/600",
        body: "Woke up early and decided to walk alone. The mist on the water was beautiful. Here is the photo I managed to capture."
    },
    {
        id: 2,
        title: "Street Lights in KL",
        image: "https://picsum.photos/id/1015/800/600",
        body: "Evening walk down the busy streets. I love how the city lights look when the sun goes down."
    },
    {
        id: 3,
        title: "Quiet Forest Trail",
        image: "https://picsum.photos/id/1043/800/600",
        body: "Found this little trail. No friends to talk to, but the birds were loud enough for company."
    },
    {
        id: 4,
        title: "Old Shop Lot",
        image: "https://picsum.photos/id/1040/800/600",
        body: "Just me and my camera exploring the older parts of town today."
    }
];

const grid = document.getElementById('photo-grid');
const modal = document.getElementById('photo-modal');
const closeModal = document.getElementById('close-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

// 1. Build the Grid
posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'photo-card';
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
