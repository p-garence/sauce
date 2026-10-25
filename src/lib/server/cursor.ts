export type CursorData = {
	type:
		| 'chrono'
		| 'likes'
		| 'score'
		| 'network_alpha'
		| 'network_chrono'
		| 'network_popular'
		| 'profile_chrono'
		| 'profile_oldest'
		| 'profile_popular'
		| 'profile_popular_week'
		| 'tag_chrono'
		| 'tag_oldest'
		| 'tag_popular'
		| 'blend'
		| 'trending'
		| 'oldest'
		| 'discussed'
		| 'random';
	lastValue: string | number; // Date ISO (chrono), Nombre (score d'algo), ou JSON string (blend / random)
	lastId: string; // Pour départager deux posts qui auraient la même date/score
};

export function encodeCursor(data: CursorData | null): string | null {
	if (!data) return null;
	// On transforme l'objet en JSON, puis en Base64
	return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decodeCursor(cursorStr?: string | null): CursorData | null {
	if (!cursorStr || cursorStr === 'null') return null;
	try {
		// On décode le Base64 vers JSON
		const decoded = Buffer.from(cursorStr, 'base64').toString('utf-8');
		const parsed = JSON.parse(decoded) as Partial<CursorData>;
		if (
			!parsed ||
			typeof parsed !== 'object' ||
			typeof parsed.type !== 'string' ||
			typeof parsed.lastId !== 'string' ||
			parsed.lastId.length === 0 ||
			parsed.lastId.length > 128 ||
			(typeof parsed.lastValue !== 'string' && typeof parsed.lastValue !== 'number')
		) {
			return null;
		}
		if (typeof parsed.lastValue === 'number' && !Number.isFinite(parsed.lastValue)) {
			return null;
		}
		return parsed as CursorData;
	} catch (e) {
		console.error('Erreur de décodage du curseur:', e);
		return null;
	}
}
