'use client';

import Image from "next/image";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600&display=swap');

  .loading-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(253, 252, 249, 0.78);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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

  .spinner-wrapper::before,
  .spinner-wrapper::after {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    pointer-events: none;
  }

  .spinner-wrapper::before {
    border: 2px solid rgba(65, 87, 62, 0.12);
  }

  .spinner-wrapper::after {
    border: 2px solid transparent;
    border-top-color: rgba(65, 87, 62, 0.88);
    border-right-color: rgba(169, 138, 214, 0.56);
    animation: orbit-ring 1.45s cubic-bezier(0.45, 0, 0.2, 1) infinite;
  }

  .mascot-container {
    width: 112px;
    height: 112px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 22px 55px -32px rgba(27, 28, 26, 0.42);
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

  @keyframes orbit-ring {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    margin-top: 20px;
    color: #41573e;
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
    background: rgba(65, 87, 62, 0.35);
    animation: dot-pulse 1.4s ease-in-out infinite;
  }

  .dot:nth-child(1) { animation-delay: 0s; background: rgba(65, 87, 62, 0.85); }
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
  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== "opacity") return;
    if (!isLoading) {
      onHidden?.();
    }
  };

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

        {text ? <p className="loading-text">{text}</p> : null}
        <div className="dots">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      </div>
    </>
  );
}
