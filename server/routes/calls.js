const router = require("express").Router();

// Import controllers
const { handleOffer, handleAnswer, handleIceCandidate } = require("../controllers/callController");

// Route to handle call offers
router.post("/offer", handleOffer);

// Route to handle call answers
router.post("/answer", handleAnswer);

// Route to handle ICE candidates
router.post("/ice-candidate", handleIceCandidate);

module.exports = router;
