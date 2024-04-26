from flask import Flask, request, jsonify
import pandas as pd
from geopy.geocoders import Nominatim
from math import radians, cos, sin, sqrt, atan2
from flask_cors import CORS

from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage



import numpy as np


import plotly
import plotly.express as px
import json
from scipy.stats import norm
from pandasai import Agent
from pandasai.llm.openai import OpenAI


from google.cloud import aiplatform

import os


from neo4j import GraphDatabase
from transformers import pipeline

from PyPDF2 import PdfReader

from google.cloud import speech, translate_v2 as translate



app = Flask(__name__)
CORS(app)


from flask_sslify import SSLify
sslify = SSLify(app)





with open('api_keys.json') as api_file:
    api_keys = json.load(api_file)
    os.environ["MISTRAL_API_KEY"] = api_keys['mistral_api']



import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = 'caresaathi_servicefile.json'

# uri = "bolt://localhost:7687"
uri = "neo4j+s://78e30e00.databases.neo4j.io"
username = "neo4j"
password = "rbSRjgroav3_0bhoT_jvxBkCHu-oOxf2k5CCKIAA8Qo"


# Hardcoded IDs
ENDPOINT_ID="5177492503057661952"
PROJECT_ID="733932637612"



# Set up Google Cloud Speech client
client = speech.SpeechClient()
translate_client = translate.Client()




# Load the clinic data
labels_path = 'Curebay_clinics.csv'
df = pd.read_csv(labels_path)




def json_to_text(data, indent=0):
    """Recursively convert JSON data to text."""
    text_summary = ""
    if isinstance(data, dict):
        for key, value in data.items():
            text_summary += "    " * indent + str(key) + ": "
            if isinstance(value, (dict, list)):
                text_summary += "\n" + json_to_text(value, indent + 1)
            else:
                text_summary += str(value) + "\n"
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, (dict, list)):
                text_summary += json_to_text(item, indent + 1)
            else:
                text_summary += "    " * indent + str(item) + "\n"
    return text_summary

def load_json_and_convert_to_text(file_path):
    """Load a JSON file and convert it to a narrative text format."""
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
        return json_to_text(data)
    except Exception as e:
        return f"An error occurred while processing the file: {e}"
        

def extract_text_from_file(file_path):
    file_name, file_extension = os.path.splitext(file_path)
    if file_extension.lower() == '.pdf':
        return extract_text_from_pdf(file_path)
    elif file_extension.lower() == '.json':
        return extract_text_from_json(file_path)
    else:
        raise ValueError("Unsupported file format")

def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    full_text = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            full_text.append(page_text)
    return '\n'.join(full_text)

def extract_text_from_json(json_path):
    return load_json_and_convert_to_text(json_path)

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
    







# api_app.py


def predict_vertex_ai(endpoint_id, project_id, instance, context, tag, location="us-central1"):
    if len(context) < 15 and tag == 'report':
        print('generated from part 1')
        try:
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
        except:
            return ['End of Report !!']
        
    else:
        print('generated from part 2')
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

        # print(response.predictions)
        return response.predictions

def valid_response(prediction):
    print(prediction)
    return prediction.strip() == '' or ('[' in prediction and ']' in prediction) or 'Prompt:' in prediction


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200



