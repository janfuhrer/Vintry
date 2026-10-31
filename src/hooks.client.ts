import type { HandleClientError } from '@sveltejs/kit/hooks';

// what browsers throw when a request never reaches the server (Chrome, Safari, Firefox)
const NETWORK = /failed to fetch|load failed|networkerror/i;

export const handleError: HandleClientError = ({ kind, error }) => {
	if (kind !== 'unknown') return;
	// no signal is not a bug: the error page says so instead of "500"
	if (error instanceof TypeError && NETWORK.test(error.message)) return { status: 503, message: 'offline' };
	// replacing Kit's default hook also replaced its logging
	console.error(error);
};
