import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const sort = url.searchParams.get('sort');
	const query = sort ? `?sort=${sort}` : '';
	throw redirect(307, `/tag/${encodeURIComponent(params.name)}${query}`);
};
