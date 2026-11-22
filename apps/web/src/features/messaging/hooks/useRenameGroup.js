import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { socket } from 'routes/IsLoggedIn';
import { updateChatName } from 'shared/lib/rqUpdate';
import { useSendMessage } from './useSendMessage';

const RenameGroup = async ({ chatId, chatName }) => {
  const { data } = await axios.put(
    `${process.env.REACT_APP_BACKEND_URL}/api/v1/chats/group/rename`,
    { chatId, chatName },
    {
      withCredentials: true,
    }
  );
  return data;
};

export const useRenameGroup = (chat) => {
  const { mutate: sendMessage } = useSendMessage(chat);

  return useMutation({
    mutationKey: 'useRenameGroup',
    mutationFn: RenameGroup,
    onSuccess: (data) => {
      const newchatName = data?.data?.chatName;
      const userId = data?.data?.user;

      updateChatName(newchatName, chat._id);

      sendMessage({
        content: `Tên nhóm đã được đổi thành ${newchatName}`,
        type: 'info',
        chatId: chat._id,
      });

      socket.emit('customize_chat', {
        userId,
        type: 'name',
        content: newchatName,
        chat,
      });
    },
  });
};
