import happyLighthouseCoverEn from './happy-lighthouse/cover-en.jpg';
import happyLighthouseSpread1 from './happy-lighthouse/spread-1.jpg';
import happyLighthouseSpread2 from './happy-lighthouse/spread-2.jpg';
import happyLighthouseQr from './happy-lighthouse/junamalturo_QR.png';
import laPerditaOmbreloCover from './la-perdita-ombrelo-de-nirano/1.jpg';
import moonlitGardenCoverEn from './moonlit-garden/cover-en.jpg';
import stargazersJourneyCoverEn from './stargazers-journey/cover-en.jpg';

export const bookCovers: Record<string, string> = {
  'happy-lighthouse-en': happyLighthouseCoverEn,
  'happy-lighthouse-es': happyLighthouseCoverEn,
  'happy-lighthouse-bilingual': happyLighthouseCoverEn,
  'la-perdita-ombrelo-de-nirano-eo': laPerditaOmbreloCover,
  'la-perdita-ombrelo-de-nirano-ru': laPerditaOmbreloCover,
  'moonlit-garden-en': moonlitGardenCoverEn,
  'moonlit-garden-fr': moonlitGardenCoverEn,
  'stargazers-journey-en': stargazersJourneyCoverEn,
  'stargazers-journey-bilingual': stargazersJourneyCoverEn,
};

export const galleryImages: Record<string, string[]> = {
  'happy-lighthouse-en': [
    happyLighthouseSpread1,
    happyLighthouseSpread2,
    "https://m.media-amazon.com/images/I/71h0tJSsw7L._AC_SL1500_.jpg",
    happyLighthouseQr,
  ],
  'happy-lighthouse-es': [
    happyLighthouseSpread1,
    happyLighthouseSpread2,
  ],
  'happy-lighthouse-bilingual': [
    happyLighthouseSpread1,
    happyLighthouseSpread2,
  ],
};
