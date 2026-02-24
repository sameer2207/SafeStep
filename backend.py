"""
SafeStep Platform - Production-Ready Backend
Single Flask server serving both API and static frontend files
"""
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import json
from datetime import datetime
from functools import wraps
import os

# Initialize Flask App
app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SECRET_KEY'] = 'safestep-secret-key-2025'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Enable CORS
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

DATABASE_PATH = 'safestep.db'

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def login_required(f):
    """Decorator to check if user is logged in"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
        return f(*args, **kwargs)
    return decorated_function

def init_db():
    """Initialize database"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            state TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            ip_address TEXT,
            browser_info TEXT,
            login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            logout_time TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            trainer TEXT NOT NULL,
            location TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            capacity INTEGER DEFAULT 100,
            enrolled INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            training_id INTEGER NOT NULL,
            status TEXT DEFAULT 'Active',
            enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (training_id) REFERENCES training_events(id),
            UNIQUE(user_id, training_id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("[OK] Database initialized successfully")

# ==================== STATIC FILE SERVING ====================

@app.route('/')
def serve_index():
    """Serve index.html for root path"""
    try:
        return send_from_directory('.', 'index.html')
    except FileNotFoundError:
        return jsonify({'error': 'index.html not found'}), 404

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, etc.) - but not API routes"""
    # Don't serve API routes through this
    if filename.startswith('api/'):
        return '', 404
    
    try:
        return send_from_directory('.', filename)
    except FileNotFoundError:
        # If file not found, serve index.html (for SPA routing)
        try:
            return send_from_directory('.', 'index.html')
        except:
            return '', 404

# ==================== API ROUTES ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check"""
    return jsonify({'status': 'healthy'}), 200

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    """Check authentication status"""
    if 'user_id' in session:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, email, role, state FROM users WHERE id = ?', (session['user_id'],))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'success': True,
                'logged_in': True,
                'user': dict(user)
            }), 200
    
    return jsonify({
        'success': True,
        'logged_in': False
    }), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        role = data.get('role', 'Participant')
        state = data.get('state', '')
        
        if not all([name, email, password, confirm_password, state]):
            return jsonify({'success': False, 'message': 'All fields required'}), 400
        
        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        
        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Email already registered'}), 409
        
        hashed = generate_password_hash(password, method='pbkdf2:sha256')
        
        cursor.execute('''
            INSERT INTO users (name, email, password, role, state)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, email, hashed, role, state))
        
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        session['user_id'] = user_id
        session['email'] = email
        session['name'] = name
        session['role'] = role
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'id': user_id,
                'name': name,
                'email': email,
                'role': role,
                'state': state
            }
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password required'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password'], password):
            conn.close()
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        cursor.execute('''
            INSERT INTO user_sessions (user_id, ip_address, browser_info)
            VALUES (?, ?, ?)
        ''', (user['id'], request.remote_addr, request.headers.get('User-Agent', '')))
        
        cursor.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', (user['id'],))
        conn.commit()
        conn.close()
        
        session['user_id'] = user['id']
        session['email'] = user['email']
        session['name'] = user['name']
        session['role'] = user['role']
        
        return jsonify({
            'success': True,
            'message': f'Welcome back, {user["name"]}!',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role'],
                'state': user['state']
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """User logout"""
    try:
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/trainings', methods=['GET'])
def get_trainings():
    """Get all trainings"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM training_events ORDER BY start_date DESC')
        trainings = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'trainings': trainings}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/trainings', methods=['POST'])
@login_required
def create_training():
    """Create new training event"""
    try:
        data = request.get_json()
        
        required_fields = ['title', 'start_date', 'end_date', 'trainer', 'location', 'capacity']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO training_events 
            (title, start_date, end_date, trainer, location, latitude, longitude, capacity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        ''', (
            data['title'], data['start_date'], data['end_date'],
            data['trainer'], data['location'],
            data.get('latitude'), data.get('longitude'),
            data['capacity']
        ))
        
        conn.commit()
        training_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Training created successfully',
            'training_id': training_id
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/trainings/<int:training_id>/enroll', methods=['POST'])
@login_required
def enroll_training(training_id):
    """Enroll user in training event"""
    try:
        user_id = session['user_id']
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT capacity, enrolled FROM training_events WHERE id = ?', (training_id,))
        training = cursor.fetchone()
        
        if not training:
            conn.close()
            return jsonify({'success': False, 'message': 'Training not found'}), 404
        
        if training['enrolled'] >= training['capacity']:
            conn.close()
            return jsonify({'success': False, 'message': 'Training is full'}), 409
        
        cursor.execute('SELECT id FROM enrollments WHERE user_id = ? AND training_id = ?', 
                      (user_id, training_id))
        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Already enrolled in this training'}), 409
        
        cursor.execute('''
            INSERT INTO enrollments (user_id, training_id, status)
            VALUES (?, ?, 'Active')
        ''', (user_id, training_id))
        
        cursor.execute('UPDATE training_events SET enrolled = enrolled + 1 WHERE id = ?', (training_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Enrolled successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/user/enrollments', methods=['GET'])
@login_required
def get_user_enrollments():
    """Get trainings user is enrolled in"""
    try:
        user_id = session['user_id']
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT te.*, e.enrollment_date
            FROM training_events te
            JOIN enrollments e ON te.id = e.training_id
            WHERE e.user_id = ?
            ORDER BY te.start_date DESC
        ''', (user_id,))
        
        enrollments = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({'success': True, 'enrollments': enrollments}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/dashboard/stats', methods=['GET'])
@login_required
def get_stats():
    """Get dashboard stats"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) as count FROM training_events')
        total_trainings = cursor.fetchone()['count']
        
        cursor.execute('SELECT SUM(enrolled) as count FROM training_events')
        total_participants = cursor.fetchone()['count'] or 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_trainings': total_trainings,
                'total_participants': total_participants,
                'states_covered': 28,
                'active_alerts': 5
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'success': False, 'message': 'Server error'}), 500

if __name__ == '__main__':
    try:
        init_db()
        
        # Insert sample data if empty
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) as count FROM users')
        if cursor.fetchone()['count'] == 0:
            hashed = generate_password_hash('admin123', method='pbkdf2:sha256')
            cursor.execute('''
                INSERT INTO users (name, email, password, role, state)
                VALUES (?, ?, ?, ?, ?)
            ''', ('Dr. Rajesh Kumar', 'rajesh.kumar@ndma.gov.in', hashed, 'NDMA Admin', 'Delhi'))
            conn.commit()
            print("[OK] Sample user created")
        conn.close()
        
        print("\n" + "="*60)
        print("SafeStep Platform Backend - Production Ready")
        print("="*60)
        print("[RUNNING] Server running")
        print("[DB] Database: safestep.db")
        print("="*60 + "\n")
        
        # Production settings
        app.run(
            debug=False,
            host='0.0.0.0',
            port=5000,
            use_reloader=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Server shutting down...")
    except Exception as e:
        print(f"[ERROR] Fatal error: {e}")
        import traceback
        traceback.print_exc()
