import { useEffect, useRef, useState } from 'react';
import { FiMoreVertical, FiCornerUpLeft, FiCornerUpRight } from 'react-icons/fi';
import Portal from 'shared/lib/Portal';
import styles from 'pages/messages/messages.module.css';

export default function MessageMenu({ message, onReply, onForward }) {
  const [position, setPosition] = useState(null);
  const buttonRef = useRef();
  const menuRef = useRef();

  useEffect(() => {
    if (!position) return;
    menuRef.current?.querySelector('button')?.focus();
    const dismiss = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target))
        setPosition(null);
    };
    const close = () => setPosition(null);
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position]);

  const select = (handler) => {
    setPosition(null);
    handler(message);
  };

  return (
    <div className={styles.messageActions} data-open={Boolean(position)}>
      <button
        ref={buttonRef}
        type="button"
        title="Tùy chọn tin nhắn"
        aria-label="Tùy chọn tin nhắn"
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={() => {
          if (position) {
            setPosition(null);
            return;
          }
          const rect = buttonRef.current.getBoundingClientRect();
          setPosition({
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 188)),
            top: Math.max(8, rect.top - 100),
          });
        }}
      >
        <FiMoreVertical />
      </button>
      {position && (
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            aria-label="Thao tác tin nhắn"
            className={styles.messageMenu}
            style={position}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Tab') {
                setPosition(null);
                buttonRef.current?.focus();
              }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const items = [...menuRef.current.querySelectorAll('button')];
                const index = items.indexOf(document.activeElement);
                items[
                  (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
                ]?.focus();
              }
            }}
          >
            <button type="button" role="menuitem" onClick={() => select(onReply)}>
              <FiCornerUpLeft />
              Trả lời
            </button>
            <button type="button" role="menuitem" onClick={() => select(onForward)}>
              <FiCornerUpRight />
              Chuyển tiếp
            </button>
          </div>
        </Portal>
      )}
    </div>
  );
}
