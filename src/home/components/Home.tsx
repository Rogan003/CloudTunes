import {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {globalSignOut} from "../../users/services/login-service.ts";
import {TokenStorage} from "../../users/services/user-token-storage-service.ts";

export const Home = () => {
    useEffect(() => {
        if (!TokenStorage.getAccessToken()) {
            navigate("/login")
        }
    }, [])

    const navigate = useNavigate()

    const logout = () => {
        globalSignOut(TokenStorage.getAccessToken()!)
        navigate("/login")
    }

    const createArtist = () => {
        navigate("/create-artist")
    }

    return (
        <div>
            <button onClick={() => logout()}>Logout</button>
            <button onClick={() => createArtist()}>Create Artist</button>
        </div>
        
    );
};