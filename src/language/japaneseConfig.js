export const japaneseConfig = {
  id: "japanese",
  name: "일본어",

  parts: ["명사", "동사", "형용사", "부사"],

  listDisplay: [
    {
      type: "text",
      source: "fields.reading",
      fallbackSource: "yomigana",
      className: "yomigana",
    },
    {
      type: "heading",
      source: "word",
    },
    {
      type: "meaning",
    },
    {
      type: "text",
      source: "fields.readingType",
      fallbackSource: "readingType",
      className: "word-reading-type",
    },
    {
      type: "fields",
      exclude: ["reading", "readingType"],
      className: "word-field",
    },
  ],

  fieldControls: {
    명사: [
      {
        name: "reading",
        label: "읽기",
        type: "text",
        placeholder: "읽는 방법을 입력하세요",
      },
      {
        name: "readingType",
        label: "읽기 유형",
        type: "options",
        options: [
          { label: "음독", value: "음독" },
          { label: "훈독", value: "훈독" },
        ],
        ariaLabel: "읽기 유형 선택",
      },
    ],

    동사: [
      {
        name: "reading",
        label: "읽기",
        type: "text",
        placeholder: "읽는 방법을 입력하세요",
      },
      {
        name: "verbGroup",
        label: "동사 그룹",
        type: "options",
        options: [
          { label: "1그룹", value: "1" },
          { label: "2그룹", value: "2" },
          { label: "3그룹", value: "3" },
        ],
        ariaLabel: "동사 그룹 선택",
      },
    ],

    형용사: [
      {
        name: "adjectiveType",
        label: "형용사 유형",
        type: "options",
        options: [
          { label: "い형용사", value: "i" },
          { label: "な형용사", value: "na" },
        ],
        ariaLabel: "형용사 유형 선택",
      },
    ],

    부사: [],
  },
};
