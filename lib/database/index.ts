// Persistance : Dexie (db.ts), contrat DataRepository (repository.ts), implémentation Dexie,
// instantanés et migrations, seed, synchro fichier (file-sync.ts côté client,
// file-store.server.ts côté serveur). Pas de barrel : on importe le module précis,
// pour ne jamais embarquer du code serveur (fs) dans le bundle client.
export {};
