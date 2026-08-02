import { useState, useEffect, useMemo } from "react";
import "./App.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

import { LANGUAGE_CONFIGS } from "./language";
import BasicWordForm from "./BasicWordForm.jsx";
import Flashcards from "./Flashcards.jsx";

function App() {
  const [page, setPage] = useState("home");
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [wordCounts, setWordCounts] = useState({});
  const languages = useMemo(() => Object.values(LANGUAGE_CONFIGS), []);
  const flashcardLanguageId = page.endsWith("-flashcards")
    ? page.replace("-flashcards", "")
    : "";

  useEffect(() => {
    if (page !== "home") {
      return;
    }

    async function loadWordCounts() {
      try {
        const loadedCounts = await Promise.all(
          languages.map(async (language) => {
            const snapshot = await getDocs(collection(db, language.collection));

            return [language.id, snapshot.size];
          }),
        );

        setWordCounts(Object.fromEntries(loadedCounts));
      } catch (error) {
        console.error("단어 불러오기 실패:", error);
      }
    }

    loadWordCounts();
  }, [page, languages]);

  const selectedLanguage = LANGUAGE_CONFIGS[page];
  const flashcardLanguage = LANGUAGE_CONFIGS[flashcardLanguageId];

  if (page === "home") {
    return (
      <main className="app">
        <section className="home-panel">
          <div className="app-header">
            <p className="eyebrow">Language notebook</p>
            <h1>단어장</h1>
          </div>

          <button
            className="add-notebook-button"
            type="button"
            onClick={() =>
              setIsLanguagePickerOpen((currentValue) => !currentValue)
            }
          >
            단어장 추가하기
          </button>

          {isLanguagePickerOpen && (
            <div className="language-picker" aria-label="언어 선택">
              {languages.map((language) => (
                <button
                  key={language.id}
                  className="language-choice-button"
                  type="button"
                  onClick={() => setPage(language.id)}
                >
                  {language.label}
                </button>
              ))}
            </div>
          )}

          <div className="language-list">
            {languages.map((language) => (
              <button
                key={language.id}
                className="language-button"
                type="button"
                onClick={() => setPage(language.id)}
              >
                <span>{language.label} 단어장</span>
                <small>{wordCounts[language.id] ?? 0}개 저장됨</small>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }
  if (selectedLanguage) {
    return (
      <BasicWordForm setPage={setPage} languageConfig={selectedLanguage} />
    );
  }

  if (flashcardLanguage) {
    return <Flashcards setPage={setPage} languageConfig={flashcardLanguage} />;
  }
}
export default App;
