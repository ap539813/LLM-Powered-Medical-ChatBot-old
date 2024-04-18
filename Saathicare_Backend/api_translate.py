import os
from flask_cors import CORS
from flask import Flask, request, jsonify
from google.cloud import speech, translate_v2 as translate

import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = 'caresaathi_servicefile.json'

app = Flask(__name__)
CORS(app)


# Set up Google Cloud Speech client
client = speech.SpeechClient()
translate_client = translate.Client()

@app.route('/speech_to_text', methods=['POST'])
def speech_to_text():
    try:
        # Check if the post request has the file part
        if 'audio' not in request.files:
            return jsonify({"error": "No audio part"}), 400
        
        audio_file = request.files['audio']
        language = request.form.get('language', 'or-IN') 

        # Convert audio to text
        audio = speech.RecognitionAudio(content=audio_file.read())
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code=language,
            enable_automatic_punctuation=True
        )

        response = client.recognize(config=config, audio=audio)

        # Collecting the recognized text
        transcribed_text = " ".join(result.alternatives[0].transcript for result in response.results)

        if not transcribed_text:
            return jsonify({"error": "No transcription available"}), 404

        # Translate the text to English
        translation = translate_client.translate(transcribed_text, target_language='en')
        english_translation = translation['translatedText']
        print(english_translation)
        if transcribed_text:
            return jsonify({"transcribedText": transcribed_text,"translatedText": english_translation}), 200
        else:
            return jsonify({"error": "No transcription available"}), 404
    except Exception as e:
        print(e)
        return jsonify({"transcribedText": "Permission denied"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8090, debug=True)

# Hindi
# Bengali
# Gujarati
# Kannada
# Malayalam
# Marathi
# Punjabi
# Tamil
# Telugu
# Urdu