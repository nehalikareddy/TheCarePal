const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'thecarepal_secret');

    const decodedId =
      decoded.id ||
      decoded._id ||
      decoded.userId ||
      decoded.user?.id ||
      decoded.user?._id;

    if (!decodedId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await User.findById(decodedId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found or token expired' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
};

module.exports = authMiddleware;
