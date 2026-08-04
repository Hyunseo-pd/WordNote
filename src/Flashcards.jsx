import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { sortWords } from "./wordSorting";
import "./App.css";

const formatMeaningDisplay = (meaningItem, shouldShowUsage) => {
  if (typeof meaningItem === "string") {
    return meaningItem;
  }

  if (!shouldShowUsage) {
    return meaningItem.meaning;
  }

  const usage = [meaningItem.preposition, meaningItem.caseType]
    .filter(Boolean)
    .join("+");

  return usage ? `${usage}: ${meaningItem.meaning}` : meaningItem.meaning;
};

const getMeaningItems = (item) => {
  if (typeof item?.meaning === "string" && item.meaning) {
    return [item.meaning];
  }

  return item?.meanings ?? [];
};

const getFieldLabelMap = (fieldControls = {}) =>
  Object.values(fieldControls)
    .flat()
    .reduce((labels, field) => {
      labels[field.name] = field.label;

      if (field.type === "participle") {
        labels.auxiliary = "보조동사";
      }

      return labels;
    }, {});

const getValueByPath = (item, path) => {
  if (!path) {
    return "";
  }

  return path
    .split(".")
    .reduce(
      (currentValue, key) =>
        currentValue && typeof currentValue === "object"
          ? currentValue[key]
          : undefined,
      item,
    );
};

