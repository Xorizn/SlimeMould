// DATA STATE
let addressData = [];

// CONFIG & STATE
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const sidebarList = document.getElementById('address-list');
const searchInputA = document.getElementById('search-input-a');
const searchInputB = document.getElementById('search-input-b');
const detailCard = document.getElementById('detail-card');

let selectedId = null;
let hoveredId = null;
let pointA = null;
let pointB = null;
let currentPath = null;
let currentFocus = 'a';
let scale = 1;
let isSearching = false;
let searchBranches = [];
const EXPLORE_COUNT = 15; // Number of simultaneous search paths
let offset = { x: 0, y: 0 };
const mapSize = 1000; // Original data range [0, 999]

// INIT
async function init() {
    try {
        const response = await fetch('/api/addresses');
        addressData = await response.json();
        
        resize();
        renderList(addressData);
        requestAnimationFrame(animate);

        window.addEventListener('resize', resize);
        
        const handleSearch = (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = addressData.filter(item => 
                item.kelurahan.toLowerCase().includes(term) ||
                item.kecamatan.toLowerCase().includes(term) ||
                item.kota_kabupaten.toLowerCase().includes(term) ||
                item.jalur.some(r => r.nama_jalan.toLowerCase().includes(term))
            );
            renderList(filtered);
        };

        searchInputA.addEventListener('input', handleSearch);
        searchInputB.addEventListener('input', handleSearch);

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('click', handleClick);

        document.getElementById('status-bar').textContent = `${addressData.length} nodes mapped | Hover to inspect | Click to focus`;
    } catch (err) {
        console.error('Error initializing application:', err);
        document.getElementById('status-bar').textContent = 'Failed to load address data';
    }
}

function resize() {
    const size = Math.min(window.innerWidth - 350, window.innerHeight) * 0.9;
    canvas.width = size;
    canvas.height = size;
    scale = size / mapSize;
}

// RENDERING LIST
function renderList(data) {
    sidebarList.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = `address-item ${selectedId === item.id ? 'selected' : ''}`;
        div.dataset.id = item.id;
        div.innerHTML = `
            <div class="id">NODE #${item.id}</div>
            <div class="title">${item.kelurahan}, ${item.kecamatan}</div>
            <div class="subtitle">${item.kota_kabupaten}</div>
        `;
        div.onclick = () => selectAddress(item.id, true);
        sidebarList.appendChild(div);
    });
}

// MAP INTERACTION
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    let closest = null;
    let minDist = 30; // Threshold in units

    addressData.forEach(item => {
        const dist = Math.hypot(item.koordinat.x - mouseX, item.koordinat.y - mouseY);
        if (dist < minDist) {
            minDist = dist;
            closest = item.id;
        }
    });

    hoveredId = closest;
    canvas.style.cursor = closest ? 'pointer' : 'crosshair';
}

function handleClick() {
    if (hoveredId) {
        selectAddress(hoveredId, true);
    }
}

function selectAddress(id, scroll = false) {
    selectedId = id;
    const data = addressData.find(d => d.id === id);
    
    // Set Point A or B
    if (currentFocus === 'a') {
        pointA = data;
        searchInputA.value = `${data.kelurahan}, ${data.kecamatan}`;
        currentFocus = 'b';
        searchInputB.focus();
    } else if (currentFocus === 'b') {
        pointB = data;
        searchInputB.value = `${data.kelurahan}, ${data.kecamatan}`;
        currentFocus = 'a';
        searchInputA.focus();
    }

    // Enable search button if both points selected
    document.getElementById('btn-find-path').disabled = !(pointA && pointB);

    // Update UI list
    document.querySelectorAll('.address-item').forEach(el => {
        const elId = parseInt(el.dataset.id);
        el.classList.toggle('selected', elId === id || (pointA && elId === pointA.id) || (pointB && elId === pointB.id));
        if (scroll && elId === id) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });

    // Update Detail Card
    if (data) {
        document.getElementById('val-id').textContent = `NODE #${data.id}`;
        document.getElementById('val-title').textContent = `${data.kelurahan}, ${data.kecamatan}`;
        document.getElementById('val-coords').textContent = `[${data.koordinat.x}, ${data.koordinat.y}]`;
        document.getElementById('val-region').textContent = `${data.kelurahan}, ${data.kecamatan}, ${data.kota_kabupaten}, ${data.provinsi}`;
        document.getElementById('val-postcode').textContent = data.kode_pos;
        document.getElementById('val-no').textContent = data.nomor_alamat;

        const routesList = document.getElementById('routes-list');
        routesList.innerHTML = '<div class="section-label">Available Routes</div>';
        data.jalur.forEach(r => {
            const pill = document.createElement('div');
            pill.className = 'route-pill';
            pill.innerHTML = `
                <div class="route-header">
                    <span class="route-name">${r.nama_jalan}</span>
                    <span class="route-meta">${r.arah}</span>
                </div>
                <div class="route-meta">
                    ${r.rt} / ${r.rw} • ${r.jarak_meter}m • ~${r.estimasi_menit} min
                </div>
            `;
            routesList.appendChild(pill);
        });

        detailCard.classList.add('active');
    }
}

