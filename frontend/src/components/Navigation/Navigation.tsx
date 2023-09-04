import * as React from 'react';
import styled from 'styled-components';
import { ButtonContainer } from '../common/ButtonContainer';
import { BookSearch24Regular, Chat24Regular, Cart24Regular, BookTemplate20Regular, BookInformation24Regular, MailList24Regular } from "@fluentui/react-icons";
import { Link } from 'react-router-dom';

interface NavigationProps {

}

const Nav = styled.nav`
    display: flex;
    width: 6.75em;
    align-items: center;
    flex-direction: column;
    padding: calc(50vh - 180px) 5px;
    background: #1a1a1a;
    
    & div {
        justify-content: center;
        width: 100%;
    }
    svg{
        color: #fff;
    }

    @media (max-width: 820px) {
        width: 100%;
        padding: 25px;
        flex-direction: row;
    }
`;

const Navigation: React.FC<{ onNavClicked: (value: string) => void }> = ({ onNavClicked }) => {

    function handlePdfClick(arg: string): void {
        onNavClicked(arg);
    }

    return (
        <Nav>
            <ButtonContainer >
                <a onClick={() => handlePdfClick('pdf')}>
                    <BookInformation24Regular />
                </a>
            </ButtonContainer>
            <ButtonContainer>
                <a onClick={() => handlePdfClick('Chat')}>
                    <Chat24Regular />
                </a>
            </ButtonContainer>
            <ButtonContainer>
                <a href='https://www.kickstarter.com/' target='_blank'>
                    <Cart24Regular />
                </a>
            </ButtonContainer>
            <ButtonContainer>
                <a href='https://devprinciples.co/' target='_blank'>
                    <MailList24Regular />
                </a>
            </ButtonContainer>
        </Nav>
    );
};

export default Navigation;
