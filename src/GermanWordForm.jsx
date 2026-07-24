import { useEffect, useRef, useState } from "react";
import "./App.css";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

const STORAGE_KEY = "german-words";

const GENDERS = [
  { label: "남성", value: "der" },
  { label: "여성", value: "die" },
  { label: "중성", value: "das" },
];

const PARTS_OF_SPEECH = ["명사", "동사", "형용사", "부사"];

const INITIAL_FIELDS = {};

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
      placeholder: "Partizip 2를 입력하세요",
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

const capitalizeNoun = (value) => {
  const [firstLetter, ...rest] = Array.from(value);
  return `${firstLetter.toLocaleUpperCase("de-DE")}${rest.join("")}`;
};

const FIELD_LABELS = {
  Imperfekt: "단순과거",
  Präteritum: "단순과거",
  perfekt: "과거분사",
  partizip2: "과거분사",
  auxiliary: "보조동사",
  comparative: "비교급",
};

const getDisplayFieldRows = (displayFields) =>
  Object.entries(displayFields).flatMap(([name, value]) => {
    if (["gender", "plural", "auxiliary"].includes(name) || !value) {
      return [];
    }

    const isParticiple = ["partizip2"].includes(name);

    return [
      {
        name,
        label: FIELD_LABELS[name] ?? name,
        value:
          isParticiple && displayFields.auxiliary
            ? `${displayFields.auxiliary} ${value}`
            : value,
      },
    ];
  });

const formatMeaningDisplay = (meaningItem, shouldShowUsage) => {
  if (!shouldShowUsage) {
    return meaningItem.meaning;
  }

  const usage = [meaningItem.preposition, meaningItem.caseType]
    .filter(Boolean)
    .join("+");

  return usage ? `${usage}: ${meaningItem.meaning}` : meaningItem.meaning;
};

