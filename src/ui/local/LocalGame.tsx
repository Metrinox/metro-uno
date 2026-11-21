import { networkOrDefault } from '../../data/networks';
import { NetworkProvider } from '../common/NetworkContext';
import { GameScreen } from '../game/GameScreen';
import { useLang } from '../i18n/LangContext';
import { useLocalGame, type GameConfig } from './useLocalGame';

interface Props {
  config: GameConfig;
  aiDelay: [number, number];
  onPlayAgain: () => void;
  onSetup: () => void;
}

/** A single-player round against computer opponents, on the map chosen in setup. */
export function LocalGame({ config, aiDelay, onPlayAgain, onSetup }: Props) {
  const { t } = useLang();
  const controller = useLocalGame(config, { aiDelay });
  return (
    <NetworkProvider network={networkOrDefault(config.map)}>
      <GameScreen
        controller={controller}
        menuLabel={t.menu}
        onMenu={onSetup}
        endActions={
          <div className="dialog-actions">
            <button type="button" className="btn btn-primary" onClick={onPlayAgain} autoFocus>
              {t.playAgain}
            </button>
            <button type="button" className="btn" onClick={onSetup}>
              {t.backToSetup}
            </button>
          </div>
        }
      />
    </NetworkProvider>
  );
}
