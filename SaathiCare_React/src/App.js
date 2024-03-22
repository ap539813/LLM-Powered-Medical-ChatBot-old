import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, BrowserRouter as Router } from 'react-router-dom';
import Navbar from './components/NavBar/NavBar';
import Sidebar from './components/SideBar/SideBar';
import MainContent from './components/MainContent/MainContent';
import './App.css';
import OptimizeLabReport from './pages/OptimizeLabReport/OptimizeLabReport';
import ImageAnalytics from './pages/ImageAnalytics/ImageAnalytics';
import ExtentPrediction from './pages/ExtentPrediction/ExtentPrediction';

const AppWrapper = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

const App = () => {
  const location = useLocation();
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  useEffect(() => {
    const hideSidebarPaths = ["/optimize-lab-report", "/image-analytics", "/extent-prediction"];
    setSidebarVisible(!hideSidebarPaths.includes(location.pathname));
  }, [location.pathname]);

  const handlePromptSelect = (prompt) => {
    setSelectedPrompt(prompt);
  };

  return (
    <>
      <Navbar />
      <div className={`app-body ${sidebarVisible ? 'with-sidebar' : 'without-sidebar'}`}>
        {sidebarVisible && <Sidebar onPromptSelect={handlePromptSelect} />}
        <Routes>
          <Route path="/" element={<MainContent selectedPrompt={selectedPrompt} onPromptChange={setSelectedPrompt} />} />
          <Route path="/optimize-lab-report" element={<OptimizeLabReport />} />
          <Route path="/image-analytics" element={<ImageAnalytics />} />
          <Route path="/extent-prediction" element={<ExtentPrediction />} />
        </Routes>
      </div>
    </>
  );
};

export default AppWrapper;
