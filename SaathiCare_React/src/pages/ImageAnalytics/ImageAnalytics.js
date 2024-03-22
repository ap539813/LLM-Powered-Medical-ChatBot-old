import React, { useState, useRef, useEffect } from 'react';
import { FaCamera, FaUpload, FaPaperPlane, FaUser, FaRobot } from 'react-icons/fa';
import './ImageAnalytics.css';

const ImageAnalytics = () => {
  const [chatMessages, setChatMessages] = useState([
    { type: 'bot', content: "Hello! Please upload an image for analysis.", contentType: 'text' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const imageFile = event.target.files[0];
      const imageUrl = URL.createObjectURL(imageFile);
      setSelectedImage(imageUrl);
    }
  };

const handleSendImage = async () => {
    if (!selectedImage || !fileInputRef.current.files[0]) return;

    setIsLoading(true);
    setChatMessages(prevMessages => [...prevMessages, { type: 'user', content: selectedImage, contentType: 'image' }]);

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);

        setSelectedImage(null); 
        if (fileInputRef.current) fileInputRef.current.value = '';

    try {
        const response = await fetch('http://192.168.29.30:9080/predict', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        let analysisResult = `<strong>Analysis Result: </strong>`;
        switch (result.prediction_class) {
            case "No DR":
                analysisResult += "No Diabetic Retinopathy detected";
                break;
            case "Mild":
                analysisResult += "Mild Diabetic Retinopathy";
                break;
            case "Moderate":
                analysisResult += "Moderate Diabetic Retinopathy";
                break;
            case "Severe":
                analysisResult += "Severe Diabetic Retinopathy";
                break;
            case "Proliferative DR":
                analysisResult += "Proliferative Diabetic Retinopathy detected";
                break;
            default:
                analysisResult += "Analysis Result: Unknown";
                break;
        }

        setChatMessages(prevMessages => [
            ...prevMessages,
            { type: 'bot', content: analysisResult, contentType: 'html', prediction: result.prediction }
        ]);

    } catch (error) {
        console.error("Error submitting image:", error);
        setChatMessages(prevMessages => [
            ...prevMessages,
            { type: 'bot', content: "There was a problem analyzing the image.", contentType: 'text', }
        ]);
    }

    setIsLoading(false);
};  

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setShowCameraModal(true);
    } catch (err) {
      console.error("Error accessing the camera: ", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    setShowCameraModal(false);
  };

  const captureImage = () => {
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob(blob => {
      const imageUrl = URL.createObjectURL(blob);
      setSelectedImage(imageUrl);
    });
    stopCamera();
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="main-content">
      <div className="chat-area">
      {chatMessages.map((msg, index) => (
        <div key={index} className={`chat-message ${msg.type}-message`}>
          <div className={`${msg.type}-icon`}>{msg.type === 'user' ? <FaUser /> : <FaRobot />}</div>
          {msg.contentType === 'image' ? (
            <img src={msg.content} alt="Uploaded by user" className="message-image" />
          ) : msg.contentType === 'html' ? (
            <div className={`message-text prediction-${msg.prediction}`} dangerouslySetInnerHTML={{ __html: msg.content }}></div> 
          ) : (
            <div className="message-text">{msg.content}</div>
          )}
        </div>
      ))}

      </div>
      <div className="input-area">
        <label className="icon upload-icon">
          <FaUpload />
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
        </label>
        {/* <FaCamera className="icon camera-icon" onClick={startCamera} /> */}
        <div className={`preview-box ${selectedImage ? '' : 'disabled'}`}>
          {selectedImage && (
            <>
              <img src={selectedImage} alt="Selected" className="preview-image" />
              <span className="remove-image-icon" onClick={handleClearImage}>✖</span>
            </>
          )}
        </div>
        <button className={`send-button ${isLoading || !selectedImage ? 'disabled' : ''}`} onClick={handleSendImage} disabled={isLoading || !selectedImage}>
          <FaPaperPlane />
        </button>
      </div>
      {showCameraModal && (
        <div className="modal">
          <div className="modal-content">
            <video ref={videoRef} autoPlay className="video-preview"></video>
            <button className="capture-button" onClick={captureImage}>Capture</button>
            <button className="close-modal-button" onClick={stopCamera}>Close</button>
          </div>
          <div className="modal-backdrop"></div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default ImageAnalytics;
