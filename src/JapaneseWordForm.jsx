const STORAGE_KEY = "japanese-words";
function JapaneseWordForm({ setPage }) {
  return (
    <main className="app">
      <section className="home-panel">
        <button
          className="back-button"
          type="button"
          onClick={() => setPage("home")}
        >
          언어 리스트
        </button>
        <div className="app-header">
          <p className="eyebrow">My Japanese dictionary</p>
          <h1>일본어 단어장</h1>
        </div>
      </section>
    </main>
  );
}
export default JapaneseWordForm;
