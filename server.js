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

const PORT = process.env.PORT || 5000; // port du serveur
// démarre le serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
