const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

function serverDijkstra(nodes, startId, endId) {
    const distances = {};
    const prev = {};
    const pq = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    nodes.forEach(n => { distances[n.id] = Infinity; prev[n.id] = null; });
    distances[startId] = 0;
    pq.push({ id: startId, dist: 0 });

    while (pq.length > 0) {
        pq.sort((a, b) => a.dist - b.dist);
        const curr = pq.shift();

        if (curr.id === endId) break;
        if (curr.dist > distances[curr.id]) continue;

        const u = nodeMap.get(curr.id);
        if (!u || !u.jalur) continue;

        for (let edge of u.jalur) {
            const alt = distances[curr.id] + edge.jarak_meter;
            if (alt < distances[edge.target_id]) {
                distances[edge.target_id] = alt;
                prev[edge.target_id] = curr.id;
                pq.push({ id: edge.target_id, dist: alt });
            }
        }
    }

    if (distances[endId] === Infinity) {
        return { success: false, error: "Jalur tidak ditemukan" };
    }

    const pathIds = [];
    let u = endId;
    while (u !== null) {
        pathIds.unshift(u);
        u = prev[u];
    }

    const pathCoords = [];
    let totalTime = 0;

    for (let i = 0; i < pathIds.length; i++) {
        const currNode = nodeMap.get(pathIds[i]);
        pathCoords.push(currNode.koordinat);

        if (i < pathIds.length - 1) {
            const nextId = pathIds[i + 1];
            const edge = currNode.jalur.find(e => e.target_id === nextId);
            if (edge) {
                totalTime += edge.estimasi_menit;
            }
        }
    }

    return {
        success: true,
        total_distance: distances[endId],
        total_time: totalTime,
        path_ids: pathIds,
        path_coords: pathCoords
    };
}

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

app.get('/api/path', (req, res) => {
    const startId = parseInt(req.query.start);
    const endId = parseInt(req.query.end);

    if (isNaN(startId) || !endId) {
        return res.status(400).json({ success: false, error: "Parameter start dan end ID harus diisi." });
    }

    const dataPath = path.join(__dirname, 'data', 'address.json');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, error: "Gagal membaca database lokal." });
        }
        try {
            const nodes = JSON.parse(data);
            const result = serverDijkstra(nodes, startId, endId);
            res.json(result);
        } catch (e) {
            res.status(500).json({ success: false, error: "Gagal memproses kalkulasi rute." });
        }
    });
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;