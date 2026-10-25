// migrate.js
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrations() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set');
    }

    console.log('⏳ Exécution des migrations de la base de données...');
    
    // max: 1 garantit qu'on utilise une seule connexion pour cette tâche courte
    const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(migrationClient);

    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('✅ Migrations terminées avec succès !');

        // Rétrocompatibilité automatique (Production) :
        // Si la colonne updated_at a été initialisée à now() lors de la migration,
        // on aligne updated_at = created_at pour tous les messages historiques non modifiés.
        await migrationClient`
            UPDATE messages 
            SET updated_at = created_at 
            WHERE content != '[deleted]' 
              AND updated_at > created_at + interval '1 second'
              AND created_at < '2026-10-21 15:00:00Z';
        `.catch((err) => {
            console.warn('Note: rétrocompatibilité messages ignorée:', err?.message);
        });
    } catch (error) {
        console.error('❌ Échec des migrations :', error);
        process.exit(1); // Fait planter le conteneur si la base ne peut pas s'initialiser
    } finally {
        await migrationClient.end();
    }
}

runMigrations();