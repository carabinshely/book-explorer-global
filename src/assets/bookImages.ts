import { bookCovers, galleryImages } from '@/assets/images';

export function getBookCover(skuId: string): string | undefined {
  return bookCovers[skuId];
}

export function getGalleryImages(skuId: string): string[] | undefined {
  return galleryImages[skuId];
}
