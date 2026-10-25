<script lang="ts">
	/**
	 * @component ChatAudioRecorder
	 * @domain chat
	 * @description Module d'enregistrement vocal en direct via WebRTC MediaRecorder (chronomètre, onde sonore et boutons d'action).
	 *
	 * @responsibilities
	 * - Capturer le flux audio du microphone via `MediaRecorder`.
	 * - Afficher la durée d'enregistrement et les barres d'ondes animées.
	 * - Produire un fichier audio (.webm, .ogg ou .m4a selon le support navigateur) avec URL locale d'écoute.
	 * - Fournir les contrôles d'arrêt, annulation et envoi direct.
	 */

	import { onDestroy } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		/** Indique si l'enregistrement est en cours (bindable) */
		isRecording?: boolean;
		/** Callback déclenché une fois l'enregistrement terminé avec le fichier et son URL */
		onRecordingComplete: (file: File, url: string, autoSend: boolean) => void;
		/** Callback déclenché lors de l'annulation */
		onCancel?: () => void;
	}

	let {
		isRecording = $bindable(false),
		onRecordingComplete,
		onCancel
	}: Props = $props();

	let recordingDuration = $state(0);
	let audioStream: MediaStream | null = null;
	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];
	let recordingTimer: ReturnType<typeof setInterval> | null = null;

	onDestroy(() => {
		cancel();
	});

	function formatAudioDuration(sec: number): string {
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}

	function getSupportedAudioMimeType(): string {
		if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
		const types = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/ogg;codecs=opus',
			'audio/ogg',
			'audio/mp4',
			'audio/aac'
		];
		for (const t of types) {
			if (MediaRecorder.isTypeSupported(t)) return t;
		}
		return '';
	}

	export async function start() {
		if (isRecording) return;
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			alert("Votre navigateur ne supporte pas l'enregistrement audio direct.");
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			audioStream = stream;
			audioChunks = [];

			const mimeType = getSupportedAudioMimeType();
			const options = mimeType ? { mimeType } : undefined;
			mediaRecorder = new MediaRecorder(stream, options);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.start(200);
			isRecording = true;
			recordingDuration = 0;
			if (recordingTimer) clearInterval(recordingTimer);
			recordingTimer = setInterval(() => {
				recordingDuration++;
			}, 1000);
		} catch (err) {
			console.error('Erreur accès micro:', err);
			alert(
				"Impossible d'accéder au microphone. Veuillez autoriser l'accès au micro dans votre navigateur."
			);
		}
	}

	export function stop(autoSend = false) {
		if (!isRecording || !mediaRecorder) return;
		if (recordingTimer) {
			clearInterval(recordingTimer);
			recordingTimer = null;
		}
		isRecording = false;

		const rec = mediaRecorder;
		rec.onstop = () => {
			if (audioStream) {
				audioStream.getTracks().forEach((track) => track.stop());
				audioStream = null;
			}
			const actualMime = rec.mimeType || getSupportedAudioMimeType() || 'audio/webm';
			const blob = new Blob(audioChunks, { type: actualMime });
			if (blob.size > 0) {
				const localUrl = URL.createObjectURL(blob);
				const ext = actualMime.includes('ogg')
					? 'ogg'
					: actualMime.includes('mp4') || actualMime.includes('aac')
						? 'm4a'
						: 'webm';
				const voiceFile = new File([blob], `vocal_${Date.now()}.${ext}`, { type: actualMime });
				onRecordingComplete(voiceFile, localUrl, autoSend);
			}
		};

		if (rec.state !== 'inactive') {
			rec.stop();
		}
	}

	export function cancel() {
		if (recordingTimer) {
			clearInterval(recordingTimer);
			recordingTimer = null;
		}
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.onstop = null;
			mediaRecorder.stop();
		}
		if (audioStream) {
			audioStream.getTracks().forEach((track) => track.stop());
			audioStream = null;
		}
		isRecording = false;
		recordingDuration = 0;
		audioChunks = [];
		onCancel?.();
	}

	export function toggle() {
		if (isRecording) {
			stop(false);
		} else {
			start();
		}
	}
