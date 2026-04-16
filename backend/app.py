import os
import mysql.connector
import joblib
import pandas as pd

from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from flask_cors import CORS

# ==========================
# INIT
# ==========================
load_dotenv()

app = Flask(
    __name__,
    template_folder="../frontend",
    static_folder="../frontend",
    static_url_path=''
)
CORS(app)

# ==========================
# LOAD ML MODEL
# ==========================
model = joblib.load("model.pkl")

# 🔥 DEBUG (run once, optional)
print("MODEL FEATURES:", model.feature_names_in_)

# ==========================
# DB CONNECTION
# ==========================
def get_db():
    return mysql.connector.connect(
        host=os.getenv("HOST", "localhost"),
        user=os.getenv("USER", "root"),
        password=os.getenv("PASSWORD", ""),
        database=os.getenv("DATABASE", "solar_monitor")
    )

# ==========================
# FRONTEND
# ==========================
@app.route('/')
def home():
    return render_template("index.html")

# ==========================
# POST API (ESP32)
# ==========================
@app.route('/api/sensor-data', methods=['POST'])
def receive_data():

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    # Extract values
    light = data.get("light")
    temp = data.get("temp")
    voltage = data.get("voltage")
    current = data.get("current")

    # Handle sensor error
    if temp == -999.0:
        temp = None

    if None in [light, voltage, current]:
        return jsonify({"error": "Missing fields"}), 400

    # ==========================
    # ML PREDICTION
    # ==========================
    try:
        # Create features with ALL required columns
        features = pd.DataFrame([{
            "temperature": float(temp if temp is not None else 0),
            "voltage": float(voltage if voltage is not None else 0),
            "current": float(current if current is not None else 0),
            "light": float(light if light is not None else 0)
        }])

        # 🔥 IMPORTANT: Match model feature order
        features = features[model.feature_names_in_]

        prediction = model.predict(features)[0]

    except Exception as e:
        print("ML ERROR:", e)
        prediction = None

    # ==========================
    # SAVE TO DATABASE
    # ==========================
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Insert sensor data
        cursor.execute("""
            INSERT INTO sensor_readings (voltage, current, temperature, light)
            VALUES (%s, %s, %s, %s)
        """, (voltage, current, temp, light))

        conn.commit()

        # Get inserted ID
        reading_id = cursor.lastrowid

        # Insert prediction into second table
        if prediction is not None:
            cursor.execute("""
                INSERT INTO efficiency_predictions (reading_id, efficiency_pct)
                VALUES (%s, %s)
            """, (reading_id, float(prediction)))

            conn.commit()

    except Exception as e:
        print("DB ERROR:", e)
        return jsonify({"error": "Database error"}), 500

    finally:
        cursor.close()
        conn.close()

    # ==========================
    # RESPONSE
    # ==========================
    result = {
        "light": light,
        "temp": temp,
        "voltage": voltage,
        "current": current,
        "prediction": float(prediction) if prediction is not None else None,
        "message": "Data stored + predicted successfully"
    }

    print("DATA SAVED:", result, flush=True)

    return jsonify(result)

# ==========================
# GET LATEST DATA
# ==========================
@app.route('/api/latest', methods=['GET'])
def get_latest():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            sr.voltage, 
            sr.current, 
            sr.temperature, 
            sr.light,
            ep.efficiency_pct AS prediction
        FROM sensor_readings sr
        LEFT JOIN efficiency_predictions ep 
            ON sr.id = ep.reading_id
        ORDER BY sr.id DESC
        LIMIT 1
    """)

    data = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify(data)

# ==========================
# RUN SERVER
# ==========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)