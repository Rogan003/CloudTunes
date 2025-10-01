import './App.css'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {Login} from "./users/components/Login.tsx";
import {Register} from "./users/components/Register.tsx";
import {Home} from "./home/components/Home.tsx";
import {ConfirmRegistration} from "./users/components/ConfirmRegistration.tsx";
import { CreateArtistForm } from './artists/components/CreateArtistForm.tsx';
import { DiscoverPage } from "./music/components/DiscoverPage";
import { ArtistSongsPage } from "./music/components/ArtistSongsPage";
import { AlbumSongsPage } from "./music/components/AlbumSongsPage";
import { SubscriptionsPage } from "./music/components/SubscriptionsPage";
import {UploadContent} from "./contents/components/UploadContent.tsx";
import { ContentView } from './contents/components/ContentViewPage.tsx';
import { RequireAuth, RequireGuest, RequireRole } from './shared/guards';
import {UploadSongsAlbum} from "./contents/components/UploadSongsAlbum.tsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
                <Route path="/register" element={<RequireGuest><Register /></RequireGuest>} />
                <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
                <Route path="/confirm-registration" element={<RequireGuest><ConfirmRegistration /></RequireGuest>} />
                <Route path="/create-artist" element={<RequireRole role="admin"><CreateArtistForm /></RequireRole>} />
                <Route path="/discover" element={<RequireRole role="user"><DiscoverPage /></RequireRole>} />
                <Route path="/artists/:artistId" element={<RequireRole role="user"><ArtistSongsPage /></RequireRole>} />
                <Route path="/albums/:albumId" element={<RequireRole role="user"><AlbumSongsPage /></RequireRole>} />
                <Route path="/subscriptions" element={<RequireRole role="user"><SubscriptionsPage /></RequireRole>} />
                <Route path="/upload-content" element={<RequireRole role="admin"><UploadContent/></RequireRole>} />
                <Route path="/upload-songs-album" element={<RequireRole role="admin"><UploadSongsAlbum/></RequireRole>} />
                <Route path="/songs/:contentId" element={<RequireAuth><ContentView/></RequireAuth>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App