const { darkSkyTest } = require('../controllers/darkSky.controller')
const { Router } = require('express');

const router = Router();

router.get('/', darkSkyTest);

module.exports = router;