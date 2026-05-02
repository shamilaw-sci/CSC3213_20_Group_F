const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- PROTECT MIDDLEWARE ---
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check if token exists in header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. If no token found
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Get user from DB (excluding password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 5. Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// --- ISADMIN MIDDLEWARE ---
const isAdmin = (req, res, next) => {
  // Check if user exists and role is admin
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
};

module.exports = { protect, isAdmin };