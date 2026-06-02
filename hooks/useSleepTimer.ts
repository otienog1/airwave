import { useState, useEffect, useRef, useCallback } from 'react';

export function useSleepTimer(onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const start = useCallback((minutes: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    secondsRef.current = minutes * 60;
    setSecondsLeft(secondsRef.current);

    intervalRef.current = setInterval(() => {
      secondsRef.current -= 1;
      if (secondsRef.current <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setSecondsLeft(null);
        onExpireRef.current();
      } else {
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);
  }, []);

  const cancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSecondsLeft(null);
  }, []);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    []
  );

  return { secondsLeft, isActive: secondsLeft !== null, start, cancel };
}
