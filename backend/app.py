import os

import mysql.connector
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from flask import render_template

load_dotenv()
app = Flask(__name__,
            template_folder="../frontend",
            static_folder="../frontend",
            static_url_path='')
CORS(app)

# ==========================
# DB CONNECTION
# ==========================
def get_db():
    return mysql.connector.connect(
        host = os.getenv("HOST", "localhost"),
        user = os.getenv("USER", "root"),
        password = os.getenv("PASSWORD", ""),
        database = os.getenv("DATABASE", "solar_monitor")
    )

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

    # Handle sensor error gracefully
    if temp == -999.0:
        temp = None

    if None in [light, voltage, current]:
        return jsonify({"error": "Missing fields"}), 400

    # ==========================
    # SAVE SENSOR DATA (TABLE 1)
    # ==========================
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
                   INSERT INTO sensor_readings (voltage, current, temperature, light)
                   VALUES (%s, %s, %s, %s)
                   """, (voltage, current, temp, light))

    conn.commit()
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
        "message": "Data stored successfully"
    }

    print("DATA SAVED:", result, flush=True)

    return jsonify(result)

@app.route('/api/latest', methods=['GET'])
def get_latest():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT voltage, current, temperature, light
        FROM sensor_readings
        ORDER BY id DESC
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
