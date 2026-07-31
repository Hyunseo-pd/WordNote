import { useEffect, useRef, useState } from "react";
import "./App.css";
import { doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { sortWordsBySavedAt } from "./wordSorting";

const PARTS_OF_SPEECH = ["명사", "동사", "형용사", "부사"];

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

function BasicWordForm({ language, setPage }) {
  const fileInputRef = useRef(null);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [part, setPart] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [words, setWords] = useState([]);

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const filteredWords = normalizedSearchQuery
    ? words.filter((item) => {
        const searchableText = [
          item.word,
          getMeaningText(item),
          item.part,
          item.createdAt,
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
      fields: {},
      savedAt,
      createdAt: new Date().toLocaleDateString("ko-KR"),
    };

    setWords((prevWords) => [newWord, ...prevWords]);
    setWord("");
    setMeaning("");
    setPart("");
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
              {PARTS_OF_SPEECH.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={part === item ? "selected" : ""}
                  onClick={() => setPart(item)}
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
            {filteredWords.map((item) => (
              <li key={item.id} className="word-item">
                <div>
                  <strong>{item.word}</strong>
                  <p>{getMeaningText(item)}</p>
                  {item.part && <p className="word-part">{item.part}</p>}
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
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default BasicWordForm;
