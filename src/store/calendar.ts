'use client'

import { create } from 'zustand'

export interface TaskRange {
    start: Date
    end: Date
}

interface TaskModalState {
    isOpen: boolean
    ranges: TaskRange[]
    openModal: (ranges: TaskRange[]) => void
    closeModal: () => void
}

export const useTaskModalStore = create<TaskModalState>((set) => ({
    isOpen: false,
    ranges: [],
    openModal: (ranges) => set({ isOpen: true, ranges }),
    closeModal: () => set({ isOpen: false, ranges: [] }),
}))
