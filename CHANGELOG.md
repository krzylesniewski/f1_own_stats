# Changelog

Historia zmian w F1 Stats. Wersja 0.0.2 obejmuje bieżące zmiany w repozytorium, a 0.0.1 — wcześniejszy stan aplikacji.

## 0.0.2

### Dodano

- Nawigację do weekendów wyścigowych i klasyfikacji sezonu (`ChampionshipPage`).
- Widoki wyścigu z analizą strategii opon i pit stopów, przebiegu pozycji oraz pogody i tempa.
- Udostępnianie porównania telemetrii przez parametry adresu URL.
- Stany ładowania i błędów z możliwością ponowienia zapytania oraz testy automatyczne.

### Zmieniono

- Wybór sezonu przeniesiono do głównego nagłówka, gdzie jest dostępny w zakładkach „Weekendy” i „Klasyfikacja”. Zmiana roku zachowuje aktywną zakładkę.
- Na telefonach selektor sezonu znajduje się obok logo, a zakładki poniżej. Usunięto selektor z widoku weekendów i rok z nazwy zakładki „Klasyfikacja”.
- Routing na adresy z `#`, zgodne z GitHub Pages. Niepoprawne lub niedostępne dynamiczne trasy wracają do strony głównej.
- Obsługę zapytań do OpenF1, odświeżanie danych i pamięć podręczną.
- Workflow publikacji i dokumentację wdrożenia na GitHub Pages.
- Folder wynikowy builda na standardowy `dist/`. GitHub Actions buduje i publikuje aplikację z tego folderu; usunięto z repozytorium wygenerowane pliki `gh-pages/`.

### Poprawiono

- Obsługę dawnych linków bez `#` przez stronę `404.html` w GitHub Pages.
- Wyświetlanie wyników sesji i porównania telemetrii przy brakujących danych.

## 0.0.1

- Pierwsza wersja aplikacji: przeglądanie sezonów, weekendów i sesji F1, wyniki, radio kierowców oraz porównanie telemetrii kwalifikacyjnej na podstawie OpenF1.
