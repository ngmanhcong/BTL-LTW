const express = require('express');
const postController = require('../controllers/postController');
const router = express.Router();

router.post(
  '/createPost/images',
  postController.uploadPostImages,
  postController.prepareAudience,
  postController.resizePostImages,
  postController.createPost
);
router.post('/createPost', postController.prepareAudience, postController.createPost);
router.use('/:postID/reacts', postController.checkAccess);
router.use('/addComment/:postID', postController.checkAccess);
router.use('/comments/:commentID/like', postController.checkAccess);
router.use('/comments/:commentID/reply', postController.checkAccess);
router.put('/:postID', postController.deletePost);
router.get('/getAllPosts', postController.getAllPosts);
router.get('/:postID', postController.checkAccess, postController.getPost);

router.put('/:postID/reacts', postController.addReact);
router.post(
  '/addComment/:postID',
  postController.uploadCommentPhoto,
  postController.resizeCommentPhoto,
  postController.addComment
);
router.get('/:postID/reacts', postController.getReacts);

router.put('/comments/:commentID/like', postController.commentLike);
router.post(
  '/comments/:commentID/reply',
  postController.uploadCommentPhoto,
  postController.resizeCommentPhoto,
  postController.addCommentReply
);
router.get('/comments/:postID', postController.checkAccess, postController.getComments);

module.exports = router;
