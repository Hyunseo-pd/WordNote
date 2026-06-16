import { useEffect, useState } from "react";
import "./App.css";

const STORAGE_KEY = "language-app-words";

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

function App() {
  const [page, setPage] = useState("home");
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [preposition, setPreposition] = useState("");
  const [caseType, setCaseType] = useState("");
  const [meanings, setMeanings] = useState([]);
  const [part, setPart] = useState("");
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [searchQuery, setSearchQuery] = useState("");

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

  if (page === "home") {
    return (
      <main className="app">
        <section className="home-panel">
          <div className="app-header">
            <p className="eyebrow">Language list</p>
            <h1>언어 리스트</h1>
          </div>

          <div className="language-list">
            <button
              className="language-button"
              type="button"
              onClick={() => setPage("german")}
            >
              <span>독일어 단어장</span>
              <small>{words.length}개 저장됨</small>
            </button>
          </div>
        </section>
      </main>
    );
  }

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
          <button className="export-button" type="button" onClick={exportWords}>
            JSON 내보내기
          </button>
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
              <p key={index}>
                {item.preposition}+{item.caseType}: {item.meaning}
              </p>
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

              return (
                <li key={item.id} className="word-item">
                  <div>
                    <strong>
                      {displayFields.gender ? `${displayFields.gender} ` : ""}
                      {item.word}
                      {displayFields.plural ? `-${displayFields.plural}` : ""}
                    </strong>
                    {(item.meanings ?? []).map((meaningitem, index) => (
                      <p key={index}>
                        {meaningitem.preposition}+{meaningitem.caseType}:{" "}
                        {meaningitem.meaning}
                      </p>
                    ))}

                    {getDisplayFieldRows(displayFields).map((field) => (
                      <p key={field.name} className="word-field">
                        {field.label}: {field.value}
                      </p>
                    ))}
                    {item.part && <p className="word-part">{item.part}</p>}
                    <small>{item.createdAt}</small>
                  </div>
                  <button type="button" onClick={() => deleteWord(item.id)}>
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

export default App;
