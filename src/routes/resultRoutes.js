const express = require('express'); // framework web
const { getSurveyResults } = require('../controllers/resultController');

const router = express.Router({mergeParams: true}); // mergeParams pour accéder à :surveyId

router.get('/', getSurveyResults); // GET /api/results/:surveyId

module.exports = router;

