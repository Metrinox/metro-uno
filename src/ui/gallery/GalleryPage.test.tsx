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

describe('GalleryPage subsurface lines', () => {
  afterEach(() => cleanup());

  const ids = (el: Element) => [...el.querySelectorAll('.card')].map((c) => c.getAttribute('data-card'));
  // Matched in code: jsdom's selector engine trips over the "&" in H&C.
  const group = (container: HTMLElement, key: string) =>
    [...container.querySelectorAll('.gallery-group')].find((g) => g.getAttribute('data-group') === key)!;

  it("shows London's 10 lines and 174 cards, each card once", () => {
    const { container } = renderAt('?map=london-underground');
    expect(container.querySelectorAll('[data-testid="gallery-line"]')).toHaveLength(10);
    const shown = ids(container.querySelector('#cards-heading')!.parentElement!);
    expect(shown).toHaveLength(174);
    expect(new Set(shown).size).toBe(174);
  });

  it('shows every subsurface station card, group after group with no names, Hammersmith (H&C) to Kensington (Olympia)', () => {
    const { container } = renderAt('?map=london-underground');
    const sub = group(container, 'subsurface');
    expect(sub.querySelector('h3')?.textContent).toMatch(/^Subsurface lines/);
    const runs = [...sub.querySelectorAll('.gallery-cards')];
    expect(runs).toHaveLength(5);
    const cards = ids(sub);
    expect(cards).toHaveLength(56);
    expect([cards[0], cards.at(-1)]).toEqual(['st:hammersmith-hc', 'st:kensington-olympia']);
    // Interchanges such as Victoria are here, not in the interchanges group.
    expect(cards).toContain('st:victoria');
    expect(ids(group(container, 'interchanges'))).not.toContain('st:victoria');
    // No group names anywhere: one heading, and no group ids in the page.
    expect(sub.querySelectorAll('h3, h4')).toHaveLength(1);
    expect(container.textContent).not.toMatch(/cir-hc|hc-dis|cir-dis|group [1-5]/i);
  });

  it('keeps each subsurface line group to its three action cards', () => {
    const { container } = renderAt('?map=london-underground');
    for (const code of ['CIR', 'DIS', 'H&C', 'MET']) {
      expect(ids(group(container, code)), code).toEqual([`act:signal-fault:${code}`, `act:terminus:${code}`, `act:rush-hour:${code}`]);
    }
  });

  it('heads the group 淺層綫 in Chinese', () => {
    window.history.replaceState(null, '', '/gallery/?map=london-underground');
    const { container } = render(
      <LangProvider initial="zh">
        <GalleryPage />
      </LangProvider>,
    );
    expect(group(container, 'subsurface').querySelector('h3')?.textContent).toMatch(/^淺層綫/);
  });

  it('leaves Hong Kong without a subsurface group', () => {
    const { container } = renderAt('');
    expect(cardCount(container)).toBe(130);
    expect(container.querySelector('.gallery-group[data-group="subsurface"]')).toBeNull();
  });
});
