import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

import { LANGUAGE_CONFIGS } from "./language";
import BasicWordForm from "./BasicWordForm.jsx";
import Flashcards from "./Flashcards.jsx";

function App() {
  const [page, setPage] = useState("home");
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [wordCounts, setWordCounts] = useState({});
  const [currentLanguages, setCurrentLanguages] = useState([]);
  const [newLanguage, setNewLanguage] = useState(null);
  const [openedMenu, setOpenedMenu] = useState(null);

  const languages = useMemo(() => Object.values(LANGUAGE_CONFIGS), []);
  const visibleLanguages = useMemo(() => {
    if (!newLanguage || currentLanguages.includes(newLanguage)) {
      return currentLanguages;
    }

    return [...currentLanguages, newLanguage];
  }, [currentLanguages, newLanguage]);

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
        const nextWordCounts = Object.fromEntries(loadedCounts);

        setCurrentLanguages(
          Object.keys(nextWordCounts).filter(
            (languageId) => nextWordCounts[languageId] > 0,
          ),
        );
        setWordCounts(nextWordCounts);
        setNewLanguage(null);
      } catch (error) {
        console.error("단어장 불러오기 실패:", error);
      }
    }

    loadWordCounts();
  }, [page, languages]);

  const languageId = page.replace("-flashcards", "");
  const selectedLanguage = LANGUAGE_CONFIGS[languageId];

  const addLanguage = (languageId) => {
    if (currentLanguages.includes(languageId) || newLanguage === languageId) {
      alert("이미 추가된 단어장입니다.");
      return;
    }

    setNewLanguage(languageId);
    setIsLanguagePickerOpen(false);
  };

  const deleteLanguage = async (languageId) => {
    const language = LANGUAGE_CONFIGS[languageId];

    if (!language || !window.confirm("이 단어장을 삭제할까요?")) {
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, language.collection));

      await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));

      setCurrentLanguages((prevLanguages) =>
        prevLanguages.filter(
          (currentLanguageId) => currentLanguageId !== languageId,
        ),
      );
      setWordCounts((prevCounts) => ({
        ...prevCounts,
        [languageId]: 0,
      }));

      if (newLanguage === languageId) {
        setNewLanguage(null);
      }
    } catch (error) {
      console.error("단어장 삭제 실패:", error);
      window.alert("단어장을 삭제하지 못했습니다. 다시 시도해주세요.");
    }
  };

  if (page === "home") {
    return (
      <main className="app">
        <section className="home-panel">
          <div className="app-header">
            <p className="eyebrow">My Language Mate</p>
            <h1>LANGT</h1>
          </div>

          <button
            className="add-notebook-button"
            type="button"
            onClick={() =>
              setIsLanguagePickerOpen((currentValue) => !currentValue)
            }
          >
            언어 추가하기
          </button>

          {isLanguagePickerOpen && (
            <div className="language-picker" aria-label="언어 선택">
              {languages.map((language) => (
                <button
                  key={language.id}
                  className="language-choice-button"
                  type="button"
                  onClick={() => addLanguage(language.id)}
                >
                  {language.label}
                </button>
              ))}
            </div>
          )}

          <div className="language-list">
            {visibleLanguages.map((languageId) => {
              const language = LANGUAGE_CONFIGS[languageId];
              const isNewLanguage = languageId === newLanguage;

              return (
                <div key={languageId} className="language-item">
                  <button
                    key={languageId}
                    className="language-button"
                    type="button"
                    onClick={() => setPage(languageId)}
                  >
                    <span>{language.label} 단어장</span>
                    <small>
                      {isNewLanguage
                        ? "새 단어장"
                        : `${wordCounts[languageId] ?? 0}개 저장됨`}
                    </small>
                  </button>

                  <button
                    type="button"
                    className="menu"
                    onClick={() =>
                      setOpenedMenu(
                        openedMenu === language.id ? null : language.id,
                      )
                    }
                  >
                    ⋮
                  </button>
                  {openedMenu === language.id && (
                    <div className="menu-dropdown">
                      <button
                        type="button"
                        className="menu-item-delete"
                        onClick={() => {
                          deleteLanguage(language.id);
                          setOpenedMenu(null);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
