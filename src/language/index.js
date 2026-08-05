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
    eyebrow: "My Japanese Words",
    ...japaneseConfig,
  },
  german: {
    id: "german",
    label: "독일어",
    collection: "germanwords",
    eyebrow: "My Deutsch Words",
    ...germanConfig,
  },
  english: {
    id: "english",
    label: "영어",
    collection: "englishwords",
    eyebrow: "My English Words",
    ...defaultConfig,
  },

  chinese: {
    id: "chinese",
    label: "중국어",
    collection: "chinesewords",
    eyebrow: "My Chinese Words",
    ...defaultConfig,
  },
};
