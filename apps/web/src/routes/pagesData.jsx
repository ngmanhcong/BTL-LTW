import React from 'react';

const Home = React.lazy(() => import('pages/home/index'));
const Login = React.lazy(() => import('pages/login/index'));
const Forgot = React.lazy(() => import('pages/forgot/index'));
const Profile = React.lazy(() => import('pages/profile/index'));
const FriendsPage = React.lazy(() => import('pages/friends/index'));
const PostPage = React.lazy(() => import('pages/post/PostPage'));
const Messages = React.lazy(() => import('pages/messages/index'));
const Learning = React.lazy(() => import('pages/learning/index'));
const Roadmaps = React.lazy(() => import('pages/learning/Roadmaps'));

const pagesData = [
  { path: '/learning', element: <Roadmaps />, title: 'roadmaps', priv: true },
  { path: '/learning/roadmaps/:roadmapId', element: <Roadmaps />, title: 'roadmap', priv: true },
  { path: '/learning/ai', element: <Learning />, title: 'learning-ai', priv: true },
  {
    path: '/learning/ai/:sessionId',
    element: <Learning />,
    title: 'learning-ai-detail',
    priv: true,
  },
  { path: '/learning/:sessionId', element: <Learning />, title: 'learning-detail', priv: true },
  {
    path: '',
    element: <Home />,
    title: 'home',
    priv: true,
  },
  {
    path: '/activate/:token',
    element: <Home />,
    title: 'home',
    priv: true,
  },
  {
    path: '/profile',
    element: <Profile />,
    title: 'profile',
    priv: true,
  },
  {
    path: '/messages',
    element: <Messages />,
    title: 'messages',
    priv: true,
  },
  {
    path: '/messages/:chatId',
    element: <Messages />,
    title: 'messages',
    priv: true,
  },
  {
    path: '/friends',
    element: <FriendsPage />,
    title: 'profile',
    priv: true,
  },
  {
    path: '/friends/:type',
    element: <FriendsPage />,
    title: 'profile',
    priv: true,
  },
  {
    path: '/profile/:username',
    element: <Profile />,
    title: 'profile',
    priv: true,
  },
  {
    path: '/:username/posts/:post',
    element: <PostPage />,
    title: 'profile',
    priv: true,
  },
  {
    path: 'forgot',
    element: <Forgot />,
    title: 'home',
    priv: false,
  },
  {
    path: 'login',
    element: <Login />,
    title: 'login',
    priv: false,
  },
];

export default pagesData;
