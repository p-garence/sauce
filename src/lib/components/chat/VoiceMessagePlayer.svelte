<!--
  @component VoiceMessagePlayer
  @domain chat
  @description Lecteur audio de message vocal avec forme d'onde interactive et vitesse de lecture.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		src: string;
		name?: string;
		isSent?: boolean;
	}

	let { src, name = 'Message vocal', isSent = false }: Props = $props();

	let audioElement = $state<HTMLAudioElement | null>(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let playbackRate = $state<1 | 1.5 | 2>(1);

	// Hauteurs statiques pré-générées pour la forme d'onde (waveform)
	const WAVE_BARS = [
		35, 60, 45, 80, 50, 90, 65, 40, 85, 100, 70, 45, 60, 75, 90, 50, 70, 85, 40, 60, 50, 75, 45, 30
	];

	function formatTime(sec: number): string {
		if (isNaN(sec) || !isFinite(sec) || sec < 0) return '0:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}

	function togglePlay(e: MouseEvent) {
		e.stopPropagation();
		if (!audioElement) return;

		if (isPlaying) {
			audioElement.pause();
		} else {
			// Met en pause les autres vocaux de la page
			window.dispatchEvent(
				new CustomEvent('app:pause-voice-messages', {
					detail: { except: audioElement }
				})
			);
			audioElement.play().catch((err) => {
				console.error('Erreur lecture audio:', err);
			});
		}
	}

	function toggleSpeed(e: MouseEvent) {
		e.stopPropagation();
		if (!audioElement) return;
		if (playbackRate === 1) playbackRate = 1.5;
		else if (playbackRate === 1.5) playbackRate = 2;
		else playbackRate = 1;
		audioElement.playbackRate = playbackRate;
	}

	function handleWaveformClick(e: MouseEvent) {
		e.stopPropagation();
		if (!audioElement || !duration) return;
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const ratio = Math.max(0, Math.min(1, clickX / rect.width));
		audioElement.currentTime = ratio * duration;
	}

	onMount(() => {
		const handleGlobalPause = (e: Event) => {
			const ce = e as CustomEvent<{ except?: HTMLAudioElement }>;
			if (ce.detail?.except !== audioElement && audioElement && isPlaying) {
				audioElement.pause();
			}
		};

		window.addEventListener('app:pause-voice-messages', handleGlobalPause);
		return () => {
			window.removeEventListener('app:pause-voice-messages', handleGlobalPause);
			if (audioElement) {
				audioElement.pause();
			}
		};
	});

	$effect(() => {
		if (src) {
			isPlaying = false;
			currentTime = 0;
			duration = 0;
		}
	});

	function updateDurationFromAudio() {
		if (
			audioElement &&
			audioElement.duration &&
			isFinite(audioElement.duration) &&
			audioElement.duration > 0
		) {
			duration = audioElement.duration;
		}
	}

	let progressPercent = $derived(
		duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
	);
	let displayedTime = $derived(
		isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)
	);
</script>

<div class="voice-player" class:is-sent={isSent}>
	<audio
		bind:this={audioElement}
		{src}
		preload="metadata"
		onplay={() => (isPlaying = true)}
		onpause={() => (isPlaying = false)}
		onended={() => {
			isPlaying = false;
			if (audioElement && currentTime > 0 && (!duration || !isFinite(duration))) {
				duration = currentTime;
			}
			currentTime = 0;
		}}
		ontimeupdate={() => {
			if (audioElement) {
				currentTime = audioElement.currentTime;
				if (
					(!duration || !isFinite(duration)) &&
					isFinite(audioElement.duration) &&
					audioElement.duration > 0
				) {
					duration = audioElement.duration;
				}
			}
		}}
		onloadedmetadata={updateDurationFromAudio}
		ondurationchange={updateDurationFromAudio}
	></audio>

	<!-- Bouton Play / Pause -->
	<button
		type="button"
		class="btn-play-pause"
		onclick={togglePlay}
		aria-label={isPlaying ? `Pause (${name})` : `Écouter (${name})`}
		title={isPlaying ? 'Mettre en pause' : 'Écouter'}
	>
		{#if isPlaying}
			<svg viewBox="0 0 24 24" class="play-icon" fill="currentColor">
				<rect x="6" y="4" width="4" height="16" rx="1"></rect>
				<rect x="14" y="4" width="4" height="16" rx="1"></rect>
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" class="play-icon play-triangle" fill="currentColor">
				<polygon points="5 3 19 12 5 21 5 3"></polygon>
			</svg>
		{/if}
	</button>

	<!-- Forme d'onde et informations -->
	<div class="voice-content">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="waveform-container" onclick={handleWaveformClick} title="Naviguer dans le vocal">
			<div class="waveform-bars">
				{#each WAVE_BARS as heightPercent, i (i)}
					{@const barProgress = ((i + 1) / WAVE_BARS.length) * 100}
					<span
						class="wave-bar"
						class:played={barProgress <= progressPercent}
						style="height: {heightPercent}%;"
					></span>
				{/each}
			</div>
			<div class="waveform-scrubber" style="left: {progressPercent}%;"></div>
		</div>

		<div class="voice-meta">
			<span class="voice-time">{displayedTime}</span>
			<button
				type="button"
				class="btn-speed"
				onclick={toggleSpeed}
				title="Modifier la vitesse de lecture"
			>
				{playbackRate}x
			</button>
		</div>
	</div>
</div>

<style>
	.voice-player {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 4px;
		min-width: 220px;
		max-width: 290px;
		user-select: none;
	}

	.btn-play-pause {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.25);
		color: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		transition:
			transform 0.15s ease,
			background-color 0.15s ease;
	}

	.voice-player:not(.is-sent) .btn-play-pause {
		background: #0ea5e9;
		color: #ffffff;
	}

	.btn-play-pause:hover {
		transform: scale(1.05);
	}

	.btn-play-pause:active {
		transform: scale(0.95);
	}

	.play-icon {
		width: 18px;
		height: 18px;
	}

	.play-triangle {
		margin-left: 2px;
	}

	.voice-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.waveform-container {
		position: relative;
		height: 24px;
		display: flex;
		align-items: center;
		cursor: pointer;
		padding: 2px 0;
	}

	.waveform-bars {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		height: 100%;
		gap: 2px;
	}

	.wave-bar {
		flex: 1;
		min-width: 2px;
		max-width: 4px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.4);
		transition:
			background-color 0.1s ease,
			height 0.1s ease;
	}

	.wave-bar.played {
		background: #ffffff;
	}

	.voice-player:not(.is-sent) .wave-bar {
		background: rgba(30, 41, 59, 0.25);
	}

	.voice-player:not(.is-sent) .wave-bar.played {
		background: #0ea5e9;
	}

	.waveform-scrubber {
		position: absolute;
		top: 50%;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
		transform: translate(-50%, -50%);
		opacity: 0;
		transition: opacity 0.15s ease;
		pointer-events: none;
	}

	.waveform-container:hover .waveform-scrubber {
		opacity: 1;
	}

	.voice-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.72rem;
		opacity: 0.85;
		font-variant-numeric: tabular-nums;
	}

	.voice-time {
		font-weight: 500;
	}

	.btn-speed {
		background: rgba(255, 255, 255, 0.2);
		border: none;
		border-radius: 10px;
		padding: 1px 6px;
		font-size: 0.68rem;
		font-weight: 600;
		color: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}

	.voice-player:not(.is-sent) .btn-speed {
		background: rgba(0, 0, 0, 0.08);
	}

	.btn-speed:hover {
		background: rgba(255, 255, 255, 0.35);
	}

	.voice-player:not(.is-sent) .btn-speed:hover {
		background: rgba(0, 0, 0, 0.15);
	}
</style>
