import * as React from "react";
import styled from "styled-components";
import { ButtonContainer } from "../common/ButtonContainer";
import {
  BookSearch24Regular,
  Chat24Regular,
  Cart24Regular,
  BookTemplate20Regular,
  BookInformation24Regular,
  MailList24Regular,
} from "@fluentui/react-icons";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

interface NavigationProps {}

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
  svg {
    color: #fff;
  }

  @media (max-width: 820px) {
    width: 100%;
    padding: 25px;
    flex-direction: row;
  }
`;

const Navigation: React.FC<{ onNavClicked: (value: string) => void }> = ({
  onNavClicked,
}) => {
  const [activeButton, setActiveButton] = React.useState<string>("Chat");
  useEffect(() => {
    const activatePdf = () => {
      handleButtonClick("pdf");
    };

    window.addEventListener("activatePdfButton", activatePdf);

    return () => {
      window.removeEventListener("activatePdfButton", activatePdf);
    };
  }, []);

  function handleButtonClick(value: string): void {
    setActiveButton(value);
    onNavClicked(value);
  }

  return (
    <Nav>
      <ButtonContainer active={activeButton === "pdf"}>
        <a onClick={() => handleButtonClick("pdf")}>
          <BookInformation24Regular />
        </a>
      </ButtonContainer>
      <ButtonContainer active={activeButton === "Chat"}>
        <a onClick={() => handleButtonClick("Chat")}>
          <Chat24Regular />
        </a>
      </ButtonContainer>
      <ButtonContainer>
        <a href="https://www.kickstarter.com/" target="_blank">
          <Cart24Regular />
        </a>
      </ButtonContainer>
      <ButtonContainer>
        <a href="https://devprinciples.co/" target="_blank">
          <MailList24Regular />
        </a>
      </ButtonContainer>
    </Nav>
  );
};

export default Navigation;
