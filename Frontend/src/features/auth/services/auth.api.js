import axios from "axios";

// Automatically cleans trailing slashes or duplicate /api endings
const RAW_URL = import.meta.env.VITE_API_BASE_URL || "https://interview-gen-ai-ws7i.onrender.com";
const CLEAN_BASE_URL = RAW_URL.replace(/\/$/, '').replace(/\/api$/, '');

const api = axios.create({
  baseURL: `${CLEAN_BASE_URL}/api`,
  withCredentials: true
});

// Interceptor to attach Authorization Bearer token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export async function register({ username, email, password }) {
  try {
    const response = await api.post('/auth/register', {
      username, email, password
    });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

export async function login({ email, password }) {
  try {
    const response = await api.post("/auth/login", {
      email, password
    });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

export async function logout() {
  try {
    const response = await api.get("/auth/logout");
    localStorage.removeItem("token");
    return response.data;
  } catch (err) {
    console.log(err);
    localStorage.removeItem("token");
    throw err;
  }
}

export async function getMe() {
  try {
    const response = await api.get("/auth/get-me");
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

export default api;