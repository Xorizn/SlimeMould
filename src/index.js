const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/addresses', (req, res) => {
    const dataPath = path.join(__dirname, 'data', 'address.json');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading address.json:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        try {
            res.json(JSON.parse(data));
        } catch (parseErr) {
            console.error('Error parsing address.json:', parseErr);
            res.status(500).json({ error: 'Error parsing data' });
        }
    });
});

app.get('/api/path', (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ success: false, error: 'Parameter start dan end wajib diisi' });
    }

    res.json({
        success: true,
        total_distance: 1500,
        total_time: 12,
        path_ids: [parseInt(start), parseInt(end)],
        path_coords: [
            { x: 200, y: 200 },
            { x: 500, y: 500 }
        ]
    });
});

app.get((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;