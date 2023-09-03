import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import "./index.css";

import Layout from "./pages/layout/Layout";
import NoPage from "./pages/NoPage";
import Chat from "./pages/chat/Chat";
import { AppStateProvider } from "./state/AppProvider";
import { createGlobalStyle } from 'styled-components';

initializeIcons();

const GlobalStyle = createGlobalStyle`
    :root {
        height: 100%;
        --main-color-dark-palette: #1a1a1a;
        --secondry-color-dark-palette: #373737;
        --blue-button-color: #3c95f4;
        --blue-active-color: #2070c6;
        --blue-gradient: linear-gradient(90deg, #3c95f4 65%, #3385dc 100%);
    }

    * {
    margin: 0;
    padding: 0;
    outline: transparent;
    text-decoration: none;
    box-sizing: border-box;
    font-family: 'Poppins', sans-serif;
    }
`;
export default function App() {
    return (
        <>
            <GlobalStyle />
            <AppStateProvider>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route path="/" element={<Chat />} />
                            <Route path="*" element={<NoPage />} />
                        </Route>
                    </Routes>
                </HashRouter>
            </AppStateProvider>
        </>
    );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