@app.route('/pdf_summarizer', methods=['POST'])
def pdf_summarizer():
    if 'file' not in request.files:
        return 'No file part', 400

    file = request.files['file']
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in ['.pdf', '.json']:
        return jsonify({"response": 'Unsupported file type'}), 401

    # Save the file
    file_path = f'uploaded{file_extension}'
    file.save(file_path)

    # Extract text from the file
    extracted_text = extract_text_from_file(file_path)

    length = len(extracted_text)
    print(length)
    # chunk_size = length // 1
    # chunks = [extracted_text[i:i + chunk_size] for i in range(0, length, chunk_size)]

    chunk_size = 5000
    chunks = [extracted_text[i:i + chunk_size] for i in range(0, length, chunk_size)]

    responses = []
    patient_name = ["- **Name of the Patient**: [Patient's Name Here]"] + [''] * (len(chunks) - 1)
    i = 0
    for chunk in chunks:
        instance = {
            "prompt": """
            Please analyze the medical report content provided below and categorize the test results. Use the following format strictly:
            - **Patient's Info**: 
            {}
            - **General Health Summary**: Provide a brief summary of the patient's overall health based on the test results.
            - **Test Results Analysis**:
            - Provide the test results in bullet points, clearly categorizing them under each relevant heading as follows:
                - **Critical Tests**: List any tests with values outside the normal ranges that may require immediate medical attention.
                - **Considerable Tests**: List tests with values that are not optimal and may need some medical attention or lifestyle changes.
                - **Normal Tests**: List tests with values within normal ranges.
            - **Additional Notes**: Any other relevant information or observations.

            **NOTE**: Analysis and summaries should adhere strictly to the above guidelines for clarity and consistency.

            **Report Content**:
            {}

            Kindly ensure the analysis is concise and directly correlates to the provided test results, focusing on accuracy and clarity in the summary.

            """.format(patient_name[i], chunk),
            "max_tokens": 2000,
            "temperature": 1.0,
            "top_p": 1.0,
            "top_k": 10
        }
        i += 1
        response = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, chunk, 'report')[0].replace('*', '').split('Output:')[-1].strip().replace(chunk, '')
        responses.append(response)

    # Combine all responses into one final response
    final_response = ' '.join(responses)
    # instance = {
    #     "prompt": """Please summarize the attached medical report content strictly in the following format:
    #             - Patient's Name: Name of the Patient.
    #             - bullet point 1
    #             - bullet point 2
    #             - bullet point 3 and so on as needed
    #             Also, provide a short general summary of the patient's overall health based on the test results.
    #             NOTE: Please provide the analysis and summary based on the above guidelines.

    #             Report Content:
    #             {}

    #             """.format(final_response),
    #     "max_tokens": 2000,
    #     "temperature": 1.0,
    #     "top_p": 1.0,
    #     "top_k": 10
    # }
    # final_response_1 = predict_vertex_ai(ENDPOINT_ID, PROJECT_ID, instance, final_response, 'report')[0].replace('*', '').split('Summary:')[-1].strip()
    return jsonify({"response": final_response})



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








# app_content.py

# Load the data
def load_data():
    df = pd.read_csv('fin_data.csv') 
    return df

@app.route('/load_data', methods=['GET'])
def get_data():
    df = load_data()
    return df.to_json(orient='records')

@app.route('/plot_histogram', methods=['POST'])
def plot_histogram():
    data = request.json
    df = pd.DataFrame(data)
    column = request.args.get('column')
    fig = px.histogram(df, x=column)
    return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

@app.route('/projected_cases', methods=['POST'])
def projected_cases():
    df = load_data()
    # print(df) 

    # Define the total population of Odisha
    population_odisha = 45429399

    # Confidence level and Z-score for the 95% confidence interval
    confidence_level = 0.95
    z_score = norm.ppf(1 - (1 - confidence_level) / 2)

    # Sample size
    sample_size = len(df)

    # Initialize a dictionary for confidence intervals in Odisha
    confidence_intervals_odisha = {}

    # Calculate confidence intervals
    for disease, count in df['Disease'].value_counts().items():
        p = count / sample_size
        se = np.sqrt(p * (1 - p) / sample_size)
        margin_of_error = z_score * se
        ci_lower = max(0, p - margin_of_error)
        ci_upper = min(1, p + margin_of_error)
        ci_lower_odisha = ci_lower * population_odisha
        ci_upper_odisha = ci_upper * population_odisha
        confidence_intervals_odisha[disease] = (ci_lower_odisha, ci_upper_odisha)

    # Convert to DataFrame for display
    ci_df = pd.DataFrame.from_dict(confidence_intervals_odisha, orient='index', columns=['Lower Bound', 'Upper Bound'])
    ci_df = ci_df.round().astype(int)  # Rounding off for better readability

    print(ci_df.reset_index().to_json(orient='records'))

    return ci_df.reset_index().to_json(orient='records')

