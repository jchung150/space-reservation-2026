import { create } from 'zustand';

export interface ReportDraft {
  taskId: string;
  photoUrls: string[]; // objectURLs (UI-only 단계)
  photoFiles: File[];  // 실제 File 객체 — objectURL 만료 방지
  photoCount: number;
  memo: string;
}

interface ReportStore {
  draft: ReportDraft | null;
  setDraft: (draft: ReportDraft) => void;
  clearDraft: () => void;
}

export const useReportStore = create<ReportStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
