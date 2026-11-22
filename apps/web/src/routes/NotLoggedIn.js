import React from 'react';

import { Navigate, Outlet } from 'react-router-dom';
import Loading from 'shared/components/ui/Loading/Loading';

export default function NotLoggedIn({ user }) {
  return user.userinfo ? (
    <Navigate to="/" />
  ) : (
    <React.Suspense fallback={<Loading />}>
      <Outlet />
    </React.Suspense>
  );
}