@app.route('/process_query', methods=['POST'])
def process_query():
    user_query = request.json.get('userInput', '')

    response = f"Received your query: {user_query}"

    data = load_data()

    with open('api_keys.json') as api_file:
        api_key = json.load(api_file)['open_api']

    # Initialize the LLM with the API key
    llm = OpenAI(api_token = api_key)

    # Create an Agent instance with the loaded DataFrame
    agent = Agent([data], config={"llm": llm})

    # Context for the LLM
    context = "I am a data analyzer aiming to present a report on the data trends. Let's analyze the loaded Curebay CSV data."

    try:
        response = agent.chat(context + " " + user_query)
        print(type(response))
        # Add the response to comments suitable for higher management
        management_comment = f"I've reviewed the data and {response}"
        # print(management_comment)
        # st.success(f"Response: {management_comment}")
    except Exception as e:
        management_comment = f"An error occurred: {e}"

    return jsonify({'response': management_comment})



# api_neo4j.pi

driver = GraphDatabase.driver(uri, auth=(username, password))

classifier = pipeline("zero-shot-classification")

def get_disease_info(tx, disease_name):
    query = (
        "MATCH (d:Disease {name: $disease_name})-[:HAS_SYMPTOM]->(s:Symptoms)-[:DETAIL_SYMPTOM]->(sym:Symptom), "
        "(d)-[:HAS_TREATMENT]->(t:Treatments)-[:DETAIL_TREATMENT]->(tr:Treatment), "
        "(d)-[:HAS_SPECIALISTS]->(sp:Specialists)-[:TREATED_BY]->(spec:Specialist), "
        "(d)-[:HAS_DIETARY_HABIT]->(dh:DietaryHabits)-[:DETAIL_DIETARY_HABIT]->(diet:DietaryHabit), "
        "(d)-[:HAS_FAMILY_HISTORY]->(fh:FamilyGeneticHistories)-[:DETAIL_FAMILY_HISTORY]->(fam:FamilyGeneticHistory), "
        "(d)-[:HAS_LIFESTYLE_HABIT]->(lh:LifestyleHabits)-[:DETAIL_LIFESTYLE_HABIT]->(life:LifestyleHabit), "
        "(d)-[:HAS_DEMOGRAPHIC]->(dm:Demographics)-[:DETAIL_DEMOGRAPHIC]->(demo:Demographic) "
        "RETURN d.name AS disease, d.type AS type, collect(distinct sym.name) AS symptoms, "
        "collect(distinct tr.name) AS treatments, collect(distinct spec.name) AS specialists, "
        "collect(distinct diet.name) AS dietary_habits, collect(distinct fam.name) AS family_history, "
        "collect(distinct life.name) AS lifestyle_habits, collect(distinct demo.name) AS demographics"
    )
    result = tx.run(query, disease_name=disease_name)
    return result.single()

def create_natural_language_response(disease_info):
    disease = disease_info["disease"]
    type_ = disease_info["type"]
    symptoms = ', '.join(disease_info["symptoms"])
    treatments = ', '.join(disease_info["treatments"])
    specialists = ', '.join(disease_info["specialists"])
    dietary_habits = ', '.join(disease_info["dietary_habits"])
    family_history = ', '.join(disease_info["family_history"])
    lifestyle_habits = ', '.join(disease_info["lifestyle_habits"])
    demographics = ', '.join(disease_info["demographics"])

    paragraph = (
        f"{disease} is a {type_} characterized by symptoms such as {symptoms}. "
        f"Treatment options include {treatments}. Management may involve dietary habits like {dietary_habits}. "
        f"Specialists involved in treatment include {specialists}. There is a family history aspect: {family_history}. "
        f"It is important to manage lifestyle habits such as {lifestyle_habits}. This condition affects {demographics}."
    )

    return paragraph

