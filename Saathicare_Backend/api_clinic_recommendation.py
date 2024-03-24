from flask import Flask, request, jsonify
import pandas as pd
from geopy.geocoders import Nominatim
from math import radians, cos, sin, sqrt, atan2

app = Flask(__name__)

# Load the clinic data
labels_path = 'Curebay_clinics.csv'
df = pd.read_csv(labels_path)

# Function to calculate distance using Haversine formula
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dLat = radians(lat2 - lat1)
    dLon = radians(lon2 - lon1)
    a = sin(dLat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    return distance

# Function to find the nearest clinic
def find_nearest_clinic(df, coordinates):
    nearest_clinic = None
    min_distance = float('inf')
    for _, row in df.iterrows():
        clinic_coords = (row["Latitude"], row["Longitude"])
        distance = calculate_distance(coordinates[0], coordinates[1], clinic_coords[0], clinic_coords[1])
        if distance < min_distance:
            min_distance = distance
            nearest_clinic = row["Address"]
    return nearest_clinic

# Geocoding function
def get_lat_lon_geopy(address):
    geolocator = Nominatim(user_agent="MyGeocoder")
    location = geolocator.geocode(address)
    if location:
        return (location.latitude, location.longitude)
    return None

# API endpoint to get the nearest clinic for a given address
@app.route('/nearest_clinic', methods=['POST'])
def get_nearest_clinic():
    data = request.json
    address = data.get('address')
    if not address:
        return jsonify({"error": "Address is required"}), 400

    coordinates = get_lat_lon_geopy(address)
    if not coordinates:
        return jsonify({"error": "Could not geocode the address"}), 404

    nearest_clinic_address = find_nearest_clinic(df, coordinates)
    if nearest_clinic_address:
        return jsonify({"nearest_clinic": [nearest_clinic_address]})
    else:
        return jsonify({"error": "No nearest clinic found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=9070)
