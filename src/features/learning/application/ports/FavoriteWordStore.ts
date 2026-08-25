import type { FavoriteWord } from '../../domain/FavoriteWord';

export interface FavoriteWordStore {
  load(): Promise<unknown>;
  save(favorites: readonly FavoriteWord[]): Promise<void>;
}