</script>

{#if isRecording}
	<div class="voice-recording-strip">
		<div class="recording-pulse-container">
			<span class="recording-dot"></span>
			<span class="recording-timer">{formatAudioDuration(recordingDuration)}</span>
		</div>
		<div class="recording-waves" aria-hidden="true">
			<span class="r-bar r-bar-1"></span>
			<span class="r-bar r-bar-2"></span>
			<span class="r-bar r-bar-3"></span>
			<span class="r-bar r-bar-4"></span>
			<span class="r-bar r-bar-5"></span>
			<span class="r-bar r-bar-6"></span>
			<span class="r-bar r-bar-7"></span>
			<span class="r-bar r-bar-8"></span>
		</div>
		<div class="recording-strip-actions">
			<button
				type="button"
				class="btn-rec-cancel"
				onclick={cancel}
				title="Annuler le message vocal"
				aria-label="Annuler"
			>
				<Icon name="action.delete" size={16} />
			</button>
			<button
				type="button"
				class="btn-rec-stop"
				onclick={() => stop(false)}
				title="Arrêter et réécouter"
				aria-label="Arrêter et réécouter"
			>
				<Icon name="action.check" size={16} />
			</button>
			<button
				type="button"
				class="btn-rec-send"
				onclick={() => stop(true)}
				title="Envoyer directement"
				aria-label="Envoyer directement"
			>
				<Icon name="action.up" size={16} />
			</button>
		</div>
	</div>
{/if}

<style>
	.voice-recording-strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 16px;
		background: #fef2f2;
		border-bottom: 1px solid #fee2e2;
	}

	.recording-pulse-container {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		color: #ef4444;
		font-variant-numeric: tabular-nums;
		font-size: 0.9rem;
	}

	.recording-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ef4444;
		animation: pulse-dot 1.2s infinite;
	}

	@keyframes pulse-dot {
		0% {
			box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
		}
		70% {
			box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
		}
	}

	.recording-waves {
		display: flex;
		align-items: center;
		gap: 3px;
		height: 20px;
		flex: 1;
		max-width: 120px;
		justify-content: center;
	}

	.r-bar {
		width: 3px;
		height: 4px;
		background: #f87171;
		border-radius: 2px;
		animation: wave-bounce 1s infinite ease-in-out;
	}

	.r-bar-1 {
		animation-delay: 0.1s;
	}
	.r-bar-2 {
		animation-delay: 0.25s;
	}
	.r-bar-3 {
		animation-delay: 0.4s;
	}
	.r-bar-4 {
		animation-delay: 0.55s;
	}
	.r-bar-5 {
		animation-delay: 0.7s;
	}
	.r-bar-6 {
		animation-delay: 0.85s;
	}
	.r-bar-7 {
		animation-delay: 0.3s;
	}
	.r-bar-8 {
		animation-delay: 0.6s;
	}

	@keyframes wave-bounce {
		0%,
		100% {
			height: 4px;
		}
		50% {
			height: 18px;
		}
	}

	.recording-strip-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-rec-cancel,
	.btn-rec-stop {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 1px solid #fca5a5;
		background: #fff;
		color: #ef4444;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.15s;
		padding: 0;
	}
	.btn-rec-cancel:hover {
		background: #fee2e2;
	}

	.btn-rec-stop {
		border-color: #cbd5e1;
		color: #475569;
	}
	.btn-rec-stop:hover {
		background: #f1f5f9;
	}

	.btn-rec-send {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: none;
		background: #0ea5e9;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(14, 165, 233, 0.4);
		transition:
			transform 0.15s,
			background 0.15s;
		padding: 0;
	}
	.btn-rec-send:hover {
		transform: scale(1.05);
		background: #0284c7;
	}
</style>
