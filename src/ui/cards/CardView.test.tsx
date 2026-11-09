// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { buildDeck } from '../../engine/cards';
import { network } from '../common/network';
import { LangProvider } from '../i18n/LangContext';
import { CardView } from './CardView';

const deck = buildDeck(network);

function iconOf(kind: 'interchange' | 'terminus') {
  const card = deck.find((c) => (kind === 'interchange' ? c.kind === 'interchange' : c.kind === 'action' && c.action === 'terminus'))!;
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

  it('keeps the interchange arrows, which the terminus no longer shares', () => {
    const icon = iconOf('interchange');
    expect(icon.textContent?.trim()).toBe('⇄');
    expect(icon.querySelector('[data-testid="terminus-icon"]')).toBeNull();
  });
});
