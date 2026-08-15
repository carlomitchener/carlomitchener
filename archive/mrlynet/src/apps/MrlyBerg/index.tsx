import { useMemo, useState } from "react";
import { BorderBox, CardBox, GridBox, InfoBox, LinkBox, ListBox } from "../../components/System";
import { TilePicker, type TilePickerValue } from "../../components/TilePicker";
import { POOL } from "../../lib/colors";
import { useTheme } from "../../contexts/ThemeContext";
import { buildMask } from "./mask";
import { Waves } from "./Waves";
import { Billiards } from "./Billiards";
import { Lasers } from "./Lasers";

// CONSTANTS

type Mode = "waves" | "billiards" | "lasers";
const MODES: Mode[] = ["waves", "billiards", "lasers"];
const MODE_LABELS: Record<Mode, string> = {
  waves: "waves",
  billiards: "billiards",
  lasers: "lasers",
};
const PADDING_OPTIONS = [0, 4, 8, 16, 24, 32, 48];
const SUBPIXEL_OPTIONS = [1, 2, 4, 8, 16, 32];
const WAVE_SPEED_OPTIONS = [0.05, 0.1, 0.2, 0.3, 0.4, 0.45];
const WAVE_DAMP_OPTIONS = [0, 0.001, 0.003, 0.008, 0.02];
const WAVE_FREQ_OPTIONS = [0.3, 0.6, 1.0, 1.6, 2.4, 4.0];
const WAVE_SIGMA_OPTIONS = [1.0, 1.5, 2.5, 4.0, 6.0];
const WAVE_AMP_OPTIONS = [0.4, 0.8, 1.5, 3.0];
const WAVE_GAIN_OPTIONS = [1, 2, 4, 8, 16];
const WAVE_REFLECT_OPTIONS = [0, 0.15, 0.35, 0.6, 0.85, 1];
const BILL_SPEED_OPTIONS = [0.5, 1, 2, 4];
const BILL_TRAIL_OPTIONS = [0.02, 0.05, 0.1, 0.2, 0.4, 1];
const BILL_SIZE_OPTIONS = [1, 1.5, 2.5, 4];
const BILL_COUNT_OPTIONS = [1, 2, 4, 8, 16, 32, 64, 128];
const LASER_RAYS_OPTIONS = [1, 4, 16, 32, 64, 128];
const LASER_SPREAD_OPTIONS = [0, Math.PI / 8, Math.PI / 2, Math.PI, Math.PI * 2];
const LASER_SPREAD_LABELS = ["none", "narrow", "wide", "half", "full"];
const LASER_BOUNCES_OPTIONS = [1, 4, 16, 64, 256];
const LASER_OMEGA_OPTIONS = [0, 0.1, 0.3, 0.8, 2.0];

// APP

