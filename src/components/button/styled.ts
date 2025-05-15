import styled from "styled-components";

export const StyledButton = styled.button<{ $variant: "primary" | "secondary" }>`
  padding: 0.6rem 1.4rem;
  font-size: 0.95rem;
  font: inherit;
  border-radius: 6px;
  cursor: pointer;
  

  ${({ $variant }) =>
    $variant === "primary" 
      ? `
        background: #3b6edc;
        color: white;
        border: none;
      `
      : `
        background: #f2f2f2;
        color: black;
        border: 2px solid #444;
      `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;