function closeDetail() {
    detailCard.classList.remove('active');
    selectedId = null;
    document.querySelectorAll('.address-item').forEach(el => el.classList.remove('selected'));
}

// ANIMATION LOOP
function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
    
    // Draw edges (subtle)
    drawEdges();

    // Update and Draw exploratory search if searching
    if (isSearching) {
        updateSearchBranches();
        drawSearchBranches();
    }

    // Draw path if exists
    if (currentPath) {
        drawPath(currentPath, time);
    }

    addressData.forEach(item => {
        drawNode(item, time);
    });

    requestAnimationFrame(animate);
}

function drawSearchBranches() {
    searchBranches.forEach(branch => {
        if (branch.path.length < 2) return;

        ctx.strokeStyle = branch.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(branch.path[0].koordinat.x * scale, branch.path[0].koordinat.y * scale);
        for(let i=1; i<branch.path.length; i++) {
            ctx.lineTo(branch.path[i].koordinat.x * scale, branch.path[i].koordinat.y * scale);
        }
        ctx.stroke();
        
        // Draw head
        const head = branch.path[branch.path.length-1];
        ctx.fillStyle = branch.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(head.koordinat.x * scale, head.koordinat.y * scale, 2, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

function drawEdges() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    addressData.forEach(node => {
        node.jalur.forEach(route => {
            const target = addressData.find(n => n.id === route.target_id);
            if (target) {
                ctx.moveTo(node.koordinat.x * scale, node.koordinat.y * scale);
                ctx.lineTo(target.koordinat.x * scale, target.koordinat.y * scale);
            }
        });
    });
    ctx.stroke();
}

function drawPath(pathData, time) {
    const coords = pathData.path_coords;
    
    // Draw glow line
    ctx.shadowBlur = 15;
    ctx.shadowColor = varToHex('--primary-glow');
    ctx.strokeStyle = varToHex('--primary-glow');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(coords[0].x * scale, coords[0].y * scale);
    for (let i = 1; i < coords.length; i++) {
        ctx.lineTo(coords[i].x * scale, coords[i].y * scale);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0; // Reset shadow

    // Draw "slime flow" animation
    const flowPos = (time / 2000) % 1; // 0 to 1
    const segmentCount = coords.length - 1;
    const targetSegment = Math.floor(flowPos * segmentCount);
    const segmentProgress = (flowPos * segmentCount) % 1;
    
    if (coords[targetSegment] && coords[targetSegment + 1]) {
        const p1 = coords[targetSegment];
        const p2 = coords[targetSegment + 1];
        
        const x = (p1.x + (p2.x - p1.x) * segmentProgress) * scale;
        const y = (p1.y + (p2.y - p1.y) * segmentProgress) * scale;
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 1000; i += 100) {
        ctx.moveTo(i * scale, 0);
        ctx.lineTo(i * scale, canvas.height);
        ctx.moveTo(0, i * scale);
        ctx.lineTo(canvas.width, i * scale);
    }
    ctx.stroke();
}

function drawNode(item, time) {
    const x = item.koordinat.x * scale;
    const y = item.koordinat.y * scale;
    const isSelected = selectedId === item.id;
    const isHovered = hoveredId === item.id;
    const isA = pointA && pointA.id === item.id;
    const isB = pointB && pointB.id === item.id;

    // Outer glow
    if (isSelected || isHovered || isA || isB) {
        const pulse = Math.sin(time / 200) * 5 + 15;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, pulse * scale);
        
        let color = 'rgba(255, 255, 255, 0.2)';
        if (isA) color = 'rgba(0, 242, 255, 0.4)';
        else if (isB) color = 'rgba(191, 255, 0, 0.4)';
        else if (isSelected) color = 'rgba(255, 255, 255, 0.3)';
        
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, pulse * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    // Core dot
    let dotColor = 'rgba(255,255,255,0.4)';
    if (isA) dotColor = varToHex('--primary-glow');
    else if (isB) dotColor = varToHex('--secondary-glow');
    else if (isSelected) dotColor = 'white';
    else if (isHovered) dotColor = 'rgba(255,255,255,0.8)';

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x, y, (isSelected || isA || isB ? 6 : 3) * scale, 0, Math.PI * 2);
    ctx.fill();

    // ID Label if hovered
    if (isHovered && !isSelected && !isA && !isB) {
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`#${item.id}`, x + 10, y - 10);
    }
}

function varToHex(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function setFocus(type) {
    currentFocus = type;
}

async function calculateRoute() {
    if (!pointA || !pointB) return;
    
    const btn = document.getElementById('btn-find-path');
    btn.disabled = true;
    btn.textContent = 'Searching...';
    
    // Start animation state
    isSearching = true;
    currentPath = null;
    searchBranches = [];
    
    // Initialize search branches starting from Point A
    for(let i=0; i<EXPLORE_COUNT; i++) {
        searchBranches.push({
            currentId: pointA.id,
            path: [pointA],
            finished: false,
            color: Math.random() > 0.5 ? varToHex('--primary-glow') : varToHex('--secondary-glow'),
            speed: 1 + Math.random() * 2
        });
    }

    try {
        // Parallel: Fetch actual path from server
        const fetchPromise = fetch(`/api/path?start=${pointA.id}&end=${pointB.id}`).then(r => r.json());
        
        // Let the animation play for at least 2 seconds for visual impact
        const [result] = await Promise.all([
            fetchPromise,
            new Promise(resolve => setTimeout(resolve, 2500))
        ]);
        
        isSearching = false;
        
        if (result.success) {
            currentPath = result;
            showRouteInfo(result);
        } else {
            alert('Path not found: ' + result.error);
        }
    } catch (err) {
        console.error('Error calculating route:', err);
        isSearching = false;
        alert('Error connecting to server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Find Fastest Path';
    }
}

// Update Search Branches Logic
function updateSearchBranches() {
    if (!isSearching) return;

    searchBranches.forEach(branch => {
        if (branch.finished) return;

        const currNode = addressData.find(n => n.id === branch.currentId);
        if (!currNode) return;

        // Choose a random neighbor that isn't already in the path (to avoid loops)
        const possibleNext = currNode.jalur.filter(j => !branch.path.some(p => p.id === j.target_id));
        
        if (possibleNext.length > 0) {
            // Heuristic: prefer nodes that are closer to Point B
            possibleNext.sort((a, b) => {
                const nodeA = addressData.find(n => n.id === a.target_id);
                const nodeB = addressData.find(n => n.id === b.target_id);
                const distA = Math.hypot(nodeA.koordinat.x - pointB.koordinat.x, nodeA.koordinat.y - pointB.koordinat.y);
                const distB = Math.hypot(nodeB.koordinat.x - pointB.koordinat.x, nodeB.koordinat.y - pointB.koordinat.y);
                return (distA - distB) + (Math.random() - 0.5) * 100; // Add some randomness
            });

            // Pick one of the top 2 candidates
            const nextIdx = Math.random() > 0.7 ? 1 : 0;
            const chosen = possibleNext[Math.min(nextIdx, possibleNext.length - 1)];
            const nextNode = addressData.find(n => n.id === chosen.target_id);
            
            branch.path.push(nextNode);
            branch.currentId = nextNode.id;

            if (nextNode.id === pointB.id) {
                branch.finished = true;
            }
        } else {
            // Dead end, restart from a random point on current path or Point A
            const restartIdx = Math.floor(Math.random() * branch.path.length);
            branch.path = branch.path.slice(0, restartIdx + 1);
            branch.currentId = branch.path[restartIdx].id;
        }

        // Limit path length to prevent memory issues
        if (branch.path.length > 50) {
            branch.path = [pointA];
            branch.currentId = pointA.id;
        }
    });
}

function showRouteInfo(data) {
    const panel = document.getElementById('route-panel');
    const summary = document.getElementById('route-summary');
    
    panel.classList.add('active');
    summary.innerHTML = `
        <div style="color: var(--primary-glow); font-weight: bold;">Fastest Connection Found</div>
        <div style="margin-top: 5px;">
            Distance: ${(data.total_distance / 1000).toFixed(2)} km<br>
            Est. Time: ${data.total_time} minutes<br>
            Nodes: ${data.path_ids.length}
        </div>
    `;
}

function clearRoute() {
    pointA = null;
    pointB = null;
    currentPath = null;
    searchInputA.value = '';
    searchInputB.value = '';
    document.getElementById('route-panel').classList.remove('active');
    document.getElementById('btn-find-path').disabled = true;
    renderList(addressData);
}

init();
