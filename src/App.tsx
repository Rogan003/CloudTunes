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

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/confirm-registration" element={<ConfirmRegistration />} />
                <Route path="/create-artist" element={<CreateArtistForm />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/artists/:artistId" element={<ArtistSongsPage />} />
                <Route path="/albums/:albumId" element={<AlbumSongsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/upload-content" element={<UploadContent/>} />
                <Route path="/songs/:contentId" element={<ContentView/>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App