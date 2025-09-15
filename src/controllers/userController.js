const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Créer un nouvel utilisateur
const createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validation minimale
    if (!name || !email) {
      return res.status(400).json({ error: "Nom et email sont requis." });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Un utilisateur avec cet email existe déjà." });
    }

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: { name, email, role },
    });

    res.status(201).json(user);
  } catch (error) {
    // Gestion spécifique de l'erreur Prisma pour violation unique
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Email déjà utilisé." });
    }
    console.error(error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// Récupérer tous les utilisateurs
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' } // facultatif, pour un affichage trié
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

module.exports = { createUser, getAllUsers };
