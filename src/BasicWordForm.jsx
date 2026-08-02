import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { sortWordsBySavedAt } from "./wordSorting";

const INITIAL_FIELDS = {};
const DEFAULT_PARTS = ["명사", "동사", "형용사", "부사"];

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

const getMeaningText = (item) => {
  if (typeof item.meaning === "string") {
    return item.meaning;
  }

  if (Array.isArray(item.meanings)) {
    return item.meanings
      .map((meaningItem) =>
        typeof meaningItem === "string" ? meaningItem : meaningItem?.meaning,
      )
      .filter(Boolean)
      .join(", ");
  }

  return "";
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

const getTextValue = (item, source, fallbackSource) => {
  const value = getValueByPath(item, source);
  const fallbackValue = getValueByPath(item, fallbackSource);

  return value ?? fallbackValue ?? "";
};

function BasicWordForm({ setPage, languageConfig }) {
  const language = languageConfig;
  const partsOfSpeech = language.parts ?? DEFAULT_PARTS;
  const fieldControlMap = language.fieldControls ?? {};
  const fieldLabelMap = getFieldLabelMap(fieldControlMap);
  const listDisplay = language.listDisplay ?? [
    { type: "heading", source: "word" },
    { type: "meaning" },
    { type: "part" },
    { type: "fields", exclude: ["gender", "auxiliary"] },
  ];
  const fileInputRef = useRef(null);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [part, setPart] = useState("");
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [searchQuery, setSearchQuery] = useState("");
  const [words, setWords] = useState([]);

  const fieldControls = fieldControlMap[part] ?? [];

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const filteredWords = normalizedSearchQuery
    ? words.filter((item) => {
        const searchableText = [
          item.word,
          getMeaningText(item),
          item.part,
          item.createdAt,
          ...Object.values(item.fields ?? {}),
          ...listDisplay.map((displayItem) =>
            getTextValue(item, displayItem.source, displayItem.fallbackSource),
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ko-KR");

        return searchableText.includes(normalizedSearchQuery);
      })
    : words;

  useEffect(() => {
    async function loadWords() {
      try {
        const snapshot = await getDocs(collection(db, language.collection));

        const loadedWords = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setWords(sortWordsBySavedAt(loadedWords));
      } catch (error) {
        console.error("단어 불러오기 실패:", error);
      }
    }

    loadWords();
  }, [language.collection]);

  const selectPart = (selectedPart) => {
    setPart(selectedPart);
    setFields(INITIAL_FIELDS);
  };

  const updateField = (name, value) => {
    setFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));
  };

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedWord = word.trim();
    const trimmedMeaning = meaning.trim();

    if (!trimmedWord || !trimmedMeaning || !part) {
      return;
    }

    const savedAt = Date.now();
    const newWord = {
      id: crypto.randomUUID(),
      word: trimmedWord,
      meaning: trimmedMeaning,
      meanings: [trimmedMeaning],
      part,
      fields: { ...fields },
      savedAt,
      createdAt: new Date().toLocaleDateString("ko-KR"),
    };

    setWords((prevWords) => [newWord, ...prevWords]);
    setWord("");
    setMeaning("");
    setPart("");
    setFields(INITIAL_FIELDS);
    await setDoc(doc(db, language.collection, newWord.id), newWord);
  }

  async function deleteWord(id) {
    setWords((prevWords) => prevWords.filter((item) => item.id !== id));
    await deleteDoc(doc(db, language.collection, id));
  }

  const exportWords = () => {
    const json = JSON.stringify(words, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${language.collection}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importWords = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const importedWords = JSON.parse(text);

      if (!Array.isArray(importedWords)) {
        throw new Error("Uploaded JSON must be an array.");
      }

      const normalizedWords = importedWords.map((item) => {
        const parsedSavedAt = Date.parse(item.createdAt ?? "");
        const meaningText = getMeaningText(item);

        return {
          ...item,
          id: item.id || crypto.randomUUID(),
          meaning: item.meaning ?? meaningText,
          meanings: Array.isArray(item.meanings)
            ? item.meanings
            : meaningText
              ? [meaningText]
              : [],
          part: item.part ?? "",
          fields: item.fields ?? {},
          savedAt:
            item.savedAt ??
            item.createdAtMs ??
            (Number.isNaN(parsedSavedAt) ? Date.now() : parsedSavedAt),
        };
      });

      setWords(sortWordsBySavedAt(normalizedWords));
      setSearchQuery("");

      await Promise.all(
        normalizedWords.map((item) =>
          setDoc(doc(db, language.collection, item.id), {
            ...item,
          }),
        ),
      );
    } catch (error) {
      window.alert(
        "JSON 파일을 불러오지 못했습니다. 파일 형식을 확인해주세요.",
      );
      console.error(error);
    } finally {
      event.target.value = "";
    }
  };

  const renderFieldControl = (field) => {
    if (field.type === "options") {
      return (
        <div key={field.name} className={field.fieldClassName ?? "part-field"}>
          <span>{field.label}</span>
          <div
            className={field.optionsClassName ?? "part-options"}
            aria-label={field.ariaLabel}
          >
            {field.options.map((item) => (
              <button
                key={item.value}
                type="button"
                className={fields[field.name] === item.value ? "selected" : ""}
                onClick={() => updateField(field.name, item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === "participle") {
      return (
        <label key={field.name} className="participle-field">
          {field.label}
          <div className="participle-input-row">
            <div className="auxiliary-options" aria-label="보조동사 선택">
              {["hat", "ist"].map((item) => (
                <label key={item} className="auxiliary-option">
                  <input
                    type="radio"
                    name="auxiliary"
                    checked={fields.auxiliary === item}
                    onChange={() => updateField("auxiliary", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <input
              value={fields[field.name] ?? ""}
              onChange={(event) => updateField(field.name, event.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        </label>
      );
    }

    return (
      <label key={field.name}>
        {field.label}
        <input
          value={fields[field.name] ?? ""}
          onChange={(event) => updateField(field.name, event.target.value)}
          placeholder={field.placeholder}
        />
      </label>
    );
  };

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

  const renderListDisplayItem = (item, displayItem) => {
    if (displayItem.type === "heading") {
      const displayFields = item.fields ?? {};
      const prefix = displayFields[displayItem.prefixField];
      const suffix = displayFields[displayItem.suffixField];
      const value = getTextValue(item, displayItem.source);

      if (!value) {
        return null;
      }

      return (
        <strong key={displayItem.source}>
          {prefix ? `${prefix} ` : ""}
          {value}
          {suffix
            ? `${displayItem.suffixPrefix ?? ""}${suffix}`
            : ""}
        </strong>
      );
    }

    if (displayItem.type === "meaning") {
      const meaningText = getMeaningText(item);

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
      return getDisplayFieldRows(item.fields ?? {}, displayItem.exclude ?? [])
        .map((field) => (
          <p
            key={field.name}
            className={displayItem.className ?? "word-field"}
          >
            {field.label}: {field.value}
          </p>
        ));
    }

    const value = getTextValue(
      item,
      displayItem.source,
      displayItem.fallbackSource,
    );

    return value ? (
      <p key={displayItem.source} className={displayItem.className}>
        {value}
      </p>
    ) : null;
  };

  return (
    <main className="app">
      <section className="word-panel">
        <div className="panel-actions">
          <button
            className="back-button"
            type="button"
            onClick={() => setPage("home")}
          >
            처음으로
          </button>
          <div className="json-actions">
            <input
              ref={fileInputRef}
              className="json-file-input"
              type="file"
              accept="application/json,.json"
              onChange={importWords}
            />
            <button
              className="import-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              JSON 가져오기
            </button>
            <button
              className="export-button"
              type="button"
              onClick={exportWords}
            >
              JSON 내보내기
            </button>
          </div>
        </div>

        <div className="app-header">
          <p className="eyebrow">{language.eyebrow}</p>
          <h1>{language.label} 단어장</h1>
        </div>

        <form className="word-form basic-form" onSubmit={handleSubmit}>
          <label className="wordInput">
            단어
            <input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="단어를 입력하세요"
            />
          </label>

          <label>
            뜻
            <input
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              placeholder="뜻을 입력하세요"
            />
          </label>

          <div className="part-field">
            <span>품사</span>
            <div className="part-options" aria-label="품사 선택">
              {partsOfSpeech.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={part === item ? "selected" : ""}
                  onClick={() => selectPart(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {fieldControls.map(renderFieldControl)}

          <button type="submit" className="saveButton">
            저장
          </button>
        </form>

        <div className="word-list-header">
          <h2>저장한 단어</h2>
          <span>
            {filteredWords.length} / {words.length}개
          </span>
        </div>

        <label className="word-search">
          <span>검색</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="단어, 뜻, 품사로 검색"
          />
        </label>

        {words.length === 0 ? (
          <p className="empty-message">아직 저장한 단어가 없습니다.</p>
        ) : filteredWords.length === 0 ? (
          <p className="empty-message">검색 결과가 없습니다.</p>
        ) : (
          <ul className="word-list">
            {filteredWords.map((item) => {
              return (
                <li key={item.id} className="word-item">
                  <div>
                    {listDisplay.map((displayItem) =>
                      renderListDisplayItem(item, displayItem),
                    )}
                    <small>{item.createdAt}</small>
                  </div>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteWord(item.id)}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

export default BasicWordForm;
