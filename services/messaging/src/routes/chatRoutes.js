const express = require('express');

const chatController = require('../controllers/chatController');

const router = express.Router();

// PROTECT ALL ROUTES AFTER THIS MIDDLEWARE

router.get('/', chatController.getChats);

router.post('/create/private', chatController.createChat);
router.post('/create/group', chatController.createGroupChat);

router.put('/group/rename', chatController.renameGroupChat);
router.put('/group/add', chatController.addToGroupChat);
router.put('/group/remove', chatController.removeFromGroupChat);

router.put('/:chatId/theme', chatController.changeTheme);

module.exports = router;
