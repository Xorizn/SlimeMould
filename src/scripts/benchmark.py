import json
import time
import random
import networkx as nx
import numpy as np

def load_graph_data(json_path):
    """Memuat data alamat dan membangun graf berbobot menggunakan NetworkX."""
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    G = nx.DiGraph()
    nodes_info = {}
    
    for item in data:
        node_id = item['id']
        coords = item['koordinat']
        G.add_node(node_id, x=coords['x'], y=coords['y'])
        nodes_info[node_id] = item
        
        for edge in item['jalur']:
            G.add_edge(node_id, edge['target_id'], 
                        weight=edge['jarak_meter'], 
                        time=edge['estimasi_menit'],
                        name=edge['nama_jalan'])
    return G, nodes_info

def run_dijkstra(G, start, end):
    """Menghitung rute terpendek absolut menggunakan algoritma Dijkstra."""
    start_time = time.perf_counter()
    try:
        path = nx.dijkstra_path(G, start, end, weight='weight')
        distance = nx.dijkstra_path_length(G, start, end, weight='weight')
        exec_time_ms = (time.perf_counter() - start_time) * 1000
        return {"success": True, "path": path, "distance": distance, "time_ms": exec_time_ms}
    except nx.NetworkXNoPath:
        return {"success": False, "path": [], "distance": float('inf'), "time_ms": 0}

def run_sma(G, start, end, max_iter=100):
    """Simulasi Slime Mold Algorithm (SMA) dengan perbaikan fitur backtracking."""
    start_time = time.perf_counter()
    
    weights = {edge: 1.0 for edge in G.edges()}
    best_path = []
    best_distance = float('inf')
    
    for iteration in range(max_iter):
        current_node = start
        path = [current_node]
        distance = 0
        visited = set([start])
        
        # Menyimpan riwayat simpul buntu khusus untuk iterasi berjalan
        dead_ends = set()
        
        while current_node != end:
            neighbors = list(G.neighbors(current_node))
            unvisited_neighbors = [n for n in neighbors if n not in visited and n not in dead_ends]
            
            if not unvisited_neighbors:
                # Mekanisme Mundur (Backtracking) jika terjebak di ujung buntu
                if len(path) > 1:
                    bad_node = path.pop()
                    dead_ends.add(bad_node) 
                    
                    # Kurangi akumulasi jarak dari simpul yang salah tersebut
                    prev_node = path[-1]
                    distance -= G[prev_node][bad_node]['weight']
                    current_node = prev_node
                    continue
                else:
                    break 
                
            scores = []
            for n in unvisited_neighbors:
                w = weights[(current_node, n)]
                d = G[current_node][n]['weight']
                scores.append(w * (1.0 / (d + 1e-5)))
                
            prob = np.array(scores) / sum(scores)
            next_node = np.random.choice(unvisited_neighbors, p=prob)
            
            distance += G[current_node][next_node]['weight']
            path.append(next_node)
            visited.add(next_node)
            current_node = next_node
            
        if current_node == end:
            if distance < best_distance:
                best_distance = distance
                best_path = path
                
            for i in range(len(path) - 1):
                edge = (path[i], path[i+1])
                weights[edge] += 1.0 / (distance + 1e-5)
                
        for edge in weights:
            weights[edge] *= 0.95 

    exec_time_ms = (time.perf_counter() - start_time) * 1000
    
    if best_distance == float('inf'):
        return {"success": False, "path": [], "distance": float('inf'), "time_ms": exec_time_ms}
        
    return {"success": True, "path": best_path, "distance": best_distance, "time_ms": exec_time_ms}

def run_benchmarks(data_path):
    G, _ = load_graph_data(data_path)
    nodes = list(G.nodes())
    
    print("=====================================================================")
    print("      MOLDSLIME ROUTING SYSTEM: BENCHMARK AUTOMATED TESTING          ")
    print("=====================================================================\n")
    print("### PENGUJIAN 1-3: SKENARIO BERJENJANG (DEKAT VS JAUH)")
    print("| Kategori | Jarak Awal | Node Start -> End | Jarak Dijkstra (m) | Jarak SMA (m) | Deviasi Jarak (%) | Waktu Dijkstra (ms) | Waktu SMA (ms) | Efisiensi Waktu (%) |")
    print("|---|---|---|---|---|---|---|---|---|")
    

    dekat_pairs = [(1, 2), (2, 11), (90, 100)] 
    jauh_pairs = [(1, 100), (2, 99), (11, 90)]
    
    for kat, pairs in [("Dekat", dekat_pairs), ("Jauh", jauh_pairs)]:
        for start, end in pairs:
            if start in G and end in G:
                dij = run_dijkstra(G, start, end)
                sma = run_sma(G, start, end, max_iter=50) 
                
                if dij['success'] and sma['success']:
                    deviasi_jarak = ((sma['distance'] - dij['distance']) / dij['distance']) * 100
                    efisiensi_waktu = ((dij['time_ms'] - sma['time_ms']) / dij['time_ms']) * 100
                    
                    print(f"| {kat} | Dekat | Node {start}->{end} | {dij['distance']:.1f} | {sma['distance']:.1f} | {deviasi_jarak:.2f}% | {dij['time_ms']:.4f} | {sma['time_ms']:.4f} | {efisiensi_waktu:.2f}% |")


    print("\n### PENGUJIAN 4: EVALUASI ITERASI SMA (RUTE TETAP NODE 1 -> 100)")
    print("| Algoritma | Max Iterasi | Total Jarak Rute (m) | Waktu Komputasi (ms) | Status Konvergensi |")
    print("|---|---|---|---|---|")
    
    start_n, end_n = 1, 100
    dij_fixed = run_dijkstra(G, start_n, end_n)
    print(f"| Dijkstra (Ground Truth) | - | {dij_fixed['distance']:.1f} | {dij_fixed['time_ms']:.4f} | Absolut Optimal |")
    
    for iterations in [10, 50, 100]:
        distances = []
        times = []
        for _ in range(5):
            res = run_sma(G, start_n, end_n, max_iter=iterations)
            if res['success']:
                distances.append(res['distance'])
                times.append(res['time_ms'])
        
        avg_dist = np.mean(distances)
        avg_time = np.mean(times)
        status = "Belum Konvergen (Local Optimum)" if avg_dist > dij_fixed['distance'] * 1.05 else "Konvergen Berhasil"
        print(f"| SMA | {iterations} | {avg_dist:.1f} | {avg_time:.4f} | {status} |")

if __name__ == "__main__":
    run_benchmarks('data/address.json')