// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../App';
import { loadMap } from '../common/settings';
import { LangProvider } from '../i18n/LangContext';

const renderApp = () =>
  render(
    <LangProvider>
      <App />
    </LangProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('Setup map picker', () => {
  it('starts on Hong Kong when nothing is saved', () => {
    renderApp();
    expect(screen.getByTestId('map-name').textContent).toBe('Hong Kong MTR');
    expect(screen.getByTestId('map-hk-mtr').className).toBe('is-selected');
  });

  it('shows the London subtitle and remembers the choice', () => {
    renderApp();
    fireEvent.click(screen.getByLabelText('London Underground'));
    expect(screen.getByTestId('map-name').textContent).toBe('London Underground');
    expect(screen.getByTestId('map-london-underground').className).toBe('is-selected');
    expect(loadMap()).toBe('london-underground');

    cleanup();
    renderApp();
    expect(screen.getByTestId('map-name').textContent).toBe('London Underground');
  });
});
