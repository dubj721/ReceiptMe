"use client";

import { useEffect, useState } from "react";

export default function Greeting({ firstName }: { firstName: string }) {
  const [greeting, setGreeting] = useState("");
  const [dateStr, setDateStr]   = useState("");

  useEffect(() => {
    const now  = new Date();
    const hour = now.getHours();
    const g    = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    setGreeting(`${g}, ${firstName}`);
    setDateStr(
      now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    );
  }, [firstName]);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#00D6F2" }}>
        {dateStr}
      </p>
      <h2 className="text-xl font-bold text-white mt-0.5 leading-snug">
        {greeting || `Hi, ${firstName}`} 👋
      </h2>
    </div>
  );
}
