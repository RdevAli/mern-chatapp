exports.handleOffer = (req, res) => {
    const { offer, to } = req.body;
    // Add logic for handling the offer
    res.status(200).json({ message: 'Offer received' });
  };
  
  exports.handleAnswer = (req, res) => {
    const { answer, to } = req.body;
    // Add logic for handling the answer
    res.status(200).json({ message: 'Answer received' });
  };
  
  exports.handleIceCandidate = (req, res) => {
    const { candidate, to } = req.body;
    // Add logic for handling ICE candidates
    res.status(200).json({ message: 'ICE candidate received' });
  };
  