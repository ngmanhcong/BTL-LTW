const FCM = require('fcm-node');
const fcm = process.env.FCM_SERVER_KEY ? new FCM(process.env.FCM_SERVER_KEY) : null;
const NotificationModel = require('../models/notificationModel');

module.exports = class Notification {
  constructor({ recipient, sender, postId, postReact }) {
    this.sender = sender;
    this.recipient = recipient;
    this.postId = postId;
    this.postReact = postReact;
  }

  async send({ body, click, type, path, NotiType }) {
    const message = {
      to: this.recipient.fcmToken,
      notification: {
        title: 'PTITSocial',
        body: body,
        click_action: click,
        icon: 'https://res.cloudinary.com/dcu2kxr5x/image/upload/v1672997573/BACKBOOK/assets/backbooklogo_on8xru.svg',
      },
    };

    let newNotification = null;

    if (NotiType !== 'message') {
      newNotification = await NotificationModel.create({
        sender: this.sender._id,
        recipient: this.recipient._id,
        type,
        click: path,
        content: body,
        reactionType:
          type === 'react'
            ? ['like', 'love', 'haha', 'wow', 'sad', 'angry'].includes(this.postReact)
              ? this.postReact
              : 'like'
            : undefined,
      });
    }

    if (process.env.FCM_SERVER_KEY && this.recipient.fcmToken) {
      fcm.send(message, function (err, response) {
        if (err) {
          console.log('Đã có lỗi xảy ra!');
          console.log(err);
        }
      });
    }

    return newNotification;
  }

  async sendPostReact() {
    const postLink = `${process.env.FRONTEND_URL}/${this.recipient.username}/posts/${this.postId}`;
    const path = `/${this.recipient.username}/posts/${this.postId}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã bày tỏ cảm xúc trên bài viết của bạn`,
      click: postLink,
      type: 'react',
      path: path,
    });
    return noti;
  }

  async sendPostComment() {
    const postLink = `${process.env.FRONTEND_URL}/${this.recipient.username}/posts/${this.postId}`;
    const path = `/${this.recipient.username}/posts/${this.postId}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã bình luận "${this.postReact}" trên bài viết của bạn`,
      click: postLink,
      type: 'comment',
      path: path,
    });
    return noti;
  }

  async sendCommentLike() {
    const postLink = `${process.env.FRONTEND_URL}/${this.recipient.username}/posts/${this.postId}`;
    const path = `/${this.recipient.username}/posts/${this.postId}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã thích bình luận của bạn`,
      click: postLink,
      type: 'react',
      path: path,
    });
    return noti;
  }

  async sendCommentComment() {
    const postLink = `${process.env.FRONTEND_URL}/${this.recipient.username}/posts/${this.postId}`;
    const path = `/${this.recipient.username}/posts/${this.postId}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã trả lời "${this.postReact}" trên bình luận của bạn`,
      click: postLink,
      type: 'comment',
      path: path,
    });
    return noti;
  }

  async sendFriendRequest() {
    const postLink = `${process.env.FRONTEND_URL}/profile/${this.sender.username}`;
    const path = `/profile/${this.sender.username}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã gửi lời mời kết bạn cho bạn`,
      click: postLink,
      type: 'friend',
      path: path,
    });
    return noti;
  }

  async sendFriendAccept() {
    const postLink = `${process.env.FRONTEND_URL}/profile/${this.sender.username}`;
    const path = `/profile/${this.sender.username}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã chấp nhận lời mời kết bạn`,
      click: postLink,
      type: 'friend',
      path: path,
    });
    return noti;
  }

  async sendFollow() {
    const postLink = `${process.env.FRONTEND_URL}/profile/${this.sender.username}`;
    const path = `/profile/${this.sender.username}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã theo dõi bạn`,
      click: postLink,
      type: 'follow',
      path: path,
    });
    return noti;
  }

  async sendMessage() {
    const link = `${process.env.FRONTEND_URL}/messages/${this.postId}`;
    const path = `/messages/${this.postId}`;

    const noti = await this.send({
      body: `${this.sender.first_name} đã gửi tin nhắn cho bạn: ${this.postReact}`,
      click: link,
      type: 'follow',
      path: path,
      NotiType: 'message',
    });
    return noti;
  }
};
