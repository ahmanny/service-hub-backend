
export const RANKING_CONFIG = {
    MIN_REVIEWS_THRESHOLD: 10, // 'm' - Start with 10 for a new platform
    GLOBAL_DEFAULT_RATING: 4.0, // 'C' - The average we assume for a "new" provider
};

export function calculateWeightedRating(
    v: number, // providerReviewCount
    R: number, // providerAverage
    C: number = RANKING_CONFIG.GLOBAL_DEFAULT_RATING,
    m: number = RANKING_CONFIG.MIN_REVIEWS_THRESHOLD
): number {
    if (v === 0) return C;

    const weighted = (v / (v + m)) * R + (m / (v + m)) * C;
    return parseFloat(weighted.toFixed(2));
}