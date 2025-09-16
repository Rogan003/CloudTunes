export type Genre = { id: string; name: string; imageUrl: string };
export type Artist = { id: string; name: string; imageUrl: string; genreIds: string[] };
export type Album = { id: string; name: string; imageUrl: string; genreId: string; artistId: string };
export type Song = { id: string; name: string; imageUrl: string; artistId: string; albumId: string };

// Prefilled demo data
export const genres: Genre[] = [
  { id: "g1", name: "Pop", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=800&auto=format&fit=crop" },
  { id: "g2", name: "Rock", imageUrl: "https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?q=80&w=800&auto=format&fit=crop" },
  { id: "g3", name: "Hip-Hop", imageUrl: "https://images.unsplash.com/photo-1598387993441-a364f854c3e3?q=80&w=800&auto=format&fit=crop" },
  { id: "g4", name: "Jazz", imageUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop" },
  { id: "g5", name: "Electronic", imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800&auto=format&fit=crop" },
  { id: "g6", name: "Classical", imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop" },
];

export const artists: Artist[] = [
  { id: "a1", name: "Neon Dreams", imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop", genreIds: ["g1", "g5"] },
  { id: "a2", name: "Stone River", imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800&auto=format&fit=crop", genreIds: ["g2"] },
  { id: "a3", name: "Urban Poet", imageUrl: "https://images.unsplash.com/photo-1524749292158-7540c2494485?q=80&w=800&auto=format&fit=crop", genreIds: ["g3"] },
  { id: "a4", name: "Blue Note Trio", imageUrl: "https://images.unsplash.com/photo-1461783436728-0a9217714695?q=80&w=800&auto=format&fit=crop", genreIds: ["g4"] },
  { id: "a5", name: "Symphonic Light", imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=800&auto=format&fit=crop", genreIds: ["g6"] },
];

export const albums: Album[] = [
  { id: "al1", name: "Midnight City", imageUrl: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=800&auto=format&fit=crop", genreId: "g5", artistId: "a1" },
  { id: "al2", name: "River Stones", imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop", genreId: "g2", artistId: "a2" },
  { id: "al3", name: "Poetry in Motion", imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800&auto=format&fit=crop", genreId: "g3", artistId: "a3" },
  { id: "al4", name: "Blue Hours", imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop", genreId: "g4", artistId: "a4" },
  { id: "al5", name: "Light Symphony", imageUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop", genreId: "g6", artistId: "a5" },
  { id: "al6", name: "Pop Parade", imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop", genreId: "g1", artistId: "a1" },
];

const sampleCovers = [
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800&auto=format&fit=crop",
];

export const songs: Song[] = Array.from({ length: 60 }, (_, i) => {
  const album = albums[i % albums.length];
  return {
    id: `s${i + 1}`,
    name: `Song ${i + 1}`,
    imageUrl: sampleCovers[i % sampleCovers.length],
    albumId: album.id,
    artistId: album.artistId,
  };
});
