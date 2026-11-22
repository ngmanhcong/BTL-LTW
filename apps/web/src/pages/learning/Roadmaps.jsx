import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheck,
  FiChevronRight,
  FiExternalLink,
  FiGrid,
  FiList,
  FiMinus,
  FiPlus,
  FiSearch,
  FiTarget,
  FiX,
  FiZap,
} from 'react-icons/fi';
import LearningTabs from './LearningTabs';
import LearningHeader from './LearningHeader';
import styles from './roadmaps.module.css';

const base = `${process.env.REACT_APP_BACKEND_URL}/api/v1/learning`;
const options = { withCredentials: true };
const states = {
  'not-started': 'Chưa học',
  learning: 'Đang học',
  done: 'Hoàn thành',
  skipped: 'Bỏ qua',
};
const errorText = (error) =>
  error?.response?.data?.message || 'Không tải được dữ liệu. Vui lòng thử lại.';
const percent = (progress = {}, total) =>
  total
    ? Math.round((Object.values(progress).filter((value) => value === 'done').length * 100) / total)
    : 0;

const matches = (text, search) =>
  text.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));

export function TopicPanel({
  topic,
  status,
  onClose,
  onStatus,
  saving,
  error,
  availableStates = states,
}) {
  const panel = useRef();
  const close = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const focusable = [...panel.current.querySelectorAll('button:not(:disabled), a[href]')];
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
    // The panel is remounted for each selected topic; keep its focus lifecycle stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-title"
        ref={panel}
      >
        <div className={styles.panelTop}>
          <span>
            <FiBookOpen /> CHỦ ĐỀ HỌC TẬP
          </span>
          <button ref={close} onClick={onClose} aria-label="Đóng chủ đề">
            <FiX />
          </button>
        </div>
        <h2 id="topic-title">{topic.title}</h2>
        <p className={styles.topicIntro}>{topic.description}</p>
        <h3>Tiến độ của bạn</h3>
        <div className={styles.statusChoices}>
          {Object.entries(availableStates).map(([value, title]) => (
            <button
              key={value}
              className={status === value ? styles.chosenStatus : ''}
              aria-pressed={status === value}
              disabled={saving}
              onClick={() => onStatus(value)}
            >
              <i className={`${styles.dot} ${styles[value] || ''}`} />
              {title}
            </button>
          ))}
        </div>
        <p className={styles.saveHint} role="status">
          {saving ? 'Đang lưu tiến độ…' : 'Tiến độ được lưu riêng trong tài khoản của bạn.'}
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {errorText(error)}
          </p>
        )}
        {topic.practice && (
          <div className={styles.exercise}>
            <FiTarget />
            <div>
              <h3>Thử sức với một bài thực hành</h3>
              <p>{topic.practice}</p>
            </div>
          </div>
        )}
        <h3>Tài liệu để bắt đầu</h3>
        <div className={styles.resourceList}>
          {topic.resources.map((resource) => (
            <a href={resource.url} key={resource.url} target="_blank" rel="noreferrer">
              <FiBookOpen />
              <span>
                {resource.title}
                <small>
                  {resource.kind === 'source'
                    ? 'Nội dung gốc của roadmap.sh'
                    : resource.kind === 'listed-resource'
                      ? 'Tài liệu được dẫn trong chủ đề gốc'
                      : 'Nguồn tham khảo'}
                </small>
              </span>
              <FiExternalLink />
            </a>
          ))}
        </div>
        <p className={styles.panelNote}>
          Đọc tài liệu, tự thực hành và đánh dấu hoàn thành khi bạn đã hiểu chủ đề.
        </p>
      </section>
    </div>
  );
}

