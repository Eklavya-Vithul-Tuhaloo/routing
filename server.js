const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const mongoUrl = 'mongodb+srv://et523:zzclDLjLXs7Cvsan@cluster0.dpz3g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'friend-system';
let db;

const secretKey = 'yourSecretKey'; // For JWT
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, '/')));

// MongoDB connection
MongoClient.connect(mongoUrl, { useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        console.log('Connected to MongoDB');
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB:', err);
    });



// User Registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists.' });
    }

    const newUser = { username, password: hashedPassword };
    await usersCollection.insertOne(newUser);
    res.status(201).json({ message: 'User created successfully.' });
});

// User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: '1h' });
    res.json({ token });
});

// Middleware for JWT authentication
function authenticate(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });
        req.user = decoded;
        next();
    });
}

// Search for users
app.get('/search', authenticate, async (req, res) => {
    const { query } = req.query;
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({ username: { $regex: query, $options: 'i' } }).toArray();
    res.json({ users });
});

// Send friend request
app.post('/friend-request', authenticate, async (req, res) => {
    const { targetUsername } = req.body;
    const userCollection = db.collection('users');
    const friendRequestsCollection = db.collection('friendRequests');

    const targetUser = await userCollection.findOne({ username: targetUsername });
    if (!targetUser) return res.status(400).json({ message: 'User not found.' });

    const existingRequest = await friendRequestsCollection.findOne({ from: req.user.username, to: targetUsername });
    if (existingRequest) return res.status(400).json({ message: 'Friend request already sent.' });

    await friendRequestsCollection.insertOne({ from: req.user.username, to: targetUsername, status: 'pending' });
    res.status(200).json({ message: 'Friend request sent.' });
});

// Accept friend request
app.post('/accept-friend', authenticate, async (req, res) => {
    const { fromUsername } = req.body;
    const friendRequestsCollection = db.collection('friendRequests');
    const friendsCollection = db.collection('friends');

    const request = await friendRequestsCollection.findOne({ from: fromUsername, to: req.user.username, status: 'pending' });
    if (!request) return res.status(400).json({ message: 'No pending friend request.' });

    await friendRequestsCollection.updateOne({ _id: request._id }, { $set: { status: 'accepted' } });
    await friendsCollection.insertOne({ user1: req.user.username, user2: fromUsername });
    await friendsCollection.insertOne({ user1: fromUsername, user2: req.user.username });

    res.status(200).json({ message: 'Friend request accepted.' });
});

// Get friends list
app.get('/friends', authenticate, async (req, res) => {
    const friendsCollection = db.collection('friends');
    try {
        const friends = await friendsCollection.find({
            $or: [{ user1: req.user.username }, { user2: req.user.username }]
        }).toArray();

        // Use a Set to eliminate duplicates
        const friendUsernames = new Set(
            friends.map(friend => (friend.user1 === req.user.username ? friend.user2 : friend.user1))
        );

        res.json({ success: true, friends: Array.from(friendUsernames) });
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ success: false, message: 'Error fetching friends.' });
    }
});

// Get pending friend requests
app.get('/friend-requests', authenticate, async (req, res) => {
    const friendRequestsCollection = db.collection('friendRequests');

    try {
        const requests = await friendRequestsCollection
            .find({ to: req.user.username, status: 'pending' })
            .toArray();
        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({ success: false, message: 'Error fetching friend requests.' });
    }
});

// Decline friend request
app.post('/decline-friend', authenticate, async (req, res) => {
    const { fromUsername } = req.body;
    const friendRequestsCollection = db.collection('friendRequests');

    try {
        const result = await friendRequestsCollection.deleteOne({
            from: fromUsername,
            to: req.user.username,
            status: 'pending'
        });

        if (result.deletedCount > 0) {
            res.status(200).json({ success: true, message: 'Friend request declined.' });
        } else {
            res.status(400).json({ success: false, message: 'No pending friend request found.' });
        }
    } catch (error) {
        console.error('Error declining friend request:', error);
        res.status(500).json({ success: false, message: 'Error declining friend request.' });
    }
});
