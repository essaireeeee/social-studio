/**
 * Emojis pertinents par catégorie (section 10.5). Le moteur classe d'abord ceux que le
 * profil de style du mode utilise le plus, puis complète avec cette table.
 */
export const EMOJI_BY_CATEGORY: Readonly<Record<string, readonly string[]>> = {
  live_result: ["🏆", "💥", "👊", "🔥"],
  live_ko: ["💥", "🔥", "👊", "⚡"],
  live_sub: ["🐍", "🔒", "🔥"],
  live_decision: ["⚖️", "🏆", "👊"],
  live_walkout: ["🚶", "🔥", "👀"],
  live_crowd: ["🔥", "🙌", "📣"],
  live_faceoff: ["👀", "🔥", "⚔️"],
  live_champion: ["🥇", "🏆", "👑", "🔥"],
  live_defense: ["🛡️", "🏆", "👑"],
  live_defeat: ["🙏", "👊"],
  live_reaction: ["🎤", "🗣️"],
  live_moment: ["🎬", "🔥", "⚡"],
  daily_fight_announce: ["📢", "🔥", "🥊"],
  daily_fighter_intro: ["🥊", "👤", "🔥"],
  daily_fight_card: ["🃏", "🥊", "📢"],
  daily_main_event: ["👑", "🔥", "🥊"],
  daily_faceoff: ["⚔️", "👀", "🔥"],
  daily_sport_news: ["📈", "📰"],
  daily_retro: ["🎞️", "⏪"],
  daily_ticketing: ["🎟️", "🎫", "🔥"],
  daily_countdown: ["⏳", "🔥"],
  daily_event_announce: ["📍", "📢", "🔥"],
  daily_fight_week: ["🔥", "🥊"],
  daily_program: ["📆", "🕒"],
  daily_last_seats: ["🎫", "⏳"],
  media_press: ["📰"],
  media_interview: ["🎙️"],
  media_tv: ["📺"],
  media_radio: ["📻"],
  media_podcast: ["🎧"],
  media_youtube: ["▶️"],
  media_portrait: ["👤"],
  media_fighter_news: ["📡"],
  comm_partner: ["🤝"],
  comm_news: ["🏢", "📢"],
  comm_statement: ["📣"],
  comm_thanks: ["🙏"],
  comm_institutional: ["📣", "🏆"],
};

/** Plafond d'emojis propre à une catégorie (communiqué sobre, défaite respectueuse). */
export const EMOJI_CAP_BY_CATEGORY: Readonly<Record<string, number>> = {
  comm_statement: 0,
  live_defeat: 1,
};

/**
 * Emojis classés pour une catégorie : ceux du profil qui sont pertinents, dans l'ordre
 * de fréquence du profil, puis le reste de la table.
 */
export function rankEmojis(categoryId: string, profileTop: readonly string[] = []): string[] {
  const relevant = EMOJI_BY_CATEGORY[categoryId] ?? [];
  const fromProfile = profileTop.filter((emoji) => relevant.includes(emoji));
  return [...new Set([...fromProfile, ...relevant])];
}
