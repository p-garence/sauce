import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertAdmin } from '$lib/server/admin';
import { updateInstanceIconSettings } from '$lib/server/instanceSettings';

export const POST: RequestHandler = async ({ request, locals }) => {
	assertAdmin(locals.user);

	try {
		const body = await request.json();
		const updated = await updateInstanceIconSettings({
			allowedBuiltinIconPacks: body.allowedBuiltinIconPacks || ['lucide', 'original'],
			allowedCustomIconSetIds: body.allowedCustomIconSetIds || [],
			defaultIconPack: body.defaultIconPack || 'lucide',
			defaultIconSetId: body.defaultIconSetId || null
		});

		return json({ success: true, settings: updated });
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour des icônes';
		return json({ error: msg }, { status: 400 });
	}
};
