import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

export const getAiTrip = async (data) => {
  const res = await axios.post(`${API_BASE}/api/ai/trip`, data);
  return res.data;
};
