/**
 * Compte Google simulé (MVP hackathon) : le vrai flux OAuth 2.0 échangera
 * un code d'autorisation contre un jeton vérifié via l'API Google.
 * Ce jeton de démonstration est vérifié côté serveur : une valeur
 * inconnue est rejetée (401) sans créer de session.
 */
export const GOOGLE_DEMO_TOKEN = "demo-google-token";
export const GOOGLE_DEMO_EMAIL = "google.demo@guardsite.ai";
export const GOOGLE_DEMO_NAME = "Utilisateur Google";
