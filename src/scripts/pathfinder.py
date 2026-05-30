import json
import networkx as nx
import math
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

def find_path(start_id, end_id):
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_path = os.path.join(base_dir, 'data', 'address.json')
        
        with open(data_path, 'r') as f:
            data = json.load(f)
        
        G = nx.Graph()
        
        for node in data:
            node_id = node['id']
            G.add_node(node_id, pos=(node['koordinat']['x'], node['koordinat']['y']))
            for route in node['jalur']:
                target_id = route['target_id']
                weight = route['jarak_meter']
                G.add_edge(node_id, target_id, weight=weight)
        
        path_ids = nx.shortest_path(G, source=start_id, target=end_id, weight='weight')
        
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
        
        return {
            "success": True,
            "path_ids": path_ids,
            "path_coords": path_coords,
            "total_distance": total_dist,
            "total_time": total_time
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


@app.route('/api/path', methods=['GET'])
def api_get_path():
    start_id = request.args.get('start')
    end_id = request.args.get('end')
    
    if not start_id or not end_id:
        return jsonify({"success": False, "error": "Missing start or end ID"}), 400
        
    try:
        start_id = int(start_id)
        end_id = int(end_id)
    except ValueError:
        return jsonify({"success": False, "error": "Start and end IDs must be integers"}), 400

    res = find_path(start_id, end_id)
    
    if not res.get("success"):
        return jsonify(res), 500
        
    return jsonify(res)
