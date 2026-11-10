// --- Configuration ---
const GITHUB_USERNAME = "anchovycryptid";
const REPO_NAME = "photo-blog";

let allPosts = []; // Keep track of posts in memory

window.onload = () => {
    const token = localStorage.getItem('github_pat');
    if (token) {
        document.getElementById('token-setup').classList.add('hidden');
        document.getElementById('admin-form').classList.remove('hidden');
        loadPosts(); // Load the list when unlocked
    }
};

function saveToken() {
    const input = document.getElementById('pat-input').value.trim();
    if (input.startsWith('github_pat_')) {
        localStorage.setItem('github_pat', input);
        document.getElementById('token-setup').classList.add('hidden');
        document.getElementById('admin-form').classList.remove('hidden');
        loadPosts();
    } else {
        alert("Invalid token format.");
    }
}

// Fetch posts and display them in the list
async function loadPosts() {
    const token = localStorage.getItem('github_pat');
    const postsListDiv = document.getElementById('posts-list');
    
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/data/posts.json`, {
            headers: { Authorization: `token ${token}` }
        });

        if (res.status === 404) {
            postsListDiv.innerHTML = '<p>No posts yet.</p>';
            return;
        }

        const data = await res.json();
        const decodedContent = atob(data.content.replace(/\n/g, ''));
        allPosts = JSON.parse(decodedContent);

        if (allPosts.length === 0) {
            postsListDiv.innerHTML = '<p>No posts yet.</p>';
            return;
        }

        postsListDiv.innerHTML = '';
        allPosts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'post-item';
            div.innerHTML = `
                <h3>${post.title}</h3>
                <div class="action-btns">
                    <button class="edit-btn" onclick="editPost(${post.id})">Edit</button>
                    <button class="delete-btn" onclick="deletePost(${post.id}, '${post.image}')">Delete</button>
                </div>
            `;
            postsListDiv.appendChild(div);
        });

    } catch (error) {
        postsListDiv.innerHTML = `<p style="color:red;">Error loading posts: ${error.message}</p>`;
    }
}

// Populate form for editing
function editPost(id) {
    const post = allPosts.find(p => p.id === id);
    if (!post) return;

    document.getElementById('form-title').innerText = "Edit Post";
    document.getElementById('edit-post-id').value = post.id;
    document.getElementById('edit-image-path').value = post.image;
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-body').value = post.body;
    document.getElementById('post-image').value = ''; // Clear file input
    
    document.getElementById('publish-btn').innerText = "Update Post";
    document.getElementById('cancel-btn').style.display = "block";
    
    window.scrollTo(0, 0); // Scroll to top
}

// Reset form back to "Create" mode
function resetForm() {
    document.getElementById('form-title').innerText = "Create a New Post";
    document.getElementById('edit-post-id').value = '';
    document.getElementById('edit-image-path').value = '';
    document.getElementById('post-title').value = '';
    document.getElementById('post-body').value = '';
    document.getElementById('post-image').value = '';
    document.getElementById('publish-btn').innerText = "Publish to Website";
    document.getElementById('cancel-btn').style.display = "none";
    document.getElementById('status').innerText = '';
}

// Delete a post and its image
async function deletePost(id, imagePath) {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    
    const token = localStorage.getItem('github_pat');
    const statusDiv = document.getElementById('status');
    statusDiv.style.color = "yellow";
    statusDiv.innerText = "Deleting post... 🗑️";

    try {
        // 1. Remove post from array and update JSON
        const updatedPosts = allPosts.filter(p => p.id !== id);
        const jsonBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(updatedPosts, null, 2))));
        
        // Get the current SHA of posts.json
        const getRes = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/data/posts.json`, {
            headers: { Authorization: `token ${token}` }
        });
        const data = await getRes.json();

        await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/data/posts.json`, {
            method: 'PUT',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Delete post ID: ${id}`, content: jsonBase64, sha: data.sha })
        });

        // 2. Delete the image file from GitHub to save space
        try {
            const imgRes = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${imagePath}`, {
                headers: { Authorization: `token ${token}` }
            });
            if (imgRes.ok) {
                const imgData = await imgRes.json();
                await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${imagePath}`, {
                    method: 'DELETE',
                    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Delete image for post: ${id}`, sha: imgData.sha })
                });
            }
        } catch (imgErr) {
            console.warn("Could not delete image, but post was deleted.");
        }

        statusDiv.style.color = "#4CAF50";
        statusDiv.innerText = "✅ Post deleted!";
        loadPosts(); // Refresh the list
        
        setTimeout(() => { statusDiv.innerText = ""; }, 3000);

    } catch (error) {
        statusDiv.style.color = "red";
        statusDiv.innerText = `❌ Error deleting: ${error.message}`;
    }
}

// Function to compress the image
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
                let scaleSize = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
            };
        };
    });
}

// Function to commit files to GitHub
async function commitToGitHub(path, contentBase64, commitMessage, fileSha = null) {
    const token = localStorage.getItem('github_pat');
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
    
    if (!fileSha) {
        const getRes = await fetch(url, { headers: { Authorization: `token ${token}` } });
        if (getRes.ok) {
            const data = await getRes.json();
            fileSha = data.sha;
        }
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage, content: contentBase64, sha: fileSha })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
    }
    return await response.json();
}

// Publish or Update a post
async function publishPost() {
    const token = localStorage.getItem('github_pat');
    const id = document.getElementById('edit-post-id').value;
    const oldImagePath = document.getElementById('edit-image-path').value;
    const title = document.getElementById('post-title').value;
    const body = document.getElementById('post-body').value;
    const fileInput = document.getElementById('post-image').files[0];
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('publish-btn');

    // Validation
    if (!title || !body) {
        alert("Please fill in Title and Story.");
        return;
    }
    // If creating new, image is required. If editing, image is optional.
    if (!id && !fileInput) {
        alert("Please select an image for the new post.");
        return;
    }

    btn.disabled = true;
    statusDiv.style.color = "yellow";
    statusDiv.innerText = "Processing... ⏳";

    try {
        let finalImagePath = oldImagePath;
        const timestamp = Date.now();

        // 1. Handle Image Upload (if a new one was selected)
        if (fileInput) {
            statusDiv.innerText = "Compressing and uploading photo... 📸";
            const imageBase64 = await compressImage(fileInput);
            finalImagePath = `images/${timestamp}.jpg`;
            await commitToGitHub(finalImagePath, imageBase64, `Upload photo: ${title}`);
        }

        statusDiv.innerText = "Saving story to database... 📝";

        // 2. Handle JSON Update
        const postsUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/data/posts.json`;
        const getPostsRes = await fetch(postsUrl, { headers: { Authorization: `token ${token}` } });
        
        let posts = [];
        let postsSha = null;
        
        if (getPostsRes.ok) {
            const data = await getPostsRes.json();
            postsSha = data.sha;
            posts = JSON.parse(atob(data.content.replace(/\n/g, '')));
        }

        if (id) {
            // Edit existing post
            const index = posts.findIndex(p => p.id == id);
            if (index !== -1) {
                posts[index] = { id: Number(id), title: title, image: finalImagePath, body: body };
            }
        } else {
            // Create new post
            const newPost = { id: timestamp, title: title, image: finalImagePath, body: body };
            posts.unshift(newPost);
        }

        const updatedJsonString = JSON.stringify(posts, null, 2);
        const jsonBase64 = btoa(unescape(encodeURIComponent(updatedJsonString)));
        
        await commitToGitHub('data/posts.json', jsonBase64, id ? `Update post: ${title}` : `New post: ${title}`, postsSha);

        statusDiv.style.color = "#4CAF50";
        statusDiv.innerText = "✅ Success! Website updating in 1 minute.";
        
        resetForm(); // Clear the form
        loadPosts(); // Refresh the list

        setTimeout(() => { statusDiv.innerText = ""; }, 5000);

    } catch (error) {
        statusDiv.style.color = "red";
        statusDiv.innerText = `❌ Error: ${error.message}`;
    } finally {
        btn.disabled = false;
    }
}
