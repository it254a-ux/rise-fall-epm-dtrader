'use client';
import { useEffect } from 'react';

export function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch('/api/keepalive').catch(() => {});
    ping();
    const interval = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return null;
}
