from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import plotly
import plotly.express as px
import json
from scipy.stats import norm
import numpy as np

app = Flask(__name__)
CORS(app)

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=9090)