def map_sentence_to_keywords(keyword_list, sentence):
    
    # keyword_list = [keyword.strip() for keyword in keywords.split(',')]

    result = classifier(sentence, keyword_list)

    # print(result)

    mapped_keywords = [label for label, score in zip(result['labels'], result['scores'])][:3]

    return mapped_keywords

def get_child_node_names(tx, parent_name):
    query = (
        "MATCH (p)-[:DETAIL_SYMPTOM|DETAIL_TREATMENT|TREATED_BY|DETAIL_DIETARY_HABIT|DETAIL_FAMILY_HISTORY|DETAIL_LIFESTYLE_HABIT|DETAIL_DEMOGRAPHIC]->(child) "
        "WHERE p.name = $parent_name "
        "RETURN collect(child.name) AS names"
    )
    result = tx.run(query, parent_name=parent_name)
    return result.single()[0]


def find_diseases_with_keywords(tx, keywords, relationship):
    query = (
        "MATCH (d:Disease)-[:HAS_SYMPTOM|HAS_TREATMENT|HAS_SPECIALISTS|HAS_DIETARY_HABIT|HAS_FAMILY_HISTORY|HAS_LIFESTYLE_HABIT|HAS_DEMOGRAPHIC]->(p)-[r:DETAIL_SYMPTOM|DETAIL_TREATMENT|TREATED_BY|DETAIL_DIETARY_HABIT|DETAIL_FAMILY_HISTORY|DETAIL_LIFESTYLE_HABIT|DETAIL_DEMOGRAPHIC]->(child) "
        "WHERE child.name IN $keywords AND type(r) = $relationship "
        "RETURN d.name AS disease"
    )
    result = tx.run(query, keywords=keywords, relationship=relationship)
    return [record["disease"] for record in result]


def main(tag, user_input):
    parent_names = {
        'symptom': ['List of symptoms'],
        'lifestyle': ['List of dietary habits', 'List of lifestyle habits'],
        'genetic': ['List of family/genetic histories']
    }

    relationship = {
        'symptom': 'DETAIL_SYMPTOM',
        'lifestyle': 'DETAIL_LIFESTYLE_HABIT',
        'genetic': 'DETAIL_FAMILY_HISTORY'
    }[tag]

    parent_name = parent_names[tag]

    with driver.session() as session:
        keywords = []
        for parent_name_i in parent_name:
            names = session.execute_read(get_child_node_names, parent_name_i)
            if names:
                keywords += names

        mapped_keywords = map_sentence_to_keywords(keywords, user_input)
        # print(f"Mapped Keywords: {', '.join(mapped_keywords)}")

        diseases = session.execute_read(find_diseases_with_keywords, mapped_keywords, relationship)
        # print(f"Diseases related to {tag}: {', '.join(diseases)}")
        
    return diseases


# Define route to handle POST requests
@app.route('/process_responses', methods=['POST'])
def process_responses():
    # Extract user_responses from the request JSON
    user_responses = request.json.get('user_responses', {})

    # Your existing code to process user_responses and generate the response
    diseases = []
    for tag, response in user_responses.items():
        diseases += main(tag, response)

    diseases = list(set(diseases))

    response = ''
    with driver.session() as session:
        for disease in diseases:
            disease_info = session.execute_read(get_disease_info, disease)
            if disease_info:
                response = response + '\n\n' + create_natural_language_response(disease_info)

    # Return the response as JSON
    return jsonify({'response': response})



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

@app.route('/translate_to_language', methods=['POST'])
def translate_to_language():
    try:
        data = request.get_json()
        text = data.get('text')
        target_language = data.get('target_language')

        if not text or not target_language:
            return jsonify({"error": "Missing text or target_language parameter"}), 400

        translation = translate_client.translate(text, target_language=target_language)
        translated_text = translation['translatedText']

        return jsonify({"translatedText": translated_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=9070, ssl_context=('cert.pem', 'key.pem'))