import { useState, useEffect } from "react";
import "./App.css";

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

import BasicWordForm from "./BasicWordForm.jsx";
import GermanFlashcards from "./GermanFlashcards.jsx";

const LANGUAGES = [
  {
    id: "japanese",
    label: "일본어",
    collection: "japanesewords",
    eyebrow: "My Japanese dictionary",
  },
  {
    id: "german",
    label: "독일어",
    collection: "germanwords",
    eyebrow: "My Deutsch dictionary",
  },
  {
    id: "english",
    label: "영어",
    collection: "englishwords",
    eyebrow: "My English dictionary",
  },
];

function App() {
  const [page, setPage] = useState("home");
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [wordCounts, setWordCounts] = useState({});

  useEffect(() => {
    if (page !== "home") {
      return;
    }

    async function loadWordCounts() {
      try {
        const loadedCounts = await Promise.all(
          LANGUAGES.map(async (language) => {
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
  }, [page]);

  const selectedLanguage = LANGUAGES.find((language) => language.id === page);

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
              {LANGUAGES.map((language) => (
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
            {LANGUAGES.map((language) => (
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

  if (page === "german-cards") {
    return <GermanFlashcards setPage={setPage} />;
  }

  if (selectedLanguage) {
    return <BasicWordForm language={selectedLanguage} setPage={setPage} />;
  }
}
export default App;
