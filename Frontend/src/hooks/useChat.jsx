//Custom hook for chat - not completed
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

export function sendMessage(chatId, senderId, text) {
  return addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    text,
    timestamp: serverTimestamp(),
  });
}

export function subscribeToMessages(chatId, callback) {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
}
