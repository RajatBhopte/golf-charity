import { useState, useCallback } from 'react';
import api from '../utils/api';

export const useScores = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/scores');
      setScores(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch scores');
    } finally {
      setLoading(false);
    }
  }, []);

  const addScore = async (score, played_date) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/scores', { score, played_date });
      // The backend enforces the 5-score limit. The best way to sync the UI 
      // perfectly is to fetch all scores again to get the exact sorted list from the DB.
      await fetchScores();
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to add score';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const editScore = async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      await api.put(`/scores/${id}`, updates);
      await fetchScores(); // Refresh the list
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to edit score';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteScore = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/scores/${id}`);
      setScores(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete score';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return {
    scores,
    loading,
    error,
    fetchScores,
    addScore,
    editScore,
    deleteScore
  };
};
