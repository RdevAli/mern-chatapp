// src/components/Notification.js
import React from 'react';

const Notification = ({ message }) => {
  if (!message) return null; // Only show if there's a message

  return (
    <div className="notification-container">
      <div className="notification">
        <p>{message}</p>
      </div>
    </div>
  );
};

export default Notification;
