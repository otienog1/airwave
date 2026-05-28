import { useState, useEffect, useRef, useCallback } from 'react';

export function useSleepTimer(onExpire: () => void) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const start = useCallback((minutes: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    secondsRef.current = minutes * 60;
    setMinutesLeft(minutes);

    intervalRef.current = setInterval(() => {
      secondsRef.current -= 1;
      const minsLeft = Math.ceil(secondsRef.current / 60);
      setMinutesLeft(minsLeft > 0 ? minsLeft : 0);

      if (secondsRef.current <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setMinutesLeft(null);
        onExpireRef.current();
      }
    }, 1000);
  }, []);

  const cancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setMinutesLeft(null);
  }, []);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    []
  );

  return { minutesLeft, isActive: minutesLeft !== null, start, cancel };
}
