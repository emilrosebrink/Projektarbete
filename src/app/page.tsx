"use client";
import { useState } from "react";
import styles from "./page.module.css";
import SearchTypeSelect from "@/components/SearchTypeSelect/SearchTypeSelect";
import SearchInput from "@/components/SearchInput/SearchInput";
import { Button } from "@/components/button";
import { Trash2, Check, X, FileJson } from "lucide-react";
import type { HighlightToken } from "@/lib/fuzzy";

type SearchResult = {
  source: string;
  documentId: string;
  matchedTypes: string[];
  allFields: { type: string; value: string }[];
};

type FuzzyMatch = {
  source: string;
  documentId: string;
  matches: {
    type: string;
    searchedFor: string;
    actualValue: string;
    tokens: HighlightToken[];
  }[];
  allFields: { type: string; value: string }[];
};

export default function Home() {
  const [searchFields, setSearchFields] = useState([
    { id: 0, type: "", value: "" },
  ]);

  const updateSearchFieldType = (id: number, type: string) => {
    setSearchFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, type } : field)),
    );
  };

  const removeSearchField = (id: number) => {
    setSearchFields((prev) => prev.filter((f) => f.id !== id));
  };

  const addSearchField = () => {
    setSearchFields((prev) => [
      ...prev,
      { id: Date.now(), type: "", value: "" },
    ]);
  };

  const selectedTypes = new Set(
    searchFields.map((f) => f.type).filter(Boolean),
  );

  const toggleTypeFromDropdown = (type: string) => {
    if (selectedTypes.has(type)) {
      setSearchFields((prev) => prev.filter((f) => f.type !== type));
    } else {
      setSearchFields((prev) => [
        ...prev,
        { id: Date.now(), type, value: "" },
      ]);
    }
  };

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [jsonView, setJsonView] = useState<{
    source: string;
    documentId: string;
  } | null>(null);
  const [jsonData, setJsonData] = useState<unknown>(null);
  const [maskingIndex, setMaskingIndex] = useState<number | null>(null);
  const [selectedMaskFields, setSelectedMaskFields] = useState<Set<number>>(
    new Set(),
  );
  const [confirmMaskAll, setConfirmMaskAll] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [dryRunNotice, setDryRunNotice] = useState<string | null>(null);

  const startMasking = (index: number) => {
    setMaskingIndex(index);
    setSelectedMaskFields(new Set());
    setConfirmMaskAll(false);
  };

  const cancelMasking = () => {
    setMaskingIndex(null);
    setSelectedMaskFields(new Set());
    setConfirmMaskAll(false);
  };

  const toggleMaskField = (fieldIndex: number) => {
    setSelectedMaskFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldIndex)) {
        next.delete(fieldIndex);
      } else {
        next.add(fieldIndex);
      }
      return next;
    });
  };

  const maskAllFields = async (resultIndex: number) => {
    const result = results[resultIndex];
    const unmaskedFields = result.allFields.filter((f) => f.value !== "XXXXX");
    const fieldTypes = unmaskedFields.map((f) => f.type);

    if (!dryRun) {
      setResults((prev) =>
        prev.map((r, ri) =>
          ri === resultIndex
            ? {
                ...r,
                allFields: r.allFields.map((f) => ({ ...f, value: "XXXXX" })),
              }
            : r,
        ),
      );
    }
    cancelMasking();

    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: result.source,
        documentId: result.documentId,
        fieldTypes,
        dryRun,
      }),
    });

    if (dryRun) {
      setDryRunNotice(
        `Dry run: ${fieldTypes.join(", ")} skulle maskerats i ${result.source}`,
      );
      setTimeout(() => setDryRunNotice(null), 4000);
    }
  };

  const applyMasking = async (resultIndex: number) => {
    const result = results[resultIndex];
    const fieldTypes = result.allFields
      .filter((_, fi) => selectedMaskFields.has(fi))
      .map((f) => f.type);

    if (!dryRun) {
      setResults((prev) =>
        prev.map((r, ri) =>
          ri === resultIndex
            ? {
                ...r,
                allFields: r.allFields.map((f, fi) =>
                  selectedMaskFields.has(fi) ? { ...f, value: "XXXXX" } : f,
                ),
              }
            : r,
        ),
      );
    }
    cancelMasking();

    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: result.source,
        documentId: result.documentId,
        fieldTypes,
        dryRun,
      }),
    });

    if (dryRun) {
      setDryRunNotice(
        `Dry run: ${fieldTypes.join(", ")} skulle maskerats i ${result.source}`,
      );
      setTimeout(() => setDryRunNotice(null), 4000);
    }
  };

  const [fuzzyResults, setFuzzyResults] = useState<FuzzyMatch[]>([]);

  const acceptFuzzyResult = (index: number) => {
    const fuzzy = fuzzyResults[index];
    const newResult: SearchResult = {
      source: fuzzy.source,
      documentId: fuzzy.documentId,
      matchedTypes: fuzzy.matches.map((m) => m.type),
      allFields: fuzzy.allFields,
    };
    setResults((prev) => [...prev, newResult]);
    setFuzzyResults((prev) => prev.filter((_, i) => i !== index));
  };

  const rejectFuzzyResult = (index: number) => {
    setFuzzyResults((prev) => prev.filter((_, i) => i !== index));
  };

  const performSearch = async () => {
    const validFields = searchFields.filter(
      (field) => field.type && field.value.trim(),
    );

    if (validFields.length === 0) {
      setResults([]);
      setFuzzyResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: validFields.map((f) => ({ type: f.type, value: f.value })),
        }),
      });
      const data = await res.json();
      setResults(data.results);
      setFuzzyResults(data.fuzzyResults);
    } finally {
      setIsSearching(false);
    }
  };

  const openJsonView = async (source: string, documentId: string) => {
    setJsonView({ source, documentId });
    const res = await fetch(
      `/api/documents?source=${encodeURIComponent(source)}&id=${encodeURIComponent(documentId)}`,
    );
    const data = await res.json();
    setJsonData(data.data);
  };

  const closeJsonView = () => {
    setJsonView(null);
    setJsonData(null);
  };

  const fieldLabel = (type: string) =>
    ({
      phone: "Telefon",
      email: "E-post",
      name: "Namn",
      address: "Adress",
      memberId: "Medlemsnummer",
      personalIdentityNumber: "Personnummer",
      orderNumber: "Ordernummer",
    })[type] ?? type;

  return (
    <main>
      <img src="/icons/mio-small.svg" alt="Mio" className={styles.logo} />

      <div className={styles.box}>
        <h1>Sök personuppgifter</h1>
        <p className={styles.description}>
          Ange ett eller flera sökkriterier för att hitta och hantera
          personuppgifter.
        </p>

        <div className={styles.formContent}>
          {searchFields.map((field) => (
            <div key={field.id} className={styles.searchRow}>
              <SearchTypeSelect
                value={field.type}
                onChange={(newType) => updateSearchFieldType(field.id, newType)}
                selectedTypes={selectedTypes}
                onToggle={toggleTypeFromDropdown}
              />

              <SearchInput
                value={field.value}
                onChange={(value) =>
                  setSearchFields((prev) =>
                    prev.map((f) => (f.id === field.id ? { ...f, value } : f)),
                  )
                }
                onEnter={() => performSearch()}
              />

              {searchFields.length > 1 && (
                <span
                  className={styles.deleteButton}
                  onClick={() => removeSearchField(field.id)}
                >
                  <Trash2 />
                </span>
              )}
            </div>
          ))}

          <div className={styles.buttonRow}>
            <Button className={styles.addButton} onClick={addSearchField}>
              Lägg till sökfält
            </Button>

            <Button
              className={styles.searchButton}
              onClick={() => performSearch()}
              disabled={isSearching}
            >
              {isSearching ? "Söker..." : "Sök"}
            </Button>

            <label className={styles.dryRunToggle}>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry run (maskera ej på riktigt)
            </label>
          </div>

          {fuzzyResults.length > 0 && (
            <div className={styles.fuzzyCard}>
              <div className={styles.resultHeader}>
                <h2 className={styles.fuzzyTitle}>Potentiella träffar</h2>
                <span className={styles.fuzzySubtitle}>
                  Baserat på liknande stavning
                </span>
              </div>

              <div className={styles.resultsGrid}>
                {fuzzyResults.map((r, index) => (
                  <div
                    key={`fuzzy-${r.source}-${index}`}
                    className={styles.fuzzyItem}
                  >
                    <div className={styles.resultContent}>
                      <div className={styles.resultSource}>{r.source}</div>
                      <div className={styles.resultDetails}>
                        {r.allFields.map((f, fi) => {
                          const fuzzyMatch = r.matches.find(
                            (m) => m.type === f.type,
                          );
                          return (
                            <div key={fi} className={styles.resultField}>
                              <span
                                className={`${styles.fieldLabel} ${fuzzyMatch ? styles.fieldLabelMatched : ""}`}
                              >
                                {fieldLabel(f.type)}
                              </span>
                              {fuzzyMatch ? (
                                <>
                                  <span className={styles.fieldValue}>
                                    {fuzzyMatch.tokens.map((token, ti) =>
                                      token.fuzzy ? (
                                        <mark
                                          key={ti}
                                          className={styles.fuzzyHighlight}
                                        >
                                          {token.text}
                                        </mark>
                                      ) : (
                                        <span key={ti}>{token.text}</span>
                                      ),
                                    )}
                                  </span>
                                  <span className={styles.fuzzyHint}>
                                    sökte: "{fuzzyMatch.searchedFor}"
                                  </span>
                                </>
                              ) : (
                                <span className={styles.fieldValue}>
                                  {f.value}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={styles.fuzzyActions}>
                      <button
                        className={styles.acceptButton}
                        title="Ja, detta är rätt person"
                        onClick={() => acceptFuzzyResult(index)}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className={styles.rejectButton}
                        title="Nej, detta är fel person"
                        onClick={() => rejectFuzzyResult(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <h2 className={styles.resultTitle}>Sökresultat</h2>
                {results.length > 1 && (
                  <span className={styles.sourceCountBadge}>
                    Hittad i {results.length} källor
                  </span>
                )}
              </div>

              <div className={styles.sourcesGrid}>
                {results.map((r, index) => (
                  <div
                    key={`${r.source}-${r.documentId}-${index}`}
                    className={styles.sourceItem}
                  >
                    <div className={styles.resultContent}>
                      <div className={styles.resultSource}>{r.source}</div>
                      <div className={styles.resultDetails}>
                        {r.allFields.map((f, fi) => {
                          const isMatched = r.matchedTypes.includes(f.type);
                          const isMasked = f.value === "XXXXX";
                          return (
                            <div
                              key={fi}
                              className={`${styles.resultField} ${isMatched ? styles.resultFieldMatched : ""} ${isMasked ? styles.resultFieldMasked : ""}`}
                            >
                              {maskingIndex === index && !isMasked && (
                                <input
                                  type="checkbox"
                                  className={styles.maskCheckbox}
                                  checked={selectedMaskFields.has(fi)}
                                  onChange={() => toggleMaskField(fi)}
                                />
                              )}
                              <span
                                className={`${styles.fieldLabel} ${isMatched ? styles.fieldLabelMatched : ""}`}
                              >
                                {fieldLabel(f.type)}
                              </span>
                              <span
                                className={`${styles.fieldValue} ${isMasked ? styles.fieldValueMasked : ""}`}
                              >
                                {f.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {maskingIndex === index ? (
                      <div className={styles.maskActions}>
                        <div className={styles.maskActionsButtons}>
                          {confirmMaskAll ? (
                            <>
                              <button
                                className={styles.confirmButton}
                                onClick={() => maskAllFields(index)}
                              >
                                Ja, maskera allt
                              </button>
                              <button
                                className={styles.cancelButton}
                                onClick={() => setConfirmMaskAll(false)}
                              >
                                Avbryt
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className={styles.confirmButton}
                                disabled={selectedMaskFields.size === 0}
                                onClick={() => applyMasking(index)}
                              >
                                Maskera valda
                              </button>
                              <button
                                className={styles.maskAllButton}
                                onClick={() => setConfirmMaskAll(true)}
                              >
                                Maskera all information
                              </button>
                              <button
                                className={styles.cancelButton}
                                onClick={cancelMasking}
                              >
                                Avbryt
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.resultActions}>
                        <button
                          className={styles.jsonViewButton}
                          title="Visa JSON"
                          onClick={() =>
                            openJsonView(r.source, r.documentId)
                          }
                        >
                          <FileJson size={13} />
                          Visa JSON
                        </button>
                        <span
                          className={styles.maskResultButton}
                          title="Maskera fält"
                          onClick={() => startMasking(index)}
                        >
                          Maskera fält
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {jsonView &&
        (() => {
          return (
            <div
              className={styles.modalOverlay}
              onClick={closeJsonView}
            >
              <div
                className={styles.modalBox}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <span className={styles.modalTitle}>{jsonView.source}</span>
                  <button
                    className={styles.modalClose}
                    onClick={closeJsonView}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <pre className={styles.jsonPre}>
                    {jsonData
                      ? JSON.stringify(jsonData, null, 2)
                      : "Laddar..."}
                  </pre>
                </div>
              </div>
            </div>
          );
        })()}

      {dryRunNotice && (
        <div className={styles.dryRunNotice}>{dryRunNotice}</div>
      )}
    </main>
  );
}
