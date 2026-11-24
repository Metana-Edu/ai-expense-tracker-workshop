import { useEffect, useState, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import "./App.css";

const SAMPLE_PROMPTS = [
  "Coffee at Starbucks, $6.50",
  "Uber ride to office, $24.00",
  "Comcast Home Internet bill, $75.00",
  "Trader Joe's groceries, $84.50",
];

const CATEGORY_COLORS = {
  "Food & Dining": { bg: "#fef3c7", text: "#92400e" },
  "Transportation": { bg: "#e0e7ff", text: "#3730a3" },
  "Shopping": { bg: "#fce7f3", text: "#9d174d" },
  "Bills & Utilities": { bg: "#fee2e2", text: "#991b1b" },
  "Entertainment": { bg: "#ede9fe", text: "#5b21b6" },
  "Healthcare": { bg: "#dcfce7", text: "#166534" },
  "Education": { bg: "#e0f2fe", text: "#075985" },
  "Travel": { bg: "#ccfbf1", text: "#115e59" },
  "Other": { bg: "#f1f5f9", text: "#475569" },
};

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadExpenses(showSpin = false) {
    if (!isSupabaseConfigured || !supabase) return;

    if (showSpin) setRefreshing(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setExpenses(data || []);
      setError("");
    }
    if (showSpin) setRefreshing(false);
  }

  async function addExpense(e) {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured yet. Check your .env file!");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessNotice("");

    const rawInput = input.trim();
    const { error } = await supabase.from("expenses").insert({
      raw_input: rawInput,
      source: "manual",
      status: "pending",
    });

    if (error) {
      setError(error.message);
    } else {
      setInput("");
      setSuccessNotice("Expense added! n8n webhook is sending it to Gemini AI...");
      setTimeout(() => setSuccessNotice(""), 6000);
      await loadExpenses();
    }

    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    async function fetchExpenses() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (error) {
          setError(error.message);
        } else {
          setExpenses(data || []);
          setError("");
        }
      }
    }

    void fetchExpenses();

    // Polling every 4 seconds to pick up updates from n8n & Gemini
    const interval = setInterval(() => {
      void fetchExpenses();
    }, 4000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [expenses]);

  const completedCount = useMemo(() => {
    return expenses.filter((item) => item.status === "completed").length;
  }, [expenses]);

  const pendingCount = useMemo(() => {
    return expenses.filter(
      (item) => item.status === "pending" || item.status === "needs_review"
    ).length;
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesStatus =
        filterStatus === "all" ? true : item.status === filterStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.merchant && item.merchant.toLowerCase().includes(q)) ||
        (item.raw_input && item.raw_input.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [expenses, filterStatus, searchQuery]);

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="brand-group">
            <img
              src="https://platform.metana.io/_next/image?url=%2Fmetana-logo.png&w=2048&q=75"
              alt="Metana"
              className="brand-logo"
            />
            <span className="badge-workshop">AI Workshop</span>
          </div>

          <div className="nav-actions">
            <div
              className={`connection-pill ${
                isSupabaseConfigured ? "connected" : "disconnected"
              }`}
            >
              <span className="status-dot"></span>
              <span className="pill-prefix">Supabase </span>
              <span>{isSupabaseConfigured ? "Connected" : "Missing"}</span>
            </div>

            <button
              type="button"
              className={`btn-refresh ${refreshing ? "spinning" : ""}`}
              onClick={() => loadExpenses(true)}
              title="Refresh expenses list"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="content-container">
        {/* Environment Alert when not configured */}
        {!isSupabaseConfigured && (
          <div className="alert-card warning">
            <div className="alert-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="alert-body">
              <h3>Supabase Connection Required</h3>
              <p>
                Your frontend is not connected to Supabase yet. Create a{" "}
                <code>.env</code> file in your project root with your project credentials:
              </p>
              <pre className="code-block">
{`VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY`}
              </pre>
              <p className="hint">
                After saving <code>.env</code>, restart Vite with <code>npm run dev</code>.
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <header className="page-header">
          <div className="header-text">
            <span className="sub-heading">AUTOMATED EXPENSE INTELLIGENCE</span>
            <h1>AI Expense Tracker</h1>
            <p>
              Type expenses in natural language or ingest emails. Supabase Webhooks
              trigger n8n to extract structured financial data with Google Gemini AI.
            </p>
          </div>
        </header>

        {/* Statistics Cards */}
        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Recorded Amount</span>
            <div className="stat-value">
              <span className="currency-tag">$</span>
              {totalAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <span className="stat-sub">From {expenses.length} total entries</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">AI Processed</span>
            <div className="stat-value text-success">{completedCount}</div>
            <span className="stat-sub">Structured & categorized by Gemini</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Pending / Processing</span>
            <div className="stat-value text-amber">{pendingCount}</div>
            <span className="stat-sub">In queue or awaiting webhook</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Live Sync Status</span>
            <div className="stat-value sync-indicator">
              <span className="pulse-beacon"></span>
              Active
            </div>
            <span className="stat-sub">Auto-syncing every 4 seconds</span>
          </div>
        </section>

        {/* Add Expense Form Card */}
        <section className="panel-card form-panel">
          <div className="panel-header">
            <div>
              <h2>Add New Expense</h2>
              <p>Describe your expense naturally in plain text or English.</p>
            </div>
          </div>

          <form onSubmit={addExpense} className="expense-form">
            <div className="input-row">
              <div className="input-wrapper">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Coffee at Starbucks, $6.50"
                  disabled={loading}
                  className="expense-input"
                />
                {input && (
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => setInput("")}
                    title="Clear input"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-submit"
              >
                {loading ? (
                  <>
                    <span className="spinner-sm"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span>Add Expense</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Sample Chips */}
            <div className="sample-prompts">
              <span className="sample-title">Try sample:</span>
              <div className="chips-list">
                {SAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chip-btn"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Feedback messages */}
          {error && <div className="notice-banner error-notice">{error}</div>}
          {successNotice && (
            <div className="notice-banner success-notice">
              <span className="check-icon">✓</span> {successNotice}
            </div>
          )}
        </section>

        {/* Expenses List & Table */}
        <section className="panel-card table-panel">
          <div className="table-header-row">
            <div>
              <h2>Recent Expenses</h2>
              <p>Live rows stored in Supabase and enriched by n8n.</p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="table-controls">
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`tab-btn ${filterStatus === "all" ? "active" : ""}`}
                  onClick={() => setFilterStatus("all")}
                >
                  All ({expenses.length})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${
                    filterStatus === "completed" ? "active" : ""
                  }`}
                  onClick={() => setFilterStatus("completed")}
                >
                  Completed ({completedCount})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${
                    filterStatus === "pending" ? "active" : ""
                  }`}
                  onClick={() => setFilterStatus("pending")}
                >
                  Pending ({expenses.filter((x) => x.status === "pending").length})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${
                    filterStatus === "needs_review" ? "active" : ""
                  }`}
                  onClick={() => setFilterStatus("needs_review")}
                >
                  Needs Review (
                  {expenses.filter((x) => x.status === "needs_review").length})
                </button>
              </div>

              <div className="search-box">
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Desktop Table View (min-width: 768px) */}
          <div className="table-responsive desktop-view">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Merchant & Raw Input</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const categoryStyle =
                    CATEGORY_COLORS[expense.category] || CATEGORY_COLORS["Other"];

                  return (
                    <tr key={expense.id} className={`row-${expense.status}`}>
                      <td className="cell-merchant">
                        <div className="merchant-title">
                          {expense.merchant || (
                            <span className="text-unprocessed">
                              {expense.status === "pending"
                                ? "Extracting merchant..."
                                : "Unspecified Merchant"}
                            </span>
                          )}
                        </div>
                        {expense.raw_input && (
                          <div className="raw-snippet" title={expense.raw_input}>
                            "{expense.raw_input}"
                          </div>
                        )}
                        {expense.description && (
                          <div className="desc-snippet">
                            {expense.description}
                          </div>
                        )}
                      </td>

                      <td>
                        {expense.category ? (
                          <span
                            className="category-pill"
                            style={{
                              backgroundColor: categoryStyle.bg,
                              color: categoryStyle.text,
                            }}
                          >
                            {expense.category}
                          </span>
                        ) : (
                          <span className="text-light">—</span>
                        )}
                      </td>

                      <td className="cell-amount">
                        {expense.amount != null ? (
                          <span className="amount-highlight">
                            {expense.currency === "USD" || !expense.currency
                              ? "$"
                              : `${expense.currency} `}
                            {Number(expense.amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-pending-amount">Pending AI</span>
                        )}
                      </td>

                      <td className="cell-date">
                        {expense.expense_date
                          ? expense.expense_date
                          : expense.created_at
                          ? new Date(expense.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>
                        <span className={`source-tag tag-${expense.source || "manual"}`}>
                          {expense.source === "email" ? "Email" : "Manual"}
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge badge-${expense.status}`}>
                          {expense.status === "completed" && (
                            <span className="badge-icon">✓</span>
                          )}
                          {expense.status === "pending" && (
                            <span className="badge-pulse"></span>
                          )}
                          {expense.status === "needs_review" && (
                            <span className="badge-icon">!</span>
                          )}
                          {expense.status === "pending"
                            ? "AI Processing"
                            : expense.status === "needs_review"
                            ? "Needs Review"
                            : "Completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      <div className="empty-box">
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginBottom: "6px" }}
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        <h3>No expenses found</h3>
                        <p>
                          {expenses.length === 0
                            ? "Add your first expense above or send a test email to get started!"
                            : "No expenses match your current search and filter criteria."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< 768px) */}
          <div className="mobile-expense-list mobile-view">
            {filteredExpenses.map((expense) => {
              const categoryStyle =
                CATEGORY_COLORS[expense.category] || CATEGORY_COLORS["Other"];

              return (
                <div
                  key={expense.id}
                  className={`mobile-expense-card card-${expense.status}`}
                >
                  <div className="card-top-row">
                    <div className="card-merchant">
                      {expense.merchant || (
                        <span className="text-unprocessed">
                          {expense.status === "pending"
                            ? "Extracting merchant..."
                            : "Unspecified Merchant"}
                        </span>
                      )}
                    </div>
                    <div className="card-amount">
                      {expense.amount != null ? (
                        <span className="amount-highlight">
                          {expense.currency === "USD" || !expense.currency
                            ? "$"
                            : `${expense.currency} `}
                          {Number(expense.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-pending-amount">Pending AI</span>
                      )}
                    </div>
                  </div>

                  {expense.raw_input && (
                    <div className="card-raw-snippet">
                      "{expense.raw_input}"
                    </div>
                  )}

                  {expense.description && (
                    <div className="card-desc-snippet">
                      {expense.description}
                    </div>
                  )}

                  <div className="card-meta-row">
                    <div className="card-tags-group">
                      {expense.category && (
                        <span
                          className="category-pill"
                          style={{
                            backgroundColor: categoryStyle.bg,
                            color: categoryStyle.text,
                          }}
                        >
                          {expense.category}
                        </span>
                      )}
                      <span className={`source-tag tag-${expense.source || "manual"}`}>
                        {expense.source === "email" ? "Email" : "Manual"}
                      </span>
                      <span className="card-date">
                        {expense.expense_date
                          ? expense.expense_date
                          : expense.created_at
                          ? new Date(expense.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>

                    <div className="card-status-wrapper">
                      <span className={`status-badge badge-${expense.status}`}>
                        {expense.status === "completed" && (
                          <span className="badge-icon">✓</span>
                        )}
                        {expense.status === "pending" && (
                          <span className="badge-pulse"></span>
                        )}
                        {expense.status === "needs_review" && (
                          <span className="badge-icon">!</span>
                        )}
                        {expense.status === "pending"
                          ? "AI Processing"
                          : expense.status === "needs_review"
                          ? "Needs Review"
                          : "Completed"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredExpenses.length === 0 && (
              <div className="empty-state">
                <div className="empty-box">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: "6px" }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <h3>No expenses found</h3>
                  <p>
                    {expenses.length === 0
                      ? "Add your first expense above or send a test email to get started!"
                      : "No expenses match your current search and filter criteria."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="page-footer">
        <p>
          Metana AI Engineering Workshop • Powered by React, Supabase, n8n & Google Gemini
        </p>
      </footer>
    </div>
  );
}
