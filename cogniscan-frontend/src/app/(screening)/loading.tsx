import Image from "next/image";

/**
 * Next.js Suspense loading fallback for screening routes.
 * Uses the CogniScan mascot + orbit ring design.
 */
export default function Loading() {
  return (
    <>
      <style>{`
        @keyframes ld-orbit{to{transform:rotate(360deg)}}
        @keyframes ld-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes ld-dot{0%,80%,100%{transform:scale(1);opacity:.5}40%{transform:scale(1.3);opacity:1}}
      `}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 110,
            height: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 2,
              borderRadius: "50%",
              border: "2px solid rgba(65,87,62,0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 2,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "rgba(65,87,62,0.88)",
              borderRightColor: "rgba(169,138,214,0.56)",
              animation: "ld-orbit 1.8s cubic-bezier(0.45,0,0.2,1) infinite",
            }}
          />
          <div
            style={{
              width: 86,
              height: 86,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.72)",
              boxShadow: "0 16px 40px -24px rgba(27,28,26,0.42)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "ld-float 3s ease-in-out infinite",
            }}
          >
            <Image
              src="/ilustrasi.png"
              alt="Memuat"
              width={86}
              height={86}
              priority
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
        </div>
        <p
          style={{
            marginTop: 20,
            color: "#41573e",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: 0.5,
          }}
        >
          Memuat...
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "rgba(65,87,62,0.85)",
              animation: "ld-dot 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "rgba(65,87,62,0.35)",
              animation: "ld-dot 1.4s ease-in-out infinite 0.2s",
            }}
          />
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "rgba(65,87,62,0.35)",
              animation: "ld-dot 1.4s ease-in-out infinite 0.4s",
            }}
          />
        </div>
      </div>
    </>
  );
}
