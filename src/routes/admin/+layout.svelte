<!--
  @component AdminLayout
  @domain admin
  @description Layout principal de la console d'administration avec barre latérale sur grand écran et menu burger rétractable sur mobile.
  @responsibilities
    - Fournir une navigation hiérarchique claire par groupes logiques sans émojis
    - Gérer l'état du menu mobile (ouverture/fermeture du tiroir latéral)
    - Offrir des raccourcis vers l'application principale et les informations de session admin
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		data: {
			sessionUser: {
				name: string;
				username: string;
				image?: string | null;
			};
		};
	}

	let { children, data }: Props = $props();

	let isMobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	type AdminPath =
		| '/admin'
		| '/admin/users'
		| '/admin/permissions'
		| '/admin/posts'
		| '/admin/stories'
		| '/admin/system-post'
		| '/admin/appearance'
		| '/admin/storage'
		| '/admin/backups'
		| '/admin/actions'
		| '/admin/docs';

	interface AdminNavItem {
		href: AdminPath;
		label: string;
		exact?: boolean;
	}

	interface AdminNavGroup {
		title: string;
		items: AdminNavItem[];
	}

	const navGroups: AdminNavGroup[] = [
		{
			title: 'Vue générale',
			items: [
				{
					href: '/admin',
					label: 'Tableau de bord',
					exact: true
				}
			]
		},
		{
			title: 'Gestion et accès',
			items: [
				{
					href: '/admin/users',
					label: 'Utilisateurs'
				},
				{
					href: '/admin/permissions',
					label: 'Permissions et rôles'
				}
			]
		},
		{
			title: 'Contenu et diffusion',
			items: [
				{
					href: '/admin/posts',
					label: 'Publications'
				},
				{
					href: '/admin/stories',
					label: 'Stories'
				},
				{
					href: '/admin/system-post',
					label: 'Post système'
				}
			]
		},
		{
			title: 'Personnalisation',
			items: [
				{
					href: '/admin/appearance',
					label: 'Apparence et packs'
				}
			]
		},
		{
			title: 'Système et maintenance',
			items: [
				{
					href: '/admin/storage',
					label: 'Stockage et médias'
				},
				{
					href: '/admin/backups',
					label: 'Sauvegardes'
				},
				{
					href: '/admin/actions',
					label: 'Actions globales'
				}
			]
		},
		{
			title: 'Aide',
			items: [
				{
					href: '/admin/docs',
					label: 'Documentation'
				}
			]
		}
	];

	function isItemActive(itemHref: string, exact?: boolean): boolean {
		const currentPath = page.url.pathname;
		if (exact) {
			return currentPath === itemHref || currentPath === `${itemHref}/`;
		}
		return currentPath.startsWith(itemHref);
	}
</script>

