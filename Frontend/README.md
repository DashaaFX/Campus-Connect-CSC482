# React Frontend
# This is the front-end application for Campus Connect.

## Backend Interaction Notes
- Refunds are full-only; UI reflects single "Initiate Refund" path.
- Suspicious payments (amount mismatch) set `requiresReview`; downloads will return blocked (HTTP 423) until cleared.
- Digital download links expire in 120s; avoid prefetching.
- Payment retry supported when `paymentStatus=failed`.

## Key Environment Variable
- `VITE_API_BASE_URL` must point at deployed API stage (e.g. https://xxxx.execute-api.us-east-1.amazonaws.com/dev2).

## Links
- See root `README.md` for full backend architecture.
- Operational procedures: `BACKEND-OPERATIONS.md`.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
