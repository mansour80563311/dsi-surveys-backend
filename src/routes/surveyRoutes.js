const express = require('express');
const { createSurvey, getAllSurvey, getSurveyById } = require('../controllers/surveyController');

const router = express.Router();

router.post('/', createSurvey);        // POST /api/surveys
router.get('/', getAllSurvey);         // GET /api/surveys
router.get('/:id', getSurveyById);     // GET /api/surveys/:id


module.exports = router;
