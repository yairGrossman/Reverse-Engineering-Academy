import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ProgressProvider } from './context/ProgressContext';
import { LocalStorageProgressStore } from './services/progress';
import './styles/tokens.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/blocks.css';
import './styles/pages.css';

// The store is instantiated once here (composition root) and injected —
// components only ever see the ProgressStore interface. localStorage is the
// only store: nothing is transmitted anywhere. Moving progress between
// browsers is the visitor's explicit export/import (sidebar footer).
const progressStore = new LocalStorageProgressStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProgressProvider store={progressStore}>
      <App />
    </ProgressProvider>
  </StrictMode>,
);
