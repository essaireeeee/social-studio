import { connection } from "next/server";
import { reply } from "@/lib/ai/http";
import { aiStatus } from "@/lib/ai/service";

/**
 * État des fournisseurs lu dans l'environnement du serveur (clé présente ou non, modèle),
 * sans jamais renvoyer de clé. Lu à chaque requête : `.env.local` peut changer.
 */
export async function GET(): Promise<Response> {
  await connection();
  return reply(aiStatus());
}
