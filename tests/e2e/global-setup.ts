// tests/e2e/global-setup.ts
import { execSync } from 'child_process';
import postgres from 'postgres';
import path from 'path';
import dotenv from 'dotenv';

// 1. On charge le fichier .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function globalSetup() {
	console.log('🔄 Initialisation de la base de données de test...');

	const originalUrl = process.env.DATABASE_URL;
	if (!originalUrl) throw new Error("DATABASE_URL n'est pas défini dans le .env");

	const defaultDbUrl = originalUrl.replace('/social', '/postgres');
	const sqlDefault = postgres(defaultDbUrl, { onnotice: () => {} });

	try {
		// 2. On vérifie si la base de test existe, sinon on la crée
		const dbList = await sqlDefault`SELECT datname FROM pg_database WHERE datname = 'social_test'`;
		if (dbList.length === 0) {
			console.log('📦 Création de la base de données "social_test"...');
			await sqlDefault`CREATE DATABASE social_test`;
		}
	} finally {
		await sqlDefault.end();
	}

	// 3. On se connecte à la base de test "social_test" avec silence sur les notices
	const testDbUrl = originalUrl.replace('/social', '/social_test');
	const sqlTest = postgres(testDbUrl, { onnotice: () => {} });

	try {
		console.log('🧹 Nettoyage de "social_test"...');
		await sqlTest`DROP SCHEMA public CASCADE;`;
		await sqlTest`CREATE SCHEMA public;`;
		await sqlTest`GRANT ALL ON SCHEMA public TO public;`;
	} finally {
		await sqlTest.end();
	}

	// 4. On applique le schéma Drizzle silencieusement
	console.log('🏗️ Application du schéma Drizzle...');
	try {
		execSync('npx drizzle-kit push --force', {
			stdio: 'pipe',
			env: { ...process.env, DATABASE_URL: testDbUrl }
		});
		console.log('✅ Base de données de test prête !');
	} catch (error) {
		console.error(
			"Erreur lors de l'application du schéma Drizzle:",
			(error as { stderr?: Buffer }).stderr?.toString()
		);
		throw error;
	}
}

export default globalSetup;
