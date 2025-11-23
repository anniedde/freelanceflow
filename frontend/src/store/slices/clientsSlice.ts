import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  tags: string[];
  totalRevenue: number;
  lastContact?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  projects?: any[];
}

interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
}

const initialState: ClientsState = {
  clients: [],
  loading: false,
  error: null,
  searchTerm: '',
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setClients: (state, action: PayloadAction<Client[]>) => {
      state.clients = action.payload;
      state.loading = false;
      state.error = null;
    },
    addClient: (state, action: PayloadAction<Client>) => {
      state.clients.unshift(action.payload);
    },
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.clients[index] = action.payload;
      }
    },
    removeClient: (state, action: PayloadAction<string>) => {
      state.clients = state.clients.filter(c => c.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
  },
});

export const {
  setClients,
  addClient,
  updateClient,
  removeClient,
  setLoading,
  setError,
  setSearchTerm,
} = clientsSlice.actions;

export default clientsSlice.reducer;
