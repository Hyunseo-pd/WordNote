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

  const languages = Object.values(LANGUAGE_CONFIGS);

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

  const languageId = page.replace("-flashcards", "");
  const selectedLanguage = LANGUAGE_CONFIGS[languageId];

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

  if (page.endsWith("-flashcards")) {
    return <Flashcards setPage={setPage} languageConfig={selectedLanguage} />;
  } else if (page !== "home") {
    return (
      <BasicWordForm setPage={setPage} languageConfig={selectedLanguage} />
    );
  }
}
export default App;
