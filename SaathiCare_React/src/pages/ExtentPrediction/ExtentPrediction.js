import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import './ExtentPrediction.css';

const ExtentPrediction = () => {
  const [data, setData] = useState([]);
  const [selectedState, setSelectedState] = useState('Odisha');
  const [stateData, setStateData] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [cityData, setCityData] = useState([]);
  const [diseaseData, setDiseaseData] = useState([]);
  const [projectedCases, setProjectedCases] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  useEffect(() => {
    fetch('http://localhost:9090/load_data')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setData(data))
      .catch(error => console.error('Error fetching data:', error));

  }, []);

  useEffect(() => {
    if (selectedState) {
      setStateData(data.filter(row => row.STATE === selectedState));
    }
  }, [selectedState, data]);

  useEffect(() => {
    if (selectedCity) {
      setCityData(data.filter(row => row.CITY === selectedCity));
    }
  }, [selectedCity, data]);

  useEffect(() => {
    setDiseaseData(data.filter(row => row.Disease));
  }, [data]);

  useEffect(() => {
    fetch('http://localhost:9090/projected_cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
      .then(response => response.json())
      .then(data => {
        console.log("Projected Cases Data:", data); // Log the data
        setProjectedCases(data);
      });
  }, [data]);

  const handleStateChange = (event) => {
    setSelectedState(event.target.value);
  };

  const handleCityChange = (event) => {
    setSelectedCity(event.target.value);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

// Function to transform data for stacked bar chart
const transformDataForGroupedBarChart = (data, column) => {
  const filteredData = data.filter(d => d[column] != null && d[column] !== ''); // Filter out null and empty string values
  const uniqueValues = Array.from(new Set(filteredData.map(d => d[column])));
  return uniqueValues.map(value => {
    return {
      x: filteredData.map(d => d.CITY),
      y: filteredData.map(d => (d[column] === value ? 1 : 0)),
      type: 'bar',
      name: `${value}` // Name of the stack
    };
  });
};

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="ExtentPrediction">
      <h1>Extend Prediction Page</h1>
      <h2>Preview of CureBay Data</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>CODE</th>
              <th>FIRSTNAME</th>
              <th>LASTNAME</th>
              <th>GENDER</th>
              <th>BLOODGROUP</th>
              <th>CITY</th>
              <th>STATE</th>
              <th>PINCODE</th>
              <th>AGE</th>
              <th>Disease</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, index) => (
              <tr key={index}>
                <td>{row.CODE}</td>
                <td>{row.FIRSTNAME}</td>
                <td>{row.LASTNAME}</td>
                <td>{row.GENDER}</td>
                <td>{row.BLOODGROUP}</td>
                <td>{row.CITY}</td>
                <td>{row.STATE}</td>
                <td>{row.PINCODE}</td>
                <td>{row.AGE}</td>
                <td>{row.Disease}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
          Prev
        </button>
        <span>{currentPage}</span>
        <button disabled={currentPage === Math.ceil(data.length / rowsPerPage)} onClick={() => handlePageChange(currentPage + 1)}>
          Next
        </button>
      </div>


      <h2>Patient Characteristics by State</h2>
      <select onChange={handleStateChange}>
        <option value="">Select a State</option>
        {Array.from(new Set(data.map(row => row.STATE))).map((state, index) => (
          <option key={index} value={state}>{state}</option>
        ))}
      </select>
      {selectedState && (
        <div className="state-charts">
          <div className="chart-row">
            <div className="chart">
              <Plot
                data={[{ x: stateData.map(d => d.GENDER), type: 'histogram', name: 'Gender Distribution' }]}
                layout={{ title: 'Gender Distribution', barmode: 'stack' }}
              />
            </div>
            <div className="chart">
              <Plot
                data={[{ x: stateData.map(d => d.BP_Status), type: 'histogram', name: 'BP Status Distribution' }]}
                layout={{ title: 'BP Status Distribution', barmode: 'stack' }}
              />
            </div>
          </div>
          <div className="chart-row">
            <div className="chart">
              <Plot
                data={[{ x: stateData.map(d => d.BLOODGROUP), type: 'histogram', name: 'Blood Group Distribution' }]}
                layout={{ title: 'Blood Group Distribution', barmode: 'stack' }}
              />
            </div>
            <div className="chart">
              <Plot
                data={[{ x: stateData.map(d => d.BMI_STATUS), type: 'histogram', name: 'BMI Status Distribution' }]}
                layout={{ title: 'BMI Status Distribution', barmode: 'stack' }}
              />
            </div>
          </div >
            <Plot
              data={[{ x: stateData.map(d => d.AGE), type: 'histogram', name: 'Age Distribution' }]}
              layout={{ title: 'Age Distribution', barmode: 'stack' }}
            />
        </div>
      )}


<h2>Patient Characteristics by City in {selectedState}</h2>
      {selectedState && (
        <>
          <Plot
            data={transformDataForGroupedBarChart(stateData, 'GENDER')}
            layout={{ title: 'Gender Distribution by City', barmode: 'stack' }}
          />
          <Plot
            data={transformDataForGroupedBarChart(stateData, 'BLOODGROUP')}
            layout={{ title: 'Blood Group Distribution by City', barmode: 'stack' }}
          />
          <Plot
            data={transformDataForGroupedBarChart(stateData, 'BP_Status')}
            layout={{ title: 'BP Status Distribution by City', barmode: 'stack' }}
          />
          <Plot
            data={transformDataForGroupedBarChart(stateData, 'BMI_STATUS')}
            layout={{ title: 'BMI Status Distribution by City', barmode: 'stack' }}
          />
        </>
      )}




      <h2>Chronic Conditions Analysis</h2>
      {diseaseData.length > 0 && (
        <>
          <Plot
            data={[
              {
                x: diseaseData.map(d => d.Disease),
                type: 'histogram',
                name: 'Disease Distribution'
              }
            ]}
            layout={{ title: 'Disease Distribution' }}
          />
          <Plot
            data={[
              {
                labels: diseaseData.map(d => d.Disease),
                values: diseaseData.map(d => d.AGE),
                type: 'pie',
                name: 'Disease Distribution'
              }
            ]}
            layout={{ title: 'Disease Distribution' }}
          />
        </>
      )}
  
      <h2>Projected Number of Cases of Each Disease in the Population of Odisha</h2>
      <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Disease</th>
            <th>Lower Bound</th>
            <th>Upper Bound</th>
          </tr>
        </thead>
        <tbody>
          {projectedCases.map((caseData, index) => (
            <tr key={index}>
              <td>{caseData["index"]}</td>
              <td>{caseData["Lower Bound"]}</td>
              <td>{caseData["Upper Bound"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      </div>
    );
  };
  
  export default ExtentPrediction;
  
