export type Artist = {
    artistId: string;
    name: string;
    bio: string;
    genres: string[];
}

export type CreateArtistRequest = Omit<Artist, 'artistId'>