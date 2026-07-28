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
- **Connexion à Vinted** : recherche faite pendant le design (voir "Découvertes techniques" ci-dessous) — **un seul cookie ne suffit pas** à authentifier une session Vinted. Dans la page "Paramètres", l'utilisateur exporte tous ses cookies `vinted.fr` via une extension navigateur (ex. Cookie-Editor, export JSON en un clic) et colle ce JSON dans le site. Stocké chiffré côté serveur (colonne dédiée, jamais exposée au client). Pas de mot de passe Vinted stocké, pas de login automatisé — on évite ainsi le déclencheur qui avait fait bloquer un précédent projet (automatisation de la page de connexion Vinted).
- **Synchronisation** : une route API Next.js (`/api/sync-vinted` ou équivalent), déclenchée par **Vercel Cron** plusieurs fois par jour (ex. toutes les 4h). Cette route :
  1. Charge le jeu de cookies stocké.
  2. Lance un navigateur headless serverless (`playwright-core` + `@sparticuz/chromium`), applique tous les cookies à un contexte de navigateur, et visite `https://www.vinted.fr/my_orders?order_type=sold` puis `?order_type=purchased`.
  3. Extrait le JSON `preloadedOrders` embarqué dans le HTML de la page (voir format ci-dessous) et enregistre les nouvelles/mises à jour d'entrées dans Supabase.
  4. Ne fait **aucune action d'écriture** sur Vinted (lecture seule).
- Cette synchro est **indépendante du bot Discord existant** — le site fonctionne même si le bot est éteint.

## Découvertes techniques (validées pendant le design)

- Vinted charge `/my_orders` avec React Server Components : les données ne sont **pas** exposées via un appel `fetch`/`XHR` séparé visible dans l'onglet Réseau, mais **embarquées directement dans le HTML initial** de la page, dans un bloc `<script>self.__next_f.push([1,"..."])</script>` contenant un JSON échappé.
- Format exact trouvé (extrait réel, anonymisé) :
  ```json
  {
    "orderStatus": "in_progress",
    "orderType": "sold",
    "preloadedOrders": {
      "orders": [
        {
          "transactionId": 21200090946,
          "conversationId": 23996837200,
          "date": "2026-07-28T11:24:05+02:00",
          "photo": { "url": "https://images1.vinted.net/...", "thumbnails": [...] },
          "price": { "amount": "20.0", "currencyCode": "EUR" },
          "status": "Bordereau envoyé au vendeur",
          "title": "Maillot Adidas Team Vitality noir col V taille M",
          "transactionUserStatus": "needs_action"
        }
      ],
      "pagination": { "currentPage": 1, "totalPages": 1, "totalEntries": 2, "perPage": 20, "time": 1785267196 },
      "ordersNeedActionCount": 2
    },
    "defaultBoughtStatus": "in_progress"
  }
  ```
- `order_type=sold` → ventes ; `order_type=purchased` → achats. Même page, même structure `preloadedOrders`, seul le paramètre d'URL change.
- Testé et confirmé : ni un cookie unique (`access_token_web`) seul, ni ce même token en en-tête `Authorization: Bearer`, ne suffisent à authentifier la session — Vinted exige l'ensemble des cookies d'une vraie session de navigateur. D'où le choix de l'export multi-cookies ci-dessus.
- Il n'y a **pas de champ acheteur/vendeur (pseudo)** directement dans ce JSON — seulement `conversationId`. Si le pseudo de la contrepartie est nécessaire à l'affichage, il faudra soit l'extraire d'ailleurs sur la page (à vérifier au moment de l'implémentation), soit s'en passer en v1 et n'afficher que titre/prix/date/statut/photo.

## Modèle de données (Supabase)

Nouvelle table dédiée (plutôt que le blob JSONB générique `user_data` existant, pour permettre des requêtes/filtres efficaces) :

- `vinted_session` : `user_id`, `cookies_chiffrés` (JSON, le tableau de cookies exporté), `updated_at`, `last_sync_status` (`ok` / `expired` / `error`).
- `vinted_orders` : `id`, `user_id`, `transaction_id` (identifiant Vinted, unique par utilisateur), `order_type` (`sold` / `purchased`), `title`, `price_amount`, `price_currency`, `photo_url`, `status`, `order_date`, `synced_at`. Une seule table pour ventes et achats, distinguées par `order_type` (mêmes champs des deux côtés d'après les données réelles trouvées).
- RLS (Row Level Security) identique à l'existant : chaque utilisateur ne voit que ses propres lignes.

## Dashboard (pages)

- **Vue d'ensemble** : total ventes, total achats, delta sur la période sélectionnée, graphique d'évolution (Chart.js, réutilisation directe).
- **Ventes** : liste filtrable/triable (photo, titre, prix, date, statut).
- **Achats** : liste équivalente côté achats.
- **Paramètres** : gestion des cookies de session Vinted (coller/mettre à jour le JSON exporté, voir la date et le statut de la dernière synchro).
- **Export** : nouveau bouton d'export CSV (le module d'export existant de Depenzo génère un rapport HTML de finances personnelles, non réutilisable tel quel — on construit un export CSV simple à la place, adapté aux données tabulaires ventes/achats).

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
