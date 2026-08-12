import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { sortWords } from "./wordSorting";
import "./App.css";

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
const getFieldOptions = (fieldControls = {}) => {
  // Implementation for rendering field values based on language
  const options = Object.values(fieldControls).flat();

  return options.reduce((acc, field) => {
    if (field.type === "options" && Array.isArray(field.options)) {
      acc[field.name] = field.options;
    }
    return acc;
  }, {});
};
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

  const [filter, setFilter] = useState("all");
  const [sortMode, setSortMode] = useState("date");
  const [currentIndex, setCurrentIndex] = useState(0);

  const listDisplay = language.listDisplay ?? [
    { type: "heading", source: "word" },
    { type: "meaning" },
    { type: "part" },
    { type: "fields", exclude: ["gender", "auxiliary"] },
  ];

  const filteroptions = Object.values(
    getFieldOptions(language.fieldControls),
  ).flat();

  const getDisplayFieldRows = (displayFields, part, exclude = []) => {
    const orderedFieldNames = (language.fieldControls?.[part] ?? [])
      .flatMap((field) =>
        field.type === "participle" ? ["auxiliary", field.name] : [field.name],
      )
      .filter((name, index, fieldNames) => fieldNames.indexOf(name) === index);
    const remainingFieldNames = Object.keys(displayFields).filter(
      (name) => !orderedFieldNames.includes(name),
    );

    return [...orderedFieldNames, ...remainingFieldNames].flatMap((name) => {
      const value = displayFields[name];

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
  };

  useEffect(() => {
    async function loadWords() {
      try {
        const snapshot = await getDocs(collection(db, language.collection));
        const loadedWords = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            word: data.word ?? "",
            meaning: data.meaning ?? "",
            part: data.part ?? "",
            fields: data.fields ?? {},
            savedAt: data.savedAt,
            createdAt: data.createdAt,
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
    const sortedWords = sortWords(words, sortMode);

    if (filter === "all") {
      return sortedWords;
    }

    return sortedWords.filter((item) => {
      const filterValues = [item.part, ...Object.values(item.fields ?? {})];

      return filterValues.includes(filter);
    });
  }, [filter, sortMode, words]);

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
        item.part,
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
          <div className="dropdown">
            <select
              defaultValue="all"
              aria-label="card filter"
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="동사">동사</option>
              <option value="명사">명사</option>
              <option value="형용사">형용사</option>
              <option value="부사">부사</option>
              {filteroptions.map((optionItem) => (
                <option key={optionItem.label} value={optionItem.value}>
                  {optionItem.label}
                </option>
              ))}
            </select>
          </div>
          <span>
            {filteredWords.length} / {words.length}개
          </span>
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
