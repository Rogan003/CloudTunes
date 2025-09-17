export interface UploadContentRequest {
    filename: string;
    filetype: string;
    filesize: number;
    title: string;
    imageUrl?: string;
    albumId?: string;
    albumName?: string;
    genres: string[];
    artistIds: string[];
}

export interface UploadContentResponse {
    contentId: string;
    filename: string;
    filetype: string;
    filesize: number;
    title: string;
    imageUrl?: string;
    albumId?: string;
    albumName?: string;
    genres: string[];
    artistIds: string[];
    createdAt: string;
    updatedAt: string;
}
