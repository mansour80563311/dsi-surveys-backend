const express = require('express');
const router = express.Router();
const { createUser, getAllUsers, loginUser } = require('../controllers/userController');
console.log({ createUser, getAllUsers, loginUser }); // 👀 vérifie que ce sont bien des fonctions

router.post('/', createUser);
router.get('/', getAllUsers);
router.post('/login', loginUser); 

module.exports = router;
