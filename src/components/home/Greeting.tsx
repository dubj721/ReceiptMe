"use client";

import { useEffect, useState } from "react";

export default function Greeting({ firstName }: { firstName: string }) {
  const [text, setText] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    setText(`${greeting}, ${firstName} 👋`);
    setDateStr(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, [firstName]);

  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{dateStr}</p>
      <h2 className="text-xl font-bold text-gray-900 mt-0.5">{text || `Hi, ${firstName} 👋`}</h2>
    </div>
  );
}
