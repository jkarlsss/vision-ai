"use client";

import { useEffect, useMemo, useState } from "react";
import { useFeedMessages } from "@liveblocks/react";

const maxFeedMessageRetryAttempts = 4;
const feedMessageRetryBaseDelayMs = 750;
const feedMessageRetryMaxDelayMs = 6000;

interface UseRetriableFeedMessagesOptions {
  limit: number;
}

export function useRetriableFeedMessages(
  feedId: string,
  options: UseRetriableFeedMessagesOptions,
) {
  const [retrySeed, setRetrySeed] = useState(0);
  const feedMessagesOptions = useMemo(
    () =>
      ({
        limit: options.limit,
        retrySeed,
      }) as unknown as Parameters<typeof useFeedMessages>[1],
    [options.limit, retrySeed],
  );
  const result = useFeedMessages(feedId, feedMessagesOptions);
  const canRetry =
    Boolean(result.error) && retrySeed < maxFeedMessageRetryAttempts;

  useEffect(() => {
    if (!canRetry) {
      return;
    }

    const retryDelay = Math.min(
      feedMessageRetryBaseDelayMs * 2 ** retrySeed,
      feedMessageRetryMaxDelayMs,
    );
    const timeoutId = window.setTimeout(() => {
      setRetrySeed((currentRetrySeed) => currentRetrySeed + 1);
    }, retryDelay);

    return () => window.clearTimeout(timeoutId);
  }, [canRetry, retrySeed]);

  return {
    ...result,
    isRetrying: canRetry,
  };
}
