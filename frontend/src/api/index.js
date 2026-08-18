import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
});

// 请求拦截器：自动附加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
};

export const novelAPI = {
  list: (params) => api.get("/novels", { params }),
  detail: (id) => api.get(`/novels/${id}`),
  myNovels: () => api.get("/novels/author/my-novels"),
  create: (data) => api.post("/novels", data),
  update: (id, data) => api.put(`/novels/${id}`, data),
  remove: (id) => api.delete(`/novels/${id}`),
};

export const chapterAPI = {
  listByNovel: (novelId) => api.get(`/chapters/novel/${novelId}`),
  detail: (id) => api.get(`/chapters/${id}`),
  create: (novelId, data) => api.post(`/chapters/novel/${novelId}`, data),
  update: (id, data) => api.put(`/chapters/${id}`, data),
  remove: (id) => api.delete(`/chapters/${id}`),
};

export const commentAPI = {
  listByNovel: (novelId) => api.get(`/comments/novel/${novelId}`),
  create: (novelId, data) => api.post(`/comments/novel/${novelId}`, data),
  remove: (id) => api.delete(`/comments/${id}`),
};

export const favoriteAPI = {
  myFavorites: () => api.get("/favorites/my"),
  check: (novelId) => api.get(`/favorites/check/${novelId}`),
  add: (novelId) => api.post(`/favorites/${novelId}`),
  remove: (novelId) => api.delete(`/favorites/${novelId}`),
};

export const applicationAPI = {
  apply: (data) => api.post("/applications/apply", data),
  myApplications: () => api.get("/applications/my-applications"),
  myLatest: () => api.get("/applications/my-latest"),
};

export const adminAPI = {
  stats: () => api.get("/admin/stats"),
  allNovels: (params) => api.get("/admin/novels", { params }),
  pendingNovels: () => api.get("/admin/novels/pending"),
  approveNovel: (id) => api.put(`/admin/novels/${id}/approve`),
  rejectNovel: (id, data) => api.put(`/admin/novels/${id}/reject`, data),
  allUsers: () => api.get("/admin/users"),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  allApplications: (params) => api.get("/admin/applications", { params }),
  pendingApplications: () => api.get("/admin/applications/pending"),
  approveApplication: (id, data) => api.put(`/admin/applications/${id}/approve`, data),
  rejectApplication: (id, data) => api.put(`/admin/applications/${id}/reject`, data),
};

export default api;
