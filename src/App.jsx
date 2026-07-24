import { useState } from "react";
import "./App.css";
import { doc, setDoc, deletedoc } from "firebase/firestore";
import { db } from "./firebase";

import GermanWordForm from "./GermanWordForm.jsx";
import JapaneseWordForm from "./JapaneseWordForm.jsx";

const GERMAN_STORAGE_KEY = "german-words";
const JAPANESE_STORAGE_KEY = "japanese-words";

function App() {
  const [page, setPage] = useState("home");
  const [Germanwords, setWordsGerman] = useState(() => {
    const savedWordsGerman = localStorage.getItem(GERMAN_STORAGE_KEY);

    return savedWordsGerman ? JSON.parse(savedWordsGerman) : [];
  });

  const [Japanesewords, setWordsJapanese] = useState(() => {
    const savedWordsJapanese = localStorage.getItem(JAPANESE_STORAGE_KEY);

    return savedWordsJapanese ? JSON.parse(savedWordsJapanese) : [];
  });
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

  if (page === "japanese") {
    return <JapaneseWordForm setPage={setPage} />;
  }
}
export default App;
