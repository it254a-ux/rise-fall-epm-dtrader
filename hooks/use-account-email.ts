'use client';

import { useState, useEffect } from 'react';
import type { DerivWS } from '@deriv/core';

interface GetSettingsResponse {
  get_settings?: {
    email?: string;
  };
}

/**
 * One-shot fetch of the authenticated account's email via Deriv's
 * get_settings API call. Uses ws.send() (request/response, not a
 * subscription) since the email doesn't change during a session — same
 * pattern useProposal.ts uses for its request, minus the subscribe.
 *
 * Deliberately separate from packages/core/src/auth — this does not read,
 * modify, or depend on anything in the auth folder. It only uses the
 * already-connected ws instance the rest of the app already has.
 */
export function useAccountEmail(ws: DerivWS | null, enabled: boolean): { email: string | null } {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!ws || !enabled) {
      setEmail(null);
      return;
    }
    let cancelled = false;
    ws.send<GetSettingsResponse>({ get_settings: 1 })
      .then((data) => {
        if (!cancelled) {
          setEmail(data.get_settings?.email ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setEmail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ws, enabled]);

  return { email };
}
