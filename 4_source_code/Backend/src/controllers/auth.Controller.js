const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getCache, setCache, buildTokenBlacklistKey } = require('../services/redis');

// REGISTER
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const username = req.body.username || req.body.name;
    const name = req.body.name || username;
    const preferences = req.body.preferences || [];

    if (!email || !username || !password) {
      return res.status(400).json({ message: 'Email, username/name, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        email
      }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      username,
      name,
      password: hashedPassword,
      preferences
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        preferences: user.preferences
      }
    });
  } catch (err) {
    next(err);
  }
};

// LOGIN
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        preferences: user.preferences
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET LOGGED IN USER
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'username', 'name', 'preferences', 'bio', 'avatarUrl', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// LOGOUT (Blacklist JWT in Redis)
const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Blacklist token in Redis for 7 days (60 * 60 * 24 * 7)
      await setCache(buildTokenBlacklistKey(token), 'revoked', 7 * 24 * 60 * 60);
    }
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, logout };
module.exports = { register, login, getMe, logout };
