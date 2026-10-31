import { APP_URL } from '$app/env/private';

export const rpName = 'Vintry';
export const rpID = new URL(APP_URL).hostname;
export const expectedOrigin = APP_URL;
