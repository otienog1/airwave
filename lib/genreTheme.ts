/**
 * Single source of truth for genre accent colors.
 * Consumed by station cards, the player, detail pages, and (later)
 * dynamic artwork generation. Do not duplicate these values in components.
 */

export interface GenreTheme {
    /** Primary accent color for the genre */
    accent: string;
    /** Low-opacity glow used for backgrounds/box-shadows */
    glow: string;
    /** Gradient pair for hero/artwork backdrops */
    gradient: [string, string];
}

const theme = (accent: string, gradientEnd: string): GenreTheme => ({
    accent,
    glow: `${accent}1a`, // 10% opacity hex suffix
    gradient: [accent, gradientEnd],
});

export const GENRE_THEMES: Record<string, GenreTheme> = {
    Pop:          theme('#ec4899', '#f97316'),
    Soul:         theme('#f59e0b', '#ef4444'),
    'Hip Hop':    theme('#7c3aed', '#ec4899'),
    Urban:        theme('#4f46e5', '#06b6d4'),
    Contemporary: theme('#059669', '#84cc16'),
    Talk:         theme('#3b82f6', '#8b5cf6'),
    News:         theme('#1d4ed8', '#0ea5e9'),
    Dance:        theme('#0891b2', '#8b5cf6'),
};

export const DEFAULT_GENRE_THEME: GenreTheme = theme('#6366f1', '#8b5cf6');

export function getGenreTheme(genre: string | null | undefined): GenreTheme {
    return (genre ? GENRE_THEMES[genre] : undefined) ?? DEFAULT_GENRE_THEME;
}
