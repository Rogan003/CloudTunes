import { useState, type ChangeEvent, type FormEvent } from "react";
import { uploadContent } from "../service/upload-content-service.ts";

export const UploadContent = () => {
    const [form, setForm] = useState({
        filename: "",
        filetype: "",
        filesize: "",
        title: "",
        imageUrl: "",
        albumId: "",
        albumName: "",
        genres: "",
        artistIds: "",
    });

    const [submitted, setSubmitted] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);

        try {
            const result = await uploadContent({
                filename: form.filename,
                filetype: form.filetype,
                filesize: parseInt(form.filesize, 10),
                title: form.title,
                imageUrl: form.imageUrl || undefined,
                albumId: form.albumId || undefined,
                albumName: form.albumName || undefined,
                genres: form.genres.split(",").map((g) => g.trim()).filter(Boolean),
                artistIds: form.artistIds.split(",").map((a) => a.trim()).filter(Boolean),
            });
            setMessage("✅ Upload succeeded: " + JSON.stringify(result));
        } catch (err: any) {
            setMessage("❌ Upload failed: " + err.message);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2>Upload Content</h2>
            <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 12 }}>
                <input placeholder="Filename" name="filename" value={form.filename} onChange={onChange} />
                <input placeholder="Filetype" name="filetype" value={form.filetype} onChange={onChange} />
                <input placeholder="Filesize" name="filesize" value={form.filesize} onChange={onChange} />
                <input placeholder="Title" name="title" value={form.title} onChange={onChange} />
                <input placeholder="Image URL" name="imageUrl" value={form.imageUrl} onChange={onChange} />
                <input placeholder="Album ID" name="albumId" value={form.albumId} onChange={onChange} />
                <input placeholder="Album Name" name="albumName" value={form.albumName} onChange={onChange} />
                <input placeholder="Genres (comma separated)" name="genres" value={form.genres} onChange={onChange} />
                <input placeholder="Artist IDs (comma separated)" name="artistIds" value={form.artistIds} onChange={onChange} />

                <button type="submit">Upload</button>
            </form>

            {submitted && message && <pre>{message}</pre>}
        </div>
    );
};
