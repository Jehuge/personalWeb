import React, { useEffect, useState } from 'react';

interface Props {
  contentType: 'blog' | 'photo' | 'video' | 'ai_image' | 'ai_demo';
  contentId: number;
}

function generateVisitorId() {
  try {
    const existing = localStorage.getItem('visitor_id');
    if (existing) return existing;
    const id = crypto && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('visitor_id', id);
    return id;
  } catch (e) {
    return `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const VoteButtons: React.FC<Props> = ({ contentType, contentId }) => {
  const [likeCount, setLikeCount] = useState<number>(0);
  const [dislikeCount, setDislikeCount] = useState<number>(0);
  const [myAction, setMyAction] = useState<number | null>(null);
  const visitorId = generateVisitorId();

  const statusKey = `vote:${contentType}:${contentId}`;

  useEffect(() => {
    const cached = localStorage.getItem(statusKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setMyAction(parsed.action ?? null);
        setLikeCount(parsed.like_count ?? 0);
        setDislikeCount(parsed.dislike_count ?? 0);
        return;
      } catch (e) {
        // fallthrough to fetch
      }
    }

    // fetch status from backend
    fetch(`/api/votes/status?content_type=${contentType}&content_id=${contentId}`, {
      headers: {
        'X-Visitor-Id': visitorId,
      },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        setMyAction(data.action ?? null);
        setLikeCount(data.like_count ?? 0);
        setDislikeCount(data.dislike_count ?? 0);
        try {
          localStorage.setItem(statusKey, JSON.stringify(data));
        } catch (e) {}
      })
      .catch(() => {
        // ignore
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentId]);

  const doVote = (action: 1 | -1) => {
    // optimistic UI update
    if (myAction === action) return;
    const prevAction = myAction;
    setMyAction(action);
    setLikeCount((c) => (action === 1 ? c + 1 : action === -1 && prevAction === 1 ? c - 1 : c));
    setDislikeCount((c) => (action === -1 ? c + 1 : action === 1 && prevAction === -1 ? c - 1 : c));

    fetch('/api/votes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Id': visitorId,
      },
      body: JSON.stringify({
        content_type: contentType,
        content_id: contentId,
        action,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setLikeCount(data.like_count ?? 0);
        setDislikeCount(data.dislike_count ?? 0);
        setMyAction(data.action ?? null);
        try {
          localStorage.setItem(statusKey, JSON.stringify(data));
        } catch (e) {}
      })
      .catch(() => {
        // rollback optimistic
        setMyAction(prevAction ?? null);
        // re-fetch status later could be added
      });
  };

  return (
    <div className="vote-buttons" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button
        aria-pressed={myAction === 1}
        onClick={() => doVote(1)}
        className={`vote-like ${myAction === 1 ? 'voted' : ''}`}
      >
        👍 {likeCount}
      </button>
      <button
        aria-pressed={myAction === -1}
        onClick={() => doVote(-1)}
        className={`vote-dislike ${myAction === -1 ? 'voted' : ''}`}
      >
        👎 {dislikeCount}
      </button>
    </div>
  );
};

export default VoteButtons;


