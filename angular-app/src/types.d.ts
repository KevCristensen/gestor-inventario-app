declare global {
    interface Window {
      electronAPI: {
        getAppVersion: () => void;
        onAppVersion: (callback: (value: { version: string }) => void) => void;
        send: (channel: string, data?: any) => void; 
        on: (channel: string, callback: (...args: any[]) => void) => void;
      };
    }
  }
  export {}; // Este export vacío convierte el archivo en un módulo