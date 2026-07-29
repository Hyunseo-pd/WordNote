import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";

const FIELD_LABELS = {
  Imperfekt: "단순과거",
  Präteritum: "단순과거",
  perfekt: "과거분사",
  partizip2: "과거분사",
  auxiliary: "보조동사",
  comparative: "비교급",
  plural: "복수형",
};

const formatMeaningDisplay = (meaningItem, shouldShowUsage) => {
  if (typeof meaningItem === "string") {
    return meaningItem;
  }

  if (!shouldShowUsage) {
    return meaningItem.meaning;
  }

  const usage = [meaningItem.preposition, meaningItem.caseType]
    .filter(Boolean)
    .join("+");

  return usage ? `${usage}: ${meaningItem.meaning}` : meaningItem.meaning;
};

const getFieldRows = (fields = {}) =>
  Object.entries(fields).flatMap(([name, value]) => {
    if (!value || name === "gender") {
      return [];
    }

    if (name === "partizip2" && fields.auxiliary) {
      return [
        {
          name,
          label: FIELD_LABELS[name] ?? name,
          value: `${fields.auxiliary} ${value}`,
        },
      ];
    }

    if (name === "auxiliary") {
      return [];
    }

    return [{ name, label: FIELD_LABELS[name] ?? name, value }];
  });

function GermanFlashcards({ setPage }) {
  const [words, setWords] = useState([]);
  const [flippedIds, setFlippedIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadWords() {
      try {
        const snapshot = await getDocs(collection(db, "germanwords"));
        const loadedWords = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setWords(loadedWords);
      } catch (error) {
        console.error("단어 불러오기 실패:", error);
      }
    }

    loadWords();
  }, []);

  const filteredWords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");

    if (!normalizedQuery) {
      return words;
    }

    return words.filter((item) => {
      const searchableText = [
        item.word,
        item.part,
        ...(item.meanings ?? []).flatMap((meaningItem) =>
          typeof meaningItem === "string"
            ? [meaningItem]
            : [
                meaningItem.preposition,
                meaningItem.caseType,
                meaningItem.meaning,
              ],
        ),
        ...Object.values(item.fields ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ko-KR");

      return searchableText.includes(normalizedQuery);
    });
  }, [searchQuery, words]);

  const toggleCard = (id) => {
    setFlippedIds((prevIds) => {
      const nextIds = new Set(prevIds);

      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }

      return nextIds;
    });
  };
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % words.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  };
  const item = words[currentIndex];
  if (!item) return null;
  const fields = item.fields ?? {};
  const isFlipped = flippedIds.has(item.id);
  const meanings = item.meanings ?? [];
  const title = `${fields.gender ? `${fields.gender} ` : ""}${item.word}`;
  return (
    <main className="app">
      <section className="word-panel flashcard-panel">
        <div className="panel-actions">
          <button
            className="back-button"
            type="button"
            onClick={() => setPage("home")}
          >
            언어 리스트
          </button>
          <button
            className="back-button"
            type="button"
            onClick={() => setPage("german")}
          >
            단어장 편집
          </button>
        </div>

        <div className="app-header">
          <p className="eyebrow">Deutsch flashcards</p>
          <h1>독일어 카드</h1>
        </div>

        <div className="word-list-header">
          <h2>학습 카드</h2>
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
          <p className="empty-message">아직 저장한 독일어 단어가 없습니다.</p>
        ) : (
          <div key={item.id}>
            <button onClick={prevCard}>previous</button>
            <button
              className={`flashcard ${isFlipped ? "is-flipped" : ""}`}
              type="button"
              onClick={() => toggleCard(item.id)}
              aria-pressed={isFlipped}
            >
              /*앞면*/
              <span className="flashcard-face flashcard-front">
                <strong>{title}</strong>
                {fields.plural && <small>-{fields.plural}</small>}
              </span>
              /*뒷면*/
              <span className="flashcard-face flashcard-back">
                <strong>{title}</strong>
                <span className="flashcard-meanings">
                  {meanings.map((meaningItem, index) => (
                    <span key={index}>
                      {formatMeaningDisplay(meaningItem, item.part === "동사")}
                    </span>
                  ))}
                </span>
                {getFieldRows(fields).map((field) => (
                  <span key={field.name} className="flashcard-detail">
                    {field.label}: {field.value}
                  </span>
                ))}
                {item.part && (
                  <span className="flashcard-part">{item.part}</span>
                )}
              </span>
            </button>
            <button onClick={nextCard}>next</button>
          </div>
        )}
      </section>
    </main>
  );
}

export default GermanFlashcards;
