import sys
import json
import networkx as nx
import math

import os

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
                # Use jarak_meter or coordinate distance as weight
                weight = route['jarak_meter']
                G.add_edge(node_id, target_id, weight=weight)
        
        # Find shortest path using Dijkstra (standard in networkx)
        # Physarum models often converge to Dijkstra-like paths in networks
        path_ids = nx.shortest_path(G, source=start_id, target=end_id, weight='weight')
        
        # Get coordinates for the path
        path_coords = []
        total_dist = 0
        total_time = 0
        
        for i in range(len(path_ids)):
            curr_node = next(n for n in data if n['id'] == path_ids[i])
            path_coords.append(curr_node['koordinat'])
            
            if i < len(path_ids) - 1:
                # Find the edge info for metadata (check both nodes in the path)
                u = path_ids[i]
                v = path_ids[i+1]
                
                # Look in u's jalur for v
                u_node = next(n for n in data if n['id'] == u)
                edge_data = next((r for r in u_node['jalur'] if r['target_id'] == v), None)
                
                if not edge_data:
                    # Look in v's jalur for u
                    v_node = next(n for n in data if n['id'] == v)
                    edge_data = next((r for r in v_node['jalur'] if r['target_id'] == u), None)
                
                if edge_data:
                    total_dist += edge_data['jarak_meter']
                    total_time += edge_data['estimasi_menit']
                else:
                    # Fallback to coordinate distance if metadata missing
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
