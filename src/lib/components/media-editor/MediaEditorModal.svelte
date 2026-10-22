<!--
  @component MediaEditorModal
  @domain media-editor
  @description Modale principale de retouche multimédia (recadrage, rotation, dessin SVG, superposition de textes et d'images).
  @responsibilities
    - Orchestrer le cycle de vie du fichier média (création/révocation d'URL objet)
    - Piloter les modes d'édition (recadrage, texte, dessin, image incrustée)
    - Gérer la pile d'historique (Undo / Redo)
    - Intégrer le viewport canvas et les barres d'outils contextuelles
    - Exporter le rendu final haute résolution via canvas
-->
<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import { mediaEditor } from '$lib/client/mediaEditorState.svelte';
	import { EDITOR_FONTS } from '$lib/constants';
	import type {
		TextItem,
		DrawingStroke,
		ImageOverlayItem,
		ImageOverlayShape,
		HistorySnapshot,
		EditorMode
	} from './types';
	import { generateId } from './types';
	import { renderAndExportCanvas } from './canvas-export';
	import { computeCropDimensions } from './editor-math';
	import TextEditOverlay from './TextEditOverlay.svelte';
	import TextToolbar from './TextToolbar.svelte';
	import ImageToolbar from './ImageToolbar.svelte';
	import DrawingToolbar from './DrawingToolbar.svelte';
	import CropToolbar from './CropToolbar.svelte';
	import MediaCanvasViewport from './MediaCanvasViewport.svelte';

	let file = $derived(mediaEditor.currentFile);
	let ratio = $derived(mediaEditor.ratio);

	let objectUrl = $state('');
	let isVideo = $derived(file ? file.type.startsWith('video') : false);

	// Modes de l'éditeur
	let activeMode = $state<EditorMode>('crop');

	// Zoom & Pan de l'image
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);

	let imageElement = $state<HTMLImageElement>();
	let cropAreaElement = $state<HTMLDivElement>();

	// Dimensions de l'espace de travail
	let workW = $state(0);
	let workH = $state(0);

	let cropDimensions = $derived(computeCropDimensions(workW, workH, ratio as '1:1' | '4:5'));
	let cropW = $derived(cropDimensions.cropW);
	let cropH = $derived(cropDimensions.cropH);

	// Calques de texte
	let texts = $state<TextItem[]>([]);
	let activeTextId = $state<string | null>(null);
	let activeText = $derived(texts.find((t) => t.id === activeTextId));

	// Mode d'édition Instagram pour la saisie de texte
	let isEditingText = $state(false);
	let isNewlyAddedText = $state(false);
	let textBeforeEdit = $state<TextItem | null>(null);

	// Calques d'images incrustées
	let images = $state<ImageOverlayItem[]>([]);
	let activeImageId = $state<string | null>(null);
	let activeImage = $derived(images.find((img) => img.id === activeImageId));

	// Calques de dessin
	let strokes = $state<DrawingStroke[]>([]);
	let brushColor = $state('#ef4444');
	let brushRelSize = $state(0.015);

	// Historique Undo / Redo
	let history = $state<HistorySnapshot[]>([
		{ texts: [], strokes: [], images: [], panX: 0, panY: 0, zoom: 1 }
	]);
	let historyIndex = $state(0);

	let canUndo = $derived(historyIndex > 0);
	let canRedo = $derived(historyIndex < history.length - 1);

	function pushHistory() {
		const nextSnapshot: HistorySnapshot = {
			texts: JSON.parse(JSON.stringify(texts)),
			strokes: JSON.parse(JSON.stringify(strokes)),
			images: JSON.parse(JSON.stringify(images)),
			panX,
			panY,
			zoom
		};

		// Éviter d'enregistrer deux snapshots consécutifs identiques
		const currentSnapshot = history[historyIndex];
		if (
			currentSnapshot &&
			currentSnapshot.panX === panX &&
			currentSnapshot.panY === panY &&
			currentSnapshot.zoom === zoom &&
			JSON.stringify(currentSnapshot.texts) === JSON.stringify(texts) &&
			JSON.stringify(currentSnapshot.strokes) === JSON.stringify(strokes) &&
			JSON.stringify(currentSnapshot.images || []) === JSON.stringify(images)
		) {
			return;
		}

		history = [...history.slice(0, historyIndex + 1), nextSnapshot];
		historyIndex = history.length - 1;
	}

	function undo() {
		if (!canUndo) return;
		historyIndex--;
		const snapshot = history[historyIndex];
		texts = JSON.parse(JSON.stringify(snapshot.texts));
		strokes = JSON.parse(JSON.stringify(snapshot.strokes));
		images = JSON.parse(JSON.stringify(snapshot.images || []));
		if (snapshot.panX !== undefined) panX = snapshot.panX;
		if (snapshot.panY !== undefined) panY = snapshot.panY;
		if (snapshot.zoom !== undefined) zoom = snapshot.zoom;
		if (activeTextId && !texts.find((t) => t.id === activeTextId)) {
			activeTextId = null;
			if (activeMode === 'text') activeMode = 'crop';
		}
		if (activeImageId && !images.find((img) => img.id === activeImageId)) {
			activeImageId = null;
			if (activeMode === 'image') activeMode = 'crop';
		}
	}

	function redo() {
		if (!canRedo) return;
		historyIndex++;
		const snapshot = history[historyIndex];
		texts = JSON.parse(JSON.stringify(snapshot.texts));
		strokes = JSON.parse(JSON.stringify(snapshot.strokes));
		images = JSON.parse(JSON.stringify(snapshot.images || []));
		if (snapshot.panX !== undefined) panX = snapshot.panX;
		if (snapshot.panY !== undefined) panY = snapshot.panY;
		if (snapshot.zoom !== undefined) zoom = snapshot.zoom;
	}

	function cleanupImages() {
		if (images.length > 0) {
			for (const img of images) {
				URL.revokeObjectURL(img.objectUrl);
			}
			images = [];
		}
		if (activeImageId !== null) {
			activeImageId = null;
		}
	}

	onDestroy(() => {
		cleanupImages();
	});

	$effect(() => {
		if (!file) {
			objectUrl = '';
			untrack(() => {
				cleanupImages();
			});
			return;
		}

		const currentUrl = URL.createObjectURL(file);
		objectUrl = currentUrl;

		untrack(() => {
			zoom = 1;
			panX = 0;
			panY = 0;
			texts = [];
			cleanupImages();
			strokes = [];
			activeTextId = null;
			activeMode = 'crop';
			isEditingText = false;
			history = [{ texts: [], strokes: [], images: [], panX: 0, panY: 0, zoom: 1 }];
			historyIndex = 0;
		});

		return () => {
			URL.revokeObjectURL(currentUrl);
			untrack(() => {
				cleanupImages();
			});
		};
	});

	// Gestion du texte
	function addText() {
		const id = generateId();
		const defaultFont = EDITOR_FONTS[0];
		const newText: TextItem = {
			id,
			text: '',
			relX: 0,
			relY: 0,
			relFontSize: 0.075,
			relWidth: 0.6,
			fontFamily: defaultFont.family,
			fontWeight: defaultFont.weight,
			color: '#ffffff',
			rotation: 0,
			hasBackground: false,
			bgColor: 'rgba(0, 0, 0, 0.75)',
			align: 'center'
		};
		texts = [...texts, newText];
		activeTextId = id;
		activeMode = 'text';
		isNewlyAddedText = true;
		textBeforeEdit = null;
		isEditingText = true;
	}

	function openTextEdit(item: TextItem) {
		activeTextId = item.id;
		activeMode = 'text';
		isNewlyAddedText = false;
		textBeforeEdit = JSON.parse(JSON.stringify(item));
		isEditingText = true;
	}

	function finishTextOverlay() {
		if (activeText) {
			activeText.text = activeText.text.replace(/^\n+/, '').replace(/\n+$/, '').trim();
			if (!activeText.text) {
				if (isNewlyAddedText) {
					texts = texts.filter((t) => t.id !== activeTextId);
					activeTextId = null;
					activeMode = 'crop';
					isEditingText = false;
					isNewlyAddedText = false;
					textBeforeEdit = null;
					return;
				} else {
					activeText.text = 'Texte';
				}
			}
		}
		isEditingText = false;
		pushHistory();
	}

	function cancelTextOverlay() {
		if (isNewlyAddedText) {
			texts = texts.filter((t) => t.id !== activeTextId);
			activeTextId = null;
			activeMode = 'crop';
		} else if (textBeforeEdit && activeText) {
			Object.assign(activeText, textBeforeEdit);
		}
		isEditingText = false;
		isNewlyAddedText = false;
		textBeforeEdit = null;
	}

	function deleteActiveText() {
		if (!activeTextId) return;
		texts = texts.filter((t) => t.id !== activeTextId);
		activeTextId = null;
		activeMode = 'crop';
		isEditingText = false;
		pushHistory();
	}

	function validateText() {
		activeTextId = null;
		activeMode = 'crop';
	}

	function cancelTextEdit() {
		activeTextId = null;
		activeMode = 'crop';
	}

	function toggleBackground() {
		if (!activeText) return;
		activeText.hasBackground = !activeText.hasBackground;
		if (activeText.hasBackground) {
			activeText.bgColor =
				activeText.color === '#000000' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)';
		}
	}

	// Gestion des calques d'image incrustée
	function addImage(imgFile: File) {
		const objUrl = URL.createObjectURL(imgFile);
		const tempImg = new Image();
		tempImg.onload = () => {
			const naturalW = tempImg.naturalWidth || 1;
			const naturalH = tempImg.naturalHeight || 1;
			const aspectRatio = naturalW / naturalH;

			const newImageItem: ImageOverlayItem = {
				id: generateId(),
				file: imgFile,
				objectUrl: objUrl,
				aspectRatio,
				relX: 0,
				relY: 0,
				relScale: 0.38,
				rotation: 0,
				shape: 'rounded'
			};

			images = [...images, newImageItem];
			activeImageId = newImageItem.id;
			activeMode = 'image';
			pushHistory();
		};
		tempImg.src = objUrl;
	}

	function deleteActiveImage() {
		if (!activeImageId) return;
		const img = images.find((i) => i.id === activeImageId);
		if (img) URL.revokeObjectURL(img.objectUrl);
		images = images.filter((i) => i.id !== activeImageId);
		activeImageId = null;
		activeMode = 'crop';
		pushHistory();
	}

	function validateImage() {
		activeImageId = null;
		activeMode = 'crop';
	}

	function cancelImageEdit() {
		activeImageId = null;
		activeMode = 'crop';
	}

	function cycleImageShape() {
		if (!activeImage) return;
		const order: ImageOverlayShape[] = ['rounded', 'circle', 'square'];
		const nextIdx = (order.indexOf(activeImage.shape) + 1) % order.length;
		activeImage.shape = order[nextIdx];
		pushHistory();
	}

	// Gestion du dessin libre
	function startDrawing() {
		activeTextId = null;
		activeMode = 'draw';
	}

	function finishDrawing() {
		activeMode = 'crop';
	}

	function undoStroke() {
		if (strokes.length === 0) return;
		strokes = strokes.slice(0, -1);
		pushHistory();
	}

	function clearStrokes() {
		if (strokes.length === 0) return;
		strokes = [];
		pushHistory();
	}

	function handleStrokeComplete(stroke: DrawingStroke) {
		strokes = [...strokes, stroke];
		pushHistory();
	}

	async function handleSave() {
		if (!file) return;

		if (isVideo) {
			mediaEditor.saveCurrent(file);
			return;
		}

		activeTextId = null;
		activeImageId = null;
		activeMode = 'crop';

		const croppedFile = await renderAndExportCanvas({
			file,
			imageElement: imageElement!,
			cropW,
			cropH,
			panX,
			panY,
			zoom,
			ratio: ratio as '1:1' | '4:5',
			strokes,
			texts,
			images
		});

		if (croppedFile) {
			cleanupImages();
			mediaEditor.saveCurrent(croppedFile);
		}
	}

	function handleCancel() {
		cleanupImages();
		mediaEditor.cancelCurrent();
	}
