//Chat component- Not complete yet
import React, { useEffect, useState } from "react";
import { sendMessage, subscribeToMessages } from "../../hooks/useChat";
import { auth } from "../firebase";

export default function Chat({ chatId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToMessages(chatId, setMessages);
    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    if (!text) return;
    await sendMessage(chatId, auth.currentUser.uid, text);
    setText("");
  };

  return (
    <div>
      <div style={{ maxHeight: 400, overflowY: "scroll" }}>
        {messages.map(msg => (
          <div key={msg.id}><b>{msg.senderId}:</b> {msg.text}</div>
        ))}
      </div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
