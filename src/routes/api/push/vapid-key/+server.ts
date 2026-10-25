import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const publicKey =
		publicEnv.PUBLIC_VAPID_KEY || privateEnv.PUBLIC_VAPID_KEY || process.env.PUBLIC_VAPID_KEY || '';
	return json({ publicKey });
};