</script>

{#if file}
	<div class="overlay">
		<div class="modal">
			<header>
				{#if activeMode === 'text'}
					<button type="button" class="btn cancel" onclick={cancelTextEdit}>Annuler</button>
					<h3>Positionner le texte</h3>
					<button type="button" class="btn save" onclick={validateText}>Valider</button>
				{:else if activeMode === 'image'}
					<button type="button" class="btn cancel" onclick={cancelImageEdit}>Annuler</button>
					<h3>Positionner l'image</h3>
					<button type="button" class="btn save" onclick={validateImage}>Valider</button>
				{:else if activeMode === 'draw'}
					<button type="button" class="btn cancel" onclick={finishDrawing}>Retour</button>
					<h3>Dessiner</h3>
					<button type="button" class="btn save" onclick={finishDrawing}>Valider</button>
				{:else}
					<button type="button" class="btn cancel" onclick={handleCancel}>Annuler</button>
					<h3>Recadrer & Éditer</h3>
					<button type="button" class="btn save" onclick={handleSave}>Suivant</button>
				{/if}
			</header>

			<div class="workspace" bind:clientWidth={workW} bind:clientHeight={workH}>
				<MediaCanvasViewport
					{cropW}
					{cropH}
					ratio={ratio as '1:1' | '4:5'}
					{objectUrl}
					{isVideo}
					bind:panX
					bind:panY
					{zoom}
					{activeMode}
					bind:imageElement
					bind:cropAreaElement
					{strokes}
					{brushColor}
					{brushRelSize}
					bind:texts
					bind:images
					{activeTextId}
					{activeImageId}
					onStrokeComplete={handleStrokeComplete}
					onSelectText={(item) => openTextEdit(item)}
					onSelectImage={(item) => {
						activeImageId = item.id;
						activeMode = 'image';
					}}
					onHistoryPush={pushHistory}
				/>
			</div>

			<!-- Contrôles inférieurs -->
			{#if isVideo}
				<div class="controls standard-controls">
					<span class="video-info">Recadrage vidéo automatique</span>
				</div>
			{:else if activeMode === 'text' && activeText}
				<TextToolbar
					{activeText}
					onEdit={() => {
						if (activeText) openTextEdit(activeText);
					}}
					onToggleBackground={toggleBackground}
					onDelete={deleteActiveText}
					onValidate={validateText}
				/>
			{:else if activeMode === 'image' && activeImage}
				<ImageToolbar
					{activeImage}
					onCycleShape={cycleImageShape}
					onDelete={deleteActiveImage}
					onValidate={validateImage}
				/>
			{:else if activeMode === 'draw'}
				<DrawingToolbar
					{brushColor}
					{brushRelSize}
					canUndo={strokes.length > 0}
					canClear={strokes.length > 0}
					onColorChange={(c) => (brushColor = c)}
					onSizeChange={(s) => (brushRelSize = s)}
					onUndo={undoStroke}
					onClear={clearStrokes}
					onFinish={finishDrawing}
				/>
			{:else}
				<CropToolbar
					{zoom}
					onZoomChange={(z) => (zoom = z)}
					onZoomCommit={pushHistory}
					{canUndo}
					{canRedo}
					onUndo={undo}
					onRedo={redo}
					onAddText={addText}
					onAddImage={addImage}
					onStartDrawing={startDrawing}
				/>
			{/if}
		</div>
	</div>

	<!-- Mode d'édition Instagram plein écran -->
	{#if isEditingText && activeText}
		<TextEditOverlay
			{activeText}
			{cropW}
			onDone={finishTextOverlay}
			onCancel={cancelTextOverlay}
			onDelete={deleteActiveText}
		/>
	{/if}
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100dvh;
		background: rgba(0, 0, 0, 0.95);
		z-index: var(--z-modal, 9999);
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: none;
		overflow: hidden;
	}

	.modal {
		background: #000;
		color: #fff;
		width: 100%;
		height: 100dvh;
		max-height: 100dvh;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	@media (min-width: 640px) {
		.modal {
			width: 90vw;
			height: 90vh;
			max-width: 600px;
			max-height: 850px;
			border-radius: 12px;
			overflow: hidden;
		}
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
		background: #000;
		border-bottom: 1px solid #222;
		flex-shrink: 0;
	}

	@media (min-width: 640px) {
		header {
			padding: 16px;
		}
	}

	header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.btn {
		background: none;
		border: none;
		color: #fff;
		font-size: 0.95rem;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
	}

	.btn.save {
		color: #0095f6;
		font-weight: 600;
	}

	.workspace {
		flex: 1;
		min-height: 0;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #111;
		overflow: hidden;
	}

	.controls {
		padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
		background: #000;
		display: flex;
		flex-direction: column;
		gap: 12px;
		border-top: 1px solid #222;
		flex-shrink: 0;
	}

	@media (min-width: 640px) {
		.controls {
			padding: 16px;
		}
	}

	.video-info {
		text-align: center;
		color: #888;
		font-size: 0.9rem;
	}
</style>
