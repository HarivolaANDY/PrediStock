import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api/',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Token ${localStorage.getItem('token')}`, // Avadika majuscule raha tsy mety
    'Accept': 'application/json',
  },

  timeout: 5000,
});

export default API;