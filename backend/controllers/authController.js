const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret-key', { expiresIn: '7d' });
};

// Register user
exports.register = async (req, res) => {
    try {
        console.log('📝 Registration attempt for:', req.body.email);
        
        const { name, email, password, role, companyName } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                success: false,
                error: 'Name, email and password are required' 
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({ 
                success: false,
                error: 'User already exists' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log('🔐 Password hashed successfully');

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'client',
            companyName: companyName || ''
        });

        await user.save();
        console.log('✅ User created successfully:', email);

        // Generate token
        const token = generateToken(user._id);
        console.log('🔑 Token generated');

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyName: user.companyName
            },
            token
        });
    } catch (error) {
        console.error('🔥 Registration error:', error.message);
        console.error('🔥 Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            error: 'Registration failed. Please try again.',
            details: error.message 
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        console.log('🔐 Login attempt for:', req.body.email);
        
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('❌ Password mismatch for:', email);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials' 
            });
        }

        // Generate token
        const token = generateToken(user._id);
        console.log('✅ Login successful for:', email);

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyName: user.companyName
            },
            token
        });
    } catch (error) {
        console.error('🔥 Login error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Login failed. Please try again.' 
        });
    }
};

// Get current user
exports.getMe = async (req, res) => {
    try {
        console.log('👤 Get user info for:', req.user.email);
        
        res.json({
            success: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                companyName: req.user.companyName,
                metaAdAccountId: req.user.metaAdAccountId
            }
        });
    } catch (error) {
        console.error('🔥 GetMe error:', error.message);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Update Meta credentials
exports.updateMetaCredentials = async (req, res) => {
    try {
        const { metaAccessToken, metaAdAccountId } = req.body;
        
        console.log('🔄 Updating Meta credentials for:', req.user.email);
        
        req.user.metaAccessToken = metaAccessToken || '';
        req.user.metaAdAccountId = metaAdAccountId || '';
        
        await req.user.save();
        
        console.log('✅ Meta credentials updated for:', req.user.email);
        
        res.json({ 
            success: true,
            message: 'Meta credentials updated successfully',
            metaAdAccountId: req.user.metaAdAccountId
        });
    } catch (error) {
        console.error('🔥 Update Meta credentials error:', error.message);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};