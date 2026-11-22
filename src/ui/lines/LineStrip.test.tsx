// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { networkById, networkOrDefault } from '../../data/networks';
import { NetworkProvider } from '../common/NetworkContext';
import { LangProvider } from '../i18n/LangContext';
import { LineStrip } from './LineStrip';

const london = networkById('london-underground')!;

const ui = (lines: string[], station: string | null, network = london) => (
  <NetworkProvider network={network}>
    <LangProvider initial="en">
      <LineStrip lines={lines} highlightStation={station} />
    </LangProvider>
  </NetworkProvider>
);

const tabs = () => screen.getAllByRole('button');
const shown = () => [...screen.getByTestId('line-strip').querySelectorAll('[data-station]')].map((s) => s.getAttribute('data-station'));
const stopsOf = (code: string) => london.lineByCode[code]!.stops.map((s) => s.stationId);
const highlighted = () => screen.getByTestId('line-strip').querySelector('[aria-current="location"]')?.getAttribute('data-station');

describe('LineStrip', () => {
  it('draws the first of several current lines, with a tab for each', () => {
    render(ui(['CIR', 'DIS'], 'sloane-square'));
    expect(tabs().map((b) => b.textContent)).toEqual(['CIR', 'DIS']);
    expect(tabs().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(screen.getByRole('button', { name: 'District' })).toBe(tabs()[1]);
    expect(shown()).toEqual(stopsOf('CIR'));
    expect(highlighted()).toBe('sloane-square');
  });

  it('switches to the line of the chosen tab, keeping the station highlighted', () => {
    render(ui(['CIR', 'DIS'], 'sloane-square'));
    fireEvent.click(screen.getByRole('button', { name: 'District' }));
    expect(tabs().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    expect(screen.getByTestId('line-strip').getAttribute('aria-label')).toBe('District');
    expect(shown()).toEqual(stopsOf('DIS'));
    expect(highlighted()).toBe('sloane-square');
  });

  it('goes back to the first line when the current lines change', () => {
    const { rerender } = render(ui(['CIR', 'DIS'], null));
    fireEvent.click(screen.getByRole('button', { name: 'District' }));
    rerender(ui(['H&C', 'DIS'], null));
    expect(shown()).toEqual(stopsOf('H&C'));
  });

  it('does not remember a choice once the current lines have changed and come back', () => {
    const { rerender } = render(ui(['CIR', 'DIS'], null));
    fireEvent.click(screen.getByRole('button', { name: 'District' }));
    rerender(ui(['VIC'], null));
    rerender(ui(['CIR', 'DIS'], null));
    expect(shown()).toEqual(stopsOf('CIR'));
  });

  it('has no tabs for a single current line', () => {
    const { unmount } = render(ui(['DIS'], null));
    expect(screen.queryByTestId('strip-tabs')).toBeNull();
    unmount();
    render(ui(['TCL'], null, networkOrDefault('hk-mtr')));
    expect(screen.queryByTestId('strip-tabs')).toBeNull();
  });
});
