import type { Artist } from "./artist-model";

export type CreateArtistRequest = Omit<Artist, 'artistId'>