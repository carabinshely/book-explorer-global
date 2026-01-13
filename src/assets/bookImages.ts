// Book cover images
import happyLighthouseCoverEn from '@/assets/images/happy-lighthouse/cover-en.jpg';
import moonlitGardenCoverEn from '@/assets/images/moonlit-garden/cover-en.jpg';
import stargazersJourneyCoverEn from '@/assets/images/stargazers-journey/cover-en.jpg';

// Map SKU IDs to their cover images
export const bookCovers: Record<string, string> = {
  'happy-lighthouse-en': happyLighthouseCoverEn,
  'happy-lighthouse-es': happyLighthouseCoverEn, // Same cover for Spanish
  'happy-lighthouse-bilingual': happyLighthouseCoverEn, // Same cover for bilingual
  'moonlit-garden-en': moonlitGardenCoverEn,
  'moonlit-garden-fr': moonlitGardenCoverEn, // Same cover for French
  'stargazers-journey-en': stargazersJourneyCoverEn,
  'stargazers-journey-bilingual': stargazersJourneyCoverEn, // Same cover for bilingual
};

export function getBookCover(skuId: string): string | undefined {
  return bookCovers[skuId];
}
