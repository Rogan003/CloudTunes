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
    genres: string[];
    artistIds: string[];
    createdAt: string;
    updatedAt: string;
    audioS3Key: string;
}

export interface GetContentResponse {
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
    fileUrl: string;
}
