import moment from 'moment';
import 'moment/locale/vi';
import { setLocale } from 'yup';

moment.locale('vi');
setLocale({
  mixed: {
    default: 'Giá trị không hợp lệ',
    required: 'Vui lòng nhập thông tin này',
    notType: 'Giá trị không đúng định dạng',
    oneOf: 'Giá trị không được hỗ trợ',
  },
  string: {
    min: ({ min }) => `Vui lòng nhập ít nhất ${min} ký tự`,
    max: ({ max }) => `Chỉ được nhập tối đa ${max} ký tự`,
    length: ({ length }) => `Vui lòng nhập đúng ${length} ký tự`,
    email: 'Địa chỉ email không hợp lệ',
    url: 'Đường dẫn không hợp lệ',
    matches: 'Thông tin không đúng định dạng',
  },
  number: {
    min: ({ min }) => `Giá trị phải từ ${min} trở lên`,
    max: ({ max }) => `Giá trị không được lớn hơn ${max}`,
    integer: 'Vui lòng nhập số nguyên',
  },
  array: {
    min: ({ min }) => `Vui lòng chọn ít nhất ${min} mục`,
    max: ({ max }) => `Chỉ được chọn tối đa ${max} mục`,
  },
});

export const emojiLocale = {
  searchPlaceHolder: 'Tìm biểu tượng cảm xúc…',
  categories: [
    { category: 'suggested', name: 'Gần đây' },
    { category: 'smileys_people', name: 'Mặt cười và con người' },
    { category: 'animals_nature', name: 'Động vật và thiên nhiên' },
    { category: 'food_drink', name: 'Đồ ăn và thức uống' },
    { category: 'travel_places', name: 'Du lịch và địa điểm' },
    { category: 'activities', name: 'Hoạt động' },
    { category: 'objects', name: 'Đồ vật' },
    { category: 'symbols', name: 'Ký hiệu' },
    { category: 'flags', name: 'Cờ' },
  ],
};

export const relationshipLabel = (value) =>
  ({
    Single: 'Độc thân',
    'In a realationship': 'Đang hẹn hò',
    'In a relationship': 'Đang hẹn hò',
    Married: 'Đã kết hôn',
    Divorced: 'Đã ly hôn',
  })[value] || value;

export const reactionLabel = (value) =>
  ({
    like: 'Thích',
    love: 'Yêu thích',
    haha: 'Haha',
    wow: 'Ngạc nhiên',
    sad: 'Buồn',
    angry: 'Phẫn nộ',
  })[value] || value;
export const notificationIcon = (notification) =>
  notification.type === 'react'
    ? notification.reactionType ||
      notification.content?.match(/\b(like|love|haha|wow|sad|angry)\b/)?.[1] ||
      'like'
    : notification.type;
export const localizeSystemText = (text = '') =>
  text
    .replace(/ changed the theme to /, ' đã đổi chủ đề thành ')
    .replace(/^Group name changed to /, 'Tên nhóm đã được đổi thành ')
    .replace(/ Added to this group$/, ' đã được thêm vào nhóm')
    .replace(/ Removed from this group$/, ' đã được xóa khỏi nhóm')
    .replace(
      / reacted (like|love|haha|wow|sad|angry) on your post$/,
      ' đã bày tỏ cảm xúc trên bài viết của bạn'
    )
    .replace(/ reacted like to your comment$/, ' đã thích bình luận của bạn')
    .replace(/ commented (.*?) on your post$/, ' đã bình luận "$1" trên bài viết của bạn')
    .replace(/ replied (.*?) on your comment$/, ' đã trả lời "$1" trên bình luận của bạn')
    .replace(/ Sent you a friend request$/, ' đã gửi lời mời kết bạn cho bạn')
    .replace(/ Accept your friend request$/, ' đã chấp nhận lời mời kết bạn')
    .replace(/ Followed you$/, ' đã theo dõi bạn')
    .replace(/ sent you a message :/, ' đã gửi tin nhắn cho bạn:');
