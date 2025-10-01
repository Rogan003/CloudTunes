import {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {globalSignOut} from "../../users/services/login-service.ts";
import {TokenStorage} from "../../users/services/user-token-storage-service.ts";
import { AuthService } from "../../users/services/auth-service";

export const Home = () => {
    useEffect(() => {
        if (!TokenStorage.getAccessToken()) {
            navigate("/login")
        }
    }, [])

    const navigate = useNavigate()

    const logout = () => {
        globalSignOut(TokenStorage.getAccessToken()!)
        TokenStorage.clearTokens()
        navigate("/login")
    }

    const createArtist = () => {
        navigate("/create-artist")
    }

    const uploadContent = () => {
        navigate("/upload-content")
    }

    const seeSubscriptions = () => {
        navigate("/subscriptions")
    }

    const discoverContent = () => {
        navigate("/discover")
    }

    const isUser = AuthService.hasRole("user");
    const isAdmin = AuthService.hasRole("admin");

    return (
        <div style={{ padding: 24, color: "#e5e7eb" }}>
            <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => logout()}>Logout</button>
                {isAdmin && <button onClick={() => createArtist()}>Create Artist</button>}
                {isAdmin && <button onClick={() => uploadContent()}>Upload Content</button>}
                {isUser && <button onClick={() => seeSubscriptions()}>My Subscriptions</button>}
                {isUser && <button onClick={() => discoverContent()}>Discover</button>}
            </div>
        </div>
    );
};