"use client";

import { Button } from "@/components/button";
import { HeaderWrapper, StyledHeader } from "./styled";
import PopoverDemo from "@/components/popover";
import useContext from "@/hooks/useContext";
import { StoreContext } from "@/providers/store";
import { useOptionalAuth } from "@/providers/auth";

export const Header = () => {
  const { userStore } = useContext(StoreContext);
  const auth = useOptionalAuth();

  return (
    <HeaderWrapper>
      <StyledHeader>About us</StyledHeader>
      <PopoverDemo />
      {auth && <Button onClick={auth.logout}>Log out</Button>}
      <p>{userStore}</p>
    </HeaderWrapper>
  );
};
