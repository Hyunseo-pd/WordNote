import { useEffect, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "japanese-words";
const READING_TYPES = ["음독", "훈독"];

function JapaneseWordForm({ setPage }) {
  const fileInputRef = useRef(null);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [yomigana, setYomigana] = useState("");
  const [readingType, setReadingType] = useState(READING_TYPES[0]);

  const [words, setWords] = useState(() => {
    const savedWords = localStorage.getItem(STORAGE_KEY);
    return savedWords ? JSON.parse(savedWords) : [];
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }, [words]);
  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedWord = word.trim();

    setWords([
      {
        id: crypto.randomUUID(),
        word: trimmedWord,
        meanings: [meaning],
        yomigana: yomigana,
        readingType: readingType,
        createdAt: new Date().toLocaleDateString("ko-KR"),
      },
      ...words,
    ]);
    setWord("");
    setMeaning("");
    setYomigana("");
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
      <section className="home-panel">
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
          <p className="eyebrow">My Japanese dictionary</p>
          <h1>일본어 단어장</h1>
        </div>
        <form className={`word-form `} onSubmit={handleSubmit}>
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
          <label>
            読み仮名
            <input
              value={yomigana}
              onChange={(event) => setYomigana(event.target.value)}
              placeholder="읽는 방법을 입력하세요"
            />
          </label>

          <div className="reading-type">
            <span>읽는 방법</span>
            <div className="reading-options" aria-label="읽는 방법 선택">
              {READING_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={readingType === item ? "selected" : ""}
                  onClick={() => setReadingType(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="saveButton">
            저장
          </button>
        </form>

        <div className="word-list-header">
          <h2>저장한 단어</h2>
          <span>{words.length}개</span>
        </div>

        {words.length === 0 ? (
          <p className="empty-message">아직 저장한 단어가 없습니다.</p>
        ) : (
          <ul className="word-list">
            {words.map((word) => (
              <li key={word.id} className="word-item">
                <div>
                  <p className="yomigana">{word.yomigana}</p>
                  <strong>{word.word}</strong>
                  <p>{word.meanings}</p>
                  <p className="word-reading-type">{word.readingType}</p>
                </div>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteWord(word.id)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
export default JapaneseWordForm;
