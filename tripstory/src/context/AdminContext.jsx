import React, { createContext, useEffect, useState } from "react";
import AdminApi from "../assets/api/admin"; // ✅ admin-auth 기반 API

export const AdminContext = createContext({
  admin: null,
  loading: true,
  reload: async () => {},
});

export default function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const user = await AdminApi.me(); // /admin-auth/me 호출
      setAdmin(user || null);
    } catch {
      setAdmin(null);
    }
  };

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, []);

  return (
    <AdminContext.Provider value={{ admin, loading, reload }}>
      {children}
    </AdminContext.Provider>
  );
}
