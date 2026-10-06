# F1 Stats

Prosty frontend do przeglądania danych z [OpenF1](https://openf1.org/docs/).

Stack: Vite + React + TypeScript, TanStack Query, TanStack Table, React Router, Tailwind CSS.

```bash
npm install
npm run dev
```

- `src/api/client.ts` – `get<T>(endpoint, params)`; operatory w kluczu, np. `{ 'lap_duration>=': 120 }`
- `src/api/types.ts` – typy odpowiedzi API
- `src/api/queries.ts` – hooki TanStack Query

Uwaga: `car_data` i `location` zawsze filtruj po kierowcy i zakresie czasu (pełna sesja to ~9 MB na kierowcę).
