export interface Content {
    contentId: string;
    filename: string;
    filetype: string;
    filesize: string;
    title: string;
    imageUrl?: string; // path inside S3
    albumId: string;
    albumName: string;
    createdAt: string;
    updatedAt: string;
    genres: string[];
    artistIds: string[];
}

export interface Rating {
    userId: string;
    contentId: string;
    rating: number; // 1-5 stars
    timestamp: string;
}

export interface ContentCard {
    contentId: string;
    title: string;
    imageUrl?: string;
}
