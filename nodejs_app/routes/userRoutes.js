const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

router.post('/register', async (req, res) => {
    try {
        const result = await userService.registerUser(req.body);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userService.authenticateUser(email, password);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: user
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const result = await userService.updateUserProfile(req.body.email, req.body);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;