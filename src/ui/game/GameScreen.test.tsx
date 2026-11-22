// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { viewFor, type Action } from '../../engine/game';
import { hk, lu, scenario, type ScenarioOptions } from '../../engine/test-helpers';
import { NetworkProvider } from '../common/NetworkContext';
import { LangProvider } from '../i18n/LangContext';
import { GameScreen } from './GameScreen';
import type { SeatInfo, TableController } from './tableController';

function renderTable(o: ScenarioOptions) {
  const state = scenario(o);
  const sent: Action[] = [];
  const seats: SeatInfo[] = state.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    kind: i === 0 ? 'human' : 'bot',
    botNumber: i,
    connected: true,
    isMe: i === 0,
    isHost: i === 0,
  }));
  const controller: TableController = {
    view: viewFor(state, 'p0'),
    seats,
    log: [],
    send: (a) => sent.push(a),
    reject: () => {},
  };
  render(
    <NetworkProvider network={o.network ?? hk}>
      <LangProvider initial="en">
        <GameScreen controller={controller} menuLabel="Menu" onMenu={() => {}} endActions={null} />
      </LangProvider>
    </NetworkProvider>,
  );
  return sent;
}

const tap = (cardId: string) => fireEvent.click(document.querySelector(`.hand [data-card="${cardId}"]`)!);

const optionsOf = () =>
  [...screen.getByTestId('line-chooser').querySelectorAll('.line-option')].map((b) => b.getAttribute('data-line'));

describe('several current lines (London)', () => {
  const filler = ['st:angel', 'st:borough', 'st:oval'];

  it('plays Sloane Square with no prompt', () => {
    const sent = renderTable({ network: lu, hands: [['st:sloane-square', ...filler], ['st:old-street']], top: 'st:parsons-green' });
    tap('st:sloane-square');
    expect(screen.queryByTestId('line-chooser')).toBeNull();
    expect(sent).toEqual([{ type: 'play', cardId: 'st:sloane-square', callUno: false }]);
  });

  it('shows several current lines as one badge, with the Circle strip and a District tab', () => {
    renderTable({ network: lu, hands: [filler, ['st:old-street']], top: 'st:sloane-square' });
    const current = screen.getByTestId('current-line');
    expect(current.getAttribute('data-line')).toBe('CIR+DIS');
    expect([...current.querySelectorAll('.line-code')].map((c) => c.textContent)).toEqual(['CIR', 'DIS']);
    expect(current.querySelector('.line-name')?.textContent).toBe('Circle / District');
    const strip = () => screen.getByTestId('line-strip');
    const highlighted = () => strip().querySelector('[aria-current="location"]')?.getAttribute('data-station');
    expect([strip().getAttribute('aria-label'), highlighted()]).toEqual(['Circle', 'sloane-square']);
    fireEvent.click(screen.getByRole('button', { name: 'District' }));
    expect([strip().getAttribute('aria-label'), highlighted()]).toEqual(['District', 'sloane-square']);
  });

  it("offers King's Cross from the Northern as three choices, the first being Circle, H&C and Met together", () => {
    const sent = renderTable({ network: lu, hands: [['st:kings-cross-st-pancras', ...filler], ['st:old-street']], top: 'st:euston', currentLine: 'NOR' });
    tap('st:kings-cross-st-pancras');
    expect(optionsOf()).toEqual(['CIR+H&C+MET', 'PIC', 'VIC']);
    const first = screen.getByTestId('line-chooser').querySelector('.line-option')!;
    expect([...first.querySelectorAll('.line-code')].map((c) => c.textContent)).toEqual(['CIR', 'H&C', 'MET']);
    fireEvent.click(first);
    expect(sent).toMatchObject([{ type: 'play', cardId: 'st:kings-cross-st-pancras', chosenLines: ['CIR', 'H&C', 'MET'] }]);
  });

  it('plays Victoria from the Victoria line with no prompt', () => {
    const sent = renderTable({ network: lu, hands: [['st:victoria', ...filler], ['st:old-street']], top: 'st:pimlico' });
    tap('st:victoria');
    expect(screen.queryByTestId('line-chooser')).toBeNull();
    expect(sent).toMatchObject([{ type: 'play', cardId: 'st:victoria', chosenLines: ['CIR', 'DIS'] }]);
  });
});

describe('line choice in Hong Kong', () => {
  it('changes line without asking for a two-line interchange (North Point)', () => {
    const sent = renderTable({ hands: [['st:north-point', 'st:jordan', 'st:whampoa'], ['st:olympic']], top: 'st:sai-ying-pun' });
    tap('st:north-point');
    expect(screen.queryByTestId('line-chooser')).toBeNull();
    expect(sent).toMatchObject([{ type: 'play', cardId: 'st:north-point', chosenLines: ['TKL'] }]);
  });

  it('offers each other line of Admiralty on its own', () => {
    renderTable({ hands: [['st:admiralty', 'st:jordan', 'st:whampoa'], ['st:olympic']], top: 'st:sai-ying-pun' });
    tap('st:admiralty');
    expect(optionsOf()).toEqual(['TWL', 'EAL', 'SIL']);
  });
});
