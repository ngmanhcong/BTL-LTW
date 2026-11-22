import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  FiArrowUpRight,
  FiArrowUp,
  FiMap,
  FiFileText,
  FiList,
  FiBookOpen,
  FiCheck,
  FiClock,
  FiExternalLink,
  FiPlus,
} from 'react-icons/fi';
import styles from './learning.module.css';
import LearningTabs from './LearningTabs';
import LearningHeader from './LearningHeader';
import hub from './roadmaps.module.css';
import { Diagram, TopicPanel } from './Roadmaps';
import GuideContent from './GuideContent';
import KheChat from './KheChat';
import submitOnEnter from './submitOnEnter';

const base = `${process.env.REACT_APP_BACKEND_URL}/api/v1/learning`;
const options = { withCredentials: true, timeout: 235000 };
const defaultProfile = { level: 'beginner', weeks: 8, hoursPerWeek: 6 };

function progress(session) {
  const tasks = session?.roadmap?.milestones?.flatMap((stage) => stage.tasks || []) || [];
  const done = tasks.filter((task) => task.done).length;
  return {
    done,
    total: tasks.length,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
function errorMessage(error) {
  return (
    error?.response?.data?.message ||
    'Không tải được dữ liệu. Vui lòng kiểm tra kết nối và thử lại.'
  );
}
function Sources({ ids = [], resources = [] }) {
  return (
    <div className={styles.sources}>
      {resources
        .filter((item) => ids.includes(item.id))
        .map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
            <FiBookOpen />
            {item.title}
            <FiExternalLink />
          </a>
        ))}
    </div>
  );
}