function Flashcards({ setPage, languageConfig }) {
  const language = languageConfig;
  const fieldLabelMap = getFieldLabelMap(language.fieldControls);
  const [words, setWords] = useState([]);
  const [flippedIds, setFlippedIds] = useState(() => new Set());
  const [searchQuery] = useState("");
  const [sortMode, setSortMode] = useState("date");
  const [currentIndex, setCurrentIndex] = useState(0);

  const listDisplay = language.listDisplay ?? [
    { type: "heading", source: "word" },
    { type: "meaning" },
    { type: "part" },
    { type: "fields", exclude: ["gender", "auxiliary"] },
  ];

  const getFieldRows = (fields = {}, fieldLabelMap = {}) =>
    Object.entries(fields).flatMap(([name, value]) => {
      if (!value || ["gender", "plural", "auxiliary"].includes(name)) {
        return [];
      }

      return [
        {
          name,
          label: fieldLabelMap[name] ?? name,
          value:
            name === "partizip2" && fields.auxiliary
              ? `${fields.auxiliary} ${value}`
              : value,
        },
      ];
    });

  const getDisplayFieldRows = (displayFields, exclude = []) =>
    Object.entries(displayFields).flatMap(([name, value]) => {
      if (!value || exclude.includes(name)) {
        return [];
      }

      const fieldValue =
        name === "partizip2" && displayFields.auxiliary
          ? `${displayFields.auxiliary} ${value}`
          : value;

      return [
        {
          name,
          label: fieldLabelMap[name] ?? name,
          value: fieldValue,
        },
      ];
    });

  useEffect(() => {
    async function loadWords() {
      try {
        const snapshot = await getDocs(collection(db, language.collection));
        const loadedWords = snapshot.docs.map((doc) => {
          const data = doc.data();
          const wordData = { ...data };
          delete wordData.meanings;
          const [meaning] = getMeaningItems(data);

          return {
            id: doc.id,
            ...wordData,
            meaning: wordData.meaning ?? formatMeaningDisplay(meaning, false),
          };
        });

        setWords(loadedWords);
      } catch (error) {
        console.error("단어 불러오기 실패:", error);
      }
    }

    loadWords();
  }, [language.collection]);

  const filteredWords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
    const sortedWords = sortWords(words, sortMode);

    if (!normalizedQuery) {
      return sortedWords;
    }

    return sortedWords.filter((item) => {
      const searchableText = [
        item.word,
        item.meaning,
        item.part,
        ...getMeaningItems(item).flatMap((meaningItem) =>
          typeof meaningItem === "string"
            ? [meaningItem]
            : [
                meaningItem.preposition,
                meaningItem.caseType,
                meaningItem.meaning,
              ],
        ),
        ...Object.values(item.fields ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ko-KR");

      return searchableText.includes(normalizedQuery);
    });
  }, [searchQuery, sortMode, words]);

  const selectSortMode = (selectedSortMode) => {
    setSortMode(selectedSortMode);
    setCurrentIndex(0);
    setFlippedIds(new Set());
  };

  const toggleCard = (id) => {
    setFlippedIds((prevIds) => {
      const nextIds = new Set(prevIds);

      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }

      return nextIds;
    });
  };
  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredWords.length);
  };

  const prevCard = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + filteredWords.length) % filteredWords.length,
    );
  };
  const item = filteredWords[currentIndex];
  const fields = item?.fields ?? {};
  const isFlipped = item ? flippedIds.has(item.id) : false;
  const meanings = getMeaningItems(item);
  const title = item
    ? `${fields.gender ? `${fields.gender} ` : ""}${item.word}`
    : "";

  const renderListDisplayItem = (item, displayItem) => {
    if (displayItem.type === "heading") {
      const displayFields = item.fields ?? {};
      const prefix = displayFields[displayItem.prefixField];
      const suffix = displayFields[displayItem.suffixField];
      const value = getValueByPath(item, displayItem.source);

      if (!value) {
        return null;
      }

      return (
        <strong key={displayItem.source}>
          {prefix ? `${prefix} ` : ""}
          {value}
          {suffix ? `${displayItem.suffixPrefix ?? ""}${suffix}` : ""}
        </strong>
      );
    }

    if (displayItem.type === "meaning") {
      const meaningText = item.meaning;

      return meaningText ? <p key="meaning">{meaningText}</p> : null;
    }

    if (displayItem.type === "part") {
      return item.part ? (
        <p key="part" className="word-part">
          {item.part}
        </p>
      ) : null;
    }

    if (displayItem.type === "fields") {
      return getDisplayFieldRows(
        item.fields ?? {},
        displayItem.exclude ?? [],
      ).map((field) => (
        <p key={field.name} className={displayItem.className ?? "word-field"}>
          {field.label}: {field.value}
        </p>
      ));
    }

    const value = getValueByPath(item, displayItem.source);

    return value ? (
      <p key={displayItem.source} className={displayItem.className}>
        {value}
      </p>
    ) : null;
  };

  return (
    <main className="app">
      <section className="word-panel flashcard-panel">
        <div className="panel-actions">
          <button
            className="back-button"
            type="button"
            onClick={() => setPage("home")}
          >
            언어 리스트
          </button>
          <button
            className="back-button"
            type="button"
            onClick={() => setPage(language.id)}
          >
            단어장 편집
          </button>
        </div>

        <div className="app-header">
          <p className="eyebrow">{language.eyebrow}</p>
          <h1>{languageConfig.label} 카드</h1>
        </div>

        <div className="flashcard-controls">
          <div className="sort-options" aria-label="card sort">
            <button
              type="button"
              className={sortMode === "date" ? "selected" : ""}
              onClick={() => selectSortMode("date")}
            >
              날짜순
            </button>
            <button
              type="button"
              className={sortMode === "alphabetical" ? "selected" : ""}
              onClick={() => selectSortMode("alphabetical")}
            >
              알파벳순
            </button>
          </div>
        </div>

        {words.length === 0 ? (
          <p className="empty-message">
            아직 저장한 {language.label} 단어가 없습니다.
          </p>
        ) : filteredWords.length === 0 ? (
          <p className="empty-message">조건에 맞는 카드가 없습니다.</p>
        ) : (
          <div key={item.id} className="flashcard-container">
            <button onClick={prevCard}>◀</button>
            <button
              className={`flashcard ${isFlipped ? "is-flipped" : ""}`}
              type="button"
              onClick={() => toggleCard(item.id)}
              aria-pressed={isFlipped}
            >
              {/* 앞면 */}
              <span className="flashcard-face flashcard-front">
                <strong>{title}</strong>
                {fields.plural && <small>-{fields.plural}</small>}
              </span>
              {/* 뒷면 */}
              <span className="flashcard-face flashcard-back">
                {listDisplay.map((displayItem) =>
                  renderListDisplayItem(item, displayItem),
                )}
              </span>
            </button>
            <button onClick={nextCard}>▶</button>
          </div>
        )}
      </section>
    </main>
  );
}

export default Flashcards;
