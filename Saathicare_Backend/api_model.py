from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
from io import BytesIO

app = Flask(__name__)
CORS(app)

from flask_sslify import SSLify
sslify = SSLify(app)

# Load your trained model
model = load_model('best_diabetic_retinopathy_model.h5')


label_to_class = {
    0: 'No DR',
    1: 'Mild',
    2: 'Moderate',
    3: 'Severe',
    4: 'Proliferative DR'
}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route('/predict', methods=['POST'])
def predict():
    # Check if a file is provided
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    # Get the file from the request
    file = request.files['file']

    print(file.name)

    # Check if the file has a filename (i.e., if a file was selected)
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Convert the FileStorage object to a file-like object
        file_stream = BytesIO(file.read())

        # Preprocess the image to fit your model's input requirements
        img = image.load_img(file_stream, target_size=(256, 256))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)

        # Make a prediction
        predictions = model.predict(img_array)
        predicted_class = np.argmax(predictions, axis=1)

        # Convert the numeric label to its corresponding class name
        predicted_class_name = label_to_class[int(predicted_class[0])]

        print({'prediction_class': predicted_class_name, 'prediction': predicted_class})

        # Return the result
        return jsonify({'prediction_class': predicted_class_name, 'prediction': int(predicted_class[0])})

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9080, debug = True, ssl_context=('/home/somewithb/SaathiCare/SaathiCare_React/cert.pem', '/home/somewithb/SaathiCare/SaathiCare_React/key.pem'))
