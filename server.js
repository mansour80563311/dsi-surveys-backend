require('dotenv').config(); // charge les variables d'environnement (.env)
const express = require('express'); // framework web
const cors = require('cors'); // autorise les requêtes depuis d'autres domaines (CORS)
const { PrismaClient } = require('@prisma/client'); // client Prisma pour la BD
const { tr } = require('zod/locales');

const app = express(); // instance d'Express
const prisma = new PrismaClient(); // instance de Prisma

app.use(cors());
app.use(express.json()); // pour parser le JSON dans les requêtes

// route de test pour vérifier que le serveur fonctionne
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Créer un nouveau sondage avec questions et options (Créer une enquête (+ questions + options))
app.post('/api/surveys' , async (req, res) => { // route pour créer un sondage
    
    try {  // essaie de créer le sondage
        const { title, description, questions } = req.body; // extrait les données du corps de la requête
        if (!title || !Array.isArray(questions)){ //
            return res.status(400).json({ error: 'Titre et questions sont recquis' }); 
        }
        
        const survey = await prisma.survey.create({ // crée le sondage dans la BD
            data: { // données du sondage
                title,
                description,
                questions: { // crée les questions associées
                    create: questions.map(q => ({ 
                        text: q.text,
                        type: q.type,
                        options: q.options ? { create: q.options.map(o => ({ label: o })) } : undefined, // crée les options si elles existent
                    })),
                },
            },  
            include: { questions: { include: { options: true } } }, // inclut les questions et options dans la réponse
        });
        res.status(201).json(survey);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer tous les sondages (Get all surveys)
app.get('/api/surveys/', async (req, res) => { // route pour récupérer tous les sondages
    try {
        const surveys = await prisma.survey.findMany({ // trouve tous les sondages
            orderBy: { createdAt: 'desc' }, // trie par date de création décroissante
            include: { questions: { include: { options: true } } }, // inclut les questions et options
        });
        res.json(surveys);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer un sondage par ID (Get survey by ID)
app.get('/api/surveys/:id', async (req, res) => { // route pour récupérer un sondage par ID
    try {
        const id = parseInt(req.params.id, 10); // ✅ convertir l'id en entier

        const survey = await prisma.survey.findUnique({ // trouve le sondage par ID
            where: { id }, // condition de recherche
            include: { questions: { include: { options: true } } }, // inclut les questions et options
        }); 
        if (!survey) {
            return res.status(404).json({ error: 'Sondage non trouvé' });
        }   
        res.json(survey);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }   
});


// Soumettre une réponse à un sondage (en batch avec transaction)
app.post('/api/surveys/:id/responses', async (req, res) => {
  try {
    const surveyId = parseInt(req.params.id, 10);
    const { userId, answers } = req.body; // answers = [{questionId, type, value}]

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'answers[] requis' });
    }

    // Vérifie que le sondage existe
    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      return res.status(404).json({ error: 'Sondage non trouvé' });
    }

        // ⚠️ Vérifie si l'utilisateur a déjà répondu à ce sondage
    const existing = await prisma.response.findFirst({
      where: { surveyId, userId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Vous avez déjà répondu à ce sondage' });
    }

    // Prépare les écritures pour la transaction
    const writes = answers.map(a => {
      const base = {
        surveyId,
        questionId: a.questionId,
        userId: userId || null,
      };

      if (a.type === 'SCALE') {
        return prisma.response.create({ data: { ...base, answerNumber: Number(a.value) } });
      } else if (a.type === 'MULTIPLE') {
        return prisma.response.create({ data: { ...base, optionId: Number(a.value) } });
      } else { // TEXT
        return prisma.response.create({ data: { ...base, answerString: String(a.value) } });
      }
    });

    // Exécute tout en une seule transaction
    const tx = await prisma.$transaction(writes);

    res.status(201).json({
      message: 'Réponses enregistrées avec succès',
      inserted: tx.length,
      responses: tx
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Résultats d’une enquête (optimisé)
app.get('/api/results/:surveyId', async (req, res) => {
  try {
    const surveyId = Number(req.params.surveyId);

    // Charger l’enquête avec toutes les questions et options
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: { include: { options: true } } },
    });
    if (!survey) return res.status(404).json({ error: 'Enquête introuvable' });

    // Préparer les requêtes à exécuter en une seule transaction
    const queries = [];
    for (const q of survey.questions) {
      if (q.type === 'SCALE') {
        queries.push(
          prisma.response.aggregate({
            _avg: { answerNumber: true },
            _count: { _all: true },
            where: { questionId: q.id },
          })
        );
      } else if (q.type === 'MULTIPLE') {
        for (const opt of q.options) {
          queries.push(
            prisma.response.count({
              where: { questionId: q.id, optionId: opt.id },
            })
          );
        }
      } else {
        queries.push(
          prisma.response.findMany({
            where: { questionId: q.id, NOT: { answerString: null } },
            select: { id: true, answerString: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
        );
      }
    }

    // Exécuter toutes les requêtes en parallèle
    const resultsData = await prisma.$transaction(queries);

    // Reconstruire les résultats question par question
    const results = [];
    let cursor = 0;
    for (const q of survey.questions) {
      if (q.type === 'SCALE') {
        const agg = resultsData[cursor++];
        results.push({
          questionId: q.id,
          text: q.text,
          type: q.type,
          count: agg._count._all,
          average: agg._avg.answerNumber || 0,
        });
      } else if (q.type === 'MULTIPLE') {
        const counts = [];
        for (const opt of q.options) {
          const c = resultsData[cursor++];
          counts.push({ optionId: opt.id, label: opt.label, count: c });
        }
        results.push({ questionId: q.id, text: q.text, type: q.type, distribution: counts });
      } else {
        const comments = resultsData[cursor++];
        results.push({ questionId: q.id, text: q.text, type: q.type, comments });
      }
    }

    res.json({ survey: { id: survey.id, title: survey.title }, results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



const PORT = process.env.PORT || 5000; // port du serveur
// démarre le serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
