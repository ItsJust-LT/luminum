// instrumentation-client.ts
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: 'history_change',
    capture_pageleave: true,         // Enable pageleave capture
    capture_exceptions: true,        // Enable Error Tracking
    debug: process.env.NODE_ENV === 'development',
});
