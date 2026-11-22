import { emojiLocale } from 'app/locale';
import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useSendMessage } from 'features/messaging/hooks/useSendMessage';
import { Like, Photo, Send, Smile } from 'shared/icons/index';
import isRTL from 'shared/lib/isRTL';
import styles from './messages.module.css';
import { socket } from 'routes/IsLoggedIn';
import { FiCornerUpLeft, FiX, FiPaperclip, FiFileText } from 'react-icons/fi';
import { messagePreview } from 'features/messaging/components/MessageContext';
import { toast } from 'react-hot-toast';
const EmojiPicker = lazy(() => import('emoji-picker-react'));

function SendMessage({
  chat,
  chatId,
  setIsTyping,
  isTyping,
  chatTheme,
  scrollToBottom,
  replyTo,
  onCancelReply,
}) {
  const messageRef = useRef();
  const imageInputRef = useRef();
  const fileInputRef = useRef();
  const emojiRef = useRef();
  const [showEmojis, setShowEmojis] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  useEffect(() => {
    if (!imageFile || !imageFile.type.startsWith('image/')) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  useEffect(() => {
    if (!showEmojis) return;
    const outside = (event) => {
      if (!emojiRef.current?.contains(event.target)) setShowEmojis(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') {
        setShowEmojis(false);
        messageRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [showEmojis]);
  const [messageText, setMessageText] = useState('');
  const [delayHandler, setDelayHandler] = useState(null);
  const isSend = messageText.trim().length > 0 || Boolean(imageFile);
  useEffect(() => {
    if (replyTo) messageRef.current?.focus();
  }, [replyTo]);

  const handleEnter = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendHandler();
    }
  };

  const {
    mutate: sendMessage,
    isSuccess: isMessageSuccess,
    isLoading: isSending,
  } = useSendMessage(chat);

  const sendHandler = () => {
    if (isSending || !chatId || !chat) return;
    sendMessage(
      {
        content: isSend ? messageText : 'like',
        ...(imageFile ? { imageFile } : {}),
        type: imageFile
          ? imageFile.type.startsWith('image/')
            ? 'image'
            : 'file'
          : isSend
            ? 'text'
            : 'like',
        chatId,
        replyMessageId: replyTo?._id,
      },
      {
        onSuccess: () => {
          socket?.emit('typing', { room: chatId, status: false });
          setIsTyping({ room: chatId, status: false });
          setMessageText('');
          setImageFile(null);
          setShowEmojis(false);
          if (imageInputRef.current) imageInputRef.current.value = '';
          onCancelReply?.();
          scrollToBottom();
          messageRef.current?.focus();
        },
      }
    );
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ảnh phải nhỏ hơn hoặc bằng 10 MB');
      return;
    }
    setImageFile(file);
    setShowEmojis(false);
    messageRef.current?.focus();
  };
  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z)$/i.test(file.name)) {
      toast.error('Chỉ hỗ trợ Word, PDF, Excel, PowerPoint, văn bản và tệp nén');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Tệp không được lớn hơn 25 MB');
      return;
    }
    setImageFile(file);
    setShowEmojis(false);
    messageRef.current?.focus();
  };
  const insertEmoji = ({ emoji }) => {
    const input = messageRef.current;
    const start = input?.selectionStart ?? messageText.length;
    const end = input?.selectionEnd ?? start;
    const next = messageText.slice(0, start) + emoji + messageText.slice(end);
    if (next.length > 400) {
      toast.error('Tin nhắn không được quá 400 ký tự');
      return;
    }
    setMessageText(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };
  const typingHandler = () => {
    if (!isTyping.status) {
      setIsTyping({ room: chatId, status: true });
      socket.emit('typing', { room: chatId, status: true });
    }
    clearTimeout(delayHandler);
    setDelayHandler(
      setTimeout(() => {
        socket.emit('typing', { room: chatId, status: false });
        setIsTyping({ room: chatId, status: false });
      }, 3000)
    );
  };

  useEffect(() => {
    scrollToBottom();
  }, [isMessageSuccess]);

  return (
    <div className={`${styles.sendContainer} ${imageFile ? styles.hasImagePreview : ''}`}>
      {replyTo && (
        <div className={styles.replyComposer}>
          <FiCornerUpLeft />
          <div>
            <strong>
              Đang trả lời {replyTo.sender?.first_name} {replyTo.sender?.last_name}
            </strong>
            <span>{messagePreview(replyTo)}</span>
          </div>
          <button type="button" aria-label="Hủy trả lời" onClick={onCancelReply}>
            <FiX />
          </button>
        </div>
      )}
      {imageFile && (
        <div className={styles.chatImagePreview}>
          {imageFile.type.startsWith('image/') ? (
            <img src={imagePreview} alt="Ảnh chuẩn bị gửi" />
          ) : (
            <FiFileText size={36} />
          )}
          <span>
            {imageFile.name} ·{' '}
            {(imageFile.size / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} KB
          </span>
          <button
            type="button"
            aria-label={imageFile.type.startsWith('image/') ? 'Bỏ ảnh đã chọn' : 'Bỏ tệp đã chọn'}
            disabled={isSending}
            onClick={() => setImageFile(null)}
          >
            <FiX />
          </button>
        </div>
      )}
      <div className={styles.send}>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={chooseImage}
          hidden
          aria-label="Chọn ảnh gửi trong chat"
        />
        <button
          type="button"
          className={styles.composerTool}
          aria-label="Gửi ảnh"
          title="Gửi ảnh"
          disabled={isSending || !chat}
          onClick={() => imageInputRef.current?.click()}
        >
          <Photo color={chatTheme?.type === 'gradient' ? chatTheme?.downColor : chatTheme?.color} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
          onChange={chooseFile}
          hidden
          aria-label="Chọn tệp đính kèm"
        />
        <button
          type="button"
          className={styles.composerTool}
          aria-label="Gửi tệp"
          title="Gửi tệp Word, PDF…"
          disabled={isSending || !chat}
          onClick={() => fileInputRef.current?.click()}
        >
          <FiPaperclip size={22} />
        </button>
        <div ref={emojiRef} className={styles.emojiTool}>
          <button
            type="button"
            className={styles.composerTool}
            aria-label="Chọn biểu tượng cảm xúc"
            title="Biểu tượng cảm xúc"
            aria-expanded={showEmojis}
            disabled={isSending || !chat}
            onClick={() => setShowEmojis((old) => !old)}
          >
            <Smile
              color={chatTheme?.type === 'gradient' ? chatTheme?.downColor : chatTheme?.color}
            />
          </button>
          {showEmojis && (
            <div
              className={styles.chatEmojiPicker}
              role="dialog"
              aria-label="Chọn biểu tượng cảm xúc"
            >
              <Suspense fallback={<p>Đang tải biểu tượng cảm xúc…</p>}>
                <EmojiPicker
                  {...emojiLocale}
                  width={Math.min(320, window.innerWidth - 40)}
                  height={Math.min(340, Math.max(200, window.innerHeight * 0.45))}
                  emojiStyle="native"
                  theme={document.body.classList.contains('dark') ? 'dark' : 'light'}
                  onEmojiClick={insertEmoji}
                  previewConfig={{ showPreview: false }}
                  lazyLoadEmojis
                />
              </Suspense>
            </div>
          )}
        </div>
        <div className={styles.send_message_wrap}>
          <textarea
            style={{
              direction: `${isRTL(messageText) ? 'rtl' : 'ltr'}`,
            }}
            value={messageText}
            maxLength={400}
            readOnly={isSending}
            ref={messageRef}
            onChange={(e) => {
              typingHandler();
              setMessageText(e.target.value);
            }}
            className={styles.send_message}
            type="text"
            placeholder="Nhập tin nhắn..."
            onKeyDown={handleEnter}
          />
        </div>
        <button
          type="button"
          aria-label={isSend ? 'Gửi tin nhắn' : 'Gửi lượt thích'}
          disabled={isSending || !chat}
          className={styles.send_message_button}
          onClick={sendHandler}
        >
          {isSend ? (
            <Send
              color={chatTheme?.type === 'gradient' ? chatTheme?.downColor : chatTheme?.color}
            />
          ) : (
            <Like
              color={chatTheme?.type === 'gradient' ? chatTheme?.downColor : chatTheme?.color}
            />
          )}
        </button>
      </div>
    </div>
  );
}

export default SendMessage;