<div class="admin-shell">
	<!-- BARRE SUPÉRIEURE MOBILE -->
	<header class="mobile-topbar">
		<button
			type="button"
			class="burger-btn"
			onclick={toggleMobileMenu}
			aria-label="Ouvrir le menu d'administration"
			aria-expanded={isMobileMenuOpen}
		>
			<svg
				viewBox="0 0 24 24"
				width="22"
				height="22"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<line x1="3" y1="6" x2="21" y2="6"></line>
				<line x1="3" y1="12" x2="21" y2="12"></line>
				<line x1="3" y1="18" x2="21" y2="18"></line>
			</svg>
		</button>
		<div class="mobile-brand">
			<span class="brand-title">Administration</span>
		</div>
		<a href={resolve('/flux')} class="mobile-exit-btn" title="Retour au réseau"> Quitter </a>
	</header>

	<!-- OVERLAY SOMBRE SUR MOBILE -->
	{#if isMobileMenuOpen}
		<div
			class="mobile-backdrop"
			onclick={closeMobileMenu}
			onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
			tabindex="-1"
			role="presentation"
		></div>
	{/if}

	<!-- BARRE LATÉRALE (SIDEBAR) -->
	<aside class="admin-sidebar" class:open={isMobileMenuOpen}>
		<div class="sidebar-header">
			<div class="brand-badge-group">
				<span class="brand-name">Console Admin</span>
				<span class="badge-role">Instance</span>
			</div>
			<button
				type="button"
				class="sidebar-close-btn"
				onclick={closeMobileMenu}
				aria-label="Fermer le menu"
			>
				✕
			</button>
		</div>

		<nav class="sidebar-nav">
			{#each navGroups as group (group.title)}
				<div class="nav-group">
					<h3 class="nav-group-title">{group.title}</h3>
					<ul class="nav-list">
						{#each group.items as item (item.href)}
							<li>
								<a
									href={resolve(item.href)}
									class="nav-link"
									class:active={isItemActive(item.href, item.exact)}
									onclick={closeMobileMenu}
								>
									<span>{item.label}</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<a href={resolve('/flux')} class="btn-return-app">
				<svg
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="19" y1="12" x2="5" y2="12"></line>
					<polyline points="12 19 5 12 12 5"></polyline>
				</svg>
				<span>Retour au réseau</span>
			</a>

			<div class="admin-user-profile">
				<div class="user-avatar-mini">
					{#if data.sessionUser.image}
						<img src={data.sessionUser.image} alt={data.sessionUser.name} />
					{:else}
						<span>{(data.sessionUser.name || 'A').charAt(0).toUpperCase()}</span>
					{/if}
				</div>
				<div class="user-meta">
					<span class="user-name">{data.sessionUser.name}</span>
					<span class="user-handle">@{data.sessionUser.username}</span>
				</div>
			</div>
		</div>
	</aside>

	<!-- CONTENU PRINCIPAL -->
	<main class="admin-main">
		<div class="main-content-wrapper">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.admin-shell {
		display: flex;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		background: #f8fafc;
		color: #0f172a;
		font-family: inherit;
	}

	/* TOPBAR MOBILE */
	.mobile-topbar {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 56px;
		background: #ffffff;
		border-bottom: 1px solid #e2e8f0;
		padding: 0 16px;
		align-items: center;
		justify-content: space-between;
		z-index: 40;
	}

	.burger-btn {
		background: none;
		border: none;
		color: #1e293b;
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 6px;
		border-radius: 6px;
	}
	.burger-btn:hover {
		background: #f1f5f9;
	}

	.brand-title {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: #0f172a;
	}

	.mobile-exit-btn {
		font-size: 0.85rem;
		font-weight: 600;
		color: #64748b;
		text-decoration: none;
		padding: 6px 10px;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
	}

	.mobile-backdrop {
		display: none;
	}

	/* SIDEBAR DESKTOP */
	.admin-sidebar {
		width: 260px;
		flex-shrink: 0;
		background: #ffffff;
		border-right: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		height: 100%;
		z-index: 50;
	}

	.sidebar-header {
		padding: 20px 20px 16px 20px;
		border-bottom: 1px solid #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.brand-badge-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.brand-name {
		font-size: 1.05rem;
		font-weight: 700;
		color: #0f172a;
		letter-spacing: -0.01em;
	}

	.badge-role {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 4px;
		background: #f1f5f9;
		color: #475569;
	}

	.sidebar-close-btn {
		display: none;
		background: none;
		border: none;
		font-size: 1.1rem;
		cursor: pointer;
		color: #64748b;
	}

	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding: 16px 12px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.nav-group-title {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #94a3b8;
		padding: 0 10px;
		margin: 0 0 6px 0;
	}

	.nav-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 10px;
		border-radius: 6px;
		color: #475569;
		text-decoration: none;
		font-size: 0.88rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.nav-link:hover {
		background: #f8fafc;
		color: #0f172a;
	}

	.nav-link.active {
		background: #eff6ff;
		color: #1d4ed8;
		font-weight: 600;
	}

	.sidebar-footer {
		padding: 16px;
		border-top: 1px solid #f1f5f9;
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: #fafafa;
	}

	.btn-return-app {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		color: #475569;
		text-decoration: none;
		padding: 8px 10px;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		transition: all 0.15s ease;
	}

	.btn-return-app:hover {
		background: #f8fafc;
		color: #0f172a;
		border-color: #cbd5e1;
	}

	.admin-user-profile {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 0;
	}

	.user-avatar-mini {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #e2e8f0;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: bold;
		color: #475569;
		flex-shrink: 0;
	}

	.user-avatar-mini img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-meta {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.user-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #0f172a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-handle {
		font-size: 0.75rem;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* CONTENU PRINCIPAL */
	.admin-main {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.main-content-wrapper {
		padding: 28px 32px;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
	}

	/* RESPONSIVE MOBILE */
	@media (max-width: 768px) {
		.admin-shell {
			height: auto;
			min-height: 100vh;
			overflow: visible;
		}

		.mobile-topbar {
			display: flex;
		}

		.admin-main {
			height: auto;
			overflow: visible;
			padding-top: 56px;
		}

		.main-content-wrapper {
			padding: 16px 12px;
		}

		.admin-sidebar {
			position: fixed;
			top: 0;
			bottom: 0;
			left: 0;
			width: 280px;
			max-width: 85vw;
			transform: translateX(-100%);
			transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
			box-shadow: none;
			height: 100%;
		}

		.admin-sidebar.open {
			transform: translateX(0);
			box-shadow:
				0 20px 25px -5px rgb(0 0 0 / 0.1),
				0 8px 10px -6px rgb(0 0 0 / 0.1);
		}

		.sidebar-close-btn {
			display: block;
		}

		.mobile-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(15, 23, 42, 0.4);
			backdrop-filter: blur(2px);
			z-index: 45;
		}
	}
</style>
