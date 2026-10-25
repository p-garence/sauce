import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import {
	saveUploadedFile,
	getUserMediaUsage,
	formatBytes,
	deleteMediaFiles
} from '$lib/server/media';
import { MAX_MEDIA_SIZE_BYTES, MAX_MEDIA_SIZE_MB } from '$lib/constants';
import type { RequestHandler } from './$types';
import type { CarouselItem } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
	// 1. Vérification de sécurité
	const session = await requireApiSession(request);

	const formData = await request.formData();
	const files = formData.getAll('file') as File[];

	if (!files || files.length === 0) {
		return json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 });
	}

	// 2. Vérification du quota utilisateur
	const totalIncomingBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
	const usage = await getUserMediaUsage(session.user.id);

	if (usage.totalBytes + totalIncomingBytes > usage.quotaBytes) {
		const remainingBytes = Math.max(0, usage.quotaBytes - usage.totalBytes);
		return json(
			{
				success: false,
				message: `Quota de stockage dépassé. Espace restant : ${formatBytes(remainingBytes)} (limite totale : ${formatBytes(usage.quotaBytes)}).`
			},
			{ status: 413 }
		);
	}

	const uploadedMedia = [];
	const savedItems: CarouselItem[] = [];

	try {
		// 3. Traitement et vérification des fichiers
		for (const file of files) {
			if (file.size === 0) continue;

			if (file.size > MAX_MEDIA_SIZE_BYTES) {
				// Nettoyer les fichiers déjà écrits lors de cette requête
				await deleteMediaFiles(savedItems);
				return json(
					{
						success: false,
						message: `Le fichier ${file.name} dépasse la limite de ${MAX_MEDIA_SIZE_MB} Mo.`
					},
					{ status: 413 }
				);
			}

			const saved = await saveUploadedFile(file);
			savedItems.push(saved);
			uploadedMedia.push({ type: saved.type, url: saved.content });
		}

		// 4. On renvoie les URLs générées
		return json({ success: true, media: uploadedMedia });
	} catch (err) {
		// En cas d'erreur de traitement, on nettoie les fichiers créés
		await deleteMediaFiles(savedItems);
		throw err;
	}
};
