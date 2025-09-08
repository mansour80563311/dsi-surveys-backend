const express = require('express'); // framework web
const { submitResponse } = require('../controllers/responseController');

const router = express.Router({mergeParams: true}); // mergeParams pour accéder à :id

router.post('/', submitResponse); // POST /api/surveys/:id/responses

module.exports = router;

