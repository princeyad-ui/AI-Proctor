import React, { useEffect, useState, useRef } from "react";
import "./Sessions.css";

const SERVER_BASE = "http://localhost:5000";

/**
 * Helper: convert absolute server file path to a served URL.
 */
function evidencePathToUrl(serverPath) {
  if (!serverPath) return null;
  const p = serverPath.replace(/\\/g, "/");
  const idx = p.indexOf("/evidence/");
  if (idx >= 0) {
    return SERVER_BASE + p.substring(idx);
  }
  const parts = p.split("/");
  const file = parts[parts.length - 1];
  const sessionId = parts[parts.length - 2];
  return `${SERVER_BASE}/evidence/${sessionId}/${file}`;
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSessionEvents, setSelectedSessionEvents] = useState([]);
  const [polling, setPolling] = useState(true); // toggle polling if you want
  const pollRef = useRef(null);

  // Poll interval (ms) - set to 5000 for near-real-time updates
  const POLL_INTERVAL_MS = 5000;

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_BASE}/api/sessions`);
      const data = await res.json();
      if (data && data.success) {
        setSessions(data.sessions || []);
      } else if (Array.isArray(data)) {
        setSessions(data);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch latest events for a single session id
  async function fetchSessionEvents(sessionId) {
    try {
      const res = await fetch(`${SERVER_BASE}/api/sessions/${sessionId}/events`);
      if (!res.ok) {
        // server may not support this endpoint; fallback to sessions array events
        return null;
      }
      const data = await res.json();
      // expected: { success:true, events: [...] } or array
      if (data && data.success && Array.isArray(data.events)) return data.events;
      if (Array.isArray(data)) return data;
      return null;
    } catch (err) {
      console.error("Failed to fetch session events", err);
      return null;
    }
  }

  // Initial load + set up polling
  useEffect(() => {
    fetchSessions();

    if (polling) {
      pollRef.current = setInterval(() => {
        fetchSessions();
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling]);

  // When opening image/modal, fetch up-to-date events for that session
  async function openImage(url, events = [], sessionId = null) {
    setSelectedImage(url);
    // if server supports events endpoint, fetch latest events for the session
    if (sessionId) {
      const latest = await fetchSessionEvents(sessionId);
      if (latest && Array.isArray(latest)) {
        setSelectedSessionEvents(latest);
        return;
      }
    }
    // fallback to passed events (may be stale)
    setSelectedSessionEvents(events || []);
  }

  function closeModal() {
    setSelectedImage(null);
    setSelectedSessionEvents([]);
  }

  return (
    <div className="sessions-page container">
      <div className="sessions-header">
        <h1>Sessions & Evidence</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn1" onClick={fetchSessions} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="btn1"
            onClick={() => {
              setPolling(p => {
                const newV = !p;
                if (!newV && pollRef.current) {
                  clearInterval(pollRef.current);
                  pollRef.current = null;
                } else if (newV && !pollRef.current) {
                  pollRef.current = setInterval(() => fetchSessions(), POLL_INTERVAL_MS);
                }
                return newV;
              });
            }}
          >
            {polling ? "Pause Live" : "Resume Live"}
          </button>
        </div>
      </div>

      {sessions.length === 0 && !loading && (
        <p className="muted">No sessions found. Start a proctoring session to see results.</p>
      )}

      <div className="session-list">
        {sessions.map((sess) => {
          const frameEvidence = (sess.evidence || []).filter(e => e.type === "frame");
          const thumbnailUrl = frameEvidence.length > 0 ? evidencePathToUrl(frameEvidence[0].path) : null;

          return (
            <div className="session-card" key={sess.sessionId}>
              <div className="session-meta">
                <div><strong>Session:</strong> <span className="mono">{sess.sessionId}</span></div>
                <div><strong>Started:</strong> {sess.startedAt ? new Date(sess.startedAt).toLocaleString() : "—"}</div>
                {sess.endedAt && <div><strong>Ended:</strong> {new Date(sess.endedAt).toLocaleString()}</div>}
                <div><strong>Alerts:</strong> {(sess.events || []).length}</div>
                <div><strong>Risk Score:</strong> {sess.riskScore ?? 0}</div>
              </div>

              <div className="session-thumbs">
                {frameEvidence.length > 0 ? (
                  frameEvidence.map((ev, idx) => {
                    const url = evidencePathToUrl(ev.path);
                    return (
                      <img
                        key={idx}
                        src={url}
                        alt={`evidence-${idx}`}
                        className="thumb"
                        onClick={() => openImage(url, sess.events, sess.sessionId)}
                      />
                    );
                  })
                ) : (
                  <div className="no-thumb">No frames</div>
                )}
              </div>

              <div className="session-actions">
                <a className="link-btn" href={`${SERVER_BASE}/api/report/${sess.sessionId}`} target="_blank" rel="noreferrer">Open Report (raw)</a>
                {thumbnailUrl && (
                  <button className="btn1" onClick={() => openImage(thumbnailUrl, sess.events, sess.sessionId)}>
                    View Latest Frame
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for image preview + events */}
      {selectedImage && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-left">
              <img src={selectedImage} alt="selected" className="modal-img" />
            </div>
            <div className="modal-right">
              <h3>Session Alerts</h3>
              {selectedSessionEvents && selectedSessionEvents.length > 0 ? (
                <ul className="events-list">
                  {selectedSessionEvents.map((ev) => (
                    <li key={ev.id ?? ev.timestamp}>
                      <div className="ev-type">{ev.type}</div>
                      <div className="ev-details">{ev.details}</div>
                      <div className="ev-time">{new Date(ev.timestamp).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No alerts for this session.</p>
              )}
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={closeModal}>Close</button>
                <a className="link-btn" href={selectedImage} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>Open image in new tab</a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
