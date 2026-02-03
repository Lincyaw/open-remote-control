import { create } from 'zustand';

interface PortForward {
  id: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  status: 'active' | 'stopped' | 'error';
}

interface PortForwardState {
  forwards: PortForward[];
  addForward: (forward: Omit<PortForward, 'id' | 'status'>) => void;
  removeForward: (id: string) => void;
  updateStatus: (id: string, status: PortForward['status']) => void;
}

export const usePortForwardStore = create<PortForwardState>((set) => ({
  forwards: [],
  addForward: (forward) =>
    set((state) => ({
      forwards: [
        ...state.forwards,
        { ...forward, id: Date.now().toString(), status: 'active' },
      ],
    })),
  removeForward: (id) =>
    set((state) => ({
      forwards: state.forwards.filter((f) => f.id !== id),
    })),
  updateStatus: (id, status) =>
    set((state) => ({
      forwards: state.forwards.map((f) =>
        f.id === id ? { ...f, status } : f
      ),
    })),
}));
