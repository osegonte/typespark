import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const api = {
  // File upload
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get session
  getSession: async (sessionId) => {
    try {
      const response = await axios.get(`${API_URL}/session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get next item
  getNextItem: async (sessionId) => {
    try {
      const response = await axios.get(`${API_URL}/session/${sessionId}/next`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Submit answer
  submitAnswer: async (sessionId, itemId, answer, timeTaken) => {
    try {
      const response = await axios.post(`${API_URL}/session/${sessionId}/submit`, {
        item_id: itemId,
        answer: answer,
        time_taken: timeTaken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api;