export function MrlyBerg() {
  const { mode: dark } = useTheme();
  const [mode, setMode] = useState<Mode>("waves");
  const [tilePick, setTilePick] = useState<TilePickerValue>({ design: "carpet", number: 5, level: 2 });
  const [paddingIdx, setPaddingIdx] = useState(2);
  const [subpixelIdx, setSubpixelIdx] = useState(1);
  const [accentIdx, setAccentIdx] = useState(() => Math.floor(Math.random() * POOL.length));
  const [paused, setPaused] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [waveSpeedIdx, setWaveSpeedIdx] = useState(2);
  const [waveDampIdx, setWaveDampIdx] = useState(1);
  const [waveFreqIdx, setWaveFreqIdx] = useState(2);
  const [waveSigmaIdx, setWaveSigmaIdx] = useState(1);
  const [waveAmpIdx, setWaveAmpIdx] = useState(1);
  const [waveGainIdx, setWaveGainIdx] = useState(2);
  const [waveReflectIdx, setWaveReflectIdx] = useState(WAVE_REFLECT_OPTIONS.length - 1);
  const [billSpeedIdx, setBillSpeedIdx] = useState(1);
  const [billTrailIdx, setBillTrailIdx] = useState(2);
  const [billSizeIdx, setBillSizeIdx] = useState(1);
  const [billCountIdx, setBillCountIdx] = useState(4);
  const [laserRaysIdx, setLaserRaysIdx] = useState(3);
  const [laserSpreadIdx, setLaserSpreadIdx] = useState(4);
  const [laserBouncesIdx, setLaserBouncesIdx] = useState(2);
  const [laserOmegaIdx, setLaserOmegaIdx] = useState(2);

  const padding = PADDING_OPTIONS[paddingIdx];
  const subpixel = SUBPIXEL_OPTIONS[subpixelIdx];
  const mask = useMemo(
    () => buildMask(tilePick.design, tilePick.number, tilePick.level, padding, subpixel, tilePick.invert === true),
    [tilePick, padding, subpixel]
  );
  const accent = POOL[accentIdx];

  const cycle = (len: number, idx: number, set: (i: number) => void) => () => set((idx + 1) % len);
  const reset = () => setEpoch((v) => v + 1);
  const voidBg = dark ? "rgb(0,0,0)" : "rgb(255,255,255)";

  return (
    <ListBox>
      {}
      <BorderBox>
        <CardBox style={{ backgroundColor: voidBg, overflow: "hidden" }}>
          {mode === "waves" && (
            <Waves
              mask={mask}
              accent={accent}
              dark={dark}
              paused={paused}
              damping={WAVE_DAMP_OPTIONS[waveDampIdx]}
              speed={WAVE_SPEED_OPTIONS[waveSpeedIdx]}
              reflect={WAVE_REFLECT_OPTIONS[waveReflectIdx]}
              sourceFreq={WAVE_FREQ_OPTIONS[waveFreqIdx]}
              sourceSigma={WAVE_SIGMA_OPTIONS[waveSigmaIdx]}
              sourceAmp={WAVE_AMP_OPTIONS[waveAmpIdx]}
              gain={WAVE_GAIN_OPTIONS[waveGainIdx]}
              epoch={epoch}
            />
          )}
          {mode === "billiards" && (
            <Billiards
              mask={mask}
              accent={accent}
              dark={dark}
              paused={paused}
              speed={BILL_SPEED_OPTIONS[billSpeedIdx]}
              trail={BILL_TRAIL_OPTIONS[billTrailIdx]}
              size={BILL_SIZE_OPTIONS[billSizeIdx]}
              count={BILL_COUNT_OPTIONS[billCountIdx]}
              epoch={epoch}
            />
          )}
          {mode === "lasers" && (
            <Lasers
              mask={mask}
              accent={accent}
              dark={dark}
              paused={paused}
              rays={LASER_RAYS_OPTIONS[laserRaysIdx]}
              spread={LASER_SPREAD_OPTIONS[laserSpreadIdx]}
              bounces={LASER_BOUNCES_OPTIONS[laserBouncesIdx]}
              omega={LASER_OMEGA_OPTIONS[laserOmegaIdx]}
              epoch={epoch}
            />
          )}
        </CardBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={3}>
          {MODES.map((m) => (
            <LinkBox key={m} active={m === mode} onClick={() => setMode(m)}>
              mode: {MODE_LABELS[m]}
            </LinkBox>
          ))}
        </GridBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={2}>
          <LinkBox onClick={() => setPaused((v) => !v)} active={paused}>
            play: {paused ? "off" : "on"}
          </LinkBox>
          <LinkBox onClick={reset}>reset</LinkBox>
        </GridBox>
      </BorderBox>

      {}
      <BorderBox>
        <ListBox>
          <TilePicker value={tilePick} onPick={setTilePick} label="tile" />
          <GridBox cols={2}>
            <LinkBox onClick={cycle(PADDING_OPTIONS.length, paddingIdx, setPaddingIdx)}>
              pad: {padding}
            </LinkBox>
            <LinkBox onClick={cycle(SUBPIXEL_OPTIONS.length, subpixelIdx, setSubpixelIdx)}>
              sub: {subpixel}x
            </LinkBox>
          </GridBox>
          <InfoBox>
            grid: {mask.width}x{mask.height}
          </InfoBox>
        </ListBox>
      </BorderBox>

      {}
      {mode === "waves" && (
        <BorderBox>
          <ListBox>
            <GridBox cols={2}>
              <LinkBox onClick={cycle(WAVE_SPEED_OPTIONS.length, waveSpeedIdx, setWaveSpeedIdx)}>
                speed: {WAVE_SPEED_OPTIONS[waveSpeedIdx]}
              </LinkBox>
              <LinkBox onClick={cycle(WAVE_DAMP_OPTIONS.length, waveDampIdx, setWaveDampIdx)}>
                damp: {WAVE_DAMP_OPTIONS[waveDampIdx]}
              </LinkBox>
            </GridBox>
            <GridBox cols={2}>
              <LinkBox onClick={cycle(WAVE_FREQ_OPTIONS.length, waveFreqIdx, setWaveFreqIdx)}>
                freq: {WAVE_FREQ_OPTIONS[waveFreqIdx]}
              </LinkBox>
              <LinkBox onClick={cycle(WAVE_SIGMA_OPTIONS.length, waveSigmaIdx, setWaveSigmaIdx)}>
                sigma: {WAVE_SIGMA_OPTIONS[waveSigmaIdx]}
              </LinkBox>
            </GridBox>
            <GridBox cols={2}>
              <LinkBox onClick={cycle(WAVE_AMP_OPTIONS.length, waveAmpIdx, setWaveAmpIdx)}>
                amp: {WAVE_AMP_OPTIONS[waveAmpIdx]}
              </LinkBox>
              <LinkBox onClick={cycle(WAVE_GAIN_OPTIONS.length, waveGainIdx, setWaveGainIdx)}>
                gain: {WAVE_GAIN_OPTIONS[waveGainIdx]}x
              </LinkBox>
            </GridBox>
            <LinkBox onClick={cycle(WAVE_REFLECT_OPTIONS.length, waveReflectIdx, setWaveReflectIdx)}>
              reflect: {WAVE_REFLECT_OPTIONS[waveReflectIdx]}
            </LinkBox>
          </ListBox>
        </BorderBox>
      )}
      {mode === "billiards" && (
        <BorderBox>
          <ListBox>
            <GridBox cols={3}>
              <LinkBox onClick={cycle(BILL_SPEED_OPTIONS.length, billSpeedIdx, setBillSpeedIdx)}>
                speed: {BILL_SPEED_OPTIONS[billSpeedIdx]}
              </LinkBox>
              <LinkBox onClick={cycle(BILL_TRAIL_OPTIONS.length, billTrailIdx, setBillTrailIdx)}>
                trail: {BILL_TRAIL_OPTIONS[billTrailIdx]}
              </LinkBox>
              <LinkBox onClick={cycle(BILL_SIZE_OPTIONS.length, billSizeIdx, setBillSizeIdx)}>
                size: {BILL_SIZE_OPTIONS[billSizeIdx]}
              </LinkBox>
            </GridBox>
            <LinkBox onClick={cycle(BILL_COUNT_OPTIONS.length, billCountIdx, setBillCountIdx)}>
              count: {BILL_COUNT_OPTIONS[billCountIdx]}
            </LinkBox>
          </ListBox>
        </BorderBox>
      )}
      {mode === "lasers" && (
        <BorderBox>
          <ListBox>
            <GridBox cols={2}>
              <LinkBox onClick={cycle(LASER_RAYS_OPTIONS.length, laserRaysIdx, setLaserRaysIdx)}>
                rays: {LASER_RAYS_OPTIONS[laserRaysIdx]}
              </LinkBox>
              <LinkBox onClick={cycle(LASER_SPREAD_OPTIONS.length, laserSpreadIdx, setLaserSpreadIdx)}>
                spread: {LASER_SPREAD_LABELS[laserSpreadIdx]}
              </LinkBox>
            </GridBox>
            <GridBox cols={2}>
              <LinkBox onClick={cycle(LASER_BOUNCES_OPTIONS.length, laserBouncesIdx, setLaserBouncesIdx)}>
                bounces: {LASER_BOUNCES_OPTIONS[laserBouncesIdx]}
              </LinkBox>
              <LinkBox onClick={cycle(LASER_OMEGA_OPTIONS.length, laserOmegaIdx, setLaserOmegaIdx)}>
                spin: {LASER_OMEGA_OPTIONS[laserOmegaIdx]}
              </LinkBox>
            </GridBox>
          </ListBox>
        </BorderBox>
      )}

      {}
      <BorderBox>
        <LinkBox onClick={cycle(POOL.length, accentIdx, setAccentIdx)}>color: {accent.name}</LinkBox>
      </BorderBox>

      {}
      <BorderBox>
        <InfoBox>
          {mode === "waves" && "tap void to drop a wave source"}
          {mode === "billiards" && `tap to fan ${BILL_COUNT_OPTIONS[billCountIdx]} billiards from a point`}
          {mode === "lasers" && "tap to place a rotating laser emitter"}
        </InfoBox>
      </BorderBox>
    </ListBox>
  );
}
