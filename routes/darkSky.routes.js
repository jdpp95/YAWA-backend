const { darkSky } = require('../controllers/darkSky.controller')
const { Router } = require('express');

const router = Router();

router.get('/', darkSky);

module.exports = router;