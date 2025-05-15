// index.jsx
import * as React from "react";
import { Popover } from "radix-ui";
import { StyledRoot } from "./styled";

const PopoverDemo = () => (
  <StyledRoot>
    <Popover.Trigger>More info</Popover.Trigger>
    <Popover.Portal>
      <Popover.Content>
        Some more info…
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  </StyledRoot>
);

export default PopoverDemo;
