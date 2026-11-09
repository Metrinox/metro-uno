import { GameScreen } from '../game/GameScreen';
import { useLang } from '../i18n/LangContext';
import { useLocalGame, type GameConfig } from './useLocalGame';

interface Props {
  config: GameConfig;
  aiDelay: [number, number];
  onPlayAgain: () => void;
  onSetup: () => void;
}

/** A single-player round against computer opponents. */
export function LocalGame({ config, aiDelay, onPlayAgain, onSetup }: Props) {
  const { t } = useLang();
  const controller = useLocalGame(config, { aiDelay });
  return (
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
  );
}
