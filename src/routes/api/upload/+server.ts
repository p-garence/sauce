import { json } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import {
	saveUploadedFile,
	getUserMediaUsage,
	getMediaFileSize,
	formatBytes,
	deleteMediaFiles
} from '$lib/server/media';
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

	// 2. Vérification initiale du quota utilisateur
	const usage = await getUserMediaUsage(session.user.id);
	if (usage.totalBytes >= usage.quotaBytes) {
		return json(
			{
				success: false,
				message: `Quota de stockage atteint (limite totale : ${formatBytes(usage.quotaBytes)}).`
			},
			{ status: 413 }
		);
	}

	const uploadedMedia = [];
	const savedItems: CarouselItem[] = [];
	let compressedBatchBytes = 0;

	try {
		// 3. Traitement (compression) et vérification de la taille / du quota après compression
		for (const file of files) {
			if (file.size === 0) continue;

			const saved = await saveUploadedFile(file);
			savedItems.push(saved);

			const compressedSize = await getMediaFileSize(saved.content);
			compressedBatchBytes += compressedSize;

			if (usage.totalBytes + compressedBatchBytes > usage.quotaBytes) {
				await deleteMediaFiles(savedItems);
				const remainingBytes = Math.max(0, usage.quotaBytes - usage.totalBytes);
				return json(
					{
						success: false,
						message: `Quota de stockage dépassé après compression. Espace restant : ${formatBytes(remainingBytes)} (limite totale : ${formatBytes(usage.quotaBytes)}).`
					},
					{ status: 413 }
				);
			}

			uploadedMedia.push({ type: saved.type, url: saved.content });
		}

		// 4. On renvoie les URLs générées
		return json({ success: true, media: uploadedMedia });
	} catch (err) {
		// En cas d'erreur de traitement (dont dépassement de maxMediaSizeMb après compression), on nettoie les fichiers créés
		await deleteMediaFiles(savedItems);
		return json(
			{
				success: false,
				message: err instanceof Error ? err.message : 'Erreur lors du traitement du fichier.'
			},
			{ status: 413 }
		);
	}
};
