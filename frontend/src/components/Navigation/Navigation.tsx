import * as React from 'react';
import styled from 'styled-components';
import { ButtonContainer } from '../common/ButtonContainer';
import { BookSearch24Regular,Chat24Regular,Cart24Regular } from "@fluentui/react-icons";

interface NavigationProps {

}

const Nav = styled.nav`
    display: flex;
    width: 6.75em;
    gap: 20px;
    align-items: center;
    flex-direction: column;
    padding: 15vh 5px;
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

const Navigation: React.FC<NavigationProps> = ({ }) => {

    return (
        <Nav>
            <ButtonContainer >
                <a href="#">
                    <BookSearch24Regular />
                </a>
            </ButtonContainer>

            <ButtonContainer>
                <a href="#">
                    <Chat24Regular />
                </a>
            </ButtonContainer>

            <ButtonContainer>
                <a href='#'>
                    <Cart24Regular />
                </a>
            </ButtonContainer>

        </Nav>
    );
};

export default Navigation;
