import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { GridBox, CardBox } from "../../components/System.js";
import { Game, type GameState } from "../../components/Game";
import { MrlyTile } from "../../components/MrlyTile";
import { GRID_TOTAL, GRID_COLS, generateCards, isMatch, type CardItem } from "./logic";

// SUBCOMPONENT

function MemoryCard({
  card,
  index,
  isFlipped,
  isVisible,
  mode,
  onClick,
}: {
  card: CardItem;
  index: number;
  isFlipped: boolean;
  isVisible: boolean;
  mode: boolean;
  onClick: (index: number) => void;
}) {
  const bg = mode ? "black" : "white";

  if (!isVisible) {
    return <div style={{ width: "100%", aspectRatio: "1/1" }} />;
  }

  if (isFlipped) {
    return (
      <CardBox onClick={() => onClick(index)} style={{ backgroundColor: bg, cursor: "pointer" }}>
        <MrlyTile design={card.design} number={card.number} color={card.color} />
      </CardBox>
    );
  }

  return (
    <CardBox onClick={() => onClick(index)} style={{ backgroundColor: bg, cursor: "pointer" }}>
      &nbsp;
    </CardBox>
  );
}

// COMPONENT

export function MrlyMemory() {
  const { mode } = useTheme();
  const [gameState, setGameState] = useState<GameState>("playing");
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLevelsPassed] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [totalPairs, setTotalPairs] = useState(0);

  const generateRound = useCallback((shouldFlash: boolean = true) => {
    setCards(generateCards());
    setFlippedIndices([]);
    setIsProcessing(false);
    if (shouldFlash) {
      setIsFlashing(true);
    }
  }, []);

  useEffect(() => {
    generateRound(true);
  }, [generateRound]);

  const resetGame = useCallback(() => {
    setLevelsPassed(0);
    setTotalPairs(0);
    setFlippedIndices([]);
    setIsProcessing(false);
    generateRound(true);
    setGameState("playing");
  }, [generateRound]);

  const handleCardClick = (index: number) => {
    if (isFlashing) {
      setIsFlashing(false);
      return;
    }
    if (gameState !== "playing" || cards[index].isMatched || flippedIndices.includes(index)) {
      return;
    }
    if (isProcessing) return;
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    if (newFlipped.length === 2) {
      setIsProcessing(true);
      const [idx1, idx2] = newFlipped;
      const card1 = cards[idx1];
      const card2 = cards[idx2];
      if (isMatch(card1, card2)) {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isMatched: true } : c)));
          setTotalPairs((p) => p + 1);
          setFlippedIndices([]);
          setIsProcessing(false);
          setCards((currentCards) => {
            const allPairsMatched = currentCards.filter((c) => !c.isMatched).length <= 1;
            if (allPairsMatched) {
              setLevelsPassed((l) => l + 1);
              setTimeout(() => generateRound(true), 500);
            }
            return currentCards;
          });
        }, 500);
      } else {
        setTimeout(() => setGameState("gameover"), 800);
      }
    }
  };

  const headerContent = isFlashing ? "look!" : `🍐 ${totalPairs}`;

  return (
    <Game
      appId="memory"
      gameState={gameState}
      gameOverEmoji="💀"
      gameOverLabel="mismatch!"
      onReset={resetGame}
      headerContent={headerContent}
    >
      <GridBox cols={GRID_COLS}>
        {cards.length === 0
          ? Array.from({ length: GRID_TOTAL }, (_, i) => (
              <CardBox key={i} style={{ backgroundColor: mode ? "black" : "white" }}>
                &nbsp;
              </CardBox>
            ))
          : cards.map((card, idx) => (
              <MemoryCard
                key={idx}
                index={idx}
                card={card}
                isFlipped={isFlashing || flippedIndices.includes(idx)}
                isVisible={!card.isMatched}
                mode={mode}
                onClick={handleCardClick}
              />
            ))}
      </GridBox>
    </Game>
  );
}
