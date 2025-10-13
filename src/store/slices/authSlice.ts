import { createSlice, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { buildApiUrl } from '../../utils/api'

export type UserRole = 'admin' | 'manager' | 'collectioner' | null
export type User = {
  token: string
  user: string
  role: UserRole
}
export interface AuthState {
  isAuthenticated: boolean
  role: UserRole
  authToken: string,
  user: string,
  loading: boolean,
  error?: string,
  refreshToken: string,
}

const initialState: AuthState = {
  isAuthenticated: false,
  role: null,
  authToken: '',
  user: '',
  loading: false,
  refreshToken: '',
}

export const loginAsync = createAsyncThunk(
  'auth/login',
  async (
    payload: { phoneNumber: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const res = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return rejectWithValue(err?.message || 'Login failed')
      }
      const json = await res.json()
      const roleName: string = (json?.data?.user?.roleName || '').toLowerCase()
      let mappedRole: UserRole = null
      if (roleName === 'admin' || roleName === 'manager') mappedRole = roleName as UserRole
      if (roleName === 'collector' || roleName === 'collectioner') mappedRole = 'collectioner'
      const token: string = json?.data?.tokens?.accessToken ?? ''
      const refreshToken: string = json?.data?.tokens?.refreshToken ?? ''
      const userName: string = json?.data?.user?.name ?? ''
      return { token, refreshToken, user: userName, role: mappedRole } as { token?: string; refreshToken?: string; user?: string; role?: UserRole }
    } catch (e) {
      return rejectWithValue('Network error')
    }
  },
)

export const refreshAsync = createAsyncThunk(
  'auth/refresh',
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      if (!refreshToken) return rejectWithValue('Missing refresh token')
      const res = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return rejectWithValue(err?.message || 'Refresh failed')
      }
      const json = await res.json();
      console.log('json', json);
      const token: string = json?.data?.tokens?.accessToken ?? ''
      const userName: string = json?.data?.user?.name ?? ''
      const roleName: string = (json?.data?.user?.roleName || '').toLowerCase()
      let mappedRole: UserRole = null
      if (roleName === 'admin' || roleName === 'manager') mappedRole = roleName as UserRole
      if (roleName === 'collector' || roleName === 'collectioner') mappedRole = 'collectioner'
      return { token, user: userName, role: mappedRole } as { token?: string; user?: string; role?: UserRole }
    } catch (e) {
      return rejectWithValue('Network error')
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setRole: (state, action: PayloadAction<UserRole>) => {
      state.role = action.payload
    },
    login: (state, action: PayloadAction<User>) => {
      state.authToken = action.payload.token ?? '';
      state.isAuthenticated = true;
      state.user = action.payload.user ?? '';
      state.role = action.payload.role ?? null;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = '';
      state.authToken = '';
      state.role = null;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true
        state.error = undefined
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.authToken = action.payload.token ?? ''
        state.user = action.payload.user ?? ''
        if (action.payload.role) state.role = action.payload.role
        state.refreshToken = action.payload.refreshToken ?? ''
        try {
          if (state.refreshToken) localStorage.setItem('refreshToken', state.refreshToken)
        } catch {}
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Login failed'
      })
      .addCase(refreshAsync.pending, (state) => {
        state.loading = true
        state.error = undefined
      })
      .addCase(refreshAsync.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.authToken = action.payload.token ?? ''
        state.user = action.payload.user ?? ''
        if (action.payload.role) state.role = action.payload.role
      })
      .addCase(refreshAsync.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.authToken = ''
        state.user = ''
        state.role = null
        state.error = (action.payload as string) || 'Refresh failed'
        try { localStorage.removeItem('refreshToken') } catch {}
      })
  },
})

export const { setRole, setAuthenticated, login, logout } = authSlice.actions
export default authSlice.reducer



