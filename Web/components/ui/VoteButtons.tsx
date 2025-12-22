import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

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
  const [isVisible, setIsVisible] = useState(true);
  const visitorId = generateVisitorId();

  const statusKey = `vote:${contentType}:${contentId}`;
  const uniqueIdSuffix = `${contentType}-${contentId}`;

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
        } catch (e) { }
      })
      .catch(() => {
        // ignore
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentId]);

  const doVote = (action: 1 | -1) => {
    // If clicking the same action, treat it as "unvote" (toggle off)
    const newAction = myAction === action ? null : action;
    const prevAction = myAction;

    setMyAction(newAction);

    // Optimistic update
    setLikeCount((c) => {
      if (prevAction === 1) return c - 1; // remove old like
      if (newAction === 1) return c + 1; // add new like
      return c;
    });
    setDislikeCount((c) => {
      if (prevAction === -1) return c - 1; // remove old dislike
      if (newAction === -1) return c + 1; // add new dislike
      return c;
    });

    fetch('/api/votes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Visitor-Id': visitorId,
      },
      // Backend expects 'action' to be 1, -1, or 0 (for reset/unvote)
      body: JSON.stringify({
        content_type: contentType,
        content_id: contentId,
        action: newAction ?? 0,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setLikeCount(data.like_count ?? 0);
        setDislikeCount(data.dislike_count ?? 0);
        setMyAction(data.action ?? null);
        try {
          localStorage.setItem(statusKey, JSON.stringify(data));
        } catch (e) { }
      })
      .catch(() => {
        // rollback optimistic
        setMyAction(prevAction ?? null);
        // re-fetch status later could be added
      });
  };

  if (!isVisible) return null;

  return (
    <StyledWrapper>
      <div className="like-dislike-container">
        <div className="tool-box">
          <button className="btn-close" onClick={() => setIsVisible(false)}>×</button>
        </div>
        <p className="text-content">你觉得{
          contentType === 'blog' ? '这篇文章' :
            contentType === 'video' ? '这个视频' :
              contentType === 'ai_demo' ? '这个演示' :
                '这张图片'
        }<br />怎么样？</p>
        <div className="icons-box">
          <div className="icons">
            <label className="btn-label" htmlFor={`like-checkbox-${uniqueIdSuffix}`}>
              <span className="like-text-content">{likeCount}</span>
              <input
                className="input-box"
                id={`like-checkbox-${uniqueIdSuffix}`}
                type="checkbox"
                checked={myAction === 1}
                onChange={() => doVote(1)}
              />
              <svg className="svgs" id="icon-like-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2H464c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48H294.5c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3V320 272 247.1c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192H96c17.7 0 32 14.3 32 32V448c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V224c0-17.7 14.3-32 32-32z" /></svg>
              <svg className="svgs" id="icon-like-regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M323.8 34.8c-38.2-10.9-78.1 11.2-89 49.4l-5.7 20c-3.7 13-10.4 25-19.5 35l-51.3 56.4c-8.9 9.8-8.2 25 1.6 33.9s25 8.2 33.9-1.6l51.3-56.4c14.1-15.5 24.4-34 30.1-54.1l5.7-20c3.6-12.7 16.9-20.1 29.7-16.5s20.1 16.9 16.5 29.7l-5.7 20c-5.7 19.9-14.7 38.7-26.6 55.5c-5.2 7.3-5.8 16.9-1.7 24.9s12.3 13 21.3 13L448 224c8.8 0 16 7.2 16 16c0 6.8-4.3 12.7-10.4 15c-7.4 2.8-13 9-14.9 16.7s.1 15.8 5.3 21.7c2.5 2.8 4 6.5 4 10.6c0 7.8-5.6 14.3-13 15.7c-8.2 1.6-15.1 7.3-18 15.1s-1.6 16.7 3.6 23.3c2.1 2.7 3.4 6.1 3.4 9.9c0 6.7-4.2 12.6-10.2 14.9c-11.5 4.5-17.7 16.9-14.4 28.8c.4 1.3 .6 2.8 .6 4.3c0 8.8-7.2 16-16 16H286.5c-12.6 0-25-3.7-35.5-10.7l-61.7-41.1c-11-7.4-25.9-4.4-33.3 6.7s-4.4 25.9 6.7 33.3l61.7 41.1c18.4 12.3 40 18.8 62.1 18.8H384c34.7 0 62.9-27.6 64-62c14.6-11.7 24-29.7 24-50c0-4.5-.5-8.8-1.3-13c15.4-11.7 25.3-30.2 25.3-51c0-6.5-1-12.8-2.8-18.7C504.8 273.7 512 257.7 512 240c0-35.3-28.6-64-64-64l-92.3 0c4.7-10.4 8.7-21.2 11.8-32.2l5.7-20c10.9-38.2-11.2-78.1-49.4-89zM32 192c-17.7 0-32 14.3-32 32V448c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32H32z" /></svg>
              <div className="fireworks">
                <div className="checked-like-fx" />
              </div>
            </label>
          </div>
          <div className="icons">
            <label className="btn-label" htmlFor={`dislike-checkbox-${uniqueIdSuffix}`}>
              <input
                className="input-box"
                id={`dislike-checkbox-${uniqueIdSuffix}`}
                type="checkbox"
                checked={myAction === -1}
                onChange={() => doVote(-1)}
              />
              <div className="fireworks">
                <div className="checked-dislike-fx" />
              </div>
              <svg className="svgs" id="icon-dislike-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2H464c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48H294.5c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3V320 272 247.1c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192H96c17.7 0 32 14.3 32 32V448c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V224c0-17.7 14.3-32 32-32z" /></svg>
              <svg className="svgs" id="icon-dislike-regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M323.8 34.8c-38.2-10.9-78.1 11.2-89 49.4l-5.7 20c-3.7 13-10.4 25-19.5 35l-51.3 56.4c-8.9 9.8-8.2 25 1.6 33.9s25 8.2 33.9-1.6l51.3-56.4c14.1-15.5 24.4-34 30.1-54.1l5.7-20c3.6-12.7 16.9-20.1 29.7-16.5s20.1 16.9 16.5 29.7l-5.7 20c-5.7 19.9-14.7 38.7-26.6 55.5c-5.2 7.3-5.8 16.9-1.7 24.9s12.3 13 21.3 13L448 224c8.8 0 16 7.2 16 16c0 6.8-4.3 12.7-10.4 15c-7.4 2.8-13 9-14.9 16.7s.1 15.8 5.3 21.7c2.5 2.8 4 6.5 4 10.6c0 7.8-5.6 14.3-13 15.7c-8.2 1.6-15.1 7.3-18 15.1s-1.6 16.7 3.6 23.3c2.1 2.7 3.4 6.1 3.4 9.9c0 6.7-4.2 12.6-10.2 14.9c-11.5 4.5-17.7 16.9-14.4 28.8c.4 1.3 .6 2.8 .6 4.3c0 8.8-7.2 16-16 16H286.5c-12.6 0-25-3.7-35.5-10.7l-61.7-41.1c-11-7.4-25.9-4.4-33.3 6.7s-4.4 25.9 6.7 33.3l61.7 41.1c18.4 12.3 40 18.8 62.1 18.8H384c34.7 0 62.9-27.6 64-62c14.6-11.7 24-29.7 24-50c0-4.5-.5-8.8-1.3-13c15.4-11.7 25.3-30.2 25.3-51c0-6.5-1-12.8-2.8-18.7C504.8 273.7 512 257.7 512 240c0-35.3-28.6-64-64-64l-92.3 0c4.7-10.4 8.7-21.2 11.8-32.2l5.7-20c10.9-38.2-11.2-78.1-49.4-89zM32 192c-17.7 0-32 14.3-32 32V448c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32H32z" /></svg>
              <span className="dislike-text-content">{dislikeCount}</span>
            </label>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default VoteButtons;

const StyledWrapper = styled.div`
  /* Ensure components don't overflow or break layout */
  width: 100%;
  display: flex;
  justify-content: center;

  .like-dislike-container {
    --dark-grey: #353535;
    --middle-grey: #767676;
    --lightest-grey: linear-gradient(#fafafa,#ebebeb);
    --shadow: 0 5px 15px 0 #00000026;
    --shadow-active: 0 5px 5px 0 #00000026;
    --border-radius-main: 10px;
    --border-radius-icon: 50px;
    --bg-color: var(--lightest-grey);
    --text-color: var(--dark-grey);
    
    position: relative;
    display: flex;
    text-align: center;
    flex-direction: column;
    align-items: center;
    cursor: default;
    color: var(--text-color);
    opacity: .9;
    margin: auto;
    padding: 1.5rem;
    font-weight: 600;
    background: var(--bg-color);
    width: 100%; /* Adapt length: fill container */
    max-width: 100%;
    border-radius: var(--border-radius-main);
    box-shadow: var(--shadow);
    transition: .2s ease all;
  }

  /* Dark mode adaptation */
  /* Using specific selector that works when 'dark' class is on html or body */
  /* We use && to increase specificity if needed, or just standard ancestor selector */
  :global(.dark) & .like-dislike-container {
    --dark-grey: #e5e5e5;
    --middle-grey: #a3a3a3;
    --lightest-grey: linear-gradient(#1e293b, #0f172a);
    --shadow: 0 5px 15px 0 #00000080;
    --shadow-active: 0 5px 5px 0 #00000080;
    --text-color: #f1f5f9;
    
    background: var(--lightest-grey);
    border: 1px solid #334155;
    color: var(--text-color);
  }

  /* Fallback for when basic nested selector works better in some setups */
  .dark & .like-dislike-container,
  [data-theme='dark'] & .like-dislike-container {
      --dark-grey: #e5e5e5;
    --middle-grey: #a3a3a3;
    --lightest-grey: linear-gradient(#1e293b, #0f172a);
    --shadow: 0 5px 15px 0 #00000080;
    --shadow-active: 0 5px 5px 0 #00000080;
    --text-color: #f1f5f9;
    
    background: var(--lightest-grey);
    border: 1px solid #334155;
    color: var(--text-color);
  }

  .like-dislike-container:hover {
    box-shadow: var(--shadow-active);
  }

  .like-dislike-container .tool-box {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    top: 0;
    right: 0;
    border-radius: var(--border-radius-main);
  }

  .like-dislike-container .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: .8rem;
    height: .8rem;
    color: transparent;
    font-size: 0;
    cursor: pointer;
    background-color: #ff000080;
    border: none;
    border-radius: var(--border-radius-main);
    transition: .2s ease all;
  }

  .like-dislike-container .btn-close:hover {
    width: 1rem;
    height: 1rem;
    font-size: 1rem;
    color: #ffffff;
    background-color: #ff0000cc;
    box-shadow: var(--shadow-active);
  }

  .like-dislike-container .btn-close:active {
    width: .9rem;
    height: .9rem;
    font-size: .9rem;
    color: #ffffffde;
    --shadow-btn-close: 0 3px 3px 0 #00000026;
    box-shadow: var(--shadow-btn-close);
  }

  .like-dislike-container .text-content {
    margin-bottom: 1rem;
    font-size: 18px;
    line-height: 1.6;
    cursor: default;
  }

  .like-dislike-container .icons-box {
    display: flex;
  }

  .like-dislike-container .icons {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: .6;
    margin: 0 0.5rem;
    cursor: pointer;
    user-select: none;
    border: 1px solid var(--middle-grey);
    border-radius: var(--border-radius-icon);
    transition: .2s ease all;
  }

  /* Dark mode specific for icons */
  :global(.dark) & .like-dislike-container .icons,
  .dark & .like-dislike-container .icons,
  [data-theme='dark'] & .like-dislike-container .icons {
     border-color: #64748b; /* Slate 500 */
  }

  .like-dislike-container .icons:hover {
    opacity: .9;
    box-shadow: var(--shadow);
  }

  .like-dislike-container .icons:active {
    opacity: .9;
    box-shadow: var(--shadow-active);
  }

  .like-dislike-container .icons .btn-label {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 0.5rem;
    cursor: pointer;
    position: relative;
  }

  .like-dislike-container .like-text-content {
    border-right: 0.1rem solid var(--dark-grey);
    padding: 0 0.6rem 0 0.5rem;
    pointer-events: none;
  }
  
  /* Update borders in dark mode */
  :global(.dark) & .like-dislike-container .like-text-content,
  .dark & .like-dislike-container .like-text-content,
  [data-theme='dark'] & .like-dislike-container .like-text-content {
    border-right-color: #94a3b8;
  }

  .like-dislike-container .dislike-text-content {
    border-left: 0.1rem solid var(--dark-grey);
    padding: 0 0.5rem 0 0.6rem;
    pointer-events: none;
  }
  
  :global(.dark) & .like-dislike-container .dislike-text-content,
  .dark & .like-dislike-container .dislike-text-content,
  [data-theme='dark'] & .like-dislike-container .dislike-text-content {
    border-left-color: #94a3b8;
  }

  .like-dislike-container .icons .svgs {
    width: 1.3rem;
    fill: #000000;
    box-sizing: content-box;
    padding: 10px 10px;
    transition: .2s ease all;
  }
  
  :global(.dark) & .like-dislike-container .icons .svgs,
  .dark & .like-dislike-container .icons .svgs,
  [data-theme='dark'] & .like-dislike-container .icons .svgs {
    fill: #f1f5f9;
  }

  /* Active State Coloring */
  .like-dislike-container .icons .input-box:checked ~ #icon-like-solid {
    fill: #ff2e51; /* Vibrant Red/Pink for Like */
  }
  
  .like-dislike-container .icons .input-box:checked ~ #icon-dislike-solid {
    fill: #64748b; /* Slate 500 for Dislike (neutral but visible) */
  }
  
  /* Ensure Dark Mode preserves or adjusts these if needed */
  :global(.dark) & .like-dislike-container .icons .input-box:checked ~ #icon-like-solid,
  .dark & .like-dislike-container .icons .input-box:checked ~ #icon-like-solid,
  [data-theme='dark'] & .like-dislike-container .icons .input-box:checked ~ #icon-like-solid {
      fill: #ff2e51; /* Keep vibrant red in dark mode */
      filter: drop-shadow(0 0 4px rgba(255, 46, 81, 0.4)); /* Glow effect in dark mode */
  }

  /* Hide the default checkbox */
  .like-dislike-container .icons .input-box {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  .like-dislike-container .icons #icon-like-regular {
    display: block;
  }

  .like-dislike-container .icons #icon-like-solid {
    display: none;
  }

  .like-dislike-container .icons:hover :is(#icon-like-solid, #icon-like-regular) {
    animation: rotate-icon-like 0.7s ease-in-out both;
  }

  .like-dislike-container .icons .input-box:checked ~ #icon-like-regular {
    display: none;
    animation: checked-icon-like 0.5s;
  }

  .like-dislike-container .icons .input-box:checked ~ #icon-like-solid {
    display: block;
    animation: checked-icon-like 0.5s;
  }

  .like-dislike-container .icons #icon-dislike-regular {
    display: block;
    transform: rotate(180deg);
  }

  .like-dislike-container .icons #icon-dislike-solid {
    display: none;
    transform: rotate(180deg);
  }

  .like-dislike-container .icons:hover :is(#icon-dislike-solid, #icon-dislike-regular) {
    animation: rotate-icon-dislike 0.7s ease-in-out both;
  }

  .like-dislike-container .icons .input-box:checked ~ #icon-dislike-regular {
    display: none;
    animation: checked-icon-dislike 0.5s;
  }

  .like-dislike-container .icons .input-box:checked ~ #icon-dislike-solid {
    display: block;
    animation: checked-icon-dislike 0.5s;
  }

  .like-dislike-container .icons .fireworks {
    transform: scale(0.4);
  }

  .like-dislike-container .icons .input-box:checked ~ .fireworks > .checked-like-fx {
    position: absolute;
    width: 10px;
    height: 10px;
    right: 40px;
    border-radius: 50%;
    box-shadow: 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff;
    animation: 1s fireworks-bang ease-out forwards, 1s fireworks-gravity ease-in forwards, 5s fireworks-position linear forwards;
    animation-duration: 1.25s, 1.25s, 6.25s;
  }

  .like-dislike-container .icons .input-box:checked ~ .fireworks > .checked-dislike-fx {
    position: absolute;
    width: 10px;
    height: 10px;
    left: 40px;
    border-radius: 50%;
    box-shadow: 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff, 0 0 #fff;
    animation: 1s fireworks-bang ease-out forwards, 1s fireworks-gravity ease-in forwards, 5s fireworks-position linear forwards;
    animation-duration: 1.25s, 1.25s, 6.25s;
  }

  /* Shake Animation */
  @keyframes rotate-icon-like {
    0% {
      transform: rotate(0deg) translate3d(0, 0, 0);
    }

    25% {
      transform: rotate(3deg) translate3d(0, 0, 0);
    }

    50% {
      transform: rotate(-3deg) translate3d(0, 0, 0);
    }

    75% {
      transform: rotate(1deg) translate3d(0, 0, 0);
    }

    100% {
      transform: rotate(0deg) translate3d(0, 0, 0);
    }
  }

  @keyframes rotate-icon-dislike {
    0% {
      transform: rotate(180deg) translate3d(0, 0, 0);
    }

    25% {
      transform: rotate(183deg) translate3d(0, 0, 0);
    }

    50% {
      transform: rotate(177deg) translate3d(0, 0, 0);
    }

    75% {
      transform: rotate(181deg) translate3d(0, 0, 0);
    }

    100% {
      transform: rotate(180deg) translate3d(0, 0, 0);
    }
  }

  /* Checked Animation */
  @keyframes checked-icon-like {
    0% {
      transform: scale(0);
      opacity: 0;
    }

    50% {
      transform: scale(1.2) rotate(-10deg);
    }
  }

  @keyframes checked-icon-dislike {
    0% {
      transform: scale(0) rotate(180deg);
      opacity: 0;
    }

    50% {
      transform: scale(1.2) rotate(170deg);
    }
  }

  /* Fireworks Animation */
  @keyframes fireworks-position {
    0%, 19.9% {
      margin-top: 10%;
      margin-left: 40%;
    }

    20%, 39.9% {
      margin-top: 40%;
      margin-left: 30%;
    }

    40%, 59.9% {
      margin-top: 20%;
      margin-left: 70%;
    }

    60%, 79.9% {
      margin-top: 30%;
      margin-left: 20%;
    }

    80%, 99.9% {
      margin-top: 30%;
      margin-left: 80%;
    }
  }

  @keyframes fireworks-gravity {
    to {
      transform: translateY(200px);
      opacity: 0;
    }
  }

  @keyframes fireworks-bang {
    to {
      box-shadow: 114px -107.3333333333px #8800ff, 212px -166.3333333333px #a600ff, 197px -6.3333333333px #ff006a, 179px -329.3333333333px #3300ff, -167px -262.3333333333px #ff0062, 233px 65.6666666667px #ff008c, 81px 42.6666666667px #0051ff, -13px 54.6666666667px #00ff2b, -60px -183.3333333333px #0900ff, 127px -259.3333333333px #ff00e6, 117px -122.3333333333px #00b7ff, 95px 20.6666666667px #ff8000, 115px 1.6666666667px #0004ff, -160px -328.3333333333px #00ff40, 69px -242.3333333333px #000dff, -208px -230.3333333333px #ff0400, 30px -15.3333333333px #e6ff00, 235px -15.3333333333px #fb00ff, 80px -232.3333333333px #d5ff00, 175px -173.3333333333px #00ff3c, -187px -176.3333333333px #aaff00, 4px 26.6666666667px #ff6f00, 227px -106.3333333333px #ff0099, 119px 17.6666666667px #00ffd5, -102px 4.6666666667px #ff0088, -16px -4.3333333333px #00fff7, -201px -310.3333333333px #00ffdd, 64px -181.3333333333px #f700ff, -234px -15.3333333333px #00fffb, -184px -263.3333333333px #aa00ff, 96px -303.3333333333px #0037ff, -139px 10.6666666667px #0026ff, 25px -205.3333333333px #00ff2b, -129px -322.3333333333px #40ff00, -235px -187.3333333333px #26ff00, -136px -237.3333333333px #0091ff, -82px -321.3333333333px #6a00ff, 7px -267.3333333333px #ff00c8, -155px 30.6666666667px #0059ff, -85px -73.3333333333px #6a00ff, 60px -199.3333333333px #55ff00, -9px -289.3333333333px #00ffaa, -208px -167.3333333333px #00ff80, -13px -299.3333333333px #ff0004, 179px -164.3333333333px #ff0044, -112px 12.6666666667px #0051ff, -209px -125.3333333333px #ff00bb, 14px -101.3333333333px #00ff95, -184px -292.3333333333px #ff0099, -26px -168.3333333333px #09ff00, 129px -67.3333333333px #0084ff, -17px -23.3333333333px #0059ff, 129px 34.6666666667px #7300ff, 35px -24.3333333333px #ffd900, -12px -297.3333333333px #ff8400, 129px -156.3333333333px #0dff00, 157px -29.3333333333px #1a00ff, -221px 6.6666666667px #ff0062, 0px -311.3333333333px #ff006a, 155px 50.6666666667px #00ffaa, -71px -318.3333333333px #0073ff;
    }
  }`;


