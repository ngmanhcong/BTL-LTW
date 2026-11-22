import { queryClient } from 'App';

export function updateMessages(newMessage) {
  queryClient.setQueryData(['getMessages', newMessage.chat], (oldData) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      pages: oldData.pages.map((page, index) =>
        index !== 0
          ? page
          : {
              ...page,
              data: {
                ...page.data,
                messages: [
                  newMessage,
                  ...page.data.messages.filter((message) => message._id !== newMessage._id),
                ],
                chat: page.data.chat
                  ? { ...page.data.chat, latestMessage: newMessage }
                  : page.data.chat,
              },
            }
      ),
    };
  });
  const cachedChats = queryClient.getQueryData(['getChats']);
  if (!cachedChats?.data.chats.some((chat) => chat._id === newMessage.chat)) {
    queryClient.invalidateQueries({ queryKey: ['getChats'] });
    return;
  }
  queryClient.setQueryData(['getChats'], (oldData) => {
    if (!oldData) return oldData;
    const target = oldData.data.chats.find((chat) => chat._id === newMessage.chat);
    return {
      ...oldData,
      data: {
        ...oldData.data,
        chats: [
          { ...target, latestMessage: newMessage },
          ...oldData.data.chats.filter((chat) => chat._id !== newMessage.chat),
        ],
      },
    };
  });
}

export function updateSeenMessages(newMessage, chat) {
  queryClient.setQueryData(['getMessages', chat._id], (oldData) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      pages: oldData.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          messages: page.data.messages.map((message) =>
            message._id === newMessage._id ? newMessage : message
          ),
          chat:
            page.data.chat?.latestMessage?._id === newMessage._id
              ? { ...page.data.chat, latestMessage: newMessage }
              : page.data.chat,
        },
      })),
    };
  });

  queryClient.setQueryData(['getChats'], (oldData) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      data: {
        ...oldData.data,
        chats: oldData.data.chats.map((item) =>
          item._id === newMessage.chat && item.latestMessage?._id === newMessage._id
            ? { ...item, latestMessage: newMessage }
            : item
        ),
      },
    };
  });
}

export function updateChatTheme(newTheme, chat) {
  queryClient.setQueryData(['getMessages', chat], (oldData) => {
    if (!oldData) return oldData;
    let newData = oldData;
    newData.pages[0].data.chat.theme = newTheme;
    return {
      ...oldData,
      newData,
    };
  });
}

export function updateChatName(newchatName, chat) {
  queryClient.setQueryData(['getMessages', chat], (oldData) => {
    if (!oldData) return oldData;
    let newData = oldData;
    newData.pages[0].data.chat.chatName = newchatName;
    return {
      ...oldData,
      newData,
    };
  });
  queryClient.setQueryData(['getChats'], (oldData) => {
    if (!oldData) return oldData;
    let newData = oldData;
    newData.data.chats = newData.data.chats.map((oldChat) => {
      if (oldChat._id === chat) {
        return {
          ...oldChat,
          chatName: newchatName,
        };
      }
      return oldChat;
    });

    return {
      ...oldData,
      newData,
    };
  });
}