export default function LearningPage() {
  const userId = useSelector((state) => state.user.userinfo?._id);
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState('');
  const [kind, setKind] = useState('roadmap');
  const [view, setView] = useState('diagram');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [question, setQuestion] = useState('');
  const lastMessage = useRef();
  const sessionKey = (id) => ['learning-session', userId, id];
  const listKey = ['learning-sessions', userId];
  const status = useQuery({
    queryKey: ['learning-status', userId],
    queryFn: async () => (await axios.get(`${base}/status`, options)).data,
    retry: false,
  });
  const list = useQuery({
    queryKey: listKey,
    queryFn: async () => (await axios.get(`${base}/sessions`, options)).data.sessions,
  });
  const detail = useQuery({
    queryKey: sessionKey(sessionId),
    enabled: Boolean(sessionId),
    queryFn: async () => (await axios.get(`${base}/sessions/${sessionId}`, options)).data.session,
    retry: false,
  });
  const session = detail.data;
  const ready = status.data?.configured === true;
  const save = (value) => {
    queryClient.setQueryData(sessionKey(value._id), value);
    queryClient.invalidateQueries({ queryKey: listKey });
  };
  const create = useMutation({
    mutationFn: async () =>
      (
        await axios.post(
          `${base}/sessions`,
          {
            goal: goal.trim(),
            kind,
            profile: defaultProfile,
          },
          options
        )
      ).data.session,
    onSuccess: (value) => {
      save(value);
      navigate(`/learning/ai/${value._id}`);
    },
  });
  const chat = useMutation({
    mutationFn: async ({ id, content }) =>
      (await axios.post(`${base}/sessions/${id}/messages`, { content }, options)).data.session,
    onSuccess: (value, variables) => {
      save(value);
      if (variables.id === sessionId) setQuestion('');
    },
  });
  const kheChat = useMutation({
    mutationFn: async ({ id, content }) =>
      (await axios.post(`${base}/sessions/${id}/messages`, { content, channel: 'khe' }, options))
        .data.session,
    onSuccess: save,
  });
  const task = useMutation({
    mutationFn: async ({ id, taskId, done }) =>
      (await axios.patch(`${base}/sessions/${id}/tasks/${taskId}`, { done }, options)).data.session,
    onSuccess: save,
  });
  useEffect(() => {
    setQuestion('');
    setSelectedTopic(null);
  }, [sessionId]);
  useEffect(() => {
    lastMessage.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [session?.messages?.length]);
  const completion = progress(session);
  const busy = create.isLoading || chat.isLoading || kheChat.isLoading;
  const isGuide = session?.kind === 'guide';
  const guideText =
    session?.guide ||
    session?.messages?.find((message) => message.role === 'assistant')?.content ||
    '';
  const guideHasTitle = /^\s*#\s+/.test(guideText);
  const diagram = session?.roadmap && {
    id: session._id,
    title: session.roadmap.title,
    stages: session.roadmap.milestones.map((stage) => ({
      id: stage._id,
      title: stage.title,
      label: `TUẦN ${stage.week}`,
      topics: stage.tasks.map((item) => ({
        id: item._id,
        title: item.title,
        description: stage.description,
        practice: item.title,
        resources: (session.resources || []).filter((resource) =>
          stage.resourceIds.includes(resource.id)
        ),
      })),
    })),
  };
  const diagramProgress = Object.fromEntries(
    (session?.roadmap?.milestones || []).flatMap((stage) =>
      stage.tasks.map((item) => [item._id, item.done ? 'done' : 'not-started'])
    )
  );

  return (
    <main className={`${hub.page} ${styles.page}`}>
      <LearningHeader />
      <LearningTabs />
      <section className={styles.workspace}>
        {status.isError && (
          <div role="alert" className={styles.notice}>
            {errorMessage(status.error)} <button onClick={() => status.refetch()}>Thử lại</button>
          </div>
        )}

        {!sessionId ? (
          <div className={styles.start}>
            <form
              className={styles.goalForm}
              onSubmit={(event) => {
                event.preventDefault();
                if (ready && !create.isLoading && goal.trim().length >= 3) create.mutate();
              }}
            >
              <label className={styles.srOnly} htmlFor="learning-goal">
                Bạn muốn học gì?
              </label>
              <textarea
                id="learning-goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                onKeyDown={submitOnEnter}
                maxLength={1500}
                minLength={3}
                required
                disabled={create.isLoading}
                placeholder="Ví dụ: Tôi muốn học AI từ đầu để xây dựng một trợ lý học tập…"
              />
              <div className={styles.promptActions}>
                <div className={styles.kindSwitch} role="group" aria-label="Kiểu nội dung">
                  <button
                    type="button"
                    aria-pressed={kind === 'roadmap'}
                    disabled={create.isLoading}
                    onClick={() => setKind('roadmap')}
                  >
                    <FiMap />
                    Roadmap
                  </button>
                  <button
                    type="button"
                    aria-pressed={kind === 'guide'}
                    disabled={create.isLoading}
                    onClick={() => setKind('guide')}
                  >
                    <FiFileText />
                    Guide
                  </button>
                </div>
                <button
                  className={styles.promptSubmit}
                  type="submit"
                  title="Gửi (Enter)"
                  aria-label={kind === 'guide' ? 'Tạo hướng dẫn' : 'Tạo roadmap'}
                  disabled={!ready || create.isLoading || goal.trim().length < 3}
                >
                  <FiArrowUp />
                </button>
              </div>
              {create.isLoading && (
                <span className={styles.srOnly} role="status">
                  Đang tạo nội dung…
                </span>
              )}
              {create.isError && (
                <p role="alert" className={styles.error}>
                  {errorMessage(create.error)}
                </p>
              )}
            </form>
          </div>
        ) : detail.isLoading ? (
          <div className={styles.loading}>Đang mở lộ trình của bạn…</div>
        ) : detail.isError ? (
          <div role="alert" className={styles.loading}>
            {errorMessage(detail.error)} <button onClick={() => detail.refetch()}>Thử lại</button>
          </div>
        ) : (
          session && (
            <>
              <div
                className={`${styles.planHeader} ${isGuide && guideHasTitle ? styles.guideLabel : ''}`}
              >
                <span className={styles.eyebrow}>
                  {isGuide ? 'GUIDE · HƯỚNG DẪN HỌC' : 'ROADMAP · LỘ TRÌNH CÁ NHÂN'}
                </span>
                {(!isGuide || !guideHasTitle) && (
                  <>
                    <h1>{isGuide ? session.goal : session.roadmap.title}</h1>
                    <p>
                      {isGuide
                        ? 'Hướng dẫn dành riêng cho mục tiêu học tập của bạn.'
                        : session.roadmap.summary}
                    </p>
                  </>
                )}
                {!isGuide && (
                  <>
                    <div className={styles.planMeta}>
                      <span>
                        <FiClock />
                        {session.profile.weeks} tuần · {session.profile.hoursPerWeek} giờ/tuần
                      </span>
                      <span>
                        <FiCheck />
                        {completion.done}/{completion.total} nhiệm vụ
                      </span>
                      <strong>{completion.percent}% hoàn thành</strong>
                    </div>
                    <div
                      className={styles.progress}
                      role="progressbar"
                      aria-label="Tiến độ học tập"
                      aria-valuenow={completion.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div style={{ width: `${completion.percent}%` }} />
                    </div>
                  </>
                )}
              </div>
              {!isGuide && (
                <div className={styles.resultToolbar}>
                  <div className={hub.viewSwitch}>
                    <button aria-pressed={view === 'diagram'} onClick={() => setView('diagram')}>
                      <FiMap />
                      Sơ đồ
                    </button>
                    <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
                      <FiList />
                      Danh sách nhiệm vụ
                    </button>
                  </div>
                </div>
              )}
              <div className={styles.planLayout}>
                <div className={styles.timeline}>
                  {task.isError && (
                    <p className={styles.error} role="alert">
                      {errorMessage(task.error)}
                    </p>
                  )}
                  {isGuide ? (
                    <article className={styles.guideArticle} aria-label="Hướng dẫn học tập">
                      <GuideContent content={guideText} />
                      <h2>Tài liệu tham khảo</h2>
                      <Sources
                        ids={
                          session.messages.find((message) => message.role === 'assistant')
                            ?.resourceIds
                        }
                        resources={session.resources}
                      />
                    </article>
                  ) : view === 'diagram' ? (
                    <Diagram
                      roadmap={diagram}
                      progress={diagramProgress}
                      onSelect={(topic) => {
                        task.reset();
                        setSelectedTopic(topic);
                      }}
                    />
                  ) : (
                    session.roadmap.milestones.map((stage, index) => (
                      <article className={styles.milestone} key={stage._id}>
                        <span
                          className={`${styles.stepNumber} ${stage.tasks.every((item) => item.done) ? styles.stepDone : ''}`}
                        >
                          {stage.tasks.every((item) => item.done) ? (
                            <FiCheck />
                          ) : (
                            String(index + 1).padStart(2, '0')
                          )}
                        </span>
                        <div className={styles.stageCard}>
                          <span className={styles.week}>TUẦN {stage.week}</span>
                          <h2>{stage.title}</h2>
                          <p>{stage.description}</p>
                          <ul>
                            {stage.tasks.map((item) => (
                              <li key={item._id}>
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={item.done}
                                    disabled={task.isLoading}
                                    onChange={(event) =>
                                      task.mutate({
                                        id: session._id,
                                        taskId: item._id,
                                        done: event.target.checked,
                                      })
                                    }
                                  />
                                  <span className={item.done ? styles.taskDone : ''}>
                                    {item.title}
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                          <Sources ids={stage.resourceIds} resources={session.resources} />
                        </div>
                      </article>
                    ))
                  )}
                  {completion.total > 0 && completion.done === completion.total && (
                    <div className={styles.finished}>
                      <FiCheck />
                      <h2>Bạn đã hoàn thành lộ trình!</h2>
                      <p>Một mục tiêu mới đang chờ bạn. Hãy tiếp tục giữ nhịp học tập nhé.</p>
                      <button onClick={() => navigate('/learning/ai')}>
                        Khám phá mục tiêu mới
                      </button>
                    </div>
                  )}
                </div>
                {!isGuide && (
                  <section className={styles.roadmapExplanation} aria-label="Giải thích lộ trình">
                    <GuideContent
                      content={
                        session.messages.find((message) => message.role === 'assistant')?.content ||
                        ''
                      }
                    />
                  </section>
                )}
                <section className={styles.followup} aria-label="Hỏi tiếp về nội dung này">
                  <div className={styles.followupMessages}>
                    {session.messages.slice(2).map((message) => (
                      <article
                        key={message._id}
                        className={`${styles.followupMessage} ${message.role === 'user' ? styles.followupUser : ''}`}
                      >
                        <small>{message.role === 'user' ? 'Bạn' : 'Trợ lý học tập'}</small>
                        {message.role === 'assistant' ? (
                          <GuideContent content={message.content} />
                        ) : (
                          <p>{message.content}</p>
                        )}
                        {message.role === 'assistant' && message.resourceIds?.length > 0 && (
                          <details>
                            <summary>Tài liệu tham khảo</summary>
                            <Sources ids={message.resourceIds} resources={session.resources} />
                          </details>
                        )}
                      </article>
                    ))}
                    {chat.isLoading && (
                      <p className={styles.thinking} role="status">
                        Đang trả lời câu hỏi của bạn…
                      </p>
                    )}
                    <div ref={lastMessage} />
                  </div>
                  <form
                    className={styles.followupForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (question.trim() && ready && !busy)
                        chat.mutate({ id: session._id, content: question.trim() });
                    }}
                  >
                    {chat.isError && (
                      <p role="alert" className={styles.error}>
                        {errorMessage(chat.error)}
                      </p>
                    )}
                    <label className={styles.srOnly} htmlFor="learning-question">
                      Hỏi trợ lý về lộ trình
                    </label>
                    <textarea
                      id="learning-question"
                      placeholder="Hỏi tiếp về nội dung này…"
                      value={question}
                      maxLength={2000}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={submitOnEnter}
                      readOnly={chat.isLoading}
                      rows={2}
                    />
                    <button
                      type="submit"
                      aria-label="Gửi câu hỏi cho trợ lý"
                      title="Gửi (Enter)"
                      disabled={!ready || busy || !question.trim()}
                    >
                      <FiArrowUp />
                    </button>
                    <small>Enter để gửi · Shift + Enter để xuống dòng</small>
                  </form>
                </section>
              </div>
            </>
          )
        )}
      </section>
      {(list.data?.length > 0 || list.isLoading || list.isError) && (
        <section className={styles.saved} aria-labelledby="saved-roadmaps-title">
          <div className={styles.savedHeading}>
            <div>
              <h2 id="saved-roadmaps-title">Lộ trình của bạn</h2>
              <p>Không gian riêng · {list.data?.length || 0} lộ trình đã lưu</p>
            </div>
            <button
              type="button"
              className={styles.newButton}
              onClick={() => navigate('/learning/ai')}
              disabled={create.isLoading}
            >
              <FiPlus />
              Lộ trình mới
            </button>
          </div>
          <nav className={styles.history} aria-label="Lộ trình đã lưu">
            {list.isLoading && <p>Đang tải lộ trình…</p>}
            {list.isError && (
              <button type="button" onClick={() => list.refetch()}>
                Không tải được danh sách. Thử lại
              </button>
            )}
            {list.data?.map((item) => (
              <Link
                key={item._id}
                to={`/learning/ai/${item._id}`}
                className={item._id === sessionId ? styles.selected : ''}
              >
                <FiBookOpen />
                <div>
                  <strong>{item.roadmap?.title || item.goal}</strong>
                  <small>
                    {item.kind === 'guide'
                      ? 'Guide · Hướng dẫn học tập'
                      : `${progress(item).percent}% hoàn thành`}
                  </small>
                </div>
                <FiArrowUpRight />
              </Link>
            ))}
            {list.data?.length === 0 && (
              <p className={styles.emptyHistory}>Lộ trình đầu tiên của bạn sẽ xuất hiện ở đây.</p>
            )}
          </nav>
        </section>
      )}
      {session && (
        <KheChat
          key={`${userId}:${session._id}`}
          userId={userId}
          messages={session.assistantMessages || []}
          resources={session.resources}
          ready={ready}
          busy={busy}
          pending={kheChat.isLoading}
          onSend={(content) => kheChat.mutateAsync({ id: session._id, content })}
        />
      )}
      {selectedTopic && session && (
        <TopicPanel
          key={selectedTopic.id}
          topic={selectedTopic}
          status={diagramProgress[selectedTopic.id] || 'not-started'}
          availableStates={{ 'not-started': 'Chưa học', done: 'Hoàn thành' }}
          onClose={() => setSelectedTopic(null)}
          onStatus={(status) =>
            task.mutate({ id: session._id, taskId: selectedTopic.id, done: status === 'done' })
          }
          saving={task.isLoading}
          error={task.error}
        />
      )}
    </main>
  );
}
