import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaNotesMedical, FaBook } from 'react-icons/fa';
import './SideBar.css';

const Sidebar = ({ onPromptSelect }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleClick = index => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const sections = [
    {
      title: 'Doctor notes',
      icon: <FaNotesMedical />,
      content: [
        'Write a one page referral letter for a [medical condition] patient to see a specialist.'
      ]
    },
    {
      title: 'Patient Education',
      icon: <FaBook />,
      content: [
        'Create a list of frequently asked questions (FAQs) and their answers for [medical condition] patients. Frequently asked questions, containing five questions and 300 words per set.',
        'Create a patient education pamphlet regarding [medical condition] and its treatment, no more than 300 words.'
      ]
    }
  ];

  return (
    <div className="sidebar">
      {sections.map((section, index) => (
        <div key={index} className={`section ${activeIndex === index ? 'active' : ''}`}>
          <div className="section-header" onClick={() => handleClick(index)}>
            {section.icon}
            {section.title}
            <span className="section-toggle">
              {activeIndex === index ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </div>
          <div className={`section-content ${activeIndex === index ? 'show' : 'hide'}`}>
            {section.content.map((text, idx) => (
              <div key={idx} className="section-item" onClick={() => onPromptSelect(text)}>
                <div className="item-text">{text}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
