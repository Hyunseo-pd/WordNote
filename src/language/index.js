import { germanConfig } from "./germanConfig";
import { japaneseConfig } from "./japaneseConfig";

const defaultConfig = {
  parts: ["명사", "동사", "형용사", "부사"],
  fieldControls: {},
  listDisplay: [
    { type: "heading", source: "word" },
    { type: "meaning" },
    { type: "part" },
  ],
};

export const LANGUAGE_CONFIGS = {
  japanese: {
    id: "japanese",
    label: "일본어",
    collection: "japanesewords",
    eyebrow: "My Japanese dictionary",
    ...japaneseConfig,
  },
  german: {
    id: "german",
    label: "독일어",
    collection: "germanwords",
    eyebrow: "My Deutsch dictionary",
    ...germanConfig,
  },
  english: {
    id: "english",
    label: "영어",
    collection: "englishwords",
    eyebrow: "My English dictionary",
    ...defaultConfig,
  },
};
