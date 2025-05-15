"use client";

import { Button } from "@/components/Button";
import { HeaderWrapper, StyledHeader } from "./styled";
import PopoverDemo from "@/components/popover";
import useContext from "@/hooks/useContext";
import { StoreContext } from "@/providers/store";
import { useAuth } from "@/providers/auth";

export const Header = () => {
  const { userStore } = useContext(StoreContext);
  const { logout } = useAuth();

  return (
    <HeaderWrapper>
      <StyledHeader>About us</StyledHeader>
      <PopoverDemo />
      <Button onClick={logout}>Log out</Button>
      <p>{userStore}</p>
    </HeaderWrapper>
  );
};
