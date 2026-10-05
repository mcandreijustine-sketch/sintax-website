import { useEffect, useState } from "react";
import {
    ref,
    onValue
} from "firebase/database";

import { database } from "../firebase";

import "../css/reports.css";
import AdminBar from "../components/AdminBar";

function Reports() {
    const [feedbackData, setFeedbackData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const feedbackRef = ref(database, "feedback");

        const unsubscribe = onValue(
            feedbackRef,

            (snapshot) => {
                const data = snapshot.val();

                console.log("Feedback data from Firebase:", data);

                if (data) {
                    const feedbackArray = Object.entries(data).map(
                        ([id, item]) => ({
                            id,
                            ...item
                        })
                    );

                    feedbackArray.sort((a, b) => {
                        const dateA = new Date(a.date || 0);
                        const dateB = new Date(b.date || 0);

                        return dateB - dateA;
                    });

                    setFeedbackData(feedbackArray);
                } else {
                    setFeedbackData([]);
                }

                setErrorMessage("");
                setLoading(false);
            },

            (error) => {
                console.error(
                    "Firebase feedback error:",
                    error
                );

                setErrorMessage(
                    error.message ||
                    "Unable to load feedback."
                );

                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const filteredFeedback = feedbackData.filter(
        (item) => {
            const value = search
                .trim()
                .toLowerCase();

            if (!value) {
                return true;
            }

            return (
                item.email
                    ?.toLowerCase()
                    .includes(value) ||
                item.feedback
                    ?.toLowerCase()
                    .includes(value)
            );
        }
    );

    const uniquePlayers = new Set(
        feedbackData
            .map((item) => item.user_id)
            .filter(Boolean)
    ).size;

    const thisMonthCount = feedbackData.filter(
        (item) => {
            if (!item.date) {
                return false;
            }

            const feedbackDate = new Date(item.date);
            const today = new Date();

            return (
                feedbackDate.getMonth() ===
                    today.getMonth() &&
                feedbackDate.getFullYear() ===
                    today.getFullYear()
            );
        }
    ).length;

    const todayCount = feedbackData.filter(
        (item) => {
            if (!item.date) {
                return false;
            }

            const feedbackDate = new Date(item.date);
            const today = new Date();

            return (
                feedbackDate.getDate() ===
                    today.getDate() &&
                feedbackDate.getMonth() ===
                    today.getMonth() &&
                feedbackDate.getFullYear() ===
                    today.getFullYear()
            );
        }
    ).length;

    const formatDate = (dateString) => {
        if (!dateString) {
            return "No date";
        }

        const parsedDate = new Date(dateString);

        if (Number.isNaN(parsedDate.getTime())) {
            return dateString;
        }

        return parsedDate.toLocaleString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );
    };

    const getInitial = (email) => {
        if (!email) {
            return "?";
        }

        return email
            .charAt(0)
            .toUpperCase();
    };

    return (
        <div className="reports-page">
            <AdminBar />

            <main className="reports-content">

                {/* HEADER */}
                <div className="reports-header">
                    <div>
                        <span className="reports-tag">
                            PLAYER FEEDBACK
                        </span>

                        <h1>
                            Feedback
                        </h1>

                        <p>
                            View feedback submitted directly
                            by players from the SINTAX game.
                        </p>
                    </div>
                </div>

                {/* STATISTICS */}
                <section className="reports-stats">

                    <div className="report-stat-card">
                        <span className="stat-label">
                            TOTAL FEEDBACK
                        </span>

                        <h2>
                            {feedbackData.length}
                        </h2>

                        <p>
                            Total feedback received
                        </p>
                    </div>

                    <div className="report-stat-card">
                        <span className="stat-label">
                            PLAYERS
                        </span>

                        <h2>
                            {uniquePlayers}
                        </h2>

                        <p>
                            Players who submitted feedback
                        </p>
                    </div>

                    <div className="report-stat-card">
                        <span className="stat-label">
                            THIS MONTH
                        </span>

                        <h2>
                            {thisMonthCount}
                        </h2>

                        <p>
                            Feedback submitted this month
                        </p>
                    </div>

                    <div className="report-stat-card">
                        <span className="stat-label">
                            TODAY
                        </span>

                        <h2>
                            {todayCount}
                        </h2>

                        <p>
                            Feedback submitted today
                        </p>
                    </div>

                </section>

                {/* FEEDBACK PANEL */}
                <section className="reports-panel">

                    <div className="tab-content">

                        <div className="section-title">

                            <div>
                                <h2>
                                    Recent Player Feedback
                                </h2>

                                <p>
                                    Feedback submitted directly
                                    from the game.
                                </p>
                            </div>

                            <input
                                type="text"
                                className="report-filter"
                                placeholder="Search feedback..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                        {/* LOADING */}
                        {loading && (
                            <div className="feedback-status">
                                <p>
                                    Loading feedback...
                                </p>
                            </div>
                        )}

                        {/* ERROR */}
                        {!loading && errorMessage && (
                            <div className="feedback-error">
                                <h3>
                                    Unable to load feedback
                                </h3>

                                <p>
                                    {errorMessage}
                                </p>

                                <p>
                                    Check your Firebase
                                    Realtime Database connection
                                    and database rules.
                                </p>
                            </div>
                        )}

                        {/* NO FEEDBACK */}
                        {!loading &&
                            !errorMessage &&
                            filteredFeedback.length === 0 && (
                                <div className="feedback-status">
                                    <p>
                                        No feedback has been
                                        submitted yet.
                                    </p>
                                </div>
                            )}

                        {/* FEEDBACK LIST */}
                        {!loading &&
                            !errorMessage &&
                            filteredFeedback.length > 0 && (
                                <div className="feedback-list">

                                    {filteredFeedback.map(
                                        (item) => (
                                            <article
                                                className="feedback-card"
                                                key={item.id}
                                            >

                                                <div className="feedback-top">

                                                    <div className="player-info">

                                                        <div className="player-avatar">
                                                            {getInitial(
                                                                item.email
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h3>
                                                                {item.email ||
                                                                    "Unknown Player"}
                                                            </h3>

                                                            <span>
                                                                Player Feedback
                                                            </span>
                                                        </div>

                                                    </div>

                                                    <span className="feedback-date">
                                                        {formatDate(
                                                            item.date
                                                        )}
                                                    </span>

                                                </div>

                                                <p className="feedback-message">
                                                    {item.feedback ||
                                                        "No feedback message."}
                                                </p>

                                            </article>
                                        )
                                    )}

                                </div>
                            )}

                    </div>

                </section>

            </main>
        </div>
    );
}

export default Reports;