import './App.css'
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {Login} from "./users/components/Login.tsx";
import {Register} from "./users/components/Register.tsx";

function App() {
  return (
      <BrowserRouter>
          <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
          </Routes>
      </BrowserRouter>
  )
}

export default App
