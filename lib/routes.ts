// ApiService endpoint suffixes — no /api prefix; ApiService.request() prepends this.baseUrl
export const ENDPOINTS = {
  auth: {
    login:          '/auth/login',
    register:       '/auth/register',
    refresh:        '/auth/refresh',
    logout:         '/auth/logout',
    profile:        '/auth/profile',
    forgotPassword: '/auth/forgot-password',
    resetPassword:  '/auth/reset-password',
    changePassword: '/auth/change-password',
    google:         '/auth/google',
  },
  stations: {
    list:      '/stations',
    favorites: '/stations/favorites',
    genres:    '/stations/genres',
    regions:   '/stations/regions',
    detail:    (id: number) => `/stations/${id}`,
    play:      (id: number) => `/stations/${id}/play`,
    favorite:  (id: number) => `/stations/${id}/favorite`,
  },
  admin: {
    stations: '/admin/stations',
    station:  (id: number) => `/admin/stations/${id}`,
  },
} as const;

// Full client-side paths for raw fetch() calls that bypass ApiService
export const CLIENT_ROUTES = {
  listeners: {
    join:      '/api/listeners/join',
    heartbeat: '/api/listeners/heartbeat',
    leave:     '/api/listeners/leave',
    counts:    '/api/listeners/counts',
  },
} as const;
