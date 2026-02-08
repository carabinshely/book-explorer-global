import theLostUmbrellaOfNiranEnCover from './the-lost-umbrella-of-niran-en/cover.jpg';
import theLostUmbrellaOfNiranCover from './the-lost-umbrella-of-niran/cover.jpg';
import theLostUmbrellaOfNiranEoCover from './the-lost-umbrella-of-niran-eo/cover.jpg';
import theLostUmbrellaOfNiranRuCover from './the-lost-umbrella-of-niran-ru/cover.jpg';
import theLostUmbrellaOfNiranEn0 from './the-lost-umbrella-of-niran-en/cover.jpg';
import theLostUmbrellaOfNiranEo0 from './the-lost-umbrella-of-niran-eo/cover.jpg';
import theLostUmbrellaOfNiranRu0 from './the-lost-umbrella-of-niran-ru/cover.jpg';

export const bookCovers: Record<string, string> = {
  'the-lost-umbrella-of-niran-en': theLostUmbrellaOfNiranEnCover,
  'the-lost-umbrella-of-niran-en-eo': theLostUmbrellaOfNiranCover,
  'the-lost-umbrella-of-niran-en-ru': theLostUmbrellaOfNiranCover,
  'the-lost-umbrella-of-niran-eo': theLostUmbrellaOfNiranEoCover,
  'the-lost-umbrella-of-niran-eo-ru': theLostUmbrellaOfNiranCover,
  'the-lost-umbrella-of-niran-ru': theLostUmbrellaOfNiranRuCover,
};

export const galleryImages: Record<string, string[]> = {
  'the-lost-umbrella-of-niran-en': [
    theLostUmbrellaOfNiranEn0,
  ],
  'the-lost-umbrella-of-niran-en-eo': [],
  'the-lost-umbrella-of-niran-en-ru': [],
  'the-lost-umbrella-of-niran-eo': [
    theLostUmbrellaOfNiranEo0,
  ],
  'the-lost-umbrella-of-niran-eo-ru': [],
  'the-lost-umbrella-of-niran-ru': [
    theLostUmbrellaOfNiranRu0,
  ],
};
