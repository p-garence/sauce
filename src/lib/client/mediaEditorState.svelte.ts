type RatioType = '1:1' | '4:5';

// La callback que la page appelante fournit pour recevoir le fichier recadré
type SaveCallback = (croppedFile: File) => void | Promise<void>;
type CancelCallback = () => void;

class MediaEditorState {
	// La file d'attente des fichiers
	queue = $state<File[]>([]);

	// Le fichier actuellement en train d'être édité
	currentFile = $state<File | null>(null);

	// Les paramètres de l'édition courante
	ratio = $state<RatioType>('4:5');
	onSaveCallback = $state<SaveCallback | null>(null);
	onCancelCallback = $state<CancelCallback | null>(null);

	/**
	 * Ouvre l'éditeur avec un ou plusieurs fichiers.
	 */
	open(files: File[], ratio: RatioType, onSave: SaveCallback, onCancel?: CancelCallback) {
		if (!files || files.length === 0) return;

		this.ratio = ratio;
		this.onSaveCallback = onSave;
		this.onCancelCallback = onCancel || null;
		this.queue = [...files];

		this.processNext();
	}

	private processNext() {
		if (this.queue.length > 0) {
			this.currentFile = this.queue.shift() || null;
		} else {
			this.currentFile = null;
			this.onSaveCallback = null;
			this.onCancelCallback = null;
		}
	}

	/**
	 * Appelé par la modale quand l'utilisateur a fini de recadrer l'image courante
	 */
	async saveCurrent(croppedFile: File) {
		if (this.onSaveCallback) {
			await this.onSaveCallback(croppedFile);
		}
		this.processNext(); // Passe au suivant (ou ferme)
	}

	/**
	 * Appelé par la modale si l'utilisateur annule ce recadrage
	 */
	cancelCurrent() {
		if (this.onCancelCallback) {
			this.onCancelCallback();
		}
		this.processNext(); // Passe au suivant (ou ferme)
	}
}

export const mediaEditor = new MediaEditorState();
