const { darkSky } = require('../controllers/darkSky.controller')
const { openMeteo } = require('../controllers/openMeteo.controller')
const { mapbox } = require('../controllers/mapbox.controller')
const { validateFields } = require('../middlewares/validateFields');

const { Router } = require('express');
const { check } = require('express-validator');

const router = Router();

router.get('/darkSky', darkSky);
router.get('/openMeteo', openMeteo);
router.get('/mapbox', [
    check('q', 'Query (q) is required').not().isEmpty(),
    validateFields
], mapbox);

module.exports = router;