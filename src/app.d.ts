// src/app.d.ts
import type { auth } from '$lib/server/auth';

declare global {
	namespace App {
		interface Locals {
			user: typeof auth.$Infer.Session.user | null;
			session: typeof auth.$Infer.Session.session | null;
		}

		interface PageState {
			showBack?: boolean;
		}

		// interface Error {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
