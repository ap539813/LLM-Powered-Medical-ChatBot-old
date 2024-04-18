from flask import Flask, request, jsonify
from neo4j import GraphDatabase
from transformers import pipeline



from flask_cors import CORS


# uri = "bolt://localhost:7687"
uri = "neo4j+s://8597dfaf.databases.neo4j.io"
username = "neo4j"
password = "zbwgNCorNrFGTejO96RAuZS4gmTDSRKAUq-74Cpklw4"



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

app = Flask(__name__)
CORS(app)

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

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8090, debug=True)
