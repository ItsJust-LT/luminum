"use client";

// Utilities to manage Web Push subscription from the browser

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray.buffer;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (typeof window === "undefined") return null;
	if (!("serviceWorker" in navigator)) return null;
	try {
		const registration = await navigator.serviceWorker.register("/sw.js");
		return registration;
	} catch (e) {
		console.error("Failed to register service worker", e);
		return null;
	}
}

export function isPushSupported(): boolean {
	if (typeof window === "undefined") return false;
	return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushPermissionState(): Promise<NotificationPermission> {
	if (typeof window === "undefined" || !("Notification" in window)) return "denied";
	return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
	const state = await getPushPermissionState();
	if (state === "granted") return true;
	if (state === "denied") return false;
	try {
		const result = await Notification.requestPermission();
		return result === "granted";
	} catch (e) {
		console.error("Notification permission request failed", e);
		return false;
	}
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
	const registration = await ensureServiceWorker();
	if (!registration) return null;
	return await registration.pushManager.getSubscription();
}

export async function subscribeToPush(userId: string): Promise<boolean> {
	if (!isPushSupported()) return false;
	const granted = await requestPushPermission();
	if (!granted) return false;
	const registration = await ensureServiceWorker();
	if (!registration) return false;
	const existing = await registration.pushManager.getSubscription();
	if (existing) {
		// Already subscribed - save to server just in case
		await saveSubscription(userId, existing);
		return true;
	}
	const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
	if (!publicKey) {
		console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured");
		return false;
	}
	const appServerKey = urlBase64ToUint8Array(publicKey);
	const subscription = await registration.pushManager.subscribe({ 
		userVisibleOnly: true, 
		applicationServerKey: appServerKey 
	});
	await saveSubscription(userId, subscription);
	return true;
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
	const registration = await ensureServiceWorker();
	if (!registration) return false;
	const sub = await registration.pushManager.getSubscription();
	if (!sub) return true;
	const endpoint = sub.endpoint;
	try {
		const { api } = await import('@/lib/api');
		await api.notifications.removePushSubscription(endpoint);
		await sub.unsubscribe();
		return true;
	} catch (e) {
		console.error("Unsubscribe failed", e);
		return false;
	}
}

async function saveSubscription(_userId: string, subscription: PushSubscription): Promise<void> {
	try {
		const { api } = await import('@/lib/api');
		await api.notifications.upsertPushSubscription(subscription);
	} catch (e) {
		console.error("Failed to save subscription", e);
	}
}

export async function isPushEnabled(): Promise<boolean> {
	const sub = await getExistingSubscription();
	return !!sub;
}
