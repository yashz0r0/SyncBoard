const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if token exists in header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user from token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // 4. Check if token was invalidated by logout
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Token expired or logged out' });
    }

    // 5. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { protect };
