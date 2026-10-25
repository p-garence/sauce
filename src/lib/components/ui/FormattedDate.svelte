<!--
  @component FormattedDate
  @domain ui
  @description Affichage d'une date relative ou absolue avec infobulle complète.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { formatRelativeDate, formatFullDate, formatDateISO } from '$lib/dates';

	interface Props {
		/** La date à formater (Date, ISO string, timestamp) */
		date: Date | string | number | null | undefined;
		/** Mode compact (ex: '2 h', '5 j', 'hier', '12 oct.') */
		compact?: boolean;
		/** Seuil en jours pour basculer vers une date absolue (par défaut 90 jours / ~3 mois) */
		thresholdDays?: number;
		/** Inclure l'heure dans la date absolue complète */
		includeTime?: boolean;
		/** Classes CSS additionnelles pour le tag <time> */
		class?: string;
		/** Actualiser automatiquement le texte relatif toutes les minutes côté client */
		autoUpdate?: boolean;
	}

	let {
		date,
		compact = false,
		thresholdDays = 90,
		includeTime = false,
		class: className = '',
		autoUpdate = true
	}: Props = $props();

	let now = $state(Date.now());

	onMount(() => {
		if (!autoUpdate || !date) return;
		const interval = setInterval(() => {
			now = Date.now();
		}, 60000);
		return () => clearInterval(interval);
	});

	let isoString = $derived(formatDateISO(date));
	let fullTooltip = $derived(formatFullDate(date, { withTime: true, withWeekday: true }));
	let formattedText = $derived(
		formatRelativeDate(date, {
			compact,
			thresholdDays,
			includeTimeForAbsolute: includeTime,
			now
		})
	);
</script>

{#if formattedText}
	<time datetime={isoString} title={fullTooltip} class="formatted-date {className}"
		>{formattedText}</time
	>
{/if}

<style>
	time {
		font-variant-numeric: tabular-nums;
	}
</style>
