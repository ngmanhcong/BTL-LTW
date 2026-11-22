import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { chatThemes } from 'features/messaging/data/chatThemes';
import { socket } from 'routes/IsLoggedIn';
import { updateChatTheme } from 'shared/lib/rqUpdate';
import { useSendMessage } from './useSendMessage';

const ChangeTheme = async ({ theme, chatId }) => {
  const { data } = await axios.put(
    `${process.env.REACT_APP_BACKEND_URL}/api/v1/chats/${chatId}/theme`,
    { theme },
    {
      withCredentials: true,
    }
  );
  return data;
};

export const useChangeTheme = (chat) => {
  const { mutate: sendMessage } = useSendMessage(chat);

  return useMutation({
    mutationKey: 'useChangeTheme',
    mutationFn: ChangeTheme,
    onSuccess: (data) => {
      const newTheme = data?.data?.theme;
      const name = data?.data?.name;
      const userId = data?.data?.user;

      updateChatTheme(newTheme, chat._id);

      sendMessage({
        content: `
         ${name} đã đổi chủ đề thành ${chatThemes[newTheme - 1].name}.`,
        type: 'info',
        chatId: chat._id,
      });

      toast.success('Đã đổi chủ đề thành công');

      socket.emit('customize_chat', {
        userId,
        type: 'theme',
        content: newTheme,
        chat,
      });
    },
  });
};
