import { getUniqueColorNames } from "../../lib/colors.js";
import { MRLY_DESIGNS, MRLY_NUMBERS } from "../../mrly";
import type { TileStyle } from "../../components/MrlyTile";

// CONFIG

export const NUM_PAIRS = 4;
export const GRID_TOTAL = NUM_PAIRS * 2 + 1;
export const GRID_COLS = 3;

// TYPES

export interface CardItem extends TileStyle {
  id: number;
  isMatched: boolean;
}

// HELPERS

export function generateCards(): CardItem[] {
  const combinations = [];
  for (const design of MRLY_DESIGNS) {
    for (const number of MRLY_NUMBERS) {
      combinations.push({ design, number });
    }
  }
  combinations.sort(() => Math.random() - 0.5);
  const selected = combinations.slice(0, NUM_PAIRS + 1);
  const colorNames = getUniqueColorNames(NUM_PAIRS + 1);
  const roundCards: CardItem[] = [];
  // PAIRS
  for (let i = 0; i < NUM_PAIRS; i++) {
    const item = selected[i];
    const color = colorNames[i] || "red";
    roundCards.push({ id: i * 2, design: item.design, number: item.number, color, isMatched: false });
    roundCards.push({ id: i * 2 + 1, design: item.design, number: item.number, color, isMatched: false });
  }
  // ODD TILE
  const odd = selected[NUM_PAIRS];
  const oddColor = colorNames[NUM_PAIRS] || "red";
  roundCards.push({ id: NUM_PAIRS * 2, design: odd.design, number: odd.number, color: oddColor, isMatched: false });
  return roundCards.sort(() => Math.random() - 0.5);
}

export function isMatch(card1: CardItem, card2: CardItem): boolean {
  return card1.design === card2.design && card1.number === card2.number && card1.color === card2.color;
}
