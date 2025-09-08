const {PrismaClient} = require('@prisma/client'); // importer le client Prisma
const prisma = new PrismaClient();

// Récupérer les résultats d’une enquête (optimisé)
const getSurveyResults = async (req, res) => {
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
            type: q.type,
            text: q.text,   
            results: {
            average: agg._avg.answerNumber,
            count: agg._count._all,
            },
        });
        } else if (q.type === 'MULTIPLE') {
        const opts = [];
        for (const opt of q.options) {
            const count = resultsData[cursor++];
            opts.push({ optionId: opt.id, label: opt.label, count });
        }
        results.push({
            questionId: q.id,
            type: q.type,
            text: q.text,
            results: opts,
        });
        } else {
        const comments = resultsData[cursor++];
        results.push({
            questionId: q.id,
            type: q.type,
            text: q.text,
            results: comments,
        });
        }   
    }
    res.json({ survey: { id: survey.id, title: survey.title }, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }     
};

module.exports = {
  getSurveyResults,
};