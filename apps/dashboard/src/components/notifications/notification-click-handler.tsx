'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side handler for notification clicks from service worker
 * Listens for messages from service worker and navigates accordingly
 */
export function NotificationClickHandler() {
  const router = useRouter();

  useEffect(() => {
    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const { url } = event.data;
        
        if (url) {
          console.log('Navigating to notification URL:', url);
          
          // Use Next.js router for internal navigation
          if (url.startsWith('/')) {
            router.push(url);
          } else {
            // External link
            window.open(url, '_blank');
          }
        }
      }
    };

    // Check if service worker messaging is supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [router]);

  return null; // This component doesn't render anything
}

