# iTasbih Salam — déploiement Vercel + Resend

Ce projet est un site HTML statique avec une Vercel Function `POST /api/order`
qui envoie les demandes de commande via Resend. La clé Resend n'est jamais
exposée dans le navigateur.

## Structure

- `index.html` : landing page et formulaire de demande
- `assets/` : images, logo et vidéo
- `api/order.js` : Vercel Function qui appelle l'API Resend
- `package.json` : fixe Node.js 24.x
- `vercel.json` : configuration de la Function + en-têtes de sécurité
- `.env.example` : variables à créer dans Vercel

## Variables nécessaires

Créez exactement ces variables :

- `RESEND_API_KEY` — secret
- `RESEND_FROM_EMAIL` — ex. `iTasbih Salam <commandes@votredomaine.com>`
- `ORDER_TO_EMAIL` — adresse qui reçoit les nouvelles demandes

La Function refuse d'envoyer si l'une de ces variables est absente.

## Configuration Resend recommandée

### Option A — domaine acheté chez Vercel

Resend dispose d'une intégration Vercel Marketplace. Elle peut créer le compte
Resend, ajouter `RESEND_API_KEY` au projet et configurer automatiquement les
enregistrements DNS d'un domaine acheté chez Vercel.

Après création du projet Vercel :

```bash
vc i resend -m domain=votredomaine.com
```

Vérifiez ensuite le domaine dans le dashboard Resend, puis ajoutez :
`RESEND_FROM_EMAIL` et `ORDER_TO_EMAIL` dans Vercel.

### Option B — domaine ailleurs

1. Ajoutez le domaine dans Resend.
2. Ajoutez chez votre fournisseur DNS les enregistrements demandés par Resend.
3. Attendez que Resend marque le domaine comme vérifié.
4. Créez une API key Resend.
5. Dans Vercel > Project > Settings > Environment Variables :
   - `RESEND_API_KEY` : type **Secret**
   - `RESEND_FROM_EMAIL` : type **Config**
   - `ORDER_TO_EMAIL` : type **Config**
6. Redéployez le projet après toute modification d'une variable.

## Déploiement Vercel

### Depuis GitHub

1. Décompressez ce projet.
2. Créez un dépôt GitHub et poussez tous les fichiers sauf les `.env`.
3. Vercel > Add New Project > Import Git Repository.
4. Framework Preset : **Other**.
5. Root Directory : racine du projet.
6. Ne définissez pas de Build Command : `index.html` est statique.
7. Node.js : le `package.json` force `24.x`.
8. Ajoutez les variables d'environnement.
9. Déployez.

### Depuis la CLI

```bash
npm i -g vercel@latest
vercel link
vercel env pull
vercel dev
vercel deploy
vercel deploy --prod
```

## Vérifications avant production

1. Ouvrir `/api/order` doit renvoyer du JSON indiquant que le service existe.
2. Envoyer le formulaire depuis la page.
3. Vérifier un statut succès dans le navigateur.
4. Vérifier l'email dans `ORDER_TO_EMAIL`.
5. Vérifier l'email dans Resend > Emails / Logs.
6. Vérifier que la vidéo et les images chargent sur mobile.
7. Tester le bouton WhatsApp sur iPhone et Android.

## Protection contre les doubles emails

Le navigateur génère un identifiant stable par soumission. La Function le
transmet à Resend via `Idempotency-Key`. Resend utilise cette clé pour éviter
qu'un retry réseau ou un double envoi ne produise plusieurs emails identiques.

## Anti-spam de base

Le formulaire inclut :

- validation côté navigateur ;
- validation stricte côté serveur ;
- limites de longueur ;
- body limité ;
- champ honeypot ;
- clé API uniquement côté serveur ;
- aucun cache sur l'API.

Pour un trafic public important, ajoutez ensuite un rate-limit persistant ou
une protection bot côté Vercel.

## Test local

Les variables doivent rester dans un fichier local non commité. Vous pouvez
utiliser `vercel env pull` après avoir lié le projet.

Ne placez jamais `RESEND_API_KEY` dans `index.html`, le JavaScript du navigateur,
GitHub ou un fichier public.
