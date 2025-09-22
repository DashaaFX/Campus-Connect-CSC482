import axios from "axios";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../firebase";

export async function loginWithAws(email, password) {
  // 1. Login to AWS
  const awsLogin = await axios.post("/auth/login", { email, password });
  const awsJwt = awsLogin.data.token;

  // 2. Get Firebase Custom Token
  const firebaseTokenResp = await axios.get("/auth/firebase-token", {
    headers: { Authorization: `Bearer ${awsJwt}` }
  });
  const firebaseToken = firebaseTokenResp.data.firebaseToken;

  // 3. Sign in to Firebase
  await signInWithCustomToken(auth, firebaseToken);
  return { awsJwt, firebaseToken };
}
