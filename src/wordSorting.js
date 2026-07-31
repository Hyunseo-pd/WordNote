const collator = new Intl.Collator(["de-DE", "ja-JP", "ko-KR"], {
  sensitivity: "base",
  numeric: true,
});

export const getSavedAt = (word) => {
  if (Number.isFinite(word?.savedAt)) {
    return word.savedAt;
  }

  if (Number.isFinite(word?.createdAtMs)) {
    return word.createdAtMs;
  }

  const parsedDate = Date.parse(word?.createdAt ?? "");
  return Number.isNaN(parsedDate) ? 0 : parsedDate;
};

export const sortWordsBySavedAt = (words) =>
  [...words].sort((firstWord, secondWord) => {
    const savedAtDifference = getSavedAt(secondWord) - getSavedAt(firstWord);

    if (savedAtDifference !== 0) {
      return savedAtDifference;
    }

    return collator.compare(firstWord.word ?? "", secondWord.word ?? "");
  });

export const sortWordsAlphabetically = (words) =>
  [...words].sort((firstWord, secondWord) =>
    collator.compare(firstWord.word ?? "", secondWord.word ?? ""),
  );

export const sortWords = (words, sortMode) =>
  sortMode === "alphabetical"
    ? sortWordsAlphabetically(words)
    : sortWordsBySavedAt(words);
