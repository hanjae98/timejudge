import { create } from 'zustand'

interface TaskModalState {
    isOpen: boolean
    start: Date | null
    end: Date | null
    openModal: (start: Date, end: Date) => void
    closeModal: () => void
}

export const useTaskModalStore = create<TaskModalState>((set) => ({
    isOpen: false,
    start: null,
    end: null,
    openModal: (start, end) => set({ isOpen: true, start, end }),
    closeModal: () => set({ isOpen: false, start: null, end: null }),
}))
