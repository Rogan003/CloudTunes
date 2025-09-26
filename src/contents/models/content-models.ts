export interface Rating {
    userId: string;
    contentId: string;
    rating: number; // 1-5 stars
    timestamp: string;
}
export interface Content {
    contentId: string;
    filename: string;
    filetype: string;
    filesize: string;
    title: string;
    imageUrl?: string;
    albumId: string;
    albumName: string;
    createdAt: string;
    updatedAt: string;
    genres: string[];
    artistIds: string[];
}
