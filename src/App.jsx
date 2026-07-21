import { useState } from "react";
import "./App.css";

import GermanWordForm from "./GermanWordForm.jsx";
import JapaneseWordForm from "./JapaneseWordForm.jsx";

const STORAGE_KEY = "language-app-words";

function App() {
  const [page, setPage] = useState("home");
  const [words, setWords] = useState(() => {
    const savedWords = localStorage.getItem(STORAGE_KEY);
    return savedWords ? JSON.parse(savedWords) : [];
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
              <small>{words.length}개 저장됨</small>
            </button>
            <button
              className="language-button"
              type="button"
              onClick={() => setPage("japanese")}
            >
              <span>일본어 단어장</span>
              <small>{words.length}개 저장됨</small>
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
