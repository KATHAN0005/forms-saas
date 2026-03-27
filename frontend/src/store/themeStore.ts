import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggle: () => set((s) => {
        const isDark = !s.isDark;
        document.documentElement.classList.toggle('dark', isDark);
        return { isDark };
      }),
      setDark: (isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
        set({ isDark });
      },
    }),
    { name: 'theme-store' }
  )
);
