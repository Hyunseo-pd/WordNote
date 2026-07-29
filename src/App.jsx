import { useState, useEffect } from "react";
import "./App.css";

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

import GermanFlashcards from "./GermanFlashcards.jsx";
import GermanWordForm from "./GermanWordForm.jsx";
import JapaneseWordForm from "./JapaneseWordForm.jsx";

function App() {
  const [page, setPage] = useState("home");
  const [Japanesewords, setJapanesewords] = useState([]);
  const [Germanwords, setGermanwords] = useState([]);

  useEffect(() => {
    async function loadWords() {
      try {
        const snapshot = await getDocs(collection(db, "japanesewords"));

        const loadedWords = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setJapanesewords(loadedWords);
      } catch (error) {
        console.error("단어 불러오기 실패:", error);
      }
    }

    loadWords();
  }, []);
  useEffect(() => {
    async function loadWords() {
      try {
        const snapshot = await getDocs(collection(db, "germanwords"));

        const loadedWords = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setGermanwords(loadedWords);
      } catch (error) {
        console.error("단어 불러오기 실패:", error);
      }
    }

    loadWords();
  }, []);
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
              <small>{Germanwords.length}개 저장됨</small>
            </button>
            <button
              className="language-button"
              type="button"
              onClick={() => setPage("german-cards")}
            >
              <span>독일어 카드 보기</span>
              <small>{Germanwords.length}개 학습</small>
            </button>
            <button
              className="language-button"
              type="button"
              onClick={() => setPage("japanese")}
            >
              <span>일본어 단어장</span>
              <small>{Japanesewords.length}개 저장됨</small>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (page === "german") {
    return <GermanWordForm setPage={setPage} />;
  }

  if (page === "german-cards") {
    return <GermanFlashcards setPage={setPage} />;
  }

  if (page === "japanese") {
    return <JapaneseWordForm setPage={setPage} />;
  }
}
export default App;
