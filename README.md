# F1 Stats

Prosty frontend do przeglądania danych z [OpenF1](https://openf1.org/docs/).

Stack: Vite + React + TypeScript, TanStack Query, TanStack Table, React Router, Tailwind CSS.

Historia zmian: [CHANGELOG.md](CHANGELOG.md).

```bash
npm install
npm run dev
```

`npm run lint`, `npm test` i `npm run build` sprawdzają projekt lokalnie.

W aplikacji są wyniki sesji, radio, porównanie telemetrii z kwalifikacji, klasyfikacja sezonu oraz widoki wyścigu: strategia opon i pit stopy, przebieg wyścigu oraz pogoda i tempo. Historyczne dane OpenF1 są bezpłatne; dostęp live wymaga płatnej subskrypcji OpenF1.

## GitHub Pages

GitHub Actions instaluje zależności, uruchamia lint i testy, a następnie buduje aplikację do `dist/` i publikuje ten folder jako artefakt GitHub Pages. Pliki wynikowe są ignorowane przez Git i nie wymagają commitowania. W ustawieniach repozytorium `Settings → Pages` wybierz `GitHub Actions`. Strony mają adresy w formie `https://krzylesniewski.github.io/f1_own_stats/#/2024/1239/9550`. Dawne linki bez `#` są przekierowywane przez `404.html`, ale pierwsze żądanie pod starym adresem nadal otrzyma HTTP 404.

- `src/api/client.ts` – `get<T>(endpoint, params)`; operatory w kluczu, np. `{ 'lap_duration>=': 120 }`
- `src/api/types.ts` – typy odpowiedzi API
- `src/api/queries.ts` – hooki TanStack Query

Uwaga: `car_data` i `location` zawsze filtruj po kierowcy i zakresie czasu (pełna sesja to ~9 MB na kierowcę).
