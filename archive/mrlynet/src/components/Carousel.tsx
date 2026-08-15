import React, { useState, type ReactNode } from "react";
import { ListBox, LinkBox, BorderBox } from "./System";
import { Controls } from "./Controls";

interface CarouselProps {
  children: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

export const Carousel = ({ children, onClose, closeLabel = "close", headerContent, footerContent }: CarouselProps) => {
  const [index, setIndex] = useState(0);
  const pages = React.Children.toArray(children);
  if (pages.length === 0) return null;
  const handleNext = () => setIndex((prev) => (prev + 1) % pages.length);
  const handlePrev = () => setIndex((prev) => (prev - 1 + pages.length) % pages.length);
  return (
    <BorderBox>
      <ListBox>
        {headerContent}
        {pages[index]}
        <Controls current={index + 1} total={pages.length} onPrev={handlePrev} onNext={handleNext} />
        {footerContent ? footerContent : onClose && <LinkBox onClick={onClose}>{closeLabel}</LinkBox>}
      </ListBox>
    </BorderBox>
  );
};
