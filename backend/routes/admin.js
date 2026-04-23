const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/auth/login', [
    body('email').isEmail(),
    body('').notEmpty(),

], validate)