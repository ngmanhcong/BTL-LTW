const express = require('express');

const messagesController = require('../controllers/messagesController');

const router = express.Router();

// PROTECT ALL ROUTES AFTER THIS MIDDLEWARE

router.get('/files/:msgId', messagesController.getAttachment);
router.get('/media/:msgId', messagesController.getImage);
router.get('/:chatId', messagesController.getMessages);
router.put('/:chatId/send', messagesController.uploadAttachment, messagesController.sendMessage);
router.put('/:msgId/seen', messagesController.seenMessage);

module.exports = router;
