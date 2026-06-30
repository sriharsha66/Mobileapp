import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function WebGlobalStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const styleId = '__medvault_global_styles__';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      * { box-sizing: border-box; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
      button, [role="button"], a { cursor: pointer; }
      input, textarea, select { outline: none; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #a0a0a0; }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  return null;
}
