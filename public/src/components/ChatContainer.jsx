import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import Peer from 'peerjs';
import Draggable from 'react-draggable';

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const scrollRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (currentChat) {
        try {
          const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
          const response = await axios.post(recieveMessageRoute, {
            from: data._id,
            to: currentChat._id,
          });
          setMessages(response.data);
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      }
    };
    fetchMessages();
  }, [currentChat]);

  useEffect(() => {
    const socketRef = socket.current;
    if (socketRef) {
      socketRef.on("msg-recieve", (msg) => {
        setMessages((prevMessages) => [...prevMessages, { fromSelf: false, message: msg }]);
        showNotification(currentChat.username, msg);
      });
    }
    return () => {
      if (socketRef) {
        socketRef.off("msg-recieve");
      }
    };
  }, [socket, currentChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (peer && localStream) {
      const handleOffer = ({ offer, from }) => {
        const call = peer.call(from, localStream);
        call.on('stream', (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        });
      };

      const handleAnswer = ({ answer }) => {
        peer.signal(answer);
      };

      const handleIceCandidate = ({ candidate }) => {
        peer.signal(candidate);
      };

      const socketRef = socket.current;
      if (socketRef) {
        socketRef.on('offer', handleOffer);
        socketRef.on('answer', handleAnswer);
        socketRef.on('ice-candidate', handleIceCandidate);
      }

      return () => {
        if (socketRef) {
          socketRef.off('offer', handleOffer);
          socketRef.off('answer', handleAnswer);
          socketRef.off('ice-candidate', handleIceCandidate);
        }
      };
    }
  }, [peer, localStream, socket]);

  const handleSendMsg = async (msg) => {
    try {
      const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
      socket.current.emit("send-msg", {
        to: currentChat._id,
        from: data._id,
        msg,
      });
      await axios.post(sendMessageRoute, {
        from: data._id,
        to: currentChat._id,
        message: msg,
      });
      setMessages((prevMessages) => [...prevMessages, { fromSelf: true, message: msg }]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const startVideoCall = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        const newPeer = new Peer(undefined, {
          host: '/',
          port: '5000'
        });
        setPeer(newPeer);
        setShowVideoCall(true);
        setMinimized(false);
        const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
        socket.current.emit("incoming-call", {
          to: currentChat._id,
          from: data._id,
          fromUsername: data.username,
        });
      })
      .catch(err => console.error('Failed to get media:', err));
  };

  const endVideoCall = () => {
    setShowVideoCall(false);
    setMinimized(false);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peer) {
      peer.destroy();
    }
    setLocalStream(null);
    setPeer(null);
  };

  const toggleMinimize = () => {
    setMinimized(prev => !prev);
  };

  const showNotification = (senderName, message) => {
    if (notificationPermission === 'granted' && !document.hasFocus()) {
      new Notification(`New message from ${senderName}`, {
        body: message,
        icon: '/path/to/your/icon.png' // Add a path to your notification icon
      });
    }
  };

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img src={`data:image/svg+xml;base64,${currentChat?.avatarImage}`} alt="" />
          </div>
          <div className="username">
            <h3>{currentChat?.username}</h3>
          </div>
          <button className="call-button" onClick={startVideoCall}>📹</button>
        </div>
        <Logout />
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div ref={scrollRef} key={index}>
            <div className={`message ${message.fromSelf ? "sended" : "recieved"}`}>
              <div className="content">
                <p>{message.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
      {showVideoCall && (
        <Draggable handle=".draggable-handle">
          <div className={minimized ? "minimized-video-call-container" : "video-call-container"}>
            <div className="draggable-handle">
              <button onClick={toggleMinimize}>{minimized ? "🔽" : "🔼"}</button>
            </div>
            <video ref={localVideoRef} className="video" autoPlay muted />
            <video ref={remoteVideoRef} className="video" autoPlay />
            {!minimized && <button onClick={endVideoCall}>End Call</button>}
          </div>
        </Draggable>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
      .call-button {
        background-color: #4f04ff;
        border: none;
        color: white;
        border-radius: 0.5rem;
        padding: 0.5rem;
        cursor: pointer;
      }
    }
  }
  .chat-messages {
    padding: 1rem;
    overflow-y: auto;
    .message {
      padding: 0.5rem;
      border-radius: 0.5rem;
      max-width: 80%;
      margin-bottom: 0.5rem;
      &.sended {
        background-color: #4f04ff;
        color: white;
        align-self: flex-end;
      }
      &.recieved {
        background-color: #ccc;
        color: black;
        align-self: flex-start;
      }
      .content {
        padding: 0.5rem;
      }
    }
  }
  .chat-input {
    padding: 1rem 2rem;
  }
  .video-call-container,
  .minimized-video-call-container {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background-color: #000;
    border: 1px solid #333;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    z-index: 1000;
    .video {
      background-color: black;
    }
    button {
      margin: 0.5rem;
      padding: 0.5rem;
      color: white;
      background-color: #4f04ff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    .draggable-handle {
      width: 100%;
      display: flex;
      justify-content: center;
      cursor: move;
    }
  }
  .minimized-video-call-container {
    width: 150px;
    height: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
    .video {
      width: 100%;
      height: 100%;
    }
  }
  .video-call-container {
    width: 400px;
    height: 300px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    .video {
      width: 100%;
      height: 80%;
    }
  }
`;