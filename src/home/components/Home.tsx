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
        globalSignOut(TokenStorage.getAccessToken()!).then(() => navigate("/login"))
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

    return (
        <div style={{ padding: 24, color: "#e5e7eb" }}>
            <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => logout()}>Logout</button>
                <button onClick={() => createArtist()}>Create Artist</button>
                <button onClick={() => uploadContent()}>Upload Content</button>
                <button onClick={() => seeSubscriptions()}>My Subscriptions</button>
                <button onClick={() => discoverContent()}>Discover</button>
            </div>
        </div>
    );
};