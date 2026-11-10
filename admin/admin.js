// --- Configuration ---
const GITHUB_USERNAME = "anchovycryptid"; // From your screenshot earlier
const REPO_NAME = "photo-blog";

// Check if token exists when page loads
window.onload = () => {
    const token = localStorage.getItem('github_pat');
    if (token) {
        document.getElementById('token-setup').classList.add('hidden');
        document.getElementById('admin-form').classList.remove('hidden');
    }
};

// Save the token to the browser's local storage
function saveToken() {
    const input = document.getElementById('pat-input').value.trim();
    if (input.startsWith('github_pat_')) {
        localStorage.setItem('github_pat', input);
        document.getElementById('token-setup').classList.add('hidden');
        document.getElementById('admin-form').classList.remove('hidden');
    } else {
        alert("That doesn't look like a valid GitHub token. It should start with 'github_pat_'.");
    }
}

// Function to compress the image in the browser
function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let scaleSize = 1;
                if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
                
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Compress to JPEG at 70% quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                const base64Data = dataUrl.split(',')[1]; 
                resolve(base64Data);
            };
        };
    });
}

// Function to commit files to GitHub
async function commitToGitHub(path, contentBase64, commitMessage, fileSha = null) {
    const token = localStorage.getItem('github_pat');
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
    
    // If we don't have a SHA, check if the file already exists
    if (!fileSha) {
        const getRes = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            fileSha = data.sha;
        }
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: commitMessage,
            content: contentBase64,
            sha: fileSha 
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
    }
    return await response.json();
}

// Main function to publish the post
async function publishPost() {
    const token = localStorage.getItem('github_pat');
    const title = document.getElementById('post-title').value;
    const body = document.getElementById('post-body').value;
    const fileInput = document.getElementById('post-image').files[0];
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('publish-btn');

    if (!title || !body || !fileInput) {
        alert("Please fill in all fields and select an image.");
        return;
    }

    btn.disabled = true;
    statusDiv.style.color = "yellow";
    statusDiv.innerText = "Compressing image... ⏳";

    try {
        // 1. Compress and Upload Image
        const imageBase64 = await compressImage(fileInput);
        const timestamp = Date.now();
        const imagePath = `images/${timestamp}.jpg`;

        statusDiv.innerText = "Uploading photo to GitHub... 📸";
        await commitToGitHub(imagePath, imageBase64, `Upload photo: ${title}`);

        statusDiv.innerText = "Saving story to database... 📝";

        // 2. Fetch current posts.json
        const postsUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/data/posts.json`;
        const getPostsRes = await fetch(postsUrl, {
            headers: { Authorization: `token ${token}` }
        });
        
        let posts = [];
        let postsSha = null;
        
        if (getPostsRes.ok) {
            const data = await getPostsRes.json();
            postsSha = data.sha;
            const decodedContent = atob(data.content.replace(/\n/g, ''));
            posts = JSON.parse(decodedContent);
        } else if (getPostsRes.status !== 404) {
            throw new Error("Could not fetch posts.json");
        }

        // 3. Add new post
        const newPost = {
            id: timestamp,
            title: title,
            image: imagePath, 
            body: body
        };
        posts.unshift(newPost); 

        // 4. Upload updated posts.json
        const updatedJsonString = JSON.stringify(posts, null, 2);
        const jsonBase64 = btoa(unescape(encodeURIComponent(updatedJsonString)));
        
        await commitToGitHub('data/posts.json', jsonBase64, `New post: ${title}`, postsSha);

        statusDiv.style.color = "#4CAF50";
        statusDiv.innerText = "✅ Success! Post published. Check your live site in 1 minute.";
        
        // Clear form
        document.getElementById('post-title').value = '';
        document.getElementById('post-body').value = '';
        document.getElementById('post-image').value = '';

    } catch (error) {
        statusDiv.style.color = "red";
        statusDiv.innerText = `❌ Error: ${error.message}`;
    } finally {
        btn.disabled = false;
    }
}
