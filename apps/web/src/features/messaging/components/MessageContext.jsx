import { localizeSystemText } from 'app/locale';
import { FiCornerUpLeft, FiCornerUpRight } from 'react-icons/fi';
import styles from 'pages/messages/messages.module.css';

export function messagePreview(message) {
  if (message?.type === 'info') return localizeSystemText(message.content);
  if (message?.type === 'like') return '👍';
  if (message?.type === 'image') return 'Ảnh';
  if (message?.type === 'file') return message.attachment?.name || message.attachmentName || 'Tệp đính kèm';
  return message?.content || 'Tin nhắn';
}

export default function MessageContext({ message, onJump }) {
  return (
    <>
      {message.forwarded && (
        <div className={styles.forwardedLabel}>
          <FiCornerUpRight /> Đã chuyển tiếp
        </div>
      )}
      {message.replyTo && (
        <button
          type="button"
          className={styles.replyQuote}
          onClick={() => onJump?.(message.replyTo.messageId)}
        >
          <span>
            <FiCornerUpLeft /> Trả lời {message.replyTo.sender?.first_name}{' '}
            {message.replyTo.sender?.last_name}
          </span>
          <span>{messagePreview(message.replyTo)}</span>
        </button>
      )}
    </>
  );
}
