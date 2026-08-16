import { useState, useEffect, useCallback } from "react";
import { MRLY_DESIGNS, MRLY_NUMBERS } from "../../mrly";
import { getUniqueColorNames } from "../../lib/colors.js";
import { GridBox, LinkBox, CardBox } from "../../components/System.js";
import { Game, type GameState } from "../../components/Game";
import { MrlyTile, type TileStyle } from "../../components/MrlyTile";

// TYPES

interface QuizState extends TileStyle {
  options: string[];
  correctOption: string;
}

// HELPERS

function getRandomItem() {
  const design = MRLY_DESIGNS[Math.floor(Math.random() * MRLY_DESIGNS.length)];
  const number = MRLY_NUMBERS[Math.floor(Math.random() * MRLY_NUMBERS.length)];
  return { design, number, name: `${design} ${number}` };
}

// COMPONENT

export function MrlyQuiz() {
  const [gameState, setGameState] = useState<GameState>("playing");
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [score, setScore] = useState(0);

  const generateRound = useCallback(() => {
    const target = getRandomItem();
    const [color] = getUniqueColorNames(1);
    const optionsSet = new Set<string>();
    optionsSet.add(target.name);
    while (optionsSet.size < 3) {
      const distractor = getRandomItem();
      optionsSet.add(distractor.name);
    }
    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);
    setQuizState({
      design: target.design,
      number: target.number,
      color,
      options,
      correctOption: target.name,
    });
  }, []);

  useEffect(() => {
    generateRound();
  }, [generateRound]);

  const resetGame = useCallback(() => {
    setScore(0);
    generateRound();
    setGameState("playing");
  }, [generateRound]);

  const handleOptionClick = (option: string) => {
    if (gameState !== "playing" || !quizState) return;
    if (option === quizState.correctOption) {
      setScore((s) => s + 1);
      generateRound();
    } else {
      setGameState("gameover");
    }
  };

  const footerContent = quizState ? (
    <GridBox cols={3}>
      {quizState.options.map((opt, i) => (
        <LinkBox key={i} onClick={() => handleOptionClick(opt)} disabled={gameState !== "playing"}>
          {opt}
        </LinkBox>
      ))}
    </GridBox>
  ) : null;

  const headerContent = <>{score}</>;

  return (
    <Game
      appId="quiz"
      gameState={gameState}
      gameOverEmoji="💀"
      gameOverLabel="wrong answer!"
      onReset={resetGame}
      headerContent={headerContent}
      footerContent={footerContent}
    >
      {quizState ? (
        <CardBox style={{ width: "100%" }}>
          <MrlyTile design={quizState.design} number={quizState.number} color={quizState.color} />
        </CardBox>
      ) : (
        <CardBox style={{ width: "100%" }}>&nbsp;</CardBox>
      )}
    </Game>
  );
}
