import React from "react";
import { CardBox, ListBox } from "./System";

interface EmojiProps {
  emoji: React.ReactNode;
  label?: string;
  onClick?: () => void;
  active?: boolean;
}

export const Emoji = ({ emoji, label, onClick, active }: EmojiProps) => {
  if (label) {
    return (
      <CardBox onClick={onClick} active={active} className="emoji-container">
        <ListBox>
          <div className="emoji-small">{emoji}</div>
          <div>{label}</div>
        </ListBox>
      </CardBox>
    );
  }
  return (
    <CardBox onClick={onClick} active={active} className="emoji-container">
      <div className="emoji-large">{emoji}</div>
    </CardBox>
  );
};
