import os
from flask import Flask, request, jsonify
from mpxj import reader

app = Flask(__name__)

@app.route('/convert', methods=['POST'])
def convert():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if not file.filename.endswith('.mpp'):
        return jsonify({'error': 'File must be a .mpp file'}), 400
        
    temp_path = '/tmp/temp_project.mpp'
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    file.save(temp_path)
    
    try:
        project = reader.read(temp_path)
        tasks = []
        for task in project.all_tasks:
            # Skip empty tasks or project summary task (outline level 0)
            outline_level = task.outline_level
            if outline_level == 0 or not task.name:
                continue
                
            start = task.start.strftime('%Y-%m-%d') if task.start else ''
            finish = task.finish.strftime('%Y-%m-%d') if task.finish else ''
            
            duration_hours = 0
            if task.duration:
                # duration value is usually in hours/days depending on project configuration
                duration_hours = task.duration.duration
                
            tasks.append({
                'uid': str(task.unique_id),
                'name': task.name,
                'start': start,
                'finish': finish,
                'hours': float(duration_hours),
                'isJob': outline_level == 1,
                'outlineLevel': int(outline_level)
            })
            
        return jsonify({'status': 'success', 'tasks': tasks})
    except Exception as e:
        print("MPXJ parsing error:", str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
