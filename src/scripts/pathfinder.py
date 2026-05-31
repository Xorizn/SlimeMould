import sys
import json
import networkx as nx
import math
import numpy as np
import os

def physarum_solver(G, start_id, end_id, iterations=500, dt=0.01):
    nodes = list(G.nodes())
    node_to_idx = {node_id: i for i, node_id in enumerate(nodes)}
    idx_to_node = {i: node_id for i, node_id in enumerate(nodes)}
    num_nodes = len(nodes)
    
    if start_id not in node_to_idx or end_id not in node_to_idx:
        return []
    
    s = node_to_idx[start_id]
    d = node_to_idx[end_id]
    
    # Initialize conductivity D and lengths L
    D = np.zeros((num_nodes, num_nodes))
    L = np.zeros((num_nodes, num_nodes))
    
    for u, v, data in G.edges(data=True):
        ui, vi = node_to_idx[u], node_to_idx[v]
        D[ui, vi] = D[vi, ui] = 1.0
        # Use a small epsilon to avoid division by zero if weight is 0
        L[ui, vi] = L[vi, ui] = max(data['weight'], 1e-6)
    
    I0 = 1.0
    
    for _ in range(iterations):
        # W_ij = D_ij / L_ij
        W = np.divide(D, L, out=np.zeros_like(D), where=L!=0)
        
        # Construct Laplacian matrix A: A_ii = sum_j W_ij, A_ij = -W_ij
        A = -W
        np.fill_diagonal(A, 0)
        row_sums = np.sum(W, axis=1)
        np.fill_diagonal(A, row_sums)
        
        # Balance vector B: net flow leaving node
        B = np.zeros(num_nodes)
        B[s] = I0
        B[d] = -I0
        
        # Fix P[d] = 0 to solve the singular system
        A_reduced = np.delete(A, d, axis=0)
        A_reduced = np.delete(A_reduced, d, axis=1)
        B_reduced = np.delete(B, d)
        
        try:
            P_reduced = np.linalg.solve(A_reduced, B_reduced)
            P = np.insert(P_reduced, d, 0)
        except np.linalg.LinAlgError:
            # If the graph is not connected or other numerical issues
            break
            
        # Calculate Flux Q_ij = W_ij * (P_i - P_j)
        P_diff = P[:, np.newaxis] - P[np.newaxis, :]
        Q = W * P_diff
        
        # Update D: D_new = D + dt * (|Q| - D)
        D = D + dt * (np.abs(Q) - D)
        
    # Extract path: follow the highest conductivity from s to d
    path_ids = [start_id]
    curr = s
    visited = {s}
    
    for _ in range(num_nodes):
        if curr == d:
            break
        
        # Neighbors of current node
        neighbors = np.where(G.adj[idx_to_node[curr]])[0]
        # We need to map neighbor node IDs back to indices
        neighbor_indices = [node_to_idx[n] for n in G.neighbors(idx_to_node[curr])]
        
        if not neighbor_indices:
            break
            
        # Find neighbor with max conductivity that hasn't been visited
        best_idx = -1
        max_cond = -1.0
        
        for ni in neighbor_indices:
            if ni not in visited:
                cond = D[curr, ni]
                if cond > max_cond:
                    max_cond = cond
                    best_idx = ni
        
        if best_idx == -1:
            break
            
        curr = best_idx
        path_ids.append(idx_to_node[curr])
        visited.add(curr)
        
    if path_ids[-1] != end_id:
        return []

    return path_ids

def find_path(start_id, end_id):
    try:
        # Get the path to address.json relative to this script
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_path = os.path.join(base_dir, 'data', 'address.json')
        
        with open(data_path, 'r') as f:
            data = json.load(f)
        
        G = nx.Graph()
        
        # Build the graph
        for node in data:
            node_id = node['id']
            G.add_node(node_id, pos=(node['koordinat']['x'], node['koordinat']['y']))
            for route in node['jalur']:
                target_id = route['target_id']
                weight = route['jarak_meter']
                G.add_edge(node_id, target_id, weight=weight)
        
        # Find path using Physarum Solver
        path_ids = physarum_solver(G, start_id, end_id)
        
        if not path_ids:
            return {"success": False, "error": "Physarum Solver failed to find a path"}
        
        # Get coordinates for the path
        path_coords = []
        total_dist = 0
        total_time = 0
        
        for i in range(len(path_ids)):
            curr_node = next(n for n in data if n['id'] == path_ids[i])
            path_coords.append(curr_node['koordinat'])
            
            if i < len(path_ids) - 1:
                u = path_ids[i]
                v = path_ids[i+1]
                
                u_node = next(n for n in data if n['id'] == u)
                edge_data = next((r for r in u_node['jalur'] if r['target_id'] == v), None)
                
                if not edge_data:
                    v_node = next(n for n in data if n['id'] == v)
                    edge_data = next((r for r in v_node['jalur'] if r['target_id'] == u), None)
                
                if edge_data:
                    total_dist += edge_data['jarak_meter']
                    total_time += edge_data['estimasi_menit']
                else:
                    dist = math.hypot(u_node['koordinat']['x'] - v_node['koordinat']['x'], 
                                      u_node['koordinat']['y'] - v_node['koordinat']['y'])
                    total_dist += dist * 10
                    total_time += dist / 5
        
        result = {
            "success": True,
            "path_ids": path_ids,
            "path_coords": path_coords,
            "total_distance": total_dist,
            "total_time": total_time
        }
        return result

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing start or end ID"}))
        sys.exit(1)
    
    start_id = int(sys.argv[1])
    end_id = int(sys.argv[2])
    
    res = find_path(start_id, end_id)
    print(json.dumps(res))
