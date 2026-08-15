import { useState, useEffect, useCallback } from "react";
import { MRLY_DESIGNS, MRLY_NUMBERS } from "../../mrly";
import { getUniqueColorNames } from "../../lib/colors.js";
import { GridBox, CardBox } from "../../components/System.js";
import { Game, type GameState } from "../../components/Game";
import { MrlyTile, type TileStyle } from "../../components/MrlyTile";

// TYPES

interface GameItem extends TileStyle {
  isTarget: boolean;
}

// COMPONENT

export function MrlyCaptcha() {
  const [gameState, setGameState] = useState<GameState>("playing");
  const [items, setItems] = useState<GameItem[]>([]);
  const [target, setTarget] = useState<GameItem | null>(null);

  const generateRound = useCallback(() => {
    const combinations = [];
    for (const design of MRLY_DESIGNS) {
      for (const number of MRLY_NUMBERS) {
        combinations.push({ design, number });
      }
    }
    combinations.sort(() => Math.random() - 0.5);
    const roundItems = combinations.slice(0, 9);
    const colorNames = getUniqueColorNames(9);
    const newItems: GameItem[] = roundItems.map((item, index) => {
      const isTarget = index === 0;
      return {
        design: item.design,
        number: item.number,
        color: colorNames[index] || "red",
        isTarget,
      };
    });
    const targetItem = newItems[0];
    setTarget(targetItem);
    setItems(newItems.sort(() => Math.random() - 0.5));
  }, []);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const resetGame = useCallback(() => {
    generateRound();
    setGameState("playing");
  }, [generateRound]);

  const handleCardClick = (item: GameItem) => {
    if (gameState !== "playing") return;
    if (item.isTarget) {
      generateRound();
    } else {
      setGameState("gameover");
    }
  };

  const headerContent = target ? `${target.design} ${target.number}` : "...";

  return (
    <Game
      appId="captcha"
      gameState={gameState}
      gameOverEmoji="💀"
      gameOverLabel="wrong tile!"
      onReset={resetGame}
      headerContent={headerContent}
    >
      <GridBox cols={3}>
        {items.length === 0
          ? Array.from({ length: 9 }, (_, i) => <CardBox key={i}>&nbsp;</CardBox>)
          : items.map((item, idx) => (
              <CardBox
                key={idx}
                onClick={() => handleCardClick(item)}
                style={{ cursor: gameState === "playing" ? "pointer" : "default" }}
              >
                <MrlyTile design={item.design} number={item.number} color={item.color} />
              </CardBox>
            ))}
      </GridBox>
    </Game>
  );
}
