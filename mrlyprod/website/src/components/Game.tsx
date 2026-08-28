import { useEffect, type ReactNode } from "react";
import { ContainerBox, BorderBox, ListBox, LinkBox, InfoBox } from "./System";
import { useMusic } from "../hooks/useMusic";
import { getItem } from "../lib/browser/storage";
import { randomScaleNote, SCALES } from "../lib/audio/music";

export type GameState = "playing" | "gameover";

export interface GameProps {
  appId: string;
  gameState: GameState;
  gameOverEmoji?: string;
  gameOverLabel?: string;
  onReset: () => void;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  children: ReactNode;
}

export function Game({
  appId,
  gameState,
  gameOverEmoji = "💀",
  gameOverLabel = "game over",
  onReset,
  headerContent,
  footerContent,
  children,
}: GameProps) {
  const { playNote, initAudio } = useMusic();

  useEffect(() => {
    if (gameState === "gameover" && getItem("mrly_mute") !== "true") {
      initAudio().then(() => playNote(randomScaleNote(SCALES.major), 1.0, -1));
    }
  }, [gameState, playNote, initAudio]);

  // HEADER
  const header =
    gameState === "gameover" ? (
      <>
        {gameOverEmoji} {gameOverLabel}
      </>
    ) : (
      headerContent || <>mrly{appId}</>
    );

  // FOOTER
  const footer = gameState === "gameover" ? <LinkBox onClick={onReset}>retry</LinkBox> : footerContent;

  return (
    <ContainerBox>
      <BorderBox>
        <ListBox>
          <InfoBox>{header}</InfoBox>
          {children}
          {footer}
        </ListBox>
      </BorderBox>
    </ContainerBox>
  );
}
