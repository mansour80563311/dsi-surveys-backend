const { PrismaClient } = require('@prisma/client'); // importer le client Prisma
const prisma = new PrismaClient(); // instance de Prisma


// Créer un nouveau sondage
const createSurvey = async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    if (!title || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Titre et questions sont requis' });
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        questions: {
          create: questions.map(q => ({
            text: q.text,
            type: q.type,
            options: q.options
              ? { create: q.options.map(o => ({ label: o })) }
              : undefined,
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });

    res.status(201).json(survey);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer tous les sondages
const getAllSurvey = async (req, res) => {
  try {
    const surveys = await prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      include: { questions: { include: { options: true } } },
    });
    res.json(surveys);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer un sondage par ID
const getSurveyById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: { questions: { include: { options: true } } },
    });
    if (!survey) {
      return res.status(404).json({ error: 'Sondage non trouvé' });
    }
    res.json(survey);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { createSurvey, getAllSurvey, getSurveyById };
