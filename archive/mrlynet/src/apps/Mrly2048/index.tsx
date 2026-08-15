import { useState, useEffect, useCallback, useRef } from "react";
import { GridBox, CardBox } from "../../components/System";
import { Game, type GameState } from "../../components/Game";
import { Keypad } from "../../components/Keypad";
import { MrlyIcon } from "../../components/MrlyIcon";
import { GRID_SIZE, spawnTile, moveGrid, checkGameOver, type Grid, type Direction } from "./logic";

// COMPONENT

export function Mrly2048() {
  const nextId = useRef(1);
  const getNextId = useCallback(() => nextId.current++, []);

  const [grid, setGrid] = useState<Grid>(
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null))
  );
  const [gameState, setGameState] = useState<GameState>("playing");

  const prepareGame = useCallback(() => {
    let newGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));
    newGrid = spawnTile(newGrid, getNextId);
    newGrid = spawnTile(newGrid, getNextId);
    setGrid(newGrid);
  }, [getNextId]);

  useEffect(() => {
    prepareGame();
  }, [prepareGame]);

  const resetGame = useCallback(() => {
    prepareGame();
    setGameState("playing");
  }, [prepareGame]);

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameState !== "playing") return;
      const result = moveGrid(grid, direction, getNextId);
      if (result.changed) {
        let newGrid = result.grid;
        newGrid = spawnTile(newGrid, getNextId);
        setGrid(newGrid);
        if (checkGameOver(newGrid)) {
          setGameState("gameover");
        }
      }
    },
    [grid, gameState, getNextId]
  );

  const footerContent = <Keypad onDirection={handleMove} disabled={gameState !== "playing"} />;

  return (
    <Game appId="2048" gameState={gameState} onReset={resetGame} footerContent={footerContent}>
      <GridBox cols={GRID_SIZE}>
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <CardBox key={`${r}-${c}`}>
              {cell && <MrlyIcon text={String(cell.val)} scramble={cell.isNew || cell.isMerged} />}
            </CardBox>
          ))
        )}
      </GridBox>
    </Game>
  );
}