// Standard roadmaps use their source positions rather than an invented 8-step plan.
function SourceDiagram({ roadmap, progress, search, zoom, onSelect }) {
  const nodes = roadmap.graph.nodes;
  const topics = new Map(
    roadmap.stages.flatMap((stage) => stage.topics).map((topic) => [topic.sourceId, topic])
  );
  const positions = new Map(nodes.map((node) => [node.id, node]));
  const minX = Math.min(...nodes.map((node) => node.x)) - 30;
  const minY = Math.min(...nodes.map((node) => node.y)) - 30;
  const width = Math.max(...nodes.map((node) => node.x + node.width)) - minX + 30;
  const height = Math.max(...nodes.map((node) => node.y + node.height)) - minY + 30;
  const center = (node) => ({
    x: node.x - minX + node.width / 2,
    y: node.y - minY + node.height / 2,
  });
  const connection = (edge) => {
    const from = positions.get(edge.source),
      to = positions.get(edge.target);
    if (!from || !to) return null;
    const a = center(from),
      b = center(to);
    if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) {
      const direction = a.x < b.x ? 1 : -1;
      a.x += (direction * from.width) / 2;
      b.x -= (direction * to.width) / 2;
      const middle = (a.x + b.x) / 2;
      return `M${a.x},${a.y} H${middle} V${b.y} H${b.x}`;
    }
    const direction = a.y < b.y ? 1 : -1;
    a.y += (direction * from.height) / 2;
    b.y -= (direction * to.height) / 2;
    const middle = (a.y + b.y) / 2;
    return `M${a.x},${a.y} V${middle} H${b.x} V${b.y}`;
  };
  return (
    <div
      className={styles.canvasViewport}
      aria-label="Sơ đồ theo nguồn roadmap.sh; có thể cuộn ngang và dọc"
    >
      <div className={styles.scaledCanvas} style={{ width: width * zoom, height: height * zoom }}>
        <div className={styles.sourceCanvas} style={{ width, height, transform: `scale(${zoom})` }}>
          <svg width={width} height={height} className={styles.connections} aria-hidden="true">
            {nodes
              .filter((node) => node.type === 'vertical' || node.type === 'horizontal')
              .map((node) => (
                <path
                  key={node.id}
                  d={
                    node.type === 'vertical'
                      ? `M${node.x - minX + node.width / 2},${node.y - minY} v${node.height}`
                      : `M${node.x - minX},${node.y - minY + node.height / 2} h${node.width}`
                  }
                />
              ))}
            {roadmap.graph.edges.map((edge, i) => (
              <path
                key={i}
                d={connection(edge) || ''}
                strokeDasharray={edge.dashed ? '4 5' : undefined}
              />
            ))}
          </svg>
          {nodes.map((node) => {
            const position = {
              left: node.x - minX,
              top: node.y - minY,
              width: node.width,
              height: node.height,
            };
            const topic = topics.get(node.id);
            if (topic)
              return (
                <button
                  key={node.id}
                  title={topic.title}
                  className={`${styles.sourceTopic} ${node.type === 'topic' ? styles.sourceMain : ''} ${styles[progress[topic.id]] || ''} ${search && !matches(topic.title, search) ? styles.dimmed : ''}`}
                  style={position}
                  aria-label={`${topic.title} — ${states[progress[topic.id] || 'not-started']}`}
                  onClick={() => onSelect(topic)}
                >
                  <i className={`${styles.dot} ${styles[progress[topic.id]] || ''}`} />
                  <span>{topic.title}</span>
                  {progress[topic.id] === 'done' && <FiCheck />}
                </button>
              );
            if (node.type === 'label')
              return (
                <span key={node.id} className={styles.sourceLabel} style={position}>
                  {node.label}
                </span>
              );
            if (node.type === 'section')
              return (
                <div
                  key={node.id}
                  className={styles.sourceSection}
                  style={position}
                  aria-hidden="true"
                />
              );
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export function Diagram({ roadmap, progress, search = '', zoom = 1, onSelect }) {
  if (roadmap.graph)
    return (
      <SourceDiagram
        roadmap={roadmap}
        progress={progress}
        search={search}
        zoom={zoom}
        onSelect={onSelect}
      />
    );
  let offset = 130;
  const stages = roadmap.stages.map((stage) => {
    const rows = Math.ceil(stage.topics.length / 2);
    const y = offset;
    const center = y + (rows - 1) * 41 + 30;
    offset += Math.max(190, rows * 82 + 45);
    return { ...stage, y, center };
  });
  const height = offset + 30;
  return (
    <div className={styles.canvasViewport} aria-label="Sơ đồ lộ trình; có thể cuộn ngang và dọc">
      <div className={styles.scaledCanvas} style={{ width: 960 * zoom, height: height * zoom }}>
        <div className={styles.canvas} style={{ width: 960, height, transform: `scale(${zoom})` }}>
          <svg width="960" height={height} className={styles.connections} aria-hidden="true">
            <path d={`M480 65 V${height - 70}`} className={styles.trunk} />
            {stages.map((stage) => (
              <g key={stage.id}>
                {stage.topics.map((topic, j) => (
                  <path
                    key={topic.id}
                    d={`M${j % 2 ? 605 : 355} ${stage.center} H${j % 2 ? 638 : 320} V${stage.y + Math.floor(j / 2) * 82 + 30} H${j % 2 ? 672 : 288}`}
                  />
                ))}
                <circle cx="480" cy={stage.y - 22} r="4" />
              </g>
            ))}
          </svg>
          <div className={styles.startNode}>{roadmap.title}</div>
          {stages.map((stage, index) => (
            <div key={stage.id}>
              <div className={styles.stageNode} style={{ left: 355, top: stage.center - 40 }}>
                <small>{stage.label || `BƯỚC ${String(index + 1).padStart(2, '0')}`}</small>
                {stage.title}
              </div>
              {stage.topics.map((topic, j) => (
                <button
                  key={topic.id}
                  title={topic.title}
                  className={`${styles.topicNode} ${styles[progress[topic.id]] || ''} ${search && !matches(topic.title, search) ? styles.dimmed : ''}`}
                  style={{ left: j % 2 ? 672 : 58, top: stage.y + Math.floor(j / 2) * 82 }}
                  onClick={() => onSelect(topic)}
                  aria-label={`${topic.title} — ${states[progress[topic.id] || 'not-started']}`}
                >
                  <i className={`${styles.dot} ${styles[progress[topic.id]] || ''}`} />
                  <span>{topic.title}</span>
                  {progress[topic.id] === 'done' ? <FiCheck /> : <FiChevronRight />}
                </button>
              ))}
            </div>
          ))}
          <div className={styles.endNode} style={{ top: height - 70 }}>
            <FiTarget /> Học qua dự án, tiến xa hơn mỗi ngày
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Roadmaps() {
  const { roadmapId } = useParams();
  const userId = useSelector((state) => state.user.userinfo?._id);
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('diagram');
  const [zoom, setZoom] = useState(1);
  const listKey = ['roadmaps', userId];
  const detailKey = ['roadmap', userId, roadmapId];
  const list = useQuery({
    queryKey: listKey,
    enabled: !roadmapId,
    retry: false,
    queryFn: async () => (await axios.get(`${base}/roadmaps`, options)).data.roadmaps,
  });
  const detail = useQuery({
    queryKey: detailKey,
    enabled: Boolean(roadmapId),
    retry: false,
    queryFn: async () => (await axios.get(`${base}/roadmaps/${roadmapId}`, options)).data,
  });
  const update = useMutation({
    mutationFn: async ({ id, topicId, status }) =>
      (await axios.patch(`${base}/roadmaps/${id}/topics/${topicId}`, { status }, options)).data,
    onSuccess: (value, variables) => {
      client.setQueryData(['roadmap', userId, variables.id], (old) =>
        old ? { ...old, progress: value.progress } : old
      );
      client.invalidateQueries({ queryKey: listKey });
    },
  });
  useEffect(() => {
    setSelected(null);
    setSearch('');
    setZoom(1);
  }, [roadmapId]);
  const roadmap = detail.data?.roadmap;
  const progress = detail.data?.progress || {};
  const topicCount = roadmap?.stages.reduce((count, stage) => count + stage.topics.length, 0) || 0;
  const done = Object.values(progress).filter((value) => value === 'done').length;
  const current = roadmapId ? detail : list;

  return (
    <main className={styles.page}>
      <LearningHeader />
      <LearningTabs />
      {current.isLoading ? (
        <div role="status" className={styles.loading}>
          Đang mở lộ trình học tập…
        </div>
      ) : current.isError ? (
        <div role="alert" className={styles.loading}>
          {errorText(current.error)} <button onClick={() => current.refetch()}>Thử lại</button>
        </div>
      ) : !roadmapId ? (
        <>
          <section className={styles.hero}>
            <span className={styles.eyebrow}>BẠN MUỐN ĐI ĐẾN ĐÂU?</span>
            <h1>
              Một hướng đi rõ ràng.
              <br />
              <span>Mỗi ngày một bước tiến.</span>
            </h1>
            <p>
              Khám phá lộ trình, hiểu từng chủ đề và tự xây dựng kỹ năng của bạn.
              <br />
              Bắt đầu từ những điều cơ bản, tiến đến dự án thực tế.
            </p>
          </section>
          <div className={styles.catalogHeading}>
            <div>
              <h2>Khám phá Roadmap</h2>
              <p>6 lĩnh vực · Học theo nhịp của bạn</p>
            </div>
            <label className={styles.search}>
              <FiSearch />
              <input
                aria-label="Tìm roadmap"
                maxLength={180}
                placeholder="Bạn muốn học gì?"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <section className={styles.cards} aria-label="Các lĩnh vực học tập">
            {list.data
              ?.filter((item) => matches(`${item.title} ${item.category}`, search))
              .map((item) => {
                const completed = percent(item.progress, item.topicCount);
                return (
                  <Link to={`/learning/roadmaps/${item.id}`} className={styles.card} key={item.id}>
                    <div className={styles.cardTop}>
                      <span className={styles.symbol}>{item.symbol}</span>
                      <FiArrowRight />
                    </div>
                    <small>{item.category}</small>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className={styles.cardMeta}>
                      <span>
                        {item.source
                          ? `${item.topicCount} chủ đề từ roadmap.sh`
                          : `${item.stageCount} bước · ${item.topicCount} chủ đề`}
                      </span>
                      <span>{completed ? `${completed}% hoàn thành` : 'Khám phá lộ trình'}</span>
                    </div>
                    <div className={styles.miniProgress}>
                      <span style={{ width: `${completed}%` }} />
                    </div>
                  </Link>
                );
              })}
          </section>
          {list.data?.filter((item) => matches(`${item.title} ${item.category}`, search)).length ===
            0 && (
            <p className={styles.noResults}>
              Chưa có lĩnh vực phù hợp. Hãy thử tên khác hoặc tạo lộ trình với AI.
            </p>
          )}
          <section className={styles.aiBanner}>
            <span>
              <FiZap />
            </span>
            <div>
              <h2>Muốn một lộ trình dành riêng cho bạn?</h2>
              <p>Kể điều bạn muốn học, trợ lý AI sẽ cùng bạn chọn bước tiếp theo.</p>
            </div>
            <Link to="/learning/ai">
              Learn with AI <FiArrowRight />
            </Link>
          </section>
        </>
      ) : (
        roadmap && (
          <>
            <Link to="/learning" className={styles.breadcrumb}>
              <FiArrowLeft /> Tất cả Roadmap
            </Link>
            <section className={styles.roadmapHeader}>
              <div>
                <span className={styles.eyebrow}>{roadmap.category}</span>
                <h1>{roadmap.title}</h1>
                <p>{roadmap.description}</p>
              </div>
            </section>
            <div className={styles.goal}>
              <FiTarget />
              <p>
                <strong>Đích đến của bạn</strong>
                {roadmap.outcome}
              </p>
            </div>
            <div className={styles.progressSummary}>
              <span>
                <FiCheck /> {done}/{topicCount} chủ đề hoàn thành
              </span>
              <div
                role="progressbar"
                aria-label="Tiến độ roadmap"
                aria-valuenow={percent(progress, topicCount)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${percent(progress, topicCount)}%` }} />
              </div>
              <strong>{percent(progress, topicCount)}%</strong>
            </div>
            <div className={styles.toolbar}>
              <div className={styles.viewSwitch}>
                <button
                  aria-label="Xem sơ đồ"
                  aria-pressed={view === 'diagram'}
                  onClick={() => setView('diagram')}
                >
                  <FiGrid />
                  Sơ đồ
                </button>
                <button
                  aria-label="Xem danh sách"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <FiList />
                  Danh sách
                </button>
              </div>
              <label className={styles.search}>
                <FiSearch />
                <input
                  aria-label="Tìm chủ đề"
                  maxLength={180}
                  placeholder="Tìm chủ đề trong roadmap…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              {view === 'diagram' && (
                <div className={styles.zoom}>
                  <button
                    aria-label="Thu nhỏ sơ đồ"
                    disabled={zoom <= 0.6}
                    onClick={() =>
                      setZoom((value) => Math.max(0.6, Math.round((value - 0.1) * 10) / 10))
                    }
                  >
                    <FiMinus />
                  </button>
                  <button aria-label="Đặt lại kích thước sơ đồ" onClick={() => setZoom(1)}>
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    aria-label="Phóng to sơ đồ"
                    disabled={zoom >= 1.3}
                    onClick={() =>
                      setZoom((value) => Math.min(1.3, Math.round((value + 0.1) * 10) / 10))
                    }
                  >
                    <FiPlus />
                  </button>
                </div>
              )}
            </div>
            <div className={styles.legend}>
              {Object.entries(states).map(([value, title]) => (
                <span key={value}>
                  <i className={`${styles.dot} ${styles[value] || ''}`} />
                  {title}
                </span>
              ))}
              <small>Bấm vào chủ đề để xem và cập nhật tiến độ</small>
            </div>

            {search &&
              !roadmap.stages.some((stage) =>
                stage.topics.some((topic) => matches(topic.title, search))
              ) && <p className={styles.noResults}>Không tìm thấy chủ đề phù hợp.</p>}
            {view === 'diagram' ? (
              <Diagram
                roadmap={roadmap}
                progress={progress}
                search={search}
                zoom={zoom}
                onSelect={(topic) => {
                  update.reset();
                  setSelected(topic);
                }}
              />
            ) : (
              <div className={styles.listView}>
                {roadmap.stages.map((stage, index) => (
                  <section key={stage.id}>
                    <h2>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {stage.title}
                    </h2>
                    {stage.topics
                      .filter((topic) => matches(topic.title, search))
                      .map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => {
                            update.reset();
                            setSelected(topic);
                          }}
                        >
                          <i className={`${styles.dot} ${styles[progress[topic.id]] || ''}`} />
                          <span>{topic.title}</span>
                          <small>{states[progress[topic.id] || 'not-started']}</small>
                          <FiChevronRight />
                        </button>
                      ))}
                  </section>
                ))}
              </div>
            )}
          </>
        )
      )}
      {selected && (
        <TopicPanel
          key={selected.id}
          topic={selected}
          status={progress[selected.id] || 'not-started'}
          onClose={() => setSelected(null)}
          onStatus={(status) => update.mutate({ id: roadmapId, topicId: selected.id, status })}
          saving={update.isLoading}
          error={update.error}
        />
      )}
    </main>
  );
}
