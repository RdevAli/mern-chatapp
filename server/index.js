const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const callRoutes = require("./routes/calls");
const app = express();
const socket = require("socket.io");
require("dotenv").config();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callRoutes);

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);

const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

global.onlineUsers = new Map();
global.userNotifications = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;

  // Handle user connection
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    
    // Send any pending notifications to the user
    const pendingNotifications = userNotifications.get(userId) || [];
    if (pendingNotifications.length > 0) {
      socket.emit("pending-notifications", pendingNotifications);
      userNotifications.delete(userId); // Clear pending notifications
    }
  });

  // Handle sending messages and notifications
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-receive", data.msg);
      
      // Send real-time notification
      socket.to(sendUserSocket).emit("new-message-notification", {
        from: data.from,
        message: "You have a new message"
      });
    } else {
      // If user is offline, store notification
      const notifications = userNotifications.get(data.to) || [];
      notifications.push({
        from: data.from,
        message: "You have a new message"
      });
      userNotifications.set(data.to, notifications);
    }
  });

  // Handle video/audio call offer
  socket.on("offer", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("offer", data);
    }
  });

  // Handle video/audio call answer
  socket.on("answer", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("answer", data);
    }
  });

  // Handle ICE candidate
  socket.on("ice-candidate", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("ice-candidate", data);
    }
  });

  // Handle read notifications
  socket.on("mark-notifications-read", (userId) => {
    userNotifications.delete(userId);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    onlineUsers.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    });
  });
});