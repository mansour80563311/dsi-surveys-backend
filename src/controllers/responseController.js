const { PrismaClient } = require('@prisma/client'); // importer le client Prisma
const prisma = new PrismaClient(); // instance de Prisma    

// Soumettre une réponse à un sondage (en batch avec transaction)
const submitResponse = async (req, res) => {
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
};

module.exports = {
  submitResponse,
};  


