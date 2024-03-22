from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage

import os

import json


with open('api_keys.json') as api_file:
    api_keys = json.load(api_file)
    os.environ["MISTRAL_API_KEY"] = api_keys['mistral_api']



import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = 'caresaathi_servicefile.json'

from flask import Flask, request, jsonify
from google.cloud import aiplatform

from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# Hardcoded IDs
ENDPOINT_ID="6002025068819906560"
PROJECT_ID="1093938084624"


def predict_vertex_ai(endpoint_id, project_id, instance, context, tag, location="us-central1"):
    if len(context) < 15 and tag == 'report':
        api_key = os.environ["MISTRAL_API_KEY"]
        model = "open-mistral-7b"

        client = MistralClient(api_key=api_key)

        messages = [
            ChatMessage(role="user", content=instance["prompt"])
        ]

        chat_response = client.chat(
            model=model,
            messages=messages,
        )
        return [chat_response.choices[0].message.content]
        
    else:
        client_options = {"api_endpoint": f"us-central1-aiplatform.googleapis.com"}
        client = aiplatform.gapic.PredictionServiceClient(client_options=client_options)

        endpoint = client.endpoint_path(
            project=project_id,
            location=location,
            endpoint=endpoint_id
        )

        response = client.predict(
            endpoint=endpoint,
            instances=[instance]
        )

        print(response.predictions)
        return response.predictions

def valid_response(prediction):
    print(prediction)
    return prediction.strip() == '' or ('[' in prediction and ']' in prediction) or 'Prompt:' in prediction


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200


@app.route('/predict', methods=['POST'])
def interactive_physician_chatbot():
    data = request.json
    print(data)
    question = data['question']
    tag = data['tag']
    context = data['context']

    if tag == 'symptom':
        instance = {"prompt": question,
                "max_tokens": 512,
                "temperature": 1.0,
                "top_p": 1.0,
                "top_k": 10}
        prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].replace('*', '').split('Symptom:')[-1].split('\n')[0].strip()
        while valid_response(prediction):
            prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].replace('*', '').split('Symptom:')[-1].split('\n')[0].strip()
        
    
    elif tag == 'lifestyle':
        instance = {"prompt": question,
                "max_tokens": 512,
                "temperature": 1.0,
                "top_p": 1.0,
                "top_k": 10}
        prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].replace('*', '').split('Lifestyle:')[-1].split('\n')[0].strip()
        while valid_response(prediction):
            prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].replace('*', '').split('Lifestyle:')[-1].split('\n')[0].strip()
        
    elif tag == 'genetic':
        instance = {"prompt": question,
                "max_tokens": 512,
                "temperature": 1.0,
                "top_p": 1.0,
                "top_k": 10}
        prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].replace('*', '').split('Genetic:')[-1].split('\n')[0].strip()
        while valid_response(prediction):
            prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].replace('*', '').split('Genetic:')[-1].split('\n')[0].strip()
        
    elif tag == 'report':
        instance = {"prompt": question,
                "max_tokens": 512,
                "temperature": 1.0,
                "top_p": 1.0,
                "top_k": 10}
        prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].split('END OF RESPONSE\nOutput:')[-1].strip().replace('*', '').replace('END OF RESPONSE', '').replace('"', '')
        while valid_response(prediction):
            prediction = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, context, tag)[0].split('END OF RESPONSE\nOutput:')[-1].strip().replace('*', '').replace('END OF RESPONSE', '').replace('"', '')
        
    else:
        return jsonify({"error": "Invalid tag"}), 400


    return jsonify({"response": prediction})


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug = True)