function GermanWordForm({ setPage }) {
  const fileInputRef = useRef(null);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [preposition, setPreposition] = useState("");
  const [caseType, setCaseType] = useState("");
  const [meanings, setMeanings] = useState([]);
  const [part, setPart] = useState("");
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingWordId, setEditingWordId] = useState(null);
  const [editingWord, setEditingWord] = useState(null);

  const [words, setWords] = useState(() => {
    const savedWords = localStorage.getItem(STORAGE_KEY);
    return savedWords ? JSON.parse(savedWords) : [];
  });

  const isNoun = part === "명사";
  const isVerb = part === "동사";

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const filteredWords = normalizedSearchQuery
    ? words.filter((item) => {
        const searchableText = [
          item.word,
          item.part,
          item.createdAt,
          ...(item.meanings ?? []).flatMap((meaningItem) => [
            meaningItem.preposition,
            meaningItem.caseType,
            meaningItem.meaning,
          ]),
          ...Object.values(item.fields ?? {}),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("ko-KR");

        return searchableText.includes(normalizedSearchQuery);
      })
    : words;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }, [words]);

  const selectPart = (selectedPart) => {
    setPart(selectedPart);
    setMeanings([]);
    setFields(INITIAL_FIELDS);
  };

  const addMeaning = (addedPrep, addedCase, addedMeaning) => {
    if (!meaning) {
      return;
    }
    setMeanings((prev) => [
      ...prev,
      { preposition: addedPrep, caseType: addedCase, meaning: addedMeaning },
    ]);
    setMeaning("");
    setPreposition("");
    setCaseType("");
  };

  const updateField = (name, value) => {
    setFields((prevFields) => ({
      ...prevFields,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedWord = word.trim();

    const savedWord = isNoun ? capitalizeNoun(trimmedWord) : trimmedWord;

    const currentMeaning =
      caseType || meaning
        ? [{ preposition: preposition, caseType: caseType, meaning: meaning }]
        : [];
    const savedMeaning = [...meanings, ...currentMeaning];
    if (!savedWord || !savedMeaning) {
      return;
    }
    setWords([
      {
        id: crypto.randomUUID(),
        word: savedWord,
        meanings: savedMeaning,
        part,
        fields: { ...fields },
        createdAt: new Date().toLocaleDateString("ko-KR"),
      },
      ...words,
    ]);
    setWord("");
    setMeaning("");
    setPreposition("");
    setCaseType("");
    setMeanings([]);
    setPart("");
    setFields(INITIAL_FIELDS);
  };

  const deleteWord = (id) => {
    setWords(words.filter((item) => item.id !== id));
  };

  const startEditingWord = (item) => {
    setEditingWordId(item.id);
    setEditingWord({
      word: item.word,
      meanings:
        item.meanings?.length > 0
          ? item.meanings.map((meaningItem) => ({ ...meaningItem }))
          : [{ preposition: "", caseType: "", meaning: "" }],
    });
  };

  const updateEditingMeaning = (index, name, value) => {
    setEditingWord((prevWord) => ({
      ...prevWord,
      meanings: prevWord.meanings.map((meaningItem, meaningIndex) =>
        meaningIndex === index
          ? { ...meaningItem, [name]: value }
          : meaningItem,
      ),
    }));
  };

  const addEditingMeaning = () => {
    setEditingWord((prevWord) => ({
      ...prevWord,
      meanings: [
        ...prevWord.meanings,
        { preposition: "", caseType: "", meaning: "" },
      ],
    }));
  };

  const saveEditingWord = (id) => {
    const trimmedWord = editingWord.word.trim();
    const savedMeanings = editingWord.meanings
      .map((meaningItem) => ({
        preposition: meaningItem.preposition.trim(),
        caseType: meaningItem.caseType,
        meaning: meaningItem.meaning.trim(),
      }))
      .filter(
        (meaningItem) =>
          meaningItem.preposition ||
          meaningItem.caseType ||
          meaningItem.meaning,
      );

    if (!trimmedWord || savedMeanings.length === 0) {
      return;
    }

    setWords((prevWords) =>
      prevWords.map((item) =>
        item.id === id
          ? {
              ...item,
              word:
                item.part === "명사"
                  ? capitalizeNoun(trimmedWord)
                  : trimmedWord,
              meanings: savedMeanings,
            }
          : item,
      ),
    );
    setEditingWordId(null);
    setEditingWord(null);
  };

  const exportWords = () => {
    const json = JSON.stringify(words, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `language-app-words-${new Date()
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

      setWords(
        importedWords.map((item) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
          meanings: Array.isArray(item.meanings) ? item.meanings : [],
          fields: item.fields ?? {},
        })),
      );
      setSearchQuery("");
    } catch (error) {
      window.alert(
        "JSON 파일을 불러오지 못했습니다. 파일 형식을 확인해주세요.",
      );
      console.error(error);
    } finally {
      event.target.value = "";
    }
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
            언어 리스트
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
          <p className="eyebrow">My Deutsch dictionary</p>
          <h1>독일어 단어장</h1>
        </div>

        <form
          className={`word-form ${isVerb ? "verb-form" : "standard-form"}`}
          onSubmit={handleSubmit}
        >
          <label className="wordInput">
            단어
            <input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="단어를 입력하세요"
            />
          </label>
          {isVerb && (
            <label>
              용법
              <div className="addpattern">
                <input
                  value={preposition}
                  onChange={(event) => setPreposition(event.target.value)}
                  placeholder="전치사"
                />
                <div className="case-options" aria-label="용법 선택">
                  {["Akk", "Dat", "Gen"].map((item) => (
                    <label key={item} className="case-option">
                      <input
                        type="radio"
                        name="case"
                        checked={caseType === item}
                        onChange={() => setCaseType(item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </label>
          )}

          <label>
            뜻
            <input
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              placeholder="뜻을 입력하세요"
            />
          </label>
          {isVerb && (
            <button
              type="button"
              className="addMeaning"
              onClick={() => addMeaning(preposition, caseType, meaning)}
            >
              용법 추가
            </button>
          )}

          <div className="meanigList">
            {meanings.map((item, index) => (
              <p key={index}>{formatMeaningDisplay(item, isVerb)}</p>
            ))}
          </div>

          <div className="part-field">
            <span>품사</span>
            <div className="part-options" aria-label="품사 선택">
              {PARTS_OF_SPEECH.map((item) => (
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

          {(FIELD_CONTROLS[part] ?? []).map((field) =>
            field.type === "options" ? (
              <div key={field.name} className={field.fieldClassName}>
                <span>{field.label}</span>
                <div
                  className={field.optionsClassName}
                  aria-label={field.ariaLabel}
                >
                  {field.options.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={
                        fields[field.name] === item.value ? "selected" : ""
                      }
                      onClick={() => updateField(field.name, item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : field.type === "participle" ? (
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
                    onChange={(event) =>
                      updateField(field.name, event.target.value)
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              </label>
            ) : (
              <label key={field.name}>
                {field.label}
                <input
                  value={fields[field.name] ?? ""}
                  onChange={(event) =>
                    updateField(field.name, event.target.value)
                  }
                  placeholder={field.placeholder}
                />
              </label>
            ),
          )}
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
              const displayFields = item.fields ?? {};
              const isEditing = editingWordId === item.id && editingWord;
              const editingMeanings = editingWord?.meanings ?? [];

              return (
                <li key={item.id} className="word-item">
                  <div>
                    {isEditing ? (
                      <label className="edit-word-field">
                        단어
                        <input
                          value={editingWord.word}
                          onChange={(event) =>
                            setEditingWord((prevWord) => ({
                              ...prevWord,
                              word: event.target.value,
                            }))
                          }
                        />
                      </label>
                    ) : (
                      <strong>
                        {displayFields.gender ? `${displayFields.gender} ` : ""}
                        {item.word}
                        {displayFields.plural ? `-${displayFields.plural}` : ""}
                      </strong>
                    )}
                    {isEditing ? (
                      <div className="edit-meanings">
                        <div className="edit-meanings-header">
                          <span>{item.part === "동사" ? "용법" : "뜻"}</span>
                          {item.part === "동사" && (
                            <button
                              type="button"
                              className="add-edit-meaning"
                              onClick={addEditingMeaning}
                              aria-label="용법 추가"
                            >
                              +
                            </button>
                          )}
                        </div>
                        {editingMeanings.map((meaningItem, index) => (
                          <div key={index} className="edit-meaning-row">
                            {item.part === "동사" && (
                              <>
                                <input
                                  value={meaningItem.preposition}
                                  onChange={(event) =>
                                    updateEditingMeaning(
                                      index,
                                      "preposition",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="전치사"
                                />
                                <div
                                  className="edit-case-options"
                                  aria-label="용법 선택"
                                >
                                  {["Akk", "Dat", "Gen"].map((caseItem) => (
                                    <label key={caseItem}>
                                      <input
                                        type="radio"
                                        name={`edit-case-${item.id}-${index}`}
                                        checked={
                                          meaningItem.caseType === caseItem
                                        }
                                        onChange={() =>
                                          updateEditingMeaning(
                                            index,
                                            "caseType",
                                            caseItem,
                                          )
                                        }
                                      />
                                      <span>{caseItem}</span>
                                    </label>
                                  ))}
                                </div>
                              </>
                            )}
                            <input
                              value={meaningItem.meaning}
                              onChange={(event) =>
                                updateEditingMeaning(
                                  index,
                                  "meaning",
                                  event.target.value,
                                )
                              }
                              placeholder="뜻"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      (item.meanings ?? []).map((meaningItem, index) => (
                        <p key={index}>
                          {formatMeaningDisplay(
                            meaningItem,
                            item.part === "동사",
                          )}
                        </p>
                      ))
                    )}

                    {getDisplayFieldRows(displayFields).map((field) => (
                      <p key={field.name} className="word-field">
                        {field.label}: {field.value}
                      </p>
                    ))}
                    {item.part && <p className="word-part">{item.part}</p>}
                    <small>{item.createdAt}</small>
                  </div>
                  <div className="word-actions">
                    {isEditing ? (
                      <button
                        type="button"
                        className="edit-save-button"
                        onClick={() => saveEditingWord(item.id)}
                      >
                        저장
                      </button>
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

export default GermanWordForm;
