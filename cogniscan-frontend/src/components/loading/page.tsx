'use client';

import { useState, useEffect } from "react";
import Image from "next/image";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600&display=swap');

  .loading-overlay {
    position: fixed;
    inset: 0;
    background-color: #c8ddb5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Nunito', sans-serif;
    z-index: 9999;
    transition: opacity 0.6s ease, visibility 0.6s ease;
  }

  .loading-overlay.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .spinner-wrapper {
    position: relative;
    width: 140px;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mascot-container {
    width: 112px;
    height: 112px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: float 3s ease-in-out infinite;
  }

  .mascot-image {
    border-radius: 50%;
    object-fit: cover;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }

  .loading-text {
    margin-top: 20px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .dots {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    align-items: center;
    justify-content: center;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    animation: dot-pulse 1.4s ease-in-out infinite;
  }

  .dot:nth-child(1) { animation-delay: 0s; background: rgba(255,255,255,0.9); }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dot-pulse {
    0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
    40% { transform: scale(1.3); opacity: 1; }
  }
`;

interface LoadingPageProps {
  isLoading?: boolean;
  text?: string;
  onHidden?: () => void;
}

export default function LoadingPage({
  isLoading = true,
  text = "Memuat...",
  onHidden,
}: LoadingPageProps) {
  const [visible, setVisible] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
    }
  }, [isLoading]);

  const handleTransitionEnd = () => {
    if (!isLoading) {
      setVisible(false);
      onHidden?.();
    }
  };

  if (!visible) return null;

  return (
    <>
      <style>{styles}</style>
      <div
        className={`loading-overlay${!isLoading ? " hidden" : ""}`}
        onTransitionEnd={handleTransitionEnd}
        aria-label="Loading"
        role="status"
      >
        <div className="spinner-wrapper">
          <div className="mascot-container">
            <Image
              src="/ilustrasi.png"
              alt="Loading"
              width={112}
              height={112}
              priority
              className="mascot-image"
            />
          </div>
        </div>

        <p className="loading-text">{text}</p>
        <div className="dots">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      </div>
    </>
  );
}