import { useEffect, useRef, useState } from 'react';
import { FiArrowUp, FiChevronDown, FiMaximize2, FiMinimize2, FiMove, FiX } from 'react-icons/fi';
import GuideContent from './GuideContent';
import submitOnEnter from './submitOnEnter';
import styles from './kheChat.module.css';

const SIZE = 64,
  GAP = 12,
  HEADER = 64;
const viewportSize = () => ({
  width: window.visualViewport?.width || window.innerWidth,
  height: window.visualViewport?.height || window.innerHeight,
});
function clampPosition(point, viewport) {
  return {
    x: Math.max(GAP, Math.min(point.x, viewport.width - SIZE - GAP)),
    y: Math.max(HEADER + GAP, Math.min(point.y, viewport.height - SIZE - GAP)),
  };
}
function Mascot({ small = false }) {
  return (
    <svg
      width={small ? 34 : 52}
      height={small ? 34 : 52}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={styles.mascot}
    >
      <path
        d="M32 8C21 13 9 29 6 43c-2 9 7 14 25 14s29-4 27-14C55 29 43 16 32 8Z"
        fill="#aeb3ba"
        stroke="#34383d"
        strokeWidth="2.5"
      />
      <path
        d="M32 10c5-8 12-8 17-6-2 8-7 12-15 9"
        fill="#8c939c"
        stroke="#34383d"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M18 35c4-11 21-13 28 1 5 9-1 14-14 14s-19-5-14-15Z" fill="#272b31" />
      <ellipse cx="25" cy="38" rx="3.5" ry="6" fill="#fff" />
      <ellipse cx="39" cy="38" rx="3.5" ry="6" fill="#fff" />
    </svg>
  );
}

