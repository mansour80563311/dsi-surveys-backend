require('dotenv').config(); // charge les variables d'environnement (.env)
const express = require('express'); // framework web
const cors = require('cors'); // autorise les requêtes depuis d'autres domaines (CORS)
const { PrismaClient } = require('@prisma/client'); // client Prisma pour la BD
const { tr } = require('zod/locales');


const app = express(); // instance d'Express
const prisma = new PrismaClient(); // instance de Prisma

app.use(cors());
app.use(express.json()); // pour parser le JSON dans les requêtes

// Importer les routes
const surveyRoutes = require('./src/routes/surveyRoutes.js');
const responseRoutes = require('./src/routes/responseRoutes.js');
const resultRoutes = require('./src/routes/resultRoutes.js');
// Utiliser les routes
app.use('/api/surveys', surveyRoutes); // utilise les routes de sondage
app.use('/api/surveys/:id/responses', responseRoutes); // utilise les routes de réponses
app.use('/api/results/:surveyId', resultRoutes); // utilise les routes de résultats




// route de test pour vérifier que le serveur fonctionne
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});



const PORT = process.env.PORT || 5000; // port du serveur
// démarre le serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});





// Résultats d’une enquête (optimisé)
// /api/results/:surveyId', 
 




