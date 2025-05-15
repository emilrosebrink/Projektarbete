"use client";

import React from "react";
import { StyledButton } from "./styled";

interface IButton {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export const Button = ({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
}: IButton) => {
  return (
    <StyledButton $variant={variant} onClick={onClick} className={className} disabled={disabled}>
      {children}
    </StyledButton>
  );
};