export default function KheChat({
  userId,
  messages = [],
  resources = [],
  ready,
  busy,
  pending,
  onSend,
}) {
  const storageKey = `ptitsocial:khe-position:${userId}`;
  const [viewport, setViewport] = useState(viewportSize);
  const [position, setPosition] = useState(() => {
    const size = viewportSize();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) return clampPosition(saved, size);
    } catch {
      /* A blocked or cleared storage must not prevent opening chat. */
    }
    return clampPosition({ x: size.width - SIZE - 24, y: size.height - SIZE - 24 }, size);
  });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const launcher = useRef();
  const input = useRef();
  const transcript = useRef();
  const drag = useRef();
  const suppressClick = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => {
    const resize = () => {
      const size = viewportSize();
      setViewport(size);
      setPosition((point) => clampPosition(point, size));
    };
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
      } catch {
        /* Storage is optional. */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [position, storageKey]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [open, messages.length, pending]);
  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };
  function startDrag(event, origin) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    if (origin === 'header' && event.target.closest('button')) return;
    drag.current = {
      x: position.x,
      y: position.y,
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
      origin,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function moveDrag(event) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.clientX,
      dy = event.clientY - current.clientY;
    if (!current.moved && Math.hypot(dx, dy) < 6) return;
    current.moved = true;
    event.preventDefault();
    setPosition(clampPosition({ x: current.x + dx, y: current.y + dy }, viewport));
  }
  function endDrag(event) {
    if (drag.current?.origin === 'launcher') suppressClick.current = drag.current.moved;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  async function send(content) {
    if (!content.trim() || !ready || busy || inFlight.current) return;
    inFlight.current = true;
    setError('');
    try {
      await onSend(content.trim());
      setQuestion('');
      input.current?.focus();
    } catch (failure) {
      setError(failure?.response?.data?.message || 'Khế chưa trả lời được. Bạn thử lại nhé.');
    } finally {
      inFlight.current = false;
    }
  }
  const width = Math.min(expanded ? 780 : 390, viewport.width - GAP * 2);
  const height = Math.min(
    expanded ? 740 : 560,
    Math.max(180, viewport.height - HEADER - SIZE - GAP * 3)
  );
  const left =
    position.x >= width + GAP * 2
      ? position.x - width - GAP
      : Math.max(GAP, Math.min(position.x + SIZE + GAP, viewport.width - width - GAP));
  const top = Math.max(
    HEADER + GAP,
    Math.min(position.y - height - GAP, viewport.height - height - GAP)
  );
  return (
    <>
      {open && (
        <section
          className={styles.panel}
          style={{ left, top, width, height }}
          role="dialog"
          aria-label="Trò chuyện với Khế"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header
            className={styles.header}
            onPointerDown={(event) => startDrag(event, 'header')}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <Mascot small />
            <div className={styles.identity}>
              <strong>Khế</strong>
              <small>Trợ lý học tập</small>
            </div>
            <FiMove className={styles.moveHint} aria-hidden="true" />
            <button
              type="button"
              aria-label={expanded ? 'Thu nhỏ cửa sổ Khế' : 'Phóng to cửa sổ Khế'}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
            <button type="button" aria-label="Thu gọn Khế" onClick={close}>
              <FiChevronDown />
            </button>
            <button type="button" aria-label="Đóng Khế" onClick={close}>
              <FiX />
            </button>
          </header>
          <div className={styles.messages} ref={transcript} aria-live="polite">
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <div>
                  <Mascot small />
                  <strong>Khế</strong>
                </div>
                <p>Chào bạn! Mình có thể giúp gì cho bạn hôm nay?</p>
                <div className={styles.suggestions}>
                  {['Giải thích phần này dễ hiểu hơn', 'Cho mình bài tập luyện tập'].map((text) => (
                    <button
                      type="button"
                      key={text}
                      disabled={!ready || busy}
                      onClick={() => {
                        setQuestion(text);
                        input.current?.focus();
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <article
                key={message._id || index}
                className={`${styles.message} ${message.role === 'user' ? styles.userMessage : ''}`}
              >
                <small>{message.role === 'user' ? 'Bạn' : 'Khế'}</small>
                {message.role === 'assistant' ? (
                  <GuideContent content={message.content} compact />
                ) : (
                  <p>{message.content}</p>
                )}
                {message.role === 'assistant' && message.resourceIds?.length > 0 && (
                  <details className={styles.sources}>
                    <summary>Tài liệu tham khảo</summary>
                    {resources
                      .filter((resource) => message.resourceIds.includes(resource.id))
                      .map((resource) => (
                        <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer">
                          {resource.title}
                        </a>
                      ))}
                  </details>
                )}
              </article>
            ))}
            {pending && (
              <p className={styles.pending} role="status">
                Khế đang trả lời…
              </p>
            )}
          </div>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              send(question);
            }}
          >
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <label className={styles.srOnly} htmlFor="khe-question">
              Hỏi Khế
            </label>
            <textarea
              id="khe-question"
              ref={input}
              rows={2}
              maxLength={2000}
              placeholder="Hỏi Khế điều bạn muốn biết…"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={submitOnEnter}
              readOnly={pending}
            />
            <button
              type="submit"
              aria-label="Gửi câu hỏi cho Khế"
              disabled={!ready || busy || !question.trim()}
            >
              <FiArrowUp />
            </button>
            <small>AI có thể sai. Hãy đối chiếu với tài liệu gốc.</small>
          </form>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className={styles.launcher}
        style={{ left: position.x, top: position.y }}
        aria-label="Mở trò chuyện với Khế"
        aria-expanded={open}
        title="Khế · Kéo để di chuyển, bấm để trò chuyện"
        onPointerDown={(event) => startDrag(event, 'launcher')}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          const delta = {
            ArrowLeft: [-10, 0],
            ArrowRight: [10, 0],
            ArrowUp: [0, -10],
            ArrowDown: [0, 10],
          }[event.key];
          if (delta) {
            event.preventDefault();
            setPosition((point) =>
              clampPosition({ x: point.x + delta[0], y: point.y + delta[1] }, viewport)
            );
          }
        }}
      >
        <Mascot />
        <span className={styles.launcherName}>Khế</span>
      </button>
    </>
  );
}
