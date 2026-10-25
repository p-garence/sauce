import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { sessionUser } = await parent();
	if (!sessionUser) throw redirect(302, '/login');

	throw redirect(302, `/profil/${sessionUser.username}`);
};
