const GENDERS = [
  { label: "남성", value: "der" },
  { label: "여성", value: "die" },
  { label: "중성", value: "das" },
];

const FIELD_CONTROLS = {
  명사: [
    {
      name: "gender",
      label: "성",
      type: "options",
      options: GENDERS,
      ariaLabel: "성 선택",
      fieldClassName: "gender-field",
      optionsClassName: "gender-options",
    },
    {
      name: "plural",
      label: "복수형",
      type: "text",
      placeholder: "복수형을 입력하세요",
    },
  ],

  동사: [
    {
      name: "Präteritum",
      label: "단순과거",
      type: "text",
      placeholder: "Präteritum을 입력하세요",
    },
    {
      name: "partizip2",
      label: "과거분사",
      type: "participle",
      placeholder: "Partizip II를 입력하세요",
    },
    {
      name: "usage",
      label: "용법",
      type: "text",
      placeholder: "용법을 입력하세요",
    },
  ],

  형용사: [
    {
      name: "comparative",
      label: "비교급",
      type: "text",
      placeholder: "비교급을 입력하세요",
    },
  ],
};

export const germanConfig = {
  language: "de",
  name: "독일어",

  parts: ["명사", "동사", "형용사", "부사"],

  listDisplay: [
    {
      type: "heading",
      source: "word",
      prefixField: "gender",
      suffixField: "plural",
      suffixPrefix: "-",
    },
    {
      type: "meaning",
    },
    {
      type: "part",
    },
    {
      type: "fields",
      exclude: ["gender", "plural", "auxiliary"],
      className: "word-field",
    },
  ],

  fieldControls: FIELD_CONTROLS,
};
