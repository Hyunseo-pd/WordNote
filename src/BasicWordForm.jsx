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
  const [editingWordId, setEditingWordId] = useState(null);
  const [editingWord, setEditingWord] = useState(null);
  const [words, setWords] = useState([]);

  const fieldControls = fieldControlMap[part] ?? [];

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const filteredWords = normalizedSearchQuery
    ? words.filter((item) => {
        const searchableText = [
          item.word,
          item.meaning,
          item.part,
          item.createdAt,
          ...Object.values(item.fields ?? {}),
          ...listDisplay.map((displayItem) =>
            getValueByPath(item, displayItem.source),
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

  const startEditingWord = (item) => {
    setEditingWordId(item.id);
    setEditingWord({
      word: item.word ?? "",
      meaning: item.meaning ?? "",
      part: item.part ?? "",
      fields: { ...(item.fields ?? {}) },
    });
  };

  const cancelEditingWord = () => {
    setEditingWordId(null);
    setEditingWord(null);
  };

  const updateEditingWord = (name, value) => {
    setEditingWord((prevWord) => ({
      ...prevWord,
      [name]: value,
    }));
  };

  const updateEditingField = (name, value) => {
    setEditingWord((prevWord) => ({
      ...prevWord,
      fields: {
        ...(prevWord?.fields ?? {}),
        [name]: value,
      },
    }));
  };

  const saveEditingWord = async (id) => {
    const trimmedWord = editingWord.word.trim();
    const trimmedMeaning = editingWord.meaning.trim();

    if (!trimmedWord || !trimmedMeaning || !editingWord.part) {
      return;
    }

    const currentWord = words.find((item) => item.id === id) ?? {};
    const updatedWord = {
      id,
      savedAt: currentWord.savedAt,
      createdAt: currentWord.createdAt,
      word: trimmedWord,
      meaning: trimmedMeaning,
      part: editingWord.part,
      fields: { ...(editingWord.fields ?? {}) },
    };

    setWords((prevWords) =>
      prevWords.map((item) => (item.id === id ? updatedWord : item)),
    );
    cancelEditingWord();
    await setDoc(doc(db, language.collection, id), updatedWord);
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

        return {
          id: item.id || crypto.randomUUID(),
          word: item.word ?? "",
          meaning: item.meaning ?? "",
          part: item.part ?? "",
          fields: item.fields ?? {},
          createdAt: item.createdAt,
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

  const renderFieldControl = (
    field,
    currentFields = fields,
    onFieldChange = updateField,
    inputNamePrefix = "field",
    isEditing = false,
  ) => {
    if (field.type === "options") {
      return (
        <div
          key={field.name}
          className={`${field.fieldClassName ?? "part-field"} ${
            isEditing ? "edit-word-field" : ""
          }`}
        >
          <span>{field.label}</span>
          <div
            className={field.optionsClassName ?? "part-options"}
            aria-label={field.ariaLabel}
          >
            {field.options.map((item) => (
              <button
                key={item.value}
                type="button"
                className={
                  currentFields[field.name] === item.value ? "selected" : ""
                }
                onClick={() => onFieldChange(field.name, item.value)}
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
        <label
          key={field.name}
          className={`participle-field ${isEditing ? "edit-word-field" : ""}`}
        >
          {field.label}
          <div className="participle-input-row">
            <div className="auxiliary-options" aria-label="보조동사 선택">
              {["hat", "ist"].map((item) => (
                <label key={item} className="auxiliary-option">
                  <input
                    type="radio"
                    name={`${inputNamePrefix}-auxiliary`}
                    checked={currentFields.auxiliary === item}
                    onChange={() => onFieldChange("auxiliary", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <input
              value={currentFields[field.name] ?? ""}
              onChange={(event) =>
                onFieldChange(field.name, event.target.value)
              }
              placeholder={field.placeholder}
            />
          </div>
        </label>
      );
    }

    return (
      <label key={field.name} className={isEditing ? "edit-word-field" : ""}>
        {field.label}
        <input
          value={currentFields[field.name] ?? ""}
          onChange={(event) => onFieldChange(field.name, event.target.value)}
          placeholder={field.placeholder}
        />
      </label>
    );
  };

  const getDisplayFieldRows = (displayFields, part, exclude = []) => {
    const orderedFieldNames = (fieldControlMap[part] ?? [])
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
          <button
            className="flashcard-button"
            type="button"
            onClick={() => setPage(`${language.id}-flashcards`)}
          >
            플래시카드
          </button>
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

          {fieldControls.map((field) => renderFieldControl(field))}

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
              const isEditing = editingWordId === item.id && editingWord;
              const editingFieldControls =
                fieldControlMap[editingWord?.part] ?? [];

              return (
                <li key={item.id} className="word-item">
                  <div>
                    {isEditing ? (
                      <>
                        <label className="edit-word-field">
                          단어
                          <input
                            value={editingWord.word}
                            onChange={(event) =>
                              updateEditingWord("word", event.target.value)
                            }
                          />
                        </label>

                        <label className="edit-word-field">
                          뜻
                          <input
                            value={editingWord.meaning}
                            onChange={(event) =>
                              updateEditingWord("meaning", event.target.value)
                            }
                          />
                        </label>

                        <div className="part-field edit-word-field">
                          <span>품사</span>
                          <div className="part-options" aria-label="품사 선택">
                            {partsOfSpeech.map((partItem) => (
                              <button
                                key={partItem}
                                type="button"
                                className={
                                  editingWord.part === partItem
                                    ? "selected"
                                    : ""
                                }
                                onClick={() =>
                                  setEditingWord((prevWord) => ({
                                    ...prevWord,
                                    part: partItem,
                                  }))
                                }
                              >
                                {partItem}
                              </button>
                            ))}
                          </div>
                        </div>

                        {editingFieldControls.map((field) =>
                          renderFieldControl(
                            field,
                            editingWord.fields ?? {},
                            updateEditingField,
                            `edit-${item.id}`,
                            true,
                          ),
                        )}
                      </>
                    ) : (
                      listDisplay.map((displayItem) =>
                        renderListDisplayItem(item, displayItem),
                      )
                    )}
                    <small>{item.createdAt}</small>
                  </div>
                  <div className="word-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="edit-save-button"
                          onClick={() => saveEditingWord(item.id)}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          className="edit-button"
                          onClick={cancelEditingWord}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => startEditingWord(item)}
                      >
                        수정
                      </button>
                    )}
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => deleteWord(item.id)}
                    >
                      삭제
                    </button>
                  </div>
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
