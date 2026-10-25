<!--
  @component VideoPlayer
  @domain post
  @description Lecteur vidéo personnalisé avec contrôle du son et lecture automatique au scroll.
-->
<!-- src/lib/components/VideoPlayer.svelte -->
<script lang="ts">
	import type { PostData } from '$lib/types';

	// Svelte 5 : récupération des props
	let { post }: { post: PostData } = $props();

	let videoMedia = $derived(post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : null);
	let videoUrl = $derived(videoMedia?.content || '');
	let videoPoster = $derived(
		videoMedia?.poster ||
			(videoUrl ? videoUrl.replace(/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i, '_poster.webp$2') : '')
	);

	// Svelte 5 : déclaration des états
	let videoElement: HTMLVideoElement | undefined = $state();
	let isVisible = $state(false);
	let isPlaying = $state(false);

	// Svelte 5 : effet pour l'IntersectionObserver (remplace onMount)
	$effect(() => {
		if (!videoElement) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					isVisible = entry.isIntersecting;

					if (isVisible) {
						// La vidéo est visible, on essaie de la lancer
						videoElement
							?.play()
							.then(() => {
								isPlaying = true;
							})
							.catch((e) => {
								console.warn('Autoplay bloqué par le navigateur', e);
							});
					} else {
						// La vidéo sort de l'écran, on la met en pause
						videoElement?.pause();
						isPlaying = false;
					}
				});
			},
			{ threshold: 0.6 } // 60% de la vidéo doit être visible pour déclencher
		);

		observer.observe(videoElement);

		// Nettoyage lors de la destruction du composant
		return () => observer.disconnect();
	});

	function togglePlay() {
		if (!videoElement) return;
		if (isPlaying) {
			videoElement.pause();
			isPlaying = false;
		} else {
			videoElement.play();
			isPlaying = true;
		}
	}
</script>

<!-- Le conteneur prend toute la place du parent -->
<div class="video-container" onclick={togglePlay} aria-hidden="true">
	<!-- 
		muted est obligatoire pour l'autoplay sur les navigateurs modernes.
		preload="metadata" économise la data si la vidéo n'est pas encore visible.
	-->
	<video
		bind:this={videoElement}
		src={videoUrl}
		poster={videoPoster || undefined}
		loop
		muted
		playsinline
		preload={isVisible ? 'auto' : 'metadata'}
	></video>

	<!-- Interface superposée -->
	<div class="overlay">
		<div class="info">
			<h3>@{post.author.username}</h3>
			<p>{post.content}</p>
		</div>
	</div>
</div>

<style>
	.video-container {
		position: relative;
		width: 100%;
		height: 100vh; /* Prend toute la hauteur de l'écran */
		background-color: black;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
	}

	video {
		width: 100%;
		height: 100%;
		object-fit: cover; /* Recadre la vidéo pour remplir l'écran (façon TikTok) */
	}

	.overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		padding: 20px;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
		color: white;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		box-sizing: border-box;
	}

	.info h3 {
		margin: 0 0 5px 0;
		font-size: 1.1rem;
		font-weight: bold;
	}

	.info p {
		margin: 0;
		font-size: 0.9rem;
	}
</style>
