// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { buildDeck, type Card } from '../../engine/cards';
import type { Network } from '../../data/network';
import { networkById, networkOrDefault } from '../../data/networks';
import { NetworkProvider } from '../common/NetworkContext';
import type { Lang } from '../i18n/i18n';
import { LangProvider } from '../i18n/LangContext';
import { CardView } from './CardView';

const network = networkOrDefault('hk-mtr');

const deck = buildDeck(network);

function iconOf(kind: 'interchange' | 'terminus' | 'signal-fault') {
  const card = deck.find((c) => (kind === 'interchange' ? c.kind === 'interchange' : c.kind === 'action' && c.action === kind))!;
  const { container } = render(
    <LangProvider>
      <CardView card={card} />
    </LangProvider>,
  );
  return container.querySelector('.card-icon')!;
}

describe('CardView icons', () => {
  it('draws the terminus as its own mark, not an arrow glyph', () => {
    const icon = iconOf('terminus');
    expect(icon.querySelector('[data-testid="terminus-icon"]')).not.toBeNull();
    expect(icon.textContent).toBe('');
  });

  it('marks signal fault with a skip sign', () => {
    expect(iconOf('signal-fault').querySelector('[data-testid="skip-icon"]')).not.toBeNull();
  });

  it('keeps the interchange arrows, which the terminus no longer shares', () => {
    const icon = iconOf('interchange');
    expect(icon.textContent?.trim()).toBe('⇄');
    expect(icon.querySelector('[data-testid="terminus-icon"]')).toBeNull();
  });
});

describe('CardView wild cards', () => {
  const wild = (deckOf: typeof deck, type: 'octopus' | 'typhoon') =>
    deckOf.find((c) => c.kind === 'wild' && c.wild === type)!;

  function show(card: Card, lang: Lang, net?: Network) {
    const face = (
      <LangProvider initial={lang}>
        <CardView card={card} />
      </LangProvider>
    );
    const { container } = render(net ? <NetworkProvider network={net}>{face}</NetworkProvider> : face);
    return container.querySelector('.card')!;
  }

  it('names the Hong Kong wilds Octopus and Typhoon in English', () => {
    const octopus = show(wild(deck, 'octopus'), 'en');
    expect(octopus.querySelector('.card-name')?.textContent).toBe('Octopus');
    expect(octopus.getAttribute('aria-label')).toBe('Octopus');
    expect(octopus.querySelector('.octopus-logo')).not.toBeNull();
    const typhoon = show(wild(deck, 'typhoon'), 'en');
    expect(typhoon.querySelector('.card-name')?.textContent).toBe('Typhoon Signal No. 8');
    expect(typhoon.querySelector('.card-icon')?.textContent).toBe('+4');
  });

  it('names the Hong Kong wilds in Chinese', () => {
    expect(show(wild(deck, 'octopus'), 'zh').querySelector('.card-name')?.textContent).toBe('八達通');
    expect(show(wild(deck, 'typhoon'), 'zh').querySelector('.card-name')?.textContent).toBe('八號風球');
  });

  it('shows an Oyster face without the Octopus artwork on the London map', () => {
    const london = networkById('london-underground')!;
    const londonDeck = buildDeck(london);
    const oyster = show(wild(londonDeck, 'octopus'), 'en', london);
    expect(oyster.querySelector('.card-name')?.textContent).toBe('Oyster');
    expect(oyster.getAttribute('aria-label')).toBe('Oyster');
    expect(oyster.querySelector('[data-testid="oyster-art"]')).not.toBeNull();
    expect(oyster.querySelector('.octopus-logo')).toBeNull();
    expect(oyster.textContent).not.toContain('八達通');
    expect(oyster.classList).toContain('card-wild');

    const strike = show(wild(londonDeck, 'typhoon'), 'en', london);
    expect(strike.querySelector('.card-name')?.textContent).toBe('Tube Strike');
    expect(strike.querySelector('.card-icon')?.textContent).toBe('+4');
  });

  it('uses the London wild names in Chinese mode', () => {
    const london = networkById('london-underground')!;
    const londonDeck = buildDeck(london);
    expect(show(wild(londonDeck, 'octopus'), 'zh', london).querySelector('.card-name')?.textContent).toBe('Oyster 卡');
    expect(show(wild(londonDeck, 'typhoon'), 'zh', london).querySelector('.card-name')?.textContent).toBe('地鐵罷工');
  });
});
