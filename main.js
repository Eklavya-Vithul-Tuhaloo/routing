document.addEventListener("DOMContentLoaded", () => {
    navigateTo(window.location.pathname);
});

window.addEventListener("hashchange", () => {
    navigateTo(window.location.pathname);
});

window.addEventListener("popstate", () => {
    navigateTo(window.location.pathname);
});

function changeRoute(route) {
    history.pushState(null, null, route);
    navigateTo(route);
}

// Function to navigate between different pages based on the URL hash
function navigateTo(path) {
    console.log("Navigating to:", path);
    const routes = {
        "/M00775636/login": loadLoginPage,
        "/M00775636/register": loadRegisterPage,
        "/M00775636/home": loadHomePage,
        "/M00775636/search": loadSearchPage,
        "/M00775636/friends": loadFriendsPage,
        "/M00775636/friend-requests": loadFriendRequestsPage
    };

    const loadPage = routes[path] || loadHomePage;
    loadPage();
}

// Load Login Page
function loadLoginPage() {
    document.getElementById("app").innerHTML = `
        <div class="text-center">
            <h2>Login</h2>
            <form id="loginForm">
                <input type="text" id="username" placeholder="Username" required><br><br>
                <input type="password" id="password" placeholder="Password" required><br><br>
                <button type="submit">Login</button>
                <p id="loginError" style="color: red; display: none;">Invalid username or password</p>
            </form>
            <p>Don't have an account? <a href="javascript:void(0);" onclick="changeRoute('/M00775636/register')">Register</a></p>
            <button onclick="goBack()">Back</button>
        </div>
    `;

    document.getElementById("loginForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Clear previous error message
        document.getElementById("loginError").style.display = "none";

        // Disable the submit button to prevent multiple submissions
        const submitButton = event.target.querySelector("button[type='submit']");
        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";

        loginUser(username, password).then(response => {
            if (response.success) {
                // Handle successful login
                console.log("Login successful");
                changeRoute('/M00775636/home'); // Redirect to home page after successful login
            } else {
                // Show error message
                document.getElementById("loginError").style.display = "block";
            }
        }).catch(error => {
            // Show error message
            document.getElementById("loginError").style.display = "block";
            console.error("Login error:", error);
        }).finally(() => {
            // Re-enable the submit button
            submitButton.disabled = false;
            submitButton.textContent = "Login";
        });
    });
}

// Login Function
async function loginUser(username, password) {
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token); // Store JWT token
            changeRoute("/M00775636/home");
        } else {
            alert(data.message || 'Login failed.');
        }
    } catch (error) {
        alert('Error connecting to the server. Please try again.');
    }
}

// Load Register Page
function loadRegisterPage() {
    document.getElementById("app").innerHTML = `
        <div class="text-center">
            <h2>Register</h2>
            <form id="registerForm">
                <input type="text" id="newUsername" placeholder="Username" required><br><br>
                <input type="password" id="newPassword" placeholder="Password" required><br><br>
                <button type="submit">Register</button>
            </form>
            <p>Already have an account? <a href="javascript:void(0);" onclick="changeRoute('/M00775636/login')">Login</a></p>
            <button onclick="goBack()">Back</button>
        </div>
    `;

    document.getElementById("registerForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("newUsername").value;
        const password = document.getElementById("newPassword").value;

        registerUser(username, password);
    });
}

// Register Function
async function registerUser(username, password) {
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            alert('Registration successful');
            changeRoute("/M00775636/login");
        } else {
            alert(data.message || 'Registration failed.');
        }
    } catch (error) {
        alert('Error connecting to the server. Please try again.');
    }
}

// Load Home Page (after login)
function loadHomePage() {
    if (!localStorage.getItem('token')) {
        changeRoute("/M00775636/login");
        return;
    }

    document.getElementById("app").innerHTML = `
        <div class="text-center">
            <h2>Welcome</h2>
            <button onclick="changeRoute('/M00775636/search')">Search Users</button><br><br>
            <button onclick="changeRoute('/M00775636/friends')">View Friends</button><br><br>
            <button onclick="changeRoute('/M00775636/friend-requests')">Friend Requests</button><br><br>
            <button onclick="logout()">Logout</button>
            <button onclick="goBack()">Back</button>
        </div>
    `;
}

// Logout Function
function logout() {
    localStorage.removeItem('token');
    changeRoute("/M00775636/login");
}

// Load Search Page
async function loadSearchPage() {
    const query = prompt('Enter username to search for:');
    try {
        const response = await fetch(`/search?query=${query}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        if (response.ok) {
            const users = data.users.map(user => `
                <div>
                    <span>${user.username}</span>
                    <button onclick="sendFriendRequest('${user.username}')">Send Friend Request</button>
                </div>
            `).join('');
            document.getElementById("app").innerHTML = `
                <div>
                    <h2>Search Results</h2>
                    ${users}
                    <button onclick="goBack()">Back</button>
                </div>
            `;
        } else {
            alert(data.message || 'Error searching for users.');
        }
    } catch (error) {
        alert('Error connecting to the server. Please try again.');
    }
}

// Send Friend Request
async function sendFriendRequest(username) {
    try {
        const response = await fetch('/friend-request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetUsername: username })
        });
        const data = await response.json();
        alert(data.message);
    } catch (error) {
        alert('Error sending friend request.');
    }
}

// Load Friends Page
async function loadFriendsPage() {
    try {
        const response = await fetch('/friends', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        if (response.ok) {
            const friends = data.friends.map(username => `
                <div>${username}</div>
            `).join('');
            document.getElementById("app").innerHTML = `
                <div>
                    <h2>Your Friends</h2>
                    ${friends || '<p>You have no friends yet.</p>'}
                    <button onclick="goBack()">Back</button>
                </div>
            `;
        } else {
            alert(data.message || 'Error loading friends.');
        }
    } catch (error) {
        alert('Error connecting to the server.');
    }
}

// Load Friend Requests Page
async function loadFriendRequestsPage() {
    try {
        const response = await fetch('/friend-requests', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();

        if (response.ok) {
            const requests = data.requests.map(request => `
                <div>
                    <span>${request.from}</span>
                    <button onclick="acceptFriendRequest('${request.from}')">Accept</button>
                    <button onclick="declineFriendRequest('${request.from}')">Decline</button>
                </div>
            `).join('');
            document.getElementById("app").innerHTML = `
                <div>
                    <h2>Pending Friend Requests</h2>
                    ${requests || '<p>No pending requests.</p>'}
                    <button onclick="goBack()">Back</button>
                </div>
            `;
        } else {
            alert(data.message || 'Error fetching friend requests.');
        }
    } catch (error) {
        alert('Error connecting to the server.');
    }
}

// Accept Friend Request
async function acceptFriendRequest(fromUsername) {
    try {
        const response = await fetch('/accept-friend', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fromUsername })
        });
        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            loadFriendRequestsPage(); // Refresh the list
        } else {
            alert(data.message || 'Error accepting friend request.');
        }
    } catch (error) {
        alert('Error connecting to the server.');
    }
}

// Decline Friend Request
async function declineFriendRequest(fromUsername) {
    try {
        const response = await fetch('/decline-friend', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fromUsername })
        });
        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            loadFriendRequestsPage(); // Refresh the list
        } else {
            alert(data.message || 'Error declining friend request.');
        }
    } catch (error) {
        alert('Error connecting to the server.');
    }
}

// Go Back Function
function goBack() {
    history.back();
}