import { useState, type FormEvent } from 'react';
import { isValidCode, normalizeCode, sanitizeName } from '../../shared/rooms';
import { useLang } from '../i18n/LangContext';
import { LangToggle } from '../i18n/LangToggle';
import { loadName, saveName } from '../common/settings';
import { ThemeToggle } from '../theme/ThemeToggle';

interface Props {
  /** A code from a share link, filled in for the player. */
  initialCode?: string;
  /** A message explaining why the player is back here (room full, kicked…). */
  message?: string | null;
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  onBack: () => void;
}

/** Create a room, or join one by its code. */
export function OnlineMenu({ initialCode = '', message, onCreate, onJoin, onBack }: Props) {
  const { t } = useLang();
  const o = t.online;
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState(initialCode);
  const [problem, setProblem] = useState<string | null>(null);

  const checkedName = (): string | null => {
    const clean = sanitizeName(name);
    if (!clean) setProblem(o.nameRequired);
    else saveName(clean);
    return clean;
  };

  const create = () => {
    const clean = checkedName();
    if (clean) onCreate(clean);
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const clean = checkedName();
    if (!clean) return;
    const c = normalizeCode(code);
    if (!isValidCode(c)) return setProblem(o.codeInvalid);
    onJoin(c, clean);
  };

  const shown = problem ?? message;

  return (
    <main className="setup online-menu">
      <div className="setup-card">
        <div className="card-toolbar">
          <button type="button" className="btn btn-quiet" onClick={onBack} data-testid="online-back">
            {o.back}
          </button>
          <span className="spacer" />
          <ThemeToggle />
          <LangToggle />
        </div>
        <h1>{o.menuTitle}</h1>
        <p className="subtitle">{o.intro}</p>

        {shown && (
          <p className="online-message" role="alert" data-testid="online-message">
            {shown}
          </p>
        )}

        <label className="field">
          <span className="field-label">{o.yourName}</span>
          <input
            type="text"
            value={name}
            maxLength={40}
            autoComplete="nickname"
            onChange={(e) => {
              setName(e.target.value);
              setProblem(null);
            }}
            data-testid="online-name"
          />
        </label>

        {!initialCode && (
          <button type="button" className="btn btn-primary btn-start" onClick={create} data-testid="create-room">
            {o.createRoom}
          </button>
        )}

        <form className="join-form" onSubmit={join}>
          {!initialCode && <h2 className="join-heading">{o.orJoin}</h2>}
          <label className="field">
            <span className="field-label">{o.roomCode}</span>
            <input
              type="text"
              value={code}
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="code-input"
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setProblem(null);
              }}
              data-testid="room-code"
            />
          </label>
          <button type="submit" className={initialCode ? 'btn btn-primary btn-start' : 'btn'} data-testid="join-room">
            {o.join}
          </button>
        </form>
      </div>
    </main>
  );
}
