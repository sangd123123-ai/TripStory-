import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api/tripstory`,
  withCredentials: true,
  timeout: 120000,
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('요청 인터셉터 오류', error);
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

async function refreshToken() {
  const res = await api.post('/auth/refresh', {});
  const newToken = res.data?.accessToken || res.data?.token;
  if (!newToken) throw new Error('새 토큰을 받지 못했습니다.');
  localStorage.setItem('token', newToken);
  localStorage.setItem('accessToken', newToken);
  return newToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (!error.response || error.response.status !== 401 || original._retry || original.url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const newToken = await refreshToken();
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      console.error('토큰 갱신 실패', refreshError.message);
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const getAiStory = async ({ title, region, mood, keywords }) => {
  const res = await api.post(`/ai/story`, { title, region, mood, keywords });
  return res.data;
};

export const fetchStories = async () => {
  const res = await api.get(`/all`);
  return res.data;
};

export const getStory = async (id) => {
  const res = await api.get(`/${id}`);
  return res.data;
};

export const searchStories = async (query) => {
  const res = await api.get(`/search`, { params: { q: query } });
  return res.data;
};

export const addComment = async (storyId, commentData) => {
  const res = await api.post(`/${storyId}/comment`, commentData);
  return res.data;
};

export const fetchComments = async (storyId) => {
  const res = await api.get(`/${storyId}/comments`);
  return res.data;
};

export const updateComment = async (storyId, commentId, updateData) => {
  const res = await api.put(`/${storyId}/comment/${commentId}`, updateData);
  return res.data;
};

export const deleteComment = async (storyId, commentId) => {
  const res = await api.delete(`/${storyId}/comment/${commentId}`);
  return res.data;
};

export const toggleLike = async (storyId) => {
  const res = await api.post(`/${storyId}/like`);
  return res.data;
};

export const updateStory = async (storyId, updateData) => {
  const res = await api.put(`/${storyId}`, updateData);
  return res.data;
};

export const deleteStory = async (storyId) => {
  const res = await api.delete(`/${storyId}`);
  return res.data;
};

export default {
  getAiStory,
  fetchStories,
  getStory,
  searchStories,
  addComment,
  fetchComments,
  toggleLike,
  updateStory,
  deleteStory,
};
