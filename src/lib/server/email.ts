/**
 * @module EmailService
 * @description Service d'envoi d'e-mails pour l'instance auto-hébergée (SMTP via Nodemailer).
 *
 * Responsabilités :
 * - Gestion du transporteur SMTP paramétrable via variables d'environnement.
 * - Mode fallback pour le développement local : affichage visible dans le terminal si aucun SMTP n'est configuré.
 * - Rate-limiting mémoire strict par adresse e-mail pour prévenir les abus et le spamming SMTP.
 * - Génération de templates HTML & texte soignés et responsives pour la réinitialisation de mot de passe.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '$env/dynamic/private';

export interface SendResetPasswordEmailParams {
	to: string;
	name?: string;
	resetUrl: string;
}

// Cache du transporteur pour réutilisation
let cachedTransporter: Transporter | null = null;

/**
 * Registre de limitation de débit en mémoire (sliding window).
 * Empêche d'envoyer plus de N requêtes par adresse e-mail dans une fenêtre donnée.
 */
interface RateLimitEntry {
	count: number;
	firstRequest: number;
}
const rateLimits = new Map<string, RateLimitEntry>();

// Nettoyage régulier du cache de rate-limiting (toutes les 30 minutes)
setInterval(
	() => {
		const now = Date.now();
		for (const [key, entry] of rateLimits.entries()) {
			if (now - entry.firstRequest > 30 * 60 * 1000) {
				rateLimits.delete(key);
			}
		}
	},
	30 * 60 * 1000
).unref();

/**
 * Vérifie si le rate-limit pour un e-mail est respecté.
 * @param email Adresse e-mail à vérifier
 * @param maxAttempts Nombre maximum d'envois autorisés
 * @param windowMs Fenêtre de temps en millisecondes (défaut : 15 minutes)
 */
export function checkEmailRateLimit(
	email: string,
	maxAttempts = 3,
	windowMs = 15 * 60 * 1000
): boolean {
	const key = email.trim().toLowerCase();
	const now = Date.now();
	const entry = rateLimits.get(key);

	if (!entry || now - entry.firstRequest > windowMs) {
		rateLimits.set(key, { count: 1, firstRequest: now });
		return true;
	}

	if (entry.count >= maxAttempts) {
		return false;
	}

	entry.count++;
	return true;
}

/**
 * Réinitialise manuellement le compteur de rate limit (utile pour les tests unitaires).
 */
export function resetRateLimits(): void {
	rateLimits.clear();
}

/**
 * Indique si un serveur SMTP a été configuré via les variables d'environnement.
 */
export function isSmtpConfigured(): boolean {
	return Boolean(env.SMTP_HOST && env.SMTP_HOST.trim().length > 0);
}

/**
 * Instancie ou retourne le transporteur Nodemailer configuré.
 */
export function getMailTransporter(): Transporter | null {
	if (!isSmtpConfigured()) {
		return null;
	}

	if (cachedTransporter) {
		return cachedTransporter;
	}

	const port = env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587;
	const isSecure = env.SMTP_SECURE === 'true' || port === 465;

	cachedTransporter = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port,
		secure: isSecure,
		auth: env.SMTP_USER
			? {
					user: env.SMTP_USER,
					pass: env.SMTP_PASS || ''
				}
			: undefined
	});

	return cachedTransporter;
}

/**
 * Génère le modèle HTML et texte pour l'e-mail de réinitialisation de mot de passe.
 */
export function buildResetPasswordEmailTemplate(name: string | undefined, resetUrl: string) {
	const greeting = name ? `Bonjour ${name},` : 'Bonjour,';
	const appName = 'Réseau Social';

	const text = `${greeting}

Une demande de réinitialisation de mot de passe a été effectuée pour votre compte sur ${appName}.

Pour choisir un nouveau mot de passe, ouvrez le lien ci-dessous dans votre navigateur :
${resetUrl}

Ce lien est strictement confidentiel et reste valable pendant 15 minutes.
Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel ne sera pas modifié.

---
${appName}`;

	const html = `<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
	<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
		<tr>
			<td style="padding: 32px 28px; text-align: left;">
				<h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #09090b; letter-spacing: -0.02em;">
					Réinitialisation de mot de passe
				</h1>
				<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">
					${greeting}
				</p>
				<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">
					Une demande de réinitialisation de mot de passe a été effectuée pour votre compte. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
				</p>
				<table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
					<tr>
						<td align="center" style="border-radius: 8px; background-color: #18181b;">
							<a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
								Réinitialiser mon mot de passe
							</a>
						</td>
					</tr>
				</table>
				<p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #71717a;">
					Ce lien expire dans <strong>15 minutes</strong> et ne peut être utilisé qu'une seule fois.
				</p>
				<p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.5; color: #71717a;">
					Si le bouton ne s'affiche pas correctement, vous pouvez copier et coller ce lien dans votre navigateur :<br>
					<a href="${resetUrl}" style="color: #2563eb; word-break: break-all; text-decoration: underline;">${resetUrl}</a>
				</p>
				<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0 20px 0;">
				<p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa;">
					Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité. Votre mot de passe actuel demeure inchangé.
				</p>
			</td>
		</tr>
	</table>
</body>
</html>`;

	return { text, html };
}

/**
 * Envoie un e-mail de réinitialisation de mot de passe.
 * Si le serveur SMTP n'est pas configuré, le lien est imprimé dans le terminal (fallback dev).
 */
export async function sendPasswordResetEmail({
	to,
	name,
	resetUrl
}: SendResetPasswordEmailParams): Promise<boolean> {
	// 1. Contrôle du rate-limiting anti-spam / anti-brute-force
	if (!checkEmailRateLimit(to)) {
		console.warn(`[EMAIL RATE-LIMIT] Trop de demandes pour l'adresse ${to}. Envoi ignoré.`);
		// On retourne true pour ne pas faire fuiter d'information à un éventuel attaquant
		return true;
	}

	const { text, html } = buildResetPasswordEmailTemplate(name, resetUrl);
	const fromAddress = env.SMTP_FROM || 'Réseau Social <noreply@social.local>';

	// 2. Mode local / développement sans SMTP
	if (!isSmtpConfigured()) {
		console.log('\n' + '━'.repeat(72));
		console.log('📧 [EMAIL DEV / FALLBACK] Réinitialisation de mot de passe');
		console.log(`   Destinataire : ${to}`);
		console.log(`   Nom          : ${name || '(non renseigné)'}`);
		console.log(`   Lien direct  : ${resetUrl}`);
		console.log("   (Configurez SMTP_HOST dans votre .env pour activer l'envoi réel)");
		console.log('━'.repeat(72) + '\n');
		return true;
	}

	// 3. Mode production avec SMTP réel
	try {
		const transporter = getMailTransporter();
		if (!transporter) return false;

		await transporter.sendMail({
			from: fromAddress,
			to,
			subject: 'Réinitialisation de votre mot de passe',
			text,
			html
		});

		return true;
	} catch (err) {
		console.error("[EMAIL ERROR] Échec de l'envoi de l'e-mail de réinitialisation:", err);
		return false;
	}
}
