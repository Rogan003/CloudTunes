import './App.css'
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {Login} from "./users/components/Login.tsx";
import {Register} from "./users/components/Register.tsx";
import {Home} from "./home/components/Home.tsx";
import {ConfirmRegistration} from "./users/components/ConfirmRegistration.tsx";
import { CreateArtistForm } from './users/components/CreateArtistForm.tsx';

function App() {
  return (
      <BrowserRouter>
          <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/confirm-registration" element={<ConfirmRegistration />} />
              <Route path="/create-artist" element={<CreateArtistForm />} />
          </Routes>
      </BrowserRouter>
  )
}

export default App
