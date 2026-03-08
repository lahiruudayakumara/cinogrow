import axios from 'axios';
import api from "../config/api";

const API_URL = api.API_BASE_URL.replace(/\/$/, "") + "/auth"; // Ensure no trailing slash and add auth path

export const login = async (email: string, password: string) => {
  try {
    console.log(api.API_BASE_URL);
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password,
    });
    console.log('Login response:', response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Login failed');
  }
};
