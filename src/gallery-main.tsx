import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GalleryPage } from './ui/gallery/GalleryPage';
import { LangProvider } from './ui/i18n/LangContext';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <GalleryPage />
    </LangProvider>
  </StrictMode>,
);
