// src/context/AuthContext.jsx
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { Auth } from '../assets/api/index'; // 일반 유저용
import AdminApi from '../assets/api/admin';

export const AuthContext = createContext({
  user: null,
  loading: true,
  reload: async () => {},
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const admin = await AdminApi.me().catch(async () => {
        await AdminApi.manualRefresh().catch(() => null);
        return AdminApi.me().catch(() => null);
      });

      if (admin) {
        setUser(admin);
        return;
      }

      await Auth.bootRefresh().catch(() => {});
      const me = await Auth.me();
      setUser(me || null);
      return;
    } catch (err) {
      console.error('[AuthContext] reload error:', err);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  return (
    <AuthContext.Provider value={{ user, loading, reload }}>
      {children}
    </AuthContext.Provider>
  );
}
