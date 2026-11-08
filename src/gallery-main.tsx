import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GalleryPage } from './ui/GalleryPage';
import { LangProvider } from './ui/LangContext';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <GalleryPage />
    </LangProvider>
  </StrictMode>,
);
