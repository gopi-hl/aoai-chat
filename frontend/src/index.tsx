import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import "./index.css";

import Layout from "./pages/layout/Layout";
import NoPage from "./pages/NoPage";
import Chat from "./pages/chat/Chat";
import { AppStateProvider } from "./state/AppProvider";
import styled, { createGlobalStyle } from 'styled-components';

initializeIcons();

const GlobalStyle = createGlobalStyle`
    #root {
        height: 100%;
        --main-color-dark-palette: #1a1a1a;
        --secondry-color-dark-palette: #373737;
        --blue-button-color: #3c95f4;
        --blue-active-color: #2070c6;
        --blue-gradient: linear-gradient(90deg, #3c95f4 65%, #3385dc 100%);
    }
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

const Background = styled.div`
    position: absolute;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    z-index: -1;

    &::before, &::after {
    content: '';
    position: absolute;
    inset: -170px auto auto -200px;
    width: clamp(30vw, 600px, 42vw);
    height: clamp(30vw, 600px, 42vw);
    border-radius: 50%;
    background: #1e6dbf;
    z-index: -1;
    }

    &::after {
    inset: auto -170px -200px auto;
    }

    @media (max-width: 820px) {
    &::before, &::after {
        width: 25rem;
        height: 25rem;
    }
    }
`;

export default function App() {
    return (
        <>
            <GlobalStyle />
            <Background />
            <AppStateProvider>
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Chat />} />
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
