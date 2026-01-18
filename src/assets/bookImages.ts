import { bookCovers } from '@/assets/images';

export function getBookCover(skuId: string): string | undefined {
  return bookCovers[skuId];
}
