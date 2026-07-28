# Refonte Depenzo → Dashboard Vinted (Ventes/Achats) — Design

## Contexte

Depenzo est une app Next.js existante de gestion de finances personnelles (budget, dépenses, objectifs, prêt), déployée sur Vercel avec Supabase (auth + stockage). Ce projet n'est plus utilisé tel quel. Objectif : refondre le site pour qu'il soit **exclusivement dédié au suivi Vinted** (ventes, achats), en réutilisant l'UI/le design system existant (Tailwind, shadcn, Chart.js, framer-motion) plutôt que de repartir de zéro.

## Objectif

Un dashboard privé, personnel, qui affiche automatiquement les ventes et achats Vinted de l'utilisateur, synchronisés périodiquement sans action manuelle.

## Hors périmètre (pour cette itération)

- Messagerie Vinted intégrée (lecture ou envoi) — jugée trop sensible pour cette itération, à reconsidérer plus tard une fois la base ventes/achats stable.
- Rapprochement automatique achat→vente du même article (calcul de marge par article) — trop complexe pour une v1 fiable ; on affiche un delta global (total ventes − total achats) sur une période.
- Republication automatique d'annonces, achat automatique.
- Toute automatisation en écriture sur le compte Vinted (le projet ne fait que **lire**).

## Architecture

- **Site** : Next.js 16 + Supabase, déployé sur Vercel (infra existante de Depenzo, conservée).
- **Connexion au site** : email/mot de passe via Supabase Auth (déjà en place) — usage strictement personnel, pas de compte public.
- **Connexion à Vinted** : dans une page "Paramètres", l'utilisateur colle son cookie de session Vinted (`access_token_web`), récupéré manuellement depuis son navigateur. Stocké chiffré côté serveur (colonne dédiée, jamais exposée au client). Pas de mot de passe Vinted stocké, pas de login automatisé — on évite ainsi le déclencheur qui avait fait bloquer un précédent projet (automatisation de la page de connexion Vinted).
- **Synchronisation** : une route API Next.js (`/api/sync-vinted` ou équivalent), déclenchée par **Vercel Cron** plusieurs fois par jour (ex. toutes les 4h). Cette route :
  1. Charge le cookie de session stocké.
  2. Lance un navigateur headless serverless (`playwright-core` + `@sparticuz/chromium`) pour visiter les pages "Mes ventes" et "Mes achats" de Vinted avec ce cookie.
  3. Extrait les nouvelles entrées (titre, prix, date, statut, photo, contrepartie) et les enregistre dans Supabase.
  4. Ne fait **aucune action d'écriture** sur Vinted (lecture seule).
- Cette synchro est **indépendante du bot Discord existant** — le site fonctionne même si le bot est éteint.

## Modèle de données (Supabase)

Nouvelle table dédiée (plutôt que le blob JSONB générique `user_data` existant, pour permettre des requêtes/filtres efficaces) :

- `vinted_session` : `user_id`, `cookie_chiffré`, `updated_at` — un cookie par utilisateur.
- `vinted_sales` : `id`, `user_id`, `vinted_item_id`, `title`, `price`, `photo_url`, `buyer`, `status`, `sold_at`, `synced_at`.
- `vinted_purchases` : mêmes colonnes, côté achats (`seller` au lieu de `buyer`).
- RLS (Row Level Security) identique à l'existant : chaque utilisateur ne voit que ses propres lignes.

## Dashboard (pages)

- **Vue d'ensemble** : total ventes, total achats, delta sur la période sélectionnée, graphique d'évolution (Chart.js, réutilisation directe).
- **Ventes** : liste filtrable/triable (photo, titre, prix, date, acheteur, statut).
- **Achats** : liste équivalente côté achats.
- **Paramètres** : gestion du cookie de session Vinted (coller/mettre à jour/voir la date de dernière synchro réussie).
- **Export** : réutilisation du module d'export CSV déjà présent dans Depenzo.

## Gestion des erreurs

- Si le cookie de session a expiré (Vinted redirige vers la page de login au lieu des pages Mes ventes/Mes achats), la synchro échoue proprement : elle enregistre un statut d'erreur visible dans "Paramètres" ("Session expirée, merci de recoller ton cookie"), sans crasher ni retenter en boucle.
- Si Vinted change la structure de ses pages (scraping HTML), la synchro échoue silencieusement pour ce cycle et retente au prochain déclenchement Cron ; un statut d'erreur reste visible pour l'utilisateur.

## Tests

- Fonctions pures (parsing des pages Vinted → objets vente/achat, calcul du delta ventes−achats) testées unitairement, indépendamment du réseau.
- La synchro réelle contre Vinted n'est pas testable automatiquement (dépend d'un vrai compte connecté) — validation manuelle après déploiement.

## Étapes suivantes après ce design

1. Nettoyer Depenzo : retirer les modules budget/dépenses/objectifs/prêt, garder auth + layout + UI + Chart.js + export.
2. Créer les tables Supabase (`vinted_session`, `vinted_sales`, `vinted_purchases`).
3. Construire la route de synchro serverless + Vercel Cron.
4. Construire les pages Ventes/Achats/Vue d'ensemble/Paramètres.
