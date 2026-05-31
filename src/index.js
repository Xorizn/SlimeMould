const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get address data
app.get('/api/addresses', (req, res) => {
    const dataPath = path.join(__dirname, 'data', 'address.json');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading address.json:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (parseErr) {
            console.error('Error parsing address.json:', parseErr);
            res.status(500).json({ error: 'Error parsing data' });
        }
    });
});

// API endpoint for pathfinding
app.get('/api/path', (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: 'Missing start or end ID' });
    }

    // Call Python script from the 'scripts' directory
    const scriptPath = path.join(__dirname, 'scripts', 'pathfinder.py');
    exec(`python "${scriptPath}" ${start} ${end}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({ error: 'Internal Server Error', details: stderr });
        }
        try {
            const result = JSON.parse(stdout);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.json(result);
        } catch (parseErr) {
            console.error('Error parsing Python output:', parseErr);
            console.error('Raw stdout:', stdout);
            res.status(500).json({ error: 'Error processing path', stdout });
        }
    });
});

// For any other routes, serve the index.html (SPA-like)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
