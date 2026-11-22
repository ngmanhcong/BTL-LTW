import { string } from 'yup';
import moment from 'moment';
import { notificationIcon, localizeSystemText } from './locale';

test('default form validation and relative time use Vietnamese', async () => {
  await expect(string().min(3).validate('a')).rejects.toThrow('Vui lòng nhập ít nhất 3 ký tự');
  await expect(string().email().validate('invalid')).rejects.toThrow('Địa chỉ email không hợp lệ');
  expect(moment.duration(2, 'minutes').humanize()).toBe('2 phút');
});

test('notification icons work independently of translated notification text', () => {
  expect(
    notificationIcon({
      type: 'react',
      reactionType: 'love',
      content: 'Bình đã bày tỏ cảm xúc trên bài viết của bạn',
    })
  ).toBe('love');
  expect(
    notificationIcon({ type: 'react', content: 'Nguyễn Văn An reacted wow on your post' })
  ).toBe('wow');
  expect(localizeSystemText('Bình Sent you a friend request')).toBe(
    'Bình đã gửi lời mời kết bạn cho bạn'
  );
});
