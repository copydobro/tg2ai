"use client";

import { redirect } from "next/navigation";

export default function Home() {
  // We can automatically redirect or show a beautiful minimalist button.
  // Let's redirect to a Telegram bot or placeholder if no bot username is configured.
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "tg2ai_bot";
  
  return (
    <main style={{
      maxWidth: "500px",
      width: "100%",
      padding: "2rem",
      textAlign: "center",
      background: "rgba(255, 255, 255, 0.03)",
      borderRadius: "16px",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        fontWeight: "800",
        background: "linear-gradient(to right, #60a5fa, #3b82f6)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: "1rem",
        letterSpacing: "-0.025em"
      }}>
        TG2AI
      </h1>
      
      <p style={{
        color: "#9ca3af",
        fontSize: "1.1rem",
        lineHeight: "1.6",
        marginBottom: "2rem"
      }}>
        Экспортируйте Telegram-каналы в форматы для искусственного интеллекта: 
        <strong style={{ color: "#f3f4f6" }}> Markdown</strong>, 
        <strong style={{ color: "#f3f4f6" }}> JSON</strong> или 
        <strong style={{ color: "#f3f4f6" }}> CSV</strong>.
      </p>

      <a 
        href={`https://t.me/${botUsername}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          color: "#ffffff",
          fontWeight: "600",
          fontSize: "1.1rem",
          padding: "12px 32px",
          borderRadius: "8px",
          boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.5)",
          transition: "transform 0.2s, box-shadow 0.2s",
          cursor: "pointer",
          border: "none"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 20px 0 rgba(59, 130, 246, 0.6)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "0 4px 14px 0 rgba(59, 130, 246, 0.5)";
        }}
      >
        Открыть бота в Telegram
      </a>

      <div style={{
        marginTop: "2.5rem",
        display: "flex",
        justifyContent: "center",
        gap: "1.5rem",
        fontSize: "0.85rem",
        color: "#6b7280"
      }}>
        <span>⚡️ Без рекламы</span>
        <span>•</span>
        <span>📂 До 200 постов</span>
        <span>•</span>
        <span>🤖 AI-Ready</span>
      </div>
    </main>
  );
}
