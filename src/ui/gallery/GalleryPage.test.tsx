// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { networkById } from '../../data/networks';
import { buildDeck } from '../../engine/cards';
import { LangProvider } from '../i18n/LangContext';
import { GalleryPage } from './GalleryPage';

const london = networkById('london-underground')!;

function renderAt(search: string) {
  window.history.replaceState(null, '', `/gallery/${search}`);
  return render(
    <LangProvider>
      <GalleryPage />
    </LangProvider>,
  );
}

function cardCount(container: HTMLElement) {
  return container.querySelectorAll('.gallery-cards .card').length;
}

describe('GalleryPage map menu', () => {
  afterEach(() => cleanup());

  it('opens on Hong Kong when the link names no map or an unknown one', () => {
    for (const search of ['', '?map=atlantis']) {
      const { container, unmount } = renderAt(search);
      expect((screen.getByTestId('gallery-map-hk-mtr') as HTMLInputElement).checked).toBe(true);
      expect(cardCount(container)).toBe(130);
      unmount();
    }
  });

  it('opens on the map named in the link', () => {
    const { container } = renderAt('?map=london-underground');
    expect((screen.getByTestId('gallery-map-london-underground') as HTMLInputElement).checked).toBe(true);
    expect(cardCount(container)).toBe(buildDeck(london).length);
  });

  it('switches map, updates the counts, and writes ?map= keeping other parameters', () => {
    const { container } = renderAt('?x=1');
    fireEvent.click(screen.getByTestId('gallery-map-london-underground'));
    expect(cardCount(container)).toBe(buildDeck(london).length);
    expect(screen.getByTestId('gallery-intro').textContent).toContain(String(buildDeck(london).length));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('map')).toBe('london-underground');
    expect(params.get('x')).toBe('1');
  });

  it('hides the alternate line name when it would repeat the shown name', () => {
    const { container } = renderAt('?map=london-underground');
    expect(container.querySelectorAll('.gallery-line-alt')).toHaveLength(0);
    fireEvent.click(screen.getByTestId('gallery-map-hk-mtr'));
    expect(container.querySelectorAll('.gallery-line-alt')).toHaveLength(8);
  });
});
