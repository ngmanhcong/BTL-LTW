import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { updateNStats } from 'app/slices/userSlice';
import { socket } from 'routes/IsLoggedIn';
import { updateMessages } from 'shared/lib/rqUpdate';

export const useSendMessage = (chat) => {
  const dispatch = useDispatch();
  return useMutation({
    mutationKey: 'useSendMessage',
    mutationFn: async ({ content, chatId, type, replyMessageId, forwardMessageId, imageFile }) => {
      let body = { content, type, replyMessageId, forwardMessageId };
      if (imageFile) {
        body = new FormData();
        const isImage = imageFile.type.startsWith('image/');
        body.append('type', isImage ? 'image' : 'file');
        body.append(isImage ? 'image' : 'file', imageFile);
        if (content?.trim()) body.append('caption', content.trim());
        if (replyMessageId) body.append('replyMessageId', replyMessageId);
      }
      const { data } = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/messages/${chatId}/send`,
        body,
        {
          withCredentials: true,
        }
      );
      return data;
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message);
    },
    onSuccess: (data) => {
      const newMessage = data?.data?.message;
      updateMessages(newMessage);
      dispatch(updateNStats({ unseenMessages: data?.data?.unseenMessages }));
      socket?.emit('new_message', { message: newMessage, chat });
    },
  });
};
