import { useEffect, useState } from 'react';
import { useAppReady } from '../contexts/AppReadyContext';

const MIN_VISIBLE_MS = 3000;
const FADE_MS = 400;

export default function SplashScreen() {
  const { ready } = useAppReady();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && minTimeElapsed) {
      setFadingOut(true);
      const timer = setTimeout(() => setRemoved(true), FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [ready, minTimeElapsed]);

  if (removed) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity ease-out"
      style={{
        opacity: fadingOut ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        pointerEvents: fadingOut ? 'none' : 'auto',
      }}
    >
      <img
        src="/splash.webp"
        alt="در حال بارگذاری..."
        className="w-24 h-24 object-contain"
      />
    </div>
  );
}
